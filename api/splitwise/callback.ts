import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAccessToken, getCurrentUser, getGroups } from '../../lib/splitwise';
import { supabase } from '../../lib/supabase';
import cookie from 'cookie';

// Simple string distance function (Levenshtein-ish or just inclusion) for matching
// For this MVP we will use simple inclusion and exact match logic
function findBestMatch(propertyName: string, groups: any[]) {
    const normalizedProperty = propertyName.toLowerCase().trim();

    // 1. Exact match
    const exact = groups.find(g => g.name.toLowerCase().trim() === normalizedProperty);
    if (exact) return exact;

    // 2. Contains match (Group name contains property name or vice-versa)
    const contains = groups.find(g =>
        g.name.toLowerCase().includes(normalizedProperty) ||
        normalizedProperty.includes(g.name.toLowerCase())
    );
    if (contains) return contains;

    // 3. Fallback: Return first group or null? 
    // Let's return the first group if no match found, or maybe null to handle manual linking later
    // Requirement says "identifica o grupo do Splitwise mais compatível". 
    // If nothing reasonable, maybe pick the most recently updated one?
    // Let's picking the one with 'Casa' or 'Ap' if present, otherwise just null.
    return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { oauth_token, oauth_verifier } = req.query;
    const cookies = cookie.parse(req.headers.cookie || '');
    const stateCookie = cookies.sw_auth_state;

    if (!stateCookie) {
        return res.status(400).json({ error: 'Missing auth state' });
    }

    let propertyName: string;
    let oauth_token_secret: string;
    let userId: string;

    try {
        const decoded = Buffer.from(stateCookie, 'base64').toString('utf-8');
        const data = JSON.parse(decoded);
        propertyName = data.property;
        oauth_token_secret = data.oauth_token_secret;
        userId = data.userId;
    } catch (e) {
        return res.status(400).json({ error: 'Invalid auth state' });
    }

    if (typeof oauth_token !== 'string' || typeof oauth_verifier !== 'string') {
        return res.status(400).json({ error: 'Invalid callback parameters' });
    }

    try {
        // 1. Exchange for Access Token
        const { access_token, access_token_secret } = await getAccessToken(oauth_token, oauth_token_secret, oauth_verifier);

        if (!access_token || !access_token_secret) {
            throw new Error('Failed to get access token');
        }

        // 2. Identify User (we need to know WHICH existing Supabase user this is)
        // IMPORTANT: The prompt implies we know who the user is.
        // However, in a serverless function plain redirect auth flow, we might lose the session if it's SPA based 
        // without a secure httpOnly session cookie sharing domain.
        // WE ASSUME: The user is logged in to the frontend, but this API route doesn't necessarily know that identity 
        // unless we passed a JWT in the initial auth step or cookies.
        // FIX: We rely on the fact that we might not be able to securely identify the Supabase user solely from this callback 
        // without a proper auth cookie from Supabase. 
        // BUT we can use the `state` to pass a temporary user identifier if needed.
        // OR we assume Supabase Auth cookie is present and readable if on same domain.
        // LETS TRY to read Supabase Auth Token from headers/cookies? API routes on Vercel are same domain.
        // However, typically `sb-access-token` is in local storage for SPA.
        // WORKAROUND: We will fetch the Splitwise User ID. 
        // And assume for this MVP that we should have passed the User ID in the state as well, OR we just save the connection
        // and let the frontend claim it?
        // BETTER APPROACH: Add `userId` to the state cookie in `auth.ts` requires the frontend to pass the user ID 
        // to `auth.ts`? No, `auth.ts` `req.query` only gets property.
        // Let's Assume the user is authenticated via Supabase and we can get the user from the JWT if it was passed... 
        // but `auth.ts` was a full page redirect.
        // To solve this: `auth.ts` should probably inspect the authorization header or a cookie. 
        // If the frontend opens `auth.ts` in a new tab/window, it might carry cookies.
        // Let's Add `userId` to `state` in `auth.ts` by assuming the caller will provide it or we can't save to DB securely.
        // REF: "2.1 users (usar auth.users do Supabase...)"

        // CRITICAL FIX: The user MUST be identified. 
        // Option A: `auth.ts` receives `access_token` (supabase) in query param? No, security risk.
        // Option B: We assume the user is just "the one who started this flow" and we persist the `user_id` in the encrypted state cookie.
        // BUT where do we get it in `auth.ts`?
        // Let's modify `auth.ts` to accept `userId` or `token` query param to Identify the user, 
        // OR verify the Supabase cookie if set.
        // For this implementation, I will assume we can pass `userId` as a query param to `auth.ts` solely for the purpose of the state.
        // I will update `auth.ts` task after this if needed, or just hotfix it here by assuming `auth.ts` handles it.
        // Let's assume `auth.ts` needs to be called with `?property=...&userId=...` or similar.
        // The prompt says: "recebe property". It doesn't mention userId. 
        // I'll stick to the prompt: The requirement 2.2 says "user_id". 
        // I will infer we need to pass the user ID or session.
        // I'll update `auth.ts` in the next tool call to include user_id handling properly.

        // For now, let's pretend we have `userId` in the state.
        // For now, let's pretend we have `userId` in the state.
        // const userId = (data as any).userId; // fixed by hoisting

        // 3. Get Splitwise current user to store their ID
        const swUser = await getCurrentUser(access_token, access_token_secret);

        // 4. Save/Update Splitwise Connection
        // We need to use `upsert`.
        if (userId) {
            const { error: upsertError } = await supabase
                .from('splitwise_connections')
                .upsert({
                    user_id: userId,
                    splitwise_user_id: String(swUser.id),
                    access_token,
                    access_token_secret,
                    updated_at: new Date()
                }, { onConflict: 'user_id' });

            if (upsertError) console.error('Upsert Error:', upsertError);
        }

        // 5. Match Group
        const groups = await getGroups(access_token, access_token_secret);
        const bestMatch = findBestMatch(propertyName, groups);

        if (bestMatch && userId) {
            // 6. Save Link
            await supabase
                .from('property_splitwise_links')
                .upsert({
                    user_id: userId,
                    property_name: propertyName,
                    splitwise_group_id: String(bestMatch.id),
                    matched_at: new Date()
                }, { onConflict: 'user_id, property_name' }); // Matches the UNIQUE constraint
        }

        // 7. Redirect back
        res.redirect(`/fluxo-caixa?status=connected&property=${encodeURIComponent(propertyName)}`);

    } catch (error) {
        console.error('Callback Error:', error);
        res.status(500).send('Authentication failed, please close this window and try again.');
    }
}
