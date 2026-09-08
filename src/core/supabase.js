// Supabase client + authentication.
//
// This file is deliberately thin. It knows how to create the client, send a
// magic link, and report who is signed in. It knows nothing about training
// data — that is sync.js.
//
// The app must work with no account and no signal. Every function here is
// safe to call when Supabase is not configured: it returns null or false
// rather than throwing, and the app carries on in local-only mode.

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, STORAGE_PREFIX } from "../config.jsx";

let client = null;

/**
 * The shared client, or null if this build has no Supabase settings.
 * Null is a normal state, not an error — it means "local-only mode".
 */
export function getClient() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
  if (client) return client;

  client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,      // survive closing the app
      autoRefreshToken: true,    // hourly token renewal, invisible to the user
      detectSessionInUrl: true,  // pick up the magic link when it lands

      // IMPORTANT. All three apps live on username.github.io, and localStorage
      // is scoped per ORIGIN, not per path — the same reason STORAGE_PREFIX
      // exists. Without a per-app key here, signing into one app would sign
      // the same browser into all three, as whoever logged in last.
      storageKey: `${STORAGE_PREFIX}auth`,
    },
  });
  return client;
}

/** Is this build wired to Supabase at all? */
export function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

/**
 * Where the magic link should return to. Uses the page the user is actually
 * on, so it works for all three apps and on a phone's installed PWA without
 * anything hard-coded.
 */
function redirectTarget() {
  if (typeof window === "undefined") return undefined;
  return window.location.origin + window.location.pathname;
}

/**
 * Send a sign-in link. Resolves to { ok, error } — never throws, because a
 * typo or a dead network must not take the app down.
 */
export async function sendMagicLink(email) {
  const c = getClient();
  if (!c) return { ok: false, error: "This app is not connected to an account service." };

  const address = (email || "").trim();
  if (!address || !address.includes("@")) {
    return { ok: false, error: "That does not look like an email address." };
  }

  try {
    const { error } = await c.auth.signInWithOtp({
      email: address,
      options: {
        emailRedirectTo: redirectTarget(),
        // No silent account creation. An unknown address gets an error rather
        // than a new empty account, so a typo cannot strand someone in a
        // blank app wondering where their history went.
        shouldCreateUser: false,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}

/** The signed-in user, or null. Never throws. */
export async function currentUser() {
  const c = getClient();
  if (!c) return null;
  try {
    const { data } = await c.auth.getSession();
    return data?.session?.user || null;
  } catch (e) {
    return null;
  }
}

/**
 * Watch for sign-in and sign-out. Returns an unsubscribe function.
 * Fires on: signing in, signing out, and each silent token refresh.
 */
export function onAuthChange(handler) {
  const c = getClient();
  if (!c) return () => {};
  try {
    const { data } = c.auth.onAuthStateChange((_event, session) => {
      handler(session?.user || null);
    });
    return () => data?.subscription?.unsubscribe?.();
  } catch (e) {
    return () => {};
  }
}

/** Sign out on this device only. Local training data is NOT touched. */
export async function signOut() {
  const c = getClient();
  if (!c) return;
  try {
    await c.auth.signOut({ scope: "local" });
  } catch (e) {
    /* already gone, or offline — nothing to do */
  }
}
