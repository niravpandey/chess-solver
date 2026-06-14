import { useCallback, useEffect } from "react";

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: () => Promise<void>;
    };
  }
}

export function useMathJax(dependencies: unknown[] = []) {
  const typeset = useCallback(() => {
    window.MathJax?.typesetPromise?.().catch((error) => {
      console.error("MathJax typeset failed", error);
    });
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(typeset, 0);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeset, ...dependencies]);

  return typeset;
}
