
import { createClient } from '@supabase/supabase-js';

// URL do Projeto
const supabaseUrl = 'https://zqfxapcwbutzytdkdtzl.supabase.co';

// CHAVE DE API (ANON KEY)
// Passo 1: Acesse https://supabase.com/dashboard/project/zqfxapcwbutzytdkdtzl/settings/api
// Passo 2: Copie a chave "anon" "public".
// Passo 3: Se estiver rodando localmente, cole abaixo.
// Passo 4: Se estiver no Vercel, adicione como Variável de Ambiente: VITE_SUPABASE_ANON_KEY

// Fix: Use optional chaining (?.) to prevent crash if import.meta.env is undefined
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZnhhcGN3YnV0enl0ZGtkdHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NjM2OTIsImV4cCI6MjA4MjMzOTY5Mn0.SK_47L2UD7k9zqcNkP4T0WrFZbaPBv7BcmERHG8EAR0'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
