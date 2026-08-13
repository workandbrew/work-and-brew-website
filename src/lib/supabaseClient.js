// Supabase client — the auth + saved lists backend.
//
// One-time setup:
//   1. npm install   (@supabase/supabase-js is already in package.json)
//   2. create a project at https://supabase.com → Settings → API,
//      copy the URL + anon key into .env (see .env.example)
//   3. run supabase/schema.sql in the Supabase SQL editor to create the tables
//   4. swap the TODO(supabase) spots in src/context/AuthContext.jsx
//      to call the helpers below

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase keys missing — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env"
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

// ---- auth helpers (drop-in replacements for AuthContext's TODOs) ----

export async function supabaseSignUp(email, password, username, preferredName) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { username, preferred_name: preferredName || username } },
  });
}

export async function supabaseSignIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function supabaseSignOut() {
  return supabase.auth.signOut();
}
