import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { uuid: string; alias: string };
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret"
    ) as { uuid: string; alias: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "UNAUTHORIZED" });
  }
}
