import { createClient } from '@supabase/supabase-js';

// URL do Projeto
const defaultUrl = 'https://zqfxapcwbutzytdkdtzl.supabase.co';
let supabaseUrl = defaultUrl;

// CHAVE DE API (ANON KEY) - Fallback
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZnhhcGN3YnV0enl0ZGtkdHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NjM2OTIsImV4cCI6MjA4MjMzOTY5Mn0.SK_47L2UD7k9zqcNkP4T0WrFZbaPBv7BcmERHG8EAR0';
let supabaseAnonKey = defaultKey;

let isUsingEnv = false;

try {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
     // @ts-ignore
     const envUrl = import.meta.env.VITE_SUPABASE_URL;
     // @ts-ignore
     const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
     
     if (envUrl && typeof envUrl === 'string') {
       supabaseUrl = envUrl;
       isUsingEnv = true;
     }
     if (envKey && typeof envKey === 'string') {
       supabaseAnonKey = envKey;
     }
  }
} catch (e) {
  console.warn("Supabase env check failed, using fallback.");
}

export const isUsingFallback = !isUsingEnv;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);