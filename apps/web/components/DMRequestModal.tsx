"use client";

import { useEffect, useState } from "react";
import { DMRequest } from "@/hooks/useDM";

interface DMRequestModalProps {
  request: DMRequest;
  onAccept: () => void;
  onReject: () => void;
}

export default function DMRequestModal({
  request,
  onAccept,
  onReject,
}: DMRequestModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(60);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onReject(); // Auto-dismiss on expiry
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = (secondsLeft / 60) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm mx-4 rounded-2xl bg-[#13131f] border border-[#2a2a3e] shadow-2xl shadow-violet-500/5 overflow-hidden">
        {/* Countdown progress bar */}
        <div className="absolute top-0 left-0 h-[3px] bg-violet-500/30 w-full">
          <div
            className="h-full bg-violet-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6 pt-8">
          {/* Lock icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-center text-lg font-semibold text-gray-100 mb-1">
            Private Message Request
          </h2>
          <p className="text-center text-sm text-gray-400 mb-6">
            <span className="font-semibold text-violet-400">
              {request.fromAlias}
            </span>{" "}
            wants to chat privately
          </p>

          {/* Info */}
          <div className="flex items-center gap-2 bg-[#0f0f1a] rounded-lg px-3 py-2 mb-6 border border-[#1e1e2e]">
            <svg
              className="w-4 h-4 text-emerald-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            <span className="text-xs text-gray-400">
              Messages will be end-to-end encrypted
            </span>
          </div>

          {/* Timer */}
          <p className="text-center text-xs text-gray-500 mb-4">
            Expires in{" "}
            <span className="text-gray-300 font-mono">{secondsLeft}s</span>
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onReject}
              className="flex-1 py-2.5 rounded-xl bg-[#1a1a28] border border-[#2a2a3e] text-sm font-medium text-gray-400 hover:text-white hover:border-gray-600 transition-all duration-200 active:scale-[0.97]"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium text-white transition-all duration-200 active:scale-[0.97] shadow-lg shadow-violet-600/20"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
