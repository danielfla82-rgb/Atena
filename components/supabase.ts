import { createClient } from '@supabase/supabase-js';

// URL do Projeto
const supabaseUrl = 'https://zqfxapcwbutzytdkdtzl.supabase.co';

// Chave fornecida explicitamente pelo usuário para conexão imediata
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZnhhcGN3YnV0enl0ZGtkdHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NjM2OTIsImV4cCI6MjA4MjMzOTY5Mn0.SK_47L2UD7k9zqcNkP4T0WrFZbaPBv7BcmERHG8EAR0";

if (!supabaseAnonKey) {
    console.error("⛔ FATAL: Não foi possível carregar a chave do Supabase.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);