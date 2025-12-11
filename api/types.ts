import { IncomingMessage, ServerResponse } from 'http';

// Custom interface to match Vercel/Next behavior without the dependency
export interface VercelRequest extends IncomingMessage {
    query: { [key: string]: string | string[] };
    cookies: { [key: string]: string };
    body: any;
}

export interface VercelResponse extends ServerResponse {
    send: (body: any) => VercelResponse;
    json: (jsonBody: any) => VercelResponse;
    status: (statusCode: number) => VercelResponse;
    redirect: (url: string) => VercelResponse;
}
