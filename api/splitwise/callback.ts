// api/splitwise/auth.ts, callback.ts, sync.ts
// O caminho mais longo, forçando a extensão de módulo Node.js
import type { VercelRequest, VercelResponse } from '../../../types.js';
import { getRequestToken } from '../../../lib/splitwise.js';
import { supabaseServer } from '../../../lib/supabase.js';
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const oauth_token = req.query?.oauth_token as string;
    const oauth_verifier = req.query?.oauth_verifier as string;

    if (!oauth_token || !oauth_verifier) {
        res.statusCode = 400;
        return res.json({ error: "Missing OAuth parameters" });
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
            res.statusCode = 400;
            return res.json({ error: "Invalid or expired request token" });
        }

        const { request_token_secret, property_name, user_id } = reqRow;

        // Exchange for Access Token
        const { oauth_access_token, oauth_access_token_secret } = await getAccessToken(
            oauth_token,
            request_token_secret,
            oauth_verifier
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
        const redirectUrl = `${appUrl}/fluxo-caixa?status=connected&property=${encodeURIComponent(property_name || "")}`;

        if (res.redirect) {
            res.redirect(redirectUrl);
        } else {
            res.setHeader('Location', redirectUrl);
            res.statusCode = 302;
            res.end();
        }

    } catch (error: any) {
        console.error('Callback Error:', error);
        res.statusCode = 500;
        res.json({ error: `Authentication failed: ${error.message}` });
    }
}
