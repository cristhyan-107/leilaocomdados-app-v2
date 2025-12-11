import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import axios from 'axios';

const consumerKey = process.env.SPLITWISE_CONSUMER_KEY!;
const consumerSecret = process.env.SPLITWISE_CONSUMER_SECRET!;

if (!consumerKey || !consumerSecret) {
    throw new Error('Missing Splitwise environment variables');
}

const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    },
});

export const getRequestToken = async (callbackUrl: string) => {
    const requestData = {
        url: 'https://secure.splitwise.com/api/v3.0/get_request_token',
        method: 'POST',
        data: { oauth_callback: callbackUrl },
    };

    const headers = oauth.toHeader(oauth.authorize(requestData));

    try {
        const response = await axios.post(requestData.url, null, { headers });
        const data = new URLSearchParams(response.data);
        return {
            oauth_token: data.get('oauth_token'),
            oauth_token_secret: data.get('oauth_token_secret'),
        };
    } catch (error) {
        console.error('Error getting request token:', error);
        throw error;
    }
};

export const getAccessToken = async (oauthToken: string, oauthTokenSecret: string, oauthVerifier: string) => {
    const requestData = {
        url: 'https://secure.splitwise.com/api/v3.0/get_access_token',
        method: 'POST',
        data: { oauth_verifier: oauthVerifier, oauth_token: oauthToken },
    };

    const token = { key: oauthToken, secret: oauthTokenSecret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));

    try {
        const response = await axios.post(requestData.url, null, { headers });
        const data = new URLSearchParams(response.data);
        return {
            access_token: data.get('oauth_token'),
            access_token_secret: data.get('oauth_token_secret'),
            user_id: data.get('user_id'), // Splitwise returns user_id sometimes but we should check current_user if needed
        };
    } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
    }
};

export const getCurrentUser = async (accessToken: string, accessTokenSecret: string) => {
    const requestData = {
        url: 'https://secure.splitwise.com/api/v3.0/get_current_user',
        method: 'GET',
    };

    const token = { key: accessToken, secret: accessTokenSecret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));

    try {
        const response = await axios.get(requestData.url, { headers });
        return response.data.user;
    } catch (error) {
        console.error('Error getting current user:', error);
        throw error;
    }
}

export const getGroups = async (accessToken: string, accessTokenSecret: string) => {
    const requestData = {
        url: 'https://secure.splitwise.com/api/v3.0/get_groups',
        method: 'GET',
    };

    const token = { key: accessToken, secret: accessTokenSecret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));

    try {
        const response = await axios.get(requestData.url, { headers });
        return response.data.groups;
    } catch (error) {
        console.error('Error getting groups:', error);
        throw error;
    }
};

export const getExpenses = async (accessToken: string, accessTokenSecret: string, groupId: string) => {
    const requestData = {
        url: `https://secure.splitwise.com/api/v3.0/get_expenses?group_id=${groupId}&limit=0`,
        method: 'GET',
    };

    const token = { key: accessToken, secret: accessTokenSecret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));

    try {
        const response = await axios.get(requestData.url, { headers });
        return response.data.expenses;
    } catch (error) {
        console.error('Error getting expenses:', error);
        throw error;
    }
};
