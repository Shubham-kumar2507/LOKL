"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface Session {
  userId: string;
  username: string;
  token: string;
}

interface UseSessionReturn {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  setSession: (session: Session | null) => void;
  logout: () => void;
}

const STORAGE_KEY = "lokl_token";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useSession(): UseSessionReturn {
  const [session, setSessionState] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const setSession = useCallback((newSession: Session | null) => {
    if (newSession) {
      localStorage.setItem(STORAGE_KEY, newSession.token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setSessionState(newSession);
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    router.push("/login");
  }, [router, setSession]);

  const verifyToken = useCallback(
    async (token: string): Promise<Session | null> => {
      try {
        const res = await fetch(`${API_URL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }

        const data = await res.json();
        return { userId: data.userId, username: data.username, token };
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
          const verified = await verifyToken(storedToken);
          if (!cancelled) {
            setSessionState(verified);
          }
        } else {
          // No token means no session, user must log in
          if (!cancelled) {
            setSessionState(null);
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
  }, [verifyToken]);

  return { session, isLoading, error, setSession, logout };
}
