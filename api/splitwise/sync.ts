import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getExpenses } from '../../lib/splitwise';
import { supabaseServer } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { property, userId } = req.query;

    if (!property || !userId) {
        return res.status(400).json({ error: 'Missing property or userId' });
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
            return res.status(404).json({ error: 'Property not linked to any Splitwise group' });
        }

        // Get Connection
        const { data: conn } = await sb
            .from("splitwise_connections")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (!conn) {
            return res.status(401).json({ error: 'User not connected to Splitwise' });
        }

        // Fetch Expenses
        const expensesData = await getExpenses(conn.access_token, conn.access_token_secret, links.splitwise_group_id);

        // Ensure expenses is array
        const expensesList = expensesData.expenses || [];

        res.status(200).json({
            group_id: links.splitwise_group_id,
            expenses: expensesList
        });

    } catch (error: any) {
        console.error('Sync Error:', error);
        res.status(500).json({ error: 'Failed to sync expenses', details: error.message });
    }
}
