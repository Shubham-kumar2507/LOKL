import { Router, Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { generateAlias } from "../utils/aliasGenerator";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// ── POST /api/auth/session ────────────────────────────
// Mints a new anonymous session. No database writes. Ever.
router.post("/session", (_req: Request, res: Response) => {
  const uuid = crypto.randomUUID();
  const alias = generateAlias();

  const token = jwt.sign({ uuid, alias, role: "anon" }, JWT_SECRET, {
    expiresIn: "24h",
  });

  res.json({ uuid, alias, token });
});

// ── GET /api/auth/verify ──────────────────────────────
// Checks if a stored token is still valid
router.get("/verify", authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ valid: true, uuid: req.user!.uuid, alias: req.user!.alias });
});

export default router;
