// types.ts
import { IncomingMessage, ServerResponse } from 'http';

export type VercelRequest = IncomingMessage & { query: Record<string, any> };
export type VercelResponse = ServerResponse & {
    status: (code: number) => VercelResponse;
    json: (data: any) => void;
    send: (data: any) => void;
    redirect: (url: string) => void;
};
