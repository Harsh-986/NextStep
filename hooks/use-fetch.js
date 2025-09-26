// /hooks/use-fetch.js
import { useCallback, useState } from "react";

export default function useFetch(fn) {
  const [loading, setLoading] = useState(false);

  const wrapped = useCallback(async (...args) => {
    setLoading(true);
    try {
      const result = await fn(...args); // IMPORTANT: return the value
      return result;
    } catch (err) {
      console.error("useFetch - wrapped fn error:", err);
      throw err; // rethrow so callers can handle it
    } finally {
      setLoading(false);
    }
  }, [fn]);

  return { loading, fn: wrapped };
}
