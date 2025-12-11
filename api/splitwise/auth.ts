import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequestToken } from '../../lib/splitwise';
import { supabase } from '../../lib/supabase';

// Helper to set cookie (simplified for Vercel serverless)
// In a real app we might use a more robust cookie library or just header manipulation
const serializeCookie = (name: string, value: string, options: any = {}) => {
    let str = `${name}=${value}`;
    if (options.httpOnly) str += '; HttpOnly';
    if (options.secure) str += '; Secure';
    if (options.path) str += `; Path=${options.path}`;
    if (options.maxAge) str += `; Max-Age=${options.maxAge}`;
    return str;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { property, userId } = req.query;

    if (!property || typeof property !== 'string') {
        return res.status(400).json({ error: 'Property name is required' });
    }

    try {
        const callbackUrl = `${process.env.APP_URL}/api/splitwise/callback`;
        const { oauth_token, oauth_token_secret } = await getRequestToken(callbackUrl);

        if (!oauth_token || !oauth_token_secret) {
            throw new Error('Failed to obtain request token');
        }

        // We need to persist the oauth_token_secret and the property name to verify later
        // For simplicity/statelessness, we can store this in a secure httpOnly cookie or a temp table
        // A temp table is safer but cookie is faster for this context. Let's use cookies for the "state".

        // NOTE: In production, encrypt this data!
        const stateData = JSON.stringify({ property, oauth_token_secret, userId });
        const encodedState = Buffer.from(stateData).toString('base64');

        res.setHeader('Set-Cookie', serializeCookie('sw_auth_state', encodedState, {
            httpOnly: true,
            secure: true,
            path: '/api/splitwise',
            maxAge: 600 // 10 minutes
        }));

        const authorizeUrl = `https://secure.splitwise.com/authorize?oauth_token=${oauth_token}`;
        res.redirect(authorizeUrl);
    } catch (error) {
        console.error('Auth Init Error:', error);
        res.status(500).json({ error: 'Failed to initiate Splitwise auth' });
    }
}
