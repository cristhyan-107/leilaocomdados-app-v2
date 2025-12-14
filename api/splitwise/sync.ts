// api/splitwise/auth.ts, callback.ts, sync.ts
// O caminho mais longo, forçando a extensão de módulo Node.js
import type { VercelRequest, VercelResponse } from '../../../types.js';
import { getRequestToken } from '../../../lib/splitwise.js';
import { supabaseServer } from '../../../lib/supabase.js';
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const property = req.query?.property as string;
    const userId = req.query?.userId as string;

    if (!property || !userId) {
        res.statusCode = 400;
        return res.json({ error: 'Missing property or userId' });
    }

    try {
        const sb = supabaseServer();

        // Find Linked Group
        const { data: links } = await sb
            .from("property_splitwise_links")
            .select("splitwise_group_id")
            .eq("user_id", userId)
            .eq("property_name", property)
            .single();

        if (!links) {
            res.statusCode = 404;
            return res.json({ error: 'Property not linked to any Splitwise group' });
        }

        // Get Connection
        const { data: conn } = await sb
            .from("splitwise_connections")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (!conn) {
            res.statusCode = 401;
            return res.json({ error: 'User not connected to Splitwise' });
        }

        // Fetch Expenses
        const expensesData = await getExpenses(conn.access_token, conn.access_token_secret, links.splitwise_group_id);
        const expensesList = expensesData.expenses || [];

        res.statusCode = 200;
        res.json({
            group_id: links.splitwise_group_id,
            expenses: expensesList
        });

    } catch (error: any) {
        console.error('Sync Error:', error);
        res.statusCode = 500;
        res.json({ error: 'Failed to sync expenses', details: error.message });
    }
}
