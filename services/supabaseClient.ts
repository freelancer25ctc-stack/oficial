
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string, fallback: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[`VITE_${key}`]) {
      // @ts-ignore
      return import.meta.env[`VITE_${key}`];
    }
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    console.warn(`Error accessing env for ${key}:`, e);
  }
  return fallback;
};

const supabaseUrl = getEnv('SUPABASE_URL', 'https://qbvelfdpaccdfrnidunk.supabase.co');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFidmVsZmRwYWNjZGZybmlkdW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNTY1NTEsImV4cCI6MjA4MDkzMjU1MX0.tMTFMwju_Yz35q4535-bROufIY0-P88deQOKZK1bPbQ');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Disable LockManager to prevent timeouts in iframe environments
    // @ts-ignore - lock is supported by GoTrue to override the default LockManager
    lock: (...args: any[]) => {
      const callback = args.find(arg => typeof arg === 'function');
      if (callback) return callback();
      return Promise.resolve();
    }
  }
});
