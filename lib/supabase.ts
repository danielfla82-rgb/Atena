import { createClient } from '@supabase/supabase-js';

// URL do Projeto (Demo / Fallback)
const defaultUrl = 'https://zqfxapcwbutzytdkdtzl.supabase.co';
// CHAVE DE API (ANON KEY) - Fallback
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZnhhcGN3YnV0enl0ZGtkdHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NjM2OTIsImV4cCI6MjA4MjMzOTY5Mn0.SK_47L2UD7k9zqcNkP4T0WrFZbaPBv7BcmERHG8EAR0';

let finalUrl = defaultUrl;
let finalKey = defaultKey;

try {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
     // @ts-ignore
     const envUrl = import.meta.env.VITE_SUPABASE_URL;
     // @ts-ignore
     const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
     
     // Only overwrite if it's a valid non-empty string and looks like a URL
     if (envUrl && typeof envUrl === 'string' && envUrl.includes('https://')) {
       finalUrl = envUrl;
     }
     if (envKey && typeof envKey === 'string' && envKey.length > 20) {
       finalKey = envKey;
     }
  }
} catch (e) {
  console.warn("Supabase env check failed, using fallback.", e);
}

// Safety check: ensure URL is absolutely valid before creating client
// If something went wrong with env vars resulting in empty string, revert to default
if (!finalUrl || finalUrl.trim() === '') finalUrl = defaultUrl;
if (!finalKey || finalKey.trim() === '') finalKey = defaultKey;

export const isUsingFallback = finalUrl === defaultUrl;
export const projectUrl = finalUrl; 

export const supabase = createClient(finalUrl, finalKey);