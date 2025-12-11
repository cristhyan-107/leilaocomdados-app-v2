import { VercelRequest, VercelResponse } from '../../types'; // Using local types
import { getRequestToken } from '../../lib/splitwise';
import { supabaseServer } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Manually parse query if not provided by runtime (Vercel functions usually provide it, but our type says it exists)
    // If running in raw node, req.query wouldn't exist without a parser.
    // However, Vercel's runtime injects it. Our type definition just makes TS happy.

    // Safety check for query param access in case of strict type checking
    const property = req.query?.property;
    const userId = req.query?.userId;

    if (!userId || typeof userId !== 'string') {
        res.statusCode = 400; // Native prop
        return res.json({ error: 'Missing userId' });
    }

    try {
        const { oauth_token, oauth_token_secret } = await getRequestToken();

        const sb = supabaseServer();
        // Save state to DB
        const { error } = await sb.from("oauth_requests").upsert({
            request_token: oauth_token,
            request_token_secret: oauth_token_secret,
            user_id: userId,
            property_name: (property as string) || null,
        });

        if (error) {
            console.error("Supabase Error:", error);
            res.statusCode = 500;
            return res.json({ error: "Database error" });
        }

        const authorizeUrl = `https://secure.splitwise.com/authorize?oauth_token=${encodeURIComponent(oauth_token)}`;

        // Native redirect or mock implementation
        if (res.redirect) {
            res.redirect(authorizeUrl);
        } else {
            // Fallback for native Node response
            res.setHeader('Location', authorizeUrl);
            res.statusCode = 302;
            res.end();
        }

    } catch (error: any) {
        console.error('Auth Init Error:', error);
        res.statusCode = 500;
        res.json({ error: 'Failed to initiate auth', details: error.message });
    }
}
