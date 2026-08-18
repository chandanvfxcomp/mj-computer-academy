import { useEffect, useRef } from "react";

// User X minute tak kuch na kare (click/type/scroll) toh automatically logout kar deta hai
export function useIdleLogout(onIdle, minutes = 15) {
  const timerRef = useRef(null);

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onIdle, minutes * 60 * 1000);
    }

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onIdle, minutes]);
}
