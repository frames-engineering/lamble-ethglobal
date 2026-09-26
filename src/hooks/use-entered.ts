"use client";

import { useEffect, useState } from "react";

/**
 * False until two animation frames after mount, then true. Waiting for a painted frame makes a CSS
 * entrance started from the flip actually visible: hydration can finish before the first paint, and
 * an animation started at that point loses its opening frames behind the previous or a blank page.
 */
export function useEntered(): boolean {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return entered;
}
