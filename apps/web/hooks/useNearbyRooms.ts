"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const POLL_INTERVAL = 30_000; // 30 seconds

export interface NearbyRoom {
  _id: string;
  alias: string;
  memberCount: number;
  createdAt: string;
}

interface UseNearbyRoomsReturn {
  rooms: NearbyRoom[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useNearbyRooms(coords: {
  lat: number;
  lng: number;
} | null): UseNearbyRoomsReturn {
  const [rooms, setRooms] = useState<NearbyRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRooms = useCallback(async () => {
    if (!coords) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_URL}/api/rooms/nearby?lat=${coords.lat}&lng=${coords.lng}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch rooms");
      }
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch rooms");
    } finally {
      setIsLoading(false);
    }
  }, [coords]);

  // Fetch on mount and when coords change
  useEffect(() => {
    if (!coords) return;

    fetchRooms();

    // Poll every 30 seconds
    intervalRef.current = setInterval(fetchRooms, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [coords, fetchRooms]);

  return { rooms, isLoading, error, refetch: fetchRooms };
}
