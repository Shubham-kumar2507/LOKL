"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/context/SocketContext";
import {
  generateKeyPair,
  encryptMessage,
  decryptMessage,
} from "@/lib/crypto";
import { encodeBase64 } from "tweetnacl-util";

// ── Types ────────────────────────────────────────────────
export interface DMRequest {
  fromAlias: string;
  requestId: string;
}

export interface ActiveDM {
  tempRoomId: string;
  peerAlias: string;
}

export interface DMMessage {
  id: string;
  alias: string;
  text: string;
  at: number;
  isOwn?: boolean;
  failed?: boolean;
}

interface UseDMReturn {
  pendingRequest: DMRequest | null;
  activeDM: ActiveDM | null;
  dmMessages: DMMessage[];
  requestDM: (targetAlias: string, roomId: string) => void;
  acceptDM: () => void;
  rejectDM: () => void;
  sendDM: (text: string) => void;
  closeDM: () => void;
  dmStatus: "idle" | "requesting" | "waiting_keys" | "ready";
  dmError: string | null;
}

let dmMsgCounter = 0;
function nextDmId(): string {
  return `dm_${Date.now()}_${++dmMsgCounter}`;
}

export function useDM(): UseDMReturn {
  const { socket } = useSocket();

  const [pendingRequest, setPendingRequest] = useState<DMRequest | null>(null);
  const [activeDM, setActiveDM] = useState<ActiveDM | null>(null);
  const [dmMessages, setDmMessages] = useState<DMMessage[]>([]);
  const [dmStatus, setDmStatus] = useState<
    "idle" | "requesting" | "waiting_keys" | "ready"
  >("idle");
  const [dmError, setDmError] = useState<string | null>(null);

  // Crypto keys kept in memory ONLY — never persisted
  const mySecretKeyRef = useRef<Uint8Array | null>(null);
  const myPublicKeyRef = useRef<string | null>(null);
  const theirPublicKeyRef = useRef<string | null>(null);

  // Track who we requested a DM with (for labeling the peer)
  const requestedAliasRef = useRef<string | null>(null);

  // ── Send a DM request ───────────────────────────────────
  const requestDM = useCallback(
    (targetAlias: string, roomId: string) => {
      if (!socket) return;
      requestedAliasRef.current = targetAlias;
      setDmStatus("requesting");
      setDmError(null);
      socket.emit("dm:request", { targetAlias, roomId });
    },
    [socket]
  );

  // ── Accept an incoming DM request ───────────────────────
  const acceptDM = useCallback(() => {
    if (!socket || !pendingRequest) return;

    // Generate keypair (in-memory only)
    const kp = generateKeyPair();
    mySecretKeyRef.current = kp.secretKey;
    myPublicKeyRef.current = encodeBase64(kp.publicKey);

    socket.emit("dm:accept", { requestId: pendingRequest.requestId });
    setDmStatus("waiting_keys");
    setPendingRequest(null);
  }, [socket, pendingRequest]);

  // ── Reject an incoming DM request ──────────────────────
  const rejectDM = useCallback(() => {
    if (!socket || !pendingRequest) return;
    socket.emit("dm:reject", { requestId: pendingRequest.requestId });
    setPendingRequest(null);
    setDmStatus("idle");
  }, [socket, pendingRequest]);

  // ── Send a DM message (encrypted) ─────────────────────
  const sendDM = useCallback(
    (text: string) => {
      if (
        !socket ||
        !activeDM ||
        !theirPublicKeyRef.current ||
        !mySecretKeyRef.current
      )
        return;

      const trimmed = text.trim();
      if (!trimmed || trimmed.length > 2000) return;

      try {
        const { nonce, ct } = encryptMessage(
          trimmed,
          theirPublicKeyRef.current,
          mySecretKeyRef.current
        );
        socket.emit("dm:message", {
          tempRoomId: activeDM.tempRoomId,
          nonce,
          ct,
        });

        // Add own message locally (optimistic)
        setDmMessages((prev) => [
          ...prev,
          {
            id: nextDmId(),
            alias: "You",
            text: trimmed,
            at: Date.now(),
            isOwn: true,
          },
        ]);
      } catch {
        setDmError("Failed to encrypt message");
      }
    },
    [socket, activeDM]
  );

  // ── Close a DM session ────────────────────────────────
  const closeDM = useCallback(() => {
    if (socket && activeDM) {
      socket.emit("dm:leave", { tempRoomId: activeDM.tempRoomId });
    }
    // Wipe crypto state
    mySecretKeyRef.current = null;
    myPublicKeyRef.current = null;
    theirPublicKeyRef.current = null;
    requestedAliasRef.current = null;
    setActiveDM(null);
    setDmMessages([]);
    setDmStatus("idle");
    setDmError(null);
  }, [socket, activeDM]);

  // ── Socket event listeners ────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Someone wants to DM us
    const onIncoming = ({
      fromAlias,
      requestId,
    }: {
      fromAlias: string;
      requestId: string;
    }) => {
      setPendingRequest({ fromAlias, requestId });
    };

    // DM room is ready — exchange public keys
    const onReady = ({ tempRoomId }: { tempRoomId: string }) => {
      // If we're the requester, generate keys now
      if (!mySecretKeyRef.current) {
        const kp = generateKeyPair();
        mySecretKeyRef.current = kp.secretKey;
        myPublicKeyRef.current = encodeBase64(kp.publicKey);
      }

      // Determine peer alias
      const peerAlias =
        requestedAliasRef.current ||
        pendingRequest?.fromAlias ||
        "Anonymous";

      setActiveDM({ tempRoomId, peerAlias });
      setDmStatus("waiting_keys");

      // Broadcast our public key to the DM room
      socket.emit("dm:pubkey", {
        tempRoomId,
        pubKey: myPublicKeyRef.current,
      });
    };

    // Received the other party's public key
    const onPubKey = ({
      pubKey,
      alias,
    }: {
      pubKey: string;
      alias: string;
    }) => {
      theirPublicKeyRef.current = pubKey;
      setDmStatus("ready");

      // Update peer alias if we didn't know it
      setActiveDM((prev) =>
        prev ? { ...prev, peerAlias: alias || prev.peerAlias } : prev
      );
    };

    // Incoming encrypted DM message
    const onMessage = ({
      nonce,
      ct,
      at,
    }: {
      nonce: string;
      ct: string;
      at: number;
    }) => {
      if (!theirPublicKeyRef.current || !mySecretKeyRef.current) {
        setDmMessages((prev) => [
          ...prev,
          {
            id: nextDmId(),
            alias: "?",
            text: "[Encrypted message — decryption failed]",
            at,
            failed: true,
          },
        ]);
        return;
      }

      const plaintext = decryptMessage(
        nonce,
        ct,
        theirPublicKeyRef.current,
        mySecretKeyRef.current
      );

      setDmMessages((prev) => [
        ...prev,
        {
          id: nextDmId(),
          alias: activeDM?.peerAlias || "Peer",
          text: plaintext ?? "[Encrypted message — decryption failed]",
          at,
          failed: !plaintext,
        },
      ]);
    };

    // Our DM request was declined
    const onDeclined = () => {
      setDmStatus("idle");
      setDmError("DM request was declined");
      requestedAliasRef.current = null;
      setTimeout(() => setDmError(null), 4000);
    };

    // Our DM request expired
    const onExpired = () => {
      setDmStatus("idle");
      setDmError("DM request expired");
      requestedAliasRef.current = null;
      setTimeout(() => setDmError(null), 4000);
    };

    // Target not found
    const onError = ({ code }: { code: string }) => {
      setDmStatus("idle");
      if (code === "USER_NOT_FOUND") {
        setDmError("User not found in this room");
      } else {
        setDmError("DM error: " + code);
      }
      requestedAliasRef.current = null;
      setTimeout(() => setDmError(null), 4000);
    };

    socket.on("dm:incoming", onIncoming);
    socket.on("dm:ready", onReady);
    socket.on("dm:pubkey", onPubKey);
    socket.on("dm:message", onMessage);
    socket.on("dm:declined", onDeclined);
    socket.on("dm:expired", onExpired);
    socket.on("dm:error", onError);

    return () => {
      socket.off("dm:incoming", onIncoming);
      socket.off("dm:ready", onReady);
      socket.off("dm:pubkey", onPubKey);
      socket.off("dm:message", onMessage);
      socket.off("dm:declined", onDeclined);
      socket.off("dm:expired", onExpired);
      socket.off("dm:error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, activeDM?.peerAlias]);

  return {
    pendingRequest,
    activeDM,
    dmMessages,
    requestDM,
    acceptDM,
    rejectDM,
    sendDM,
    closeDM,
    dmStatus,
    dmError,
  };
}
