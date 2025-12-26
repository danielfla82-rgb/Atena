
import { createClient } from '@supabase/supabase-js';

// URL do Projeto fornecida
const supabaseUrl = 'https://zqfxapcwbutzytdkdtzl.supabase.co';

// ATENÇÃO: Use a ANON KEY (Pública) aqui. 
// A chave que você forneceu no prompt (sb_secret_...) é perigosa para o frontend.
// Estou colocando uma string placeholder. Por favor, substitua pela ANON KEY do painel do Supabase.
const supabaseAnonKey = 'SUA_CHAVE_ANON_PUBLICA_AQUI'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
