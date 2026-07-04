import { supabase } from "@/integrations/supabase/client";
import { bootstrapUser } from "@/lib/auth.functions";

const LS_CRED_KEY = "quadra-auth-cred-v1";

interface StoredCred {
  email: string;
  password: string;
}

function loadCred(): StoredCred | null {
  try {
    const raw = localStorage.getItem(LS_CRED_KEY);
    return raw ? (JSON.parse(raw) as StoredCred) : null;
  } catch {
    return null;
  }
}

function saveCred(c: StoredCred) {
  localStorage.setItem(LS_CRED_KEY, JSON.stringify(c));
}

function clearCred() {
  localStorage.removeItem(LS_CRED_KEY);
}

function randomCred(): StoredCred {
  const id = crypto.randomUUID();
  return {
    email: `u-${id}@quadra.local`,
    password: crypto.randomUUID() + crypto.randomUUID(),
  };
}

async function clearAuthState() {
  clearCred();
  await supabase.auth.signOut().catch(() => undefined);
}

async function tryStoredCredentialSignIn(cred: StoredCred): Promise<string | null> {
  const { data: signIn, error } = await supabase.auth.signInWithPassword(cred);
  if (!error && signIn.user) return signIn.user.id;
  return null;
}

/** Ensures the current browser has an authenticated Supabase session. */
export async function ensureAuth(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    const { data: userData, error } = await supabase.auth.getUser();
    if (!error && userData.user?.id) return userData.user.id;
    await clearAuthState();
  }

  let cred = loadCred();
  if (cred) {
    const userId = await tryStoredCredentialSignIn(cred);
    if (userId) return userId;
    await clearAuthState();
  }

  // Create a fresh confirmed user via server function, then sign in.
  cred = randomCred();
  await bootstrapUser({ data: cred });
  saveCred(cred);
  const userId = await tryStoredCredentialSignIn(cred);
  if (!userId) {
    await clearAuthState();
    throw new Error("Could not create a new Supabase login session.");
  }
  return userId;
}


/** Upsert profile row from local nickname/avatar. */
export async function syncProfile(nickname: string, avatar: string) {
  const userId = await ensureAuth();
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: userId, nickname, avatar_url: avatar },
      { onConflict: "user_id" },
    );
  if (error) console.warn("[syncProfile]", error);
  return userId;
}
