"use client";

import React from "react";

interface InitializerModalProps {
  onStart: () => void;
  error: string | null;
}

export default function InitializerModal({
  onStart,
  error,
}: InitializerModalProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 text-center px-6">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          LOKL
        </h1>
        <p className="text-sm text-gray-400 max-w-xs">
          Connect locally with people around you
        </p>
      </div>

      <div className="relative w-32 h-32 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-full blur-xl" />
        <div className="relative w-24 h-24 rounded-full border-2 border-violet-500/50 border-t-violet-500 animate-spin" />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2 max-w-xs">
          {error}
        </div>
      )}

      <button
        onClick={onStart}
        disabled={!!error}
        className={`px-8 py-3 rounded-lg font-semibold transition-all ${
          error
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:shadow-lg hover:shadow-violet-500/50 active:scale-95"
        }`}
      >
        {error ? "Permission Required" : "Share Location"}
      </button>

      <p className="text-xs text-gray-500 max-w-xs">
        We need your location to show nearby rooms. Your location is never stored on our servers.
      </p>
    </div>
  );
}
