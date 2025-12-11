import { OAuth } from 'oauth';

// Ensure we have the env vars
const CONSUMER_KEY = process.env.SPLITWISE_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.SPLITWISE_CONSUMER_SECRET;
const APP_URL = process.env.APP_URL;

if (!CONSUMER_KEY || !CONSUMER_SECRET || !APP_URL) {
    console.warn("Missing Splitwise Env Vars");
}

// Splitwise API Endpoints
const REQUEST_TOKEN_URL = 'https://secure.splitwise.com/api/v3.0/get_request_token';
const ACCESS_TOKEN_URL = 'https://secure.splitwise.com/api/v3.0/get_access_token';
const API_BASE = 'https://secure.splitwise.com/api/v3.0';

// Factory to create OAuth instance
function createOAuth() {
    if (!CONSUMER_KEY || !CONSUMER_SECRET) {
        throw new Error("Splitwise Environment Variables are missing");
    }

    return new OAuth(
        REQUEST_TOKEN_URL,
        ACCESS_TOKEN_URL,
        CONSUMER_KEY,
        CONSUMER_SECRET,
        '1.0A',
        `${APP_URL}/api/splitwise/callback`,
        'HMAC-SHA1'
    );
}

// 1. Get Request Token
export async function getRequestToken(): Promise<{ oauth_token: string; oauth_token_secret: string }> {
    return new Promise((resolve, reject) => {
        const oa = createOAuth();
        oa.getOAuthRequestToken((err, oauth_token, oauth_token_secret) => {
            if (err) return reject(err);
            resolve({ oauth_token, oauth_token_secret });
        });
    });
}

// 2. Exchange Request Token for Access Token
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
                if (err) return reject(err);
                resolve({ oauth_access_token, oauth_access_token_secret });
            }
        );
    });
}

// 3. Generic GET request (Fixed: uses oauth lib, no Axios headers issues)
export async function splitwiseGet<T>(
    path: string,
    accessToken: string,
    accessTokenSecret: string
): Promise<T> {
    return new Promise((resolve, reject) => {
        const oa = createOAuth();
        const url = `${API_BASE}${path}`;

        oa.get(url, accessToken, accessTokenSecret, (err, data) => {
            if (err) return reject(err);
            if (!data) return resolve({} as T);

            try {
                const jsonStr = Buffer.isBuffer(data) ? data.toString('utf8') : (data as string);
                const result = JSON.parse(jsonStr);
                resolve(result);
            } catch (parseErr) {
                reject(parseErr);
            }
        });
    });
}

// Helper specific to simple Group List
export async function listGroups(accessToken: string, accessTokenSecret: string) {
    const data = await splitwiseGet<{ groups: any[] }>('/get_groups', accessToken, accessTokenSecret);
    return data;
}

// Helper specific to Expenses
export async function getExpenses(accessToken: string, accessTokenSecret: string, groupId?: string) {
    const query = groupId ? `?group_id=${encodeURIComponent(groupId)}&limit=50` : '?limit=50';
    const data = await splitwiseGet<{ expenses: any[] }>(`/get_expenses${query}`, accessToken, accessTokenSecret);
    return data;
}
