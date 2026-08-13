import { createContext, useContext, useState, useEffect } from "react";
import { supabase, supabaseSignUp, supabaseSignIn, supabaseSignOut } from "../lib/supabaseClient";

const AuthContext = createContext(null);

const cap = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : str);

function buildUser(supabaseUser) {
  const meta = supabaseUser.user_metadata || {};
  return {
    id:            supabaseUser.id,
    email:         supabaseUser.email,
    username:      meta.username || supabaseUser.email,
    preferredName: cap(meta.preferred_name || meta.username || supabaseUser.email?.split("@")[0]),
  };
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount + listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? buildUser(session.user) : null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? buildUser(session.user) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, username, preferredName) => {
    const { error } = await supabaseSignUp(email, password, username, preferredName);
    if (error) return { error };
    return { error: null };
  };

  const signIn = async (email, password) => {
    const { error } = await supabaseSignIn(email, password);
    if (error) return { error };
    return { error: null };
  };

  const signOut = async () => {
    await supabaseSignOut();
  };

  const updatePreferredName = async (preferredName) => {
    const pref = cap(preferredName?.trim());
    await supabase.auth.updateUser({ data: { preferred_name: pref } });
    setUser((prev) => (prev ? { ...prev, preferredName: pref } : prev));
  };

  const updateUsername = (username) =>
    setUser((prev) => (prev ? { ...prev, username } : prev));

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, signUp, signIn, signOut, updateUsername, updatePreferredName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
