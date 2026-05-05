"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import RoomList from "@/components/RoomList";
import InitializerModal from "@/components/InitializerModal";

export default function Home() {
  const { session, isLoading, logout } = useSession();
  const router = useRouter();

  // Explicit location sharing initialization state
  const [hasStarted, setHasStarted] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // We wait until the initial loading is complete to redirect
  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/login");
    }
  }, [isLoading, session, router]);

  // Handle manual "Start" action
  const handleStart = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setHasStarted(true);
        },
        (err) => {
          console.error("Location error:", err);
          setError(
            err.code === 1
              ? "Location permission denied. Please enable in your browser."
              : "Failed to get location."
          );
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
      </main>
    );
  }

  // Prevent flashing content if not logged in
  if (!session) return null;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-gray-100 flex flex-col relative font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-600/10 rounded-full blur-[140px] mix-blend-screen" />
      </div>

      <div className="flex-1 w-full max-w-lg mx-auto relative z-10 flex flex-col h-screen overflow-hidden border-x border-[#1e1e2e]/50 bg-[#0a0a0f]/80 backdrop-blur-xl">
        {/* Header */}
        <header className="shrink-0 px-6 py-5 border-b border-[#1e1e2e]/80 flex justify-between items-center bg-[#0a0a0f]/90 backdrop-blur-md sticky top-0 z-20">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
              LOKL
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
              </div>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-gray-400 flex items-center gap-1.5 bg-[#111119] px-3 py-1.5 rounded-full border border-[#2a2a3e]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {session.username}
            </span>
            <button 
              onClick={logout}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {!hasStarted && !coords ? (
            <div className="absolute inset-0 p-6 flex flex-col justify-center animate-fade-in">
              <InitializerModal onStart={handleStart} error={error} />
            </div>
          ) : coords ? (
            <div className="absolute inset-0 flex flex-col h-full animate-fade-up border-t border-[#1e1e2e]/50 mt-[-1px]">
              <RoomList coords={coords} token={session.token} />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
