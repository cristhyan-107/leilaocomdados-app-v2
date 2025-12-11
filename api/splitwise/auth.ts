import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequestToken } from '../../lib/splitwise';
import { supabaseServer } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { property, userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const { oauth_token, oauth_token_secret } = await getRequestToken();

        const sb = supabaseServer();
        // Save state to DB instead of cookie
        const { error } = await sb.from("oauth_requests").upsert({
            request_token: oauth_token,
            request_token_secret: oauth_token_secret,
            user_id: userId as string,
            property_name: (property as string) || null,
        });

        if (error) {
            console.error("Supabase Error:", error);
            return res.status(500).json({ error: "Database error" });
        }

        const authorizeUrl = `https://secure.splitwise.com/authorize?oauth_token=${encodeURIComponent(oauth_token)}`;
        res.redirect(authorizeUrl);
    } catch (error: any) {
        console.error('Auth Init Error:', error);
        res.status(500).json({ error: 'Failed to initiate auth', details: error.message });
    }
}
