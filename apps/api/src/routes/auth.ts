import { Router, Request, Response, IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import {
  generateOTP,
  sendVerificationEmail,
  isVerificationRequired,
} from "../services/emailService";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// ── POST /api/auth/signup ─────────────────────────────
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      res.status(400).json({ error: "MISSING_FIELDS" });
      return;
    }

    if (username.length < 3 || username.length > 20) {
      res.status(400).json({ error: "INVALID_USERNAME" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "WEAK_PASSWORD" });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        res.status(409).json({ error: "EMAIL_EXISTS" });
      } else {
        res.status(409).json({ error: "USERNAME_EXISTS" });
      }
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      username,
      email: email.toLowerCase(),
      passwordHash,
      isVerified: !isVerificationRequired(), // auto-verify if toggle is off
    });

    // If verification required, generate OTP
    if (isVerificationRequired()) {
      const otp = generateOTP();
      user.verificationOTP = otp;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      await user.save();

      // Send verification email (fire-and-forget with error handling)
      try {
        await sendVerificationEmail(email.toLowerCase(), otp);
      } catch (err) {
        console.error("[auth] Failed to send verification email:", (err as Error).message);
      }

      res.status(201).json({
        requiresVerification: true,
        email: email.toLowerCase(),
      });
      return;
    }

    // No verification needed — save and return JWT
    await user.save();

    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      userId: user._id.toString(),
      username: user.username,
      token,
    });
  } catch (err) {
    console.error("[auth] Signup error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ── POST /api/auth/login ──────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "MISSING_FIELDS" });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ error: "INVALID_CREDENTIALS" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: "INVALID_CREDENTIALS" });
      return;
    }

    // Check verification status
    if (isVerificationRequired() && !user.isVerified) {
      res.status(403).json({ error: "EMAIL_NOT_VERIFIED", email: user.email });
      return;
    }

    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      userId: user._id.toString(),
      username: user.username,
      token,
    });
  } catch (err) {
    console.error("[auth] Login error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ── POST /api/auth/verify-email ───────────────────────
router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ error: "MISSING_FIELDS" });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ error: "USER_NOT_FOUND" });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ error: "ALREADY_VERIFIED" });
      return;
    }

    if (user.verificationOTP !== otp) {
      res.status(400).json({ error: "INVALID_OTP" });
      return;
    }

    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      res.status(400).json({ error: "OTP_EXPIRED" });
      return;
    }

    // Mark as verified
    user.isVerified = true;
    user.verificationOTP = null as any;
    user.otpExpiresAt = null as any;
    await user.save();

    // Issue JWT
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      userId: user._id.toString(),
      username: user.username,
      token,
    });
  } catch (err) {
    console.error("[auth] Verify error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ── POST /api/auth/resend-otp ─────────────────────────
router.post("/resend-otp", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "MISSING_FIELDS" });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ error: "USER_NOT_FOUND" });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ error: "ALREADY_VERIFIED" });
      return;
    }

    const otp = generateOTP();
    user.verificationOTP = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendVerificationEmail(email.toLowerCase(), otp);
    } catch (err) {
      console.error("[auth] Failed to resend OTP:", (err as Error).message);
    }

    res.json({ sent: true });
  } catch (err) {
    console.error("[auth] Resend OTP error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// ── GET /api/auth/verify ──────────────────────────────
// Checks if a stored token is still valid
router.get("/verify", authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    valid: true,
    userId: req.user!.userId,
    username: req.user!.username,
  });
});

export default router;
