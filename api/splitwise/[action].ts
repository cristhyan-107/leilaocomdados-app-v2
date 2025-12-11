import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequestToken, getAccessToken, splitwiseGet } from '../../lib/splitwise';
import { supabaseServer } from '../../lib/supabase';

// Unified Handler for /api/splitwise/[action]
// Actions: 'init', 'callback', 'groups', 'expenses'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. Determine Action
    // Vercel dynamic routes pass the filename param as query param.
    // filename: [action].ts -> req.query.action might be string or array
    const { action: actionParam } = req.query;
    const action = Array.isArray(actionParam) ? actionParam[0] : actionParam;

    // Helper for errors
    const sendError = (code: number, msg: string, detail?: any) => {
        console.error(`API Error [${action}]: ${msg}`, detail);
        res.status(code).json({ error: msg, detail });
    };

    try {
        switch (action) {

            // =================================================================================
            // 1. INIT - Start OAuth Flow
            // GET /api/splitwise/init?property=<name>&user_id=<uuid>
            // =================================================================================
            case 'init': {
                const property = req.query.property as string;
                const user_id = req.query.user_id as string;

                if (!property || !user_id) return sendError(400, "Missing property or user_id");

                const { oauth_token, oauth_token_secret } = await getRequestToken();

                // Save temp request state
                const sb = supabaseServer();
                const { error } = await sb.from("oauth_requests").upsert({
                    request_token: oauth_token,
                    request_token_secret: oauth_token_secret,
                    user_id: user_id,
                    property_name: property,
                });

                if (error) throw error;

                const redirectUrl = `https://secure.splitwise.com/authorize?oauth_token=${encodeURIComponent(oauth_token)}`;
                res.redirect(redirectUrl);
                break;
            }

            // =================================================================================
            // 2. CALLBACK - Handle Return from Splitwise
            // GET /api/splitwise/callback?oauth_token=...&oauth_verifier=...
            // =================================================================================
            case 'callback': {
                const { oauth_token, oauth_verifier } = req.query;

                if (!oauth_token || !oauth_verifier) return sendError(400, "Missing OAuth params");

                const sb = supabaseServer();

                // Retrieve Secret
                const { data: reqRow, error: reqErr } = await sb
                    .from("oauth_requests")
                    .select("*")
                    .eq("request_token", oauth_token)
                    .single();

                if (reqErr || !reqRow) return sendError(400, "Invalid or expired request token");

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

                // Try to Auto-Match Group if property_name exists
                if (property_name) {
                    try {
                        const groupsData = await splitwiseGet<{ groups: any[] }>('/get_groups', oauth_access_token, oauth_access_token_secret);
                        const groups = groupsData.groups || [];
                        const normalizedProp = property_name.toLowerCase();

                        // Simple match logic
                        const match = groups.find((g: any) => g.name.toLowerCase().includes(normalizedProp) || normalizedProp.includes(g.name.toLowerCase()));

                        if (match) {
                            await sb.from("property_splitwise_links").upsert({
                                user_id: user_id,
                                property_name: property_name,
                                splitwise_group_id: String(match.id),
                                matched_at: new Date()
                            }, { onConflict: 'user_id, property_name' });
                        }
                    } catch (matchErr) {
                        console.error("Auto-match failed, but connection saved.", matchErr);
                    }
                }

                // Cleanup request token
                await sb.from("oauth_requests").delete().eq("request_token", oauth_token);

                // Redirect to Frontend
                const appUrl = process.env.APP_URL;
                res.redirect(`${appUrl}/fluxo-caixa?status=connected&property=${encodeURIComponent(property_name || "")}`);
                break;
            }

            // =================================================================================
            // 3. GROUPS - List Groups (Optional usage)
            // GET /api/splitwise/groups?user_id=...
            // =================================================================================
            case 'groups': {
                const user_id = req.query.user_id as string;
                if (!user_id) return sendError(400, "Missing user_id");

                const sb = supabaseServer();
                const { data: conn } = await sb.from("splitwise_connections").select("*").eq("user_id", user_id).single();

                if (!conn) return sendError(401, "No Splitwise connection found");

                const groupsData = await splitwiseGet<{ groups: any[] }>('/get_groups', conn.access_token, conn.access_token_secret);
                res.status(200).json(groupsData);
                break;
            }

            // =================================================================================
            // 4. EXPENSES - Get Expenses (Sync)
            // GET /api/splitwise/expenses?user_id=...&property=...
            // =================================================================================
            case 'expenses': {
                const { user_id, property } = req.query;
                if (!user_id || !property) return sendError(400, "Missing params");

                const sb = supabaseServer();

                // Find Linked Group
                const { data: links } = await sb
                    .from("property_splitwise_links")
                    .select("splitwise_group_id")
                    .eq("user_id", user_id)
                    .eq("property_name", property)
                    .single();

                if (!links) return sendError(404, "Property not linked to any Splitwise group");

                // Get Connection
                const { data: conn } = await sb.from("splitwise_connections").select("*").eq("user_id", user_id).single();
                if (!conn) return sendError(401, "Not connected");

                // Fetch Expenses
                // ?limit=0 means all (or default page size, typically 20-50, limit=0 to allow max or paging)
                const expensesData = await splitwiseGet<{ expenses: any[] }>(`/get_expenses?group_id=${links.splitwise_group_id}&limit=50`, conn.access_token, conn.access_token_secret);

                res.status(200).json({
                    group_id: links.splitwise_group_id,
                    expenses: expensesData.expenses || []
                });
                break;
            }

            default:
                res.status(404).json({ error: "Unknown action", action });
        }
    } catch (err: any) {
        sendError(500, "Internal Server Error", err.message);
    }
}
