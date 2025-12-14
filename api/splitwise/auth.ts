// api/splitwise/auth.ts, callback.ts, sync.ts
// O caminho mais longo, forçando a extensão de módulo Node.js
import type { VercelRequest, VercelResponse } from '../../../types.js';
import { getRequestToken } from '../../../lib/splitwise.js';
import { supabaseServer } from '../../../lib/supabase.js';

// Lógica para lidar com a solicitação GET para iniciar o OAuth do Splitwise
export default async (req: VercelRequest, res: VercelResponse) => {
    // 1. Inicializa o cliente Supabase para extrair o ID do usuário (modo autenticado)
    const supabase = supabaseServer(req);

    // 2. Tenta obter a sessão do usuário via JWT
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Se o usuário não estiver logado, retorna um erro ou redireciona
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const userId = user.id;

        // 3. Obtém o Request Token do Splitwise
        const { oauthToken, oauthTokenSecret, oauthAuthorizeUrl } = await getRequestToken();

        // 4. Inicializa o cliente Supabase (modo Admin) para salvar o segredo
        const supabaseAdmin = supabaseServer(); 

        // 5. Salva o Request Token e o Segredo na tabela temporária, vinculado ao userId
        // (Usamos o modo Admin para poder escrever na tabela `oauth_temp_secrets`)
        const { error: insertError } = await supabaseAdmin
            .from('oauth_temp_secrets')
            .insert({
                user_id: userId,
                oauth_token: oauthToken,
                oauth_token_secret: oauthTokenSecret,
            });

        if (insertError) {
            console.error('Error saving temp secrets:', insertError);
            return res.status(500).json({ error: 'Failed to save temporary secrets to DB.' });
        }

        // 6. Redireciona o usuário para o Splitwise para autorização
        res.redirect(oauthAuthorizeUrl);

    } catch (error) {
        console.error('Splitwise Auth Error:', error);
        res.status(500).json({ error: 'Failed to initiate Splitwise authentication process.' });
    }
};