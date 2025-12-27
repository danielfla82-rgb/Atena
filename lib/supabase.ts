import { createClient } from '@supabase/supabase-js';

// URL do Projeto (Demo / Fallback)
const defaultUrl = 'https://zqfxapcwbutzytdkdtzl.supabase.co';
let supabaseUrl = defaultUrl;

// CHAVE DE API (ANON KEY) - Fallback
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZnhhcGN3YnV0enl0ZGtkdHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NjM2OTIsImV4cCI6MjA4MjMzOTY5Mn0.SK_47L2UD7k9zqcNkP4T0WrFZbaPBv7BcmERHG8EAR0';
let supabaseAnonKey = defaultKey;

try {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
     // @ts-ignore
     const envUrl = import.meta.env.VITE_SUPABASE_URL;
     // @ts-ignore
     const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
     
     if (envUrl && typeof envUrl === 'string' && envUrl.length > 0) {
       supabaseUrl = envUrl;
     }
     if (envKey && typeof envKey === 'string' && envKey.length > 0) {
       supabaseAnonKey = envKey;
     }
  }
} catch (e) {
  console.warn("Supabase env check failed, using fallback.");
}

// A detecção agora verifica se a URL mudou em relação ao padrão.
// Se mudou, assumimos que o usuário configurou o ambiente corretamente.
export const isUsingFallback = supabaseUrl === defaultUrl;
export const projectUrl = supabaseUrl; // Export para debug visual
export const supabase = createClient(supabaseUrl, supabaseAnonKey);