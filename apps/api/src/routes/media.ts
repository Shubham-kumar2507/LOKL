import { Router, Request, Response, IRouter } from "express";
import sharp from "sharp";
import crypto from "crypto";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REQUESTS" },
});

// ── POST /api/media/upload ────────────────────────────
// Accepts raw image body, strips ALL EXIF (including GPS), returns cleaned buffer.
// In production, this would upload to S3/R2 and return a presigned URL.
router.post(
  "/upload",
  uploadLimiter,
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const contentType = req.headers["content-type"] || "";

      // Validate MIME type
      const mimeType = contentType.split(";")[0].trim();
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        res.status(400).json({
          error: "INVALID_FILE_TYPE",
          allowed: ALLOWED_MIME_TYPES,
        });
        return;
      }

      // Collect raw body
      const chunks: Buffer[] = [];
      let totalSize = 0;

      for await (const chunk of req) {
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
          res.status(413).json({ error: "FILE_TOO_LARGE", maxBytes: MAX_FILE_SIZE });
          return;
        }
        chunks.push(chunk);
      }

      const rawBuffer = Buffer.concat(chunks);

      if (rawBuffer.length === 0) {
        res.status(400).json({ error: "EMPTY_FILE" });
        return;
      }

      // ── CRITICAL: Strip ALL EXIF data including GPS coordinates ──
      // sharp's .rotate() re-encodes the image from scratch,
      // automatically stripping all metadata including:
      //   - GPS coordinates
      //   - Camera make/model
      //   - Timestamps
      //   - Thumbnails
      const cleanBuffer = await sharp(rawBuffer).rotate().toBuffer();

      // Generate a random key for storage
      const fileKey = `${crypto.randomUUID()}.webp`;

      // In production: upload cleanBuffer to S3/R2
      // const uploadResult = await s3.upload({ Key: fileKey, Body: cleanBuffer, ... })
      // For now, return metadata confirming EXIF was stripped

      res.status(200).json({
        url: `/media/${fileKey}`,
        size: cleanBuffer.length,
        originalSize: rawBuffer.length,
        exifStripped: true,
      });
    } catch (err) {
      console.error("Media upload error:", (err as Error).message);
      res.status(500).json({ error: "UPLOAD_FAILED" });
    }
  }
);

export default router;
