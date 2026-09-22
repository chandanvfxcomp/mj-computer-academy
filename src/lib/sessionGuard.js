// Supabase ka login-cookie 400 din tak persist rehta hai (library ka fixed default hai, badla nahi ja sakta).
// Isliye hum sessionStorage use karte hain — jo tab band hote hi khali ho jaata hai — taaki
// "tab band karke wapas kholne par bina password ke login ho jaana" na ho.

const FLAG_KEY = "mj_session_active";

export function markSessionActive() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(FLAG_KEY, "1");
  }
}

export function isSessionActiveFlagSet() {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(FLAG_KEY) === "1";
}

export function clearSessionActiveFlag() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(FLAG_KEY);
  }
}

// Browser back/forward (bfcache) se purana authenticated page dikhne se rokta hai —
// jab bhi page bfcache se restore ho, poora reload karwa deta hai taaki fresh auth-check ho
export function guardAgainstBackForwardCache() {
  if (typeof window === "undefined") return;
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      window.location.reload();
    }
  });
}
