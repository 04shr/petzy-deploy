import { useState, useEffect, useCallback, useMemo } from "react";
import bcrypt from "bcryptjs";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";

/* =========================
   KEYWORD: UTILITIES
   Functionality: small helpers used by auth + hooks
   Change point: alter normalization or salt rounds
   ========================= */
const normalize = (username) => (username || "").trim().toLowerCase();
const SALT_ROUNDS = 10;

/* =========================
   KEYWORD: AUTH HELPERS - CHECK / CREATE / VERIFY
   Functionality: Firestore-backed user existence, creation (bcrypt), and verification
   Change point: swap storage, change hashing, or expose more metadata
   ========================= */
export const checkIfUserExists = async (username) => {
  const id = normalize(username);
  if (!id) return false;
  try {
    const snap = await getDoc(doc(db, "users", id));
    return snap.exists();
  } catch (err) {
    console.error("checkIfUserExists error:", err);
    throw err;
  }
};

export const createUser = async ({ username, petName, secretKey, extra = {} }) => {
  const id = normalize(username);
  if (!id) return { ok: false, reason: "username_required" };

  try {
    const hashed = await bcrypt.hash(secretKey, SALT_ROUNDS);

    const userDoc = {
      username: username.trim(),
      username_lc: id,
      petName: (petName || "").trim(),
      secretKeyHash: hashed,
      createdAt: new Date().toISOString(),
      preferences: {
        dailyLog: { feed: 0, play: 0, groom: 0, rest: 0, interact: 0 },
        dailyHistory: {},
        stats: { hunger: 0, happiness: 0, energy: 100, love: 0, xp: 0, streakPercent: 0 },
        meshes: [],
        currentScene: null,
        currentModel: null,
        selectedPet: null,
      },
      ...extra,
    };

    await setDoc(doc(db, "users", id), userDoc);
    const safe = { ...userDoc };
    delete safe.secretKeyHash;
    return { ok: true, data: safe };
  } catch (err) {
    console.error("createUser error:", err);
    return { ok: false, reason: err.message || "failed_to_create" };
  }
};

export const verifyUser = async (username, secretKey) => {
  const id = normalize(username);
  if (!id) return { ok: false, reason: "username_required" };

  try {
    const snap = await getDoc(doc(db, "users", id));
    if (!snap.exists()) return { ok: false, reason: "not_found" };

    const data = snap.data();
    const hash = data?.secretKeyHash;
    if (!hash) return { ok: false, reason: "no_password_stored" };

    const match = await bcrypt.compare(secretKey, hash);
    if (match) {
      const safe = { ...data };
      delete safe.secretKeyHash;
      return { ok: true, data: safe };
    } else {
      return { ok: false, reason: "wrong_password" };
    }
  } catch (err) {
    console.error("verifyUser error:", err);
    return { ok: false, reason: err.message || "verification_error" };
  }
};

/* =========================
   KEYWORD: INTERACTION COUNTER
   Functionality: increment ephemeral 'interact' counter in local prefs (UI feedback)
   Change point: record richer metadata or route through incrementDailyAction
   ========================= */
export const recordInteraction = (preferences, updatePreferences, action = "Interacted 💬") => {
  // Use updatePreferences with increment operation to avoid read-modify-write
  // Consumers using the hook can call guardedUpdate if they want dedupe behaviour.
  updatePreferences({
    dailyLog: { interact: { __op: "inc", n: 1 } },
    lastAction: action,
    lastActionAt: new Date().toISOString(),
  }).catch((e) => {
    console.warn("recordInteraction:updatePreferences failed:", e);
  });
};

/* =========================
   KEYWORD: usePreferences HOOK
   Functionality: realtime listener for current user's prefs + updater function
   Change point: alter storage schema, subscription behavior, or returned shape
   ========================= */
