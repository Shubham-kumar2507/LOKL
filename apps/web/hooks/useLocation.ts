"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Coords {
  lat: number;
  lng: number;
}

interface UseLocationReturn {
  coords: Coords | null;
  isLoading: boolean;
  error: string | null;
  accuracy: number | null;
}

/**
 * Haversine distance in metres between two lat/lng points.
 */
function haversineMetres(a: Coords, b: Coords): number {
  const R = 6_371_000; // earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLng = Math.sin(dLng / 2);
  const h =
    sinHalfDLat * sinHalfDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinHalfDLng * sinHalfDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const MIN_MOVE_METRES = 200;

export function useLocation(): UseLocationReturn {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const lastCoordsRef = useRef<Coords | null>(null);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    const newCoords: Coords = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };

    const last = lastCoordsRef.current;

    // Only update if we've moved > 200m or this is the first reading
    if (!last || haversineMetres(last, newCoords) > MIN_MOVE_METRES) {
      lastCoordsRef.current = newCoords;
      setCoords(newCoords);
    }

    setAccuracy(pos.coords.accuracy);
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setIsLoading(false);
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError("PERMISSION_DENIED");
        break;
      case err.POSITION_UNAVAILABLE:
        setError("POSITION_UNAVAILABLE");
        break;
      case err.TIMEOUT:
        setError("TIMEOUT");
        break;
      default:
        setError("UNKNOWN_ERROR");
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("GEOLOCATION_NOT_SUPPORTED");
      setIsLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: false,
        maximumAge: 30_000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [handleSuccess, handleError]);

  return { coords, isLoading, error, accuracy };
}
