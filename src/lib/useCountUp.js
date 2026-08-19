import { useEffect, useState, useRef } from "react";

// Number ko 0 se target tak smoothly animate karta hai (stat cards ke liye premium feel)
export function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    const end = Number(target) || 0;
    const startTime = performance.now();

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    const frame = requestAnimationFrame(tick);
    prevTarget.current = end;
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
