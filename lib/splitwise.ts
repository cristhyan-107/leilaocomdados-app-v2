import { OAuth } from 'oauth';

// Ensure we have the env vars
const CONSUMER_KEY = process.env.SPLITWISE_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.SPLITWISE_CONSUMER_SECRET;
const APP_URL = process.env.APP_URL;

if (!CONSUMER_KEY || !CONSUMER_SECRET || !APP_URL) {
    console.error("Missing Splitwise Env Vars: ", { CONSUMER_KEY: !!CONSUMER_KEY, CONSUMER_SECRET: !!CONSUMER_SECRET, APP_URL: !!APP_URL });
}

// Splitwise API Endpoints
const REQUEST_TOKEN_URL = 'https://secure.splitwise.com/api/v3.0/get_request_token';
// Note: Splitwise docs say https://secure.splitwise.com/api/v3.0/get_access_token 
// but sometimes just /get_access_token without v3.0 works better with some libs. Sticking to v3.0 as per new snippet.
const ACCESS_TOKEN_URL = 'https://secure.splitwise.com/api/v3.0/get_access_token';
const API_BASE = 'https://secure.splitwise.com/api/v3.0';

// Factory to create OAuth instance
// We use a factory because we might want to inject dynamic callback URLs if needed, 
// though typically it's static.
function createOAuth() {
    if (!CONSUMER_KEY || !CONSUMER_SECRET) {
        throw new Error("Splitwise Environment Variables are missing");
    }

    return new OAuth(
        REQUEST_TOKEN_URL,
        ACCESS_TOKEN_URL,
        CONSUMER_KEY,
        CONSUMER_SECRET,
        '1.0A', // OAuth 1.0A is standard for Splitwise
        `${APP_URL}/api/splitwise/callback`, // Callback must be absolute
        'HMAC-SHA1'
    );
}

// 1. Get Request Token (Step 1)
export async function getRequestToken(): Promise<{ oauth_token: string; oauth_token_secret: string }> {
    return new Promise((resolve, reject) => {
        const oa = createOAuth();
        oa.getOAuthRequestToken((err, oauth_token, oauth_token_secret) => {
            if (err) {
                console.error("Splitwise RequestToken Error:", err);
                return reject(err);
            }
            resolve({ oauth_token, oauth_token_secret });
        });
    });
}

// 2. Exchange Request Token for Access Token (Step 3)
export async function getAccessToken(
    oauth_token: string,
    oauth_token_secret: string,
    oauth_verifier: string
): Promise<{ oauth_access_token: string; oauth_access_token_secret: string }> {
    return new Promise((resolve, reject) => {
        const oa = createOAuth();
        oa.getOAuthAccessToken(
            oauth_token,
            oauth_token_secret,
            oauth_verifier,
            (err, oauth_access_token, oauth_access_token_secret) => {
                if (err) {
                    console.error("Splitwise AccessToken Error:", err);
                    return reject(err);
                }
                resolve({ oauth_access_token, oauth_access_token_secret });
            }
        );
    });
}

// 3. Generic GET request (for groups, expenses, user, etc.)
export async function splitwiseGet<T>(
    path: string,
    accessToken: string,
    accessTokenSecret: string
): Promise<T> {
    return new Promise((resolve, reject) => {
        const oa = createOAuth();
        const url = `${API_BASE}${path}`;

        oa.get(url, accessToken, accessTokenSecret, (err, data) => {
            if (err) {
                console.error(`Splitwise GET Error (${path}):`, err);
                return reject(err);
            }
            if (!data) return resolve({} as T);

            try {
                // Determine if data is Buffer or string. Vercel/Node `oauth` typically returns string or Buffer.
                const jsonStr = Buffer.isBuffer(data) ? data.toString('utf8') : (data as string);
                const result = JSON.parse(jsonStr);
                resolve(result);
            } catch (parseErr) {
                console.error("Splitwise JSON Parse Error:", parseErr);
                reject(parseErr);
            }
        });
    });
}