export default function usePreferences() {
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // safe user info (no secret)

  /* =========================
     KEYWORD: USERNAME SOURCE
     Functionality: reads current username from localStorage (single source of truth)
     Change point: change key or derive from auth provider
     ========================= */
  const readUsername = () => {
    try {
      const u = localStorage.getItem("petzy_current_username");
      return u ? String(u).trim().toLowerCase() : null;
    } catch (err) {
      console.warn("localStorage read failed:", err);
      return null;
    }
  };

  // Memoize username and doc ref for stable dependencies
  const username = useMemo(() => readUsername(), []);
  const userDocRef = useMemo(() => (username ? doc(db, "users", username) : null), [username]);

  /* =========================
     KEYWORD: REALTIME PREFERENCES LISTENER
     Functionality: subscribes to user's Firestore doc and syncs preferences & safe user info
     Change point: modify fields copied into local state or error handling
     ========================= */
  useEffect(() => {
    if (!userDocRef) {
      setPreferences({});
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const safeUser = { ...(data || {}) };
          if (safeUser.secretKeyHash) delete safeUser.secretKeyHash;

          // Update local state
          setUser({
            username: safeUser.username || username,
            petName: safeUser.petName || safeUser.preferences?.petName || null,
          });
          const prefs = data.preferences || {};
          setPreferences(prefs);

          // Persist currentModel locally for immediate rehydration on other pages / refreshes
          try {
            if (prefs && prefs.currentModel) {
              sessionStorage.setItem("petzy_selected_model", JSON.stringify(prefs.currentModel));
              localStorage.setItem("petzy_selected_model_backup", JSON.stringify(prefs.currentModel));
            } else if (prefs && prefs.selectedPet) {
              // if only id provided, attempt to store minimal object (id only)
              sessionStorage.setItem("petzy_selected_model", JSON.stringify({ id: prefs.selectedPet }));
            }
          } catch (err) {
            // don't break app for storage errors
            console.warn("Failed to persist currentModel to sessionStorage:", err);
          }
        } else {
          setPreferences({});
          setUser(null);
        }

        setLoading(false);
      },
      (err) => {
        console.error("Realtime preferences listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userDocRef, username]);

  /**
   * =========================
   * KEYWORD: updatePreferences
   * Functionality: merge top-level keys into preferences and persist to Firestore
   * Change point: alter merge strategy, batching, or conflict resolution
   *
   * Notes:
   * - This function accepts a mixed shape. If you need to perform an atomic increment,
   *   pass nested objects with { __op: 'inc', n: <number> } at the deepest level,
   *   e.g. { dailyLog: { feed: { __op: 'inc', n: 1 } } }
   * - It intentionally does NOT perform an optimistic setPreferences to avoid double UI updates.
   * =========================
   */
  const updatePreferences = useCallback(
    async (newPrefs = {}) => {
      if (!userDocRef) {
        console.warn("updatePreferences: no user logged in");
        return { ok: false, reason: "no_user" };
      }

      try {
        // Build dotted payload for updateDoc, supporting nested __op: 'inc'
        const payload = {};

        Object.keys(newPrefs).forEach((key) => {
          const value = newPrefs[key];

          // If value is an object, check its nested keys for __op instructions
          if (value && typeof value === "object" && !Array.isArray(value)) {
            const nestedKeys = Object.keys(value);
            const hasNestedInc = nestedKeys.some(
              (nk) =>
                value[nk] &&
                typeof value[nk] === "object" &&
                !Array.isArray(value[nk]) &&
                value[nk].__op === "inc"
            );

            if (hasNestedInc) {
              nestedKeys.forEach((nestedKey) => {
                const nestedVal = value[nestedKey];
                if (nestedVal && nestedVal.__op === "inc") {
                  payload[`preferences.${key}.${nestedKey}`] = increment(nestedVal.n || 1);
                } else {
                  payload[`preferences.${key}.${nestedKey}`] = nestedVal;
                }
              });
              return; // continue outer foreach
            }
          }

          // Default simple assignment
          payload[`preferences.${key}`] = value;
        });

        // Update if exists, otherwise create minimal doc
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          await updateDoc(userDocRef, payload);
        } else {
          await setDoc(userDocRef, { username, username_lc: username, preferences: newPrefs }, { merge: true });
        }

        return { ok: true };
      } catch (err) {
        console.error("updatePreferences error:", err);
        return { ok: false, reason: err.message || "failed_to_update" };
      }
    },
    [userDocRef, username]
  );

  // client-side guard to prevent duplicate actions within a short time window
  const CLIENT_ACTION_GUARD = useMemo(() => new Map(), []);
  const clientActionGuard = useCallback((key, ms = 700) => {
    const now = Date.now();
    const last = CLIENT_ACTION_GUARD.get(key) || 0;
    if (now - last < ms) return false;
    CLIENT_ACTION_GUARD.set(key, now);
    setTimeout(() => CLIENT_ACTION_GUARD.delete(key), ms + 50);
    return true;
  }, [CLIENT_ACTION_GUARD]);

  // guardedUpdate: wrapper that prevents duplicate client-side writes for the same action key
  const guardedUpdate = useCallback(
    async (actionKey, newPrefs = {}, guardMs = 700) => {
      if (!clientActionGuard(actionKey, guardMs)) {
        return { ok: false, reason: "duplicate_ignored" };
      }
      return await updatePreferences(newPrefs);
    },
    [clientActionGuard, updatePreferences]
  );

  return [preferences || {}, updatePreferences, { loading, user, guardedUpdate }];
}
