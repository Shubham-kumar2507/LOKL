"use client";

import { useState, useEffect, useCallback } from "react";

export interface Session {
  uuid: string;
  alias: string;
  token: string;
}

interface UseSessionReturn {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = "lokl_token";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mintSession = useCallback(async (): Promise<Session> => {
    const res = await fetch(`${API_URL}/api/auth/session`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error("Failed to mint session");
    }

    const data: Session = await res.json();
    localStorage.setItem(STORAGE_KEY, data.token);
    return data;
  }, []);

  const verifyToken = useCallback(
    async (token: string): Promise<Session | null> => {
      try {
        const res = await fetch(`${API_URL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // Token expired or invalid — clear it
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }

        const data = await res.json();
        return { uuid: data.uuid, alias: data.alias, token };
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const storedToken = localStorage.getItem(STORAGE_KEY);

        if (storedToken) {
          // Step 2: Verify existing token
          const verified = await verifyToken(storedToken);
          if (!cancelled && verified) {
            setSession(verified);
            setIsLoading(false);
            return;
          }
        }

        // Step 3: No token or invalid — mint a new session
        if (!cancelled) {
          const newSession = await mintSession();
          if (!cancelled) {
            setSession(newSession);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Session error");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [mintSession, verifyToken]);

  return { session, isLoading, error };
}
