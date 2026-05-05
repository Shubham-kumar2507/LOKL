import nodemailer from "nodemailer";

const REQUIRE_EMAIL_VERIFICATION =
  process.env.REQUIRE_EMAIL_VERIFICATION === "true";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Generate a 6-digit numeric OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send verification email with OTP
 */
export async function sendVerificationEmail(
  to: string,
  otp: string
): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@lokl.app";

  await transporter.sendMail({
    from: `"LOKL" <${from}>`,
    to,
    subject: "Verify your LOKL account",
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0a0a0f; color: #e2eaf8; border-radius: 16px;">
        <h1 style="font-size: 24px; color: #fff; margin-bottom: 8px;">Verify your email</h1>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 28px;">Enter this code to complete your LOKL registration:</p>
        <div style="background: linear-gradient(135deg, rgba(0,212,255,0.1), rgba(124,58,237,0.1)); border: 1px solid rgba(0,212,255,0.2); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #00d4ff;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Check if email verification is required
 */
export function isVerificationRequired(): boolean {
  return REQUIRE_EMAIL_VERIFICATION;
}
