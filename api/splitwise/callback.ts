import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAccessToken, listGroups } from '../../lib/splitwise';
import { supabaseServer } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { oauth_token, oauth_verifier } = req.query;

    if (!oauth_token || !oauth_verifier) {
        return res.status(400).send("Missing OAuth parameters");
    }

    try {
        const sb = supabaseServer();

        // Retrieve Secret from DB
        const { data: reqRow, error: reqErr } = await sb
            .from("oauth_requests")
            .select("*")
            .eq("request_token", oauth_token)
            .single();

        if (reqErr || !reqRow) {
            return res.status(400).send("Invalid or expired request token");
        }

        const { request_token_secret, property_name, user_id } = reqRow;

        // Exchange for Access Token
        const { oauth_access_token, oauth_access_token_secret } = await getAccessToken(
            oauth_token as string,
            request_token_secret,
            oauth_verifier as string
        );

        // Save Connection
        await sb.from("splitwise_connections").upsert({
            user_id: user_id,
            access_token: oauth_access_token,
            access_token_secret: oauth_access_token_secret,
            updated_at: new Date()
        }, { onConflict: 'user_id' });

        // Auto-match if property name exists
        if (property_name) {
            try {
                const groupsData = await listGroups(oauth_access_token, oauth_access_token_secret);
                const groups = groupsData.groups || [];
                const normalizedProp = property_name.toLowerCase();

                const match = groups.find((g: any) =>
                    g.name.toLowerCase().includes(normalizedProp) ||
                    normalizedProp.includes(g.name.toLowerCase())
                );

                if (match) {
                    await sb.from("property_splitwise_links").upsert({
                        user_id: user_id,
                        property_name: property_name,
                        splitwise_group_id: String(match.id),
                        matched_at: new Date()
                    }, { onConflict: 'user_id, property_name' });
                }
            } catch (err) {
                console.error("Auto-match failed:", err);
            }
        }

        // Cleanup
        await sb.from("oauth_requests").delete().eq("request_token", oauth_token);

        // Redirect
        const appUrl = process.env.APP_URL;
        res.redirect(`${appUrl}/fluxo-caixa?status=connected&property=${encodeURIComponent(property_name || "")}`);

    } catch (error: any) {
        console.error('Callback Error:', error);
        res.status(500).send(`Authentication failed: ${error.message}`);
    }
}
