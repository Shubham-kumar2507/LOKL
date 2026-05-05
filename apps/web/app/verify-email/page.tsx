"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import Head from "next/head";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  
  const router = useRouter();
  const { setSession } = useSession();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const handleVerify = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!email || otp.length !== 6) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setSession({
        userId: data.userId,
        username: data.username,
        token: data.token,
      });
      
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendStatus("Sending...");
    setError("");
    
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resend");
      }

      setResendStatus("Code sent!");
      setTimeout(() => setResendStatus(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend");
      setResendStatus("");
    }
  };

  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet" />
      </Head>
      <div style={styleSheet.body}>
        <div style={styleSheet.authWrapper}>
          <div style={styleSheet.card3d}>
            <div style={styleSheet.card}>
              <div style={styleSheet.cardShimmer}></div>
              
              <div style={styleSheet.header}>
                <h1 style={styleSheet.title}>Verify Email</h1>
                <p style={styleSheet.subtitle}>We've sent a 6-digit code to your email.</p>
              </div>

              <form onSubmit={handleVerify}>
                <div style={styleSheet.inputGroup}>
                  <label style={styleSheet.label}>Email block</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{...styleSheet.input, opacity: 0.7}}
                    disabled={!!initialEmail}
                    required
                  />
                </div>

                <div style={styleSheet.inputGroup}>
                  <label style={styleSheet.label}>6-Digit Code</label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={otp}
                    maxLength={6}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setOtp(val);
                      if (val.length === 6 && email) {
                        // Auto-submit when 6 digits are typed
                        setTimeout(() => {
                           const form = e.target.closest("form");
                           if(form) form.requestSubmit();
                        }, 100);
                      }
                    }}
                    style={{...styleSheet.input, letterSpacing: '8px', textAlign: 'center', fontSize: '20px'}}
                    required
                  />
                </div>

                {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '14px', marginTop: '-6px' }}>{error}</div>}

                <button type="submit" disabled={isSubmitting || otp.length !== 6 || !email} style={styleSheet.btnPrimary}>
                  {isSubmitting ? "Verifying..." : "Verify & Continue"}
                </button>
                
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <button type="button" onClick={handleResend} style={styleSheet.linkButton} disabled={!!resendStatus}>
                    {resendStatus || "Didn't receive a code? Resend"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{background: "#020408", height: "100vh"}}>Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  )
}

const styleSheet: { [key: string]: React.CSSProperties } = {
  body: {
    background: "#020408",
    fontFamily: "'DM Sans', sans-serif",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    color: "#e2eaf8",
  },
  authWrapper: {
    position: "relative",
    zIndex: 10,
  },
  card3d: {
    width: "400px",
  },
  card: {
    background: "rgba(6, 12, 22, 0.75)",
    backdropFilter: "blur(28px)",
    WebkitBackdropFilter: "blur(28px)",
    border: "1px solid rgba(0, 212, 255, 0.13)",
    borderRadius: "28px",
    padding: "48px 40px 40px",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 0 60px rgba(0,212,255,0.04), 0 32px 80px rgba(0,0,0,0.7)"
  },
  cardShimmer: {
    position: "absolute",
    top: 0, left: "10%", right: "10%",
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.55), transparent)"
  },
  header: {
    marginBottom: "32px",
    textAlign: "center"
  },
  title: {
    fontFamily: "'Syne', sans-serif",
    fontSize: "26px", fontWeight: 800,
    letterSpacing: "-0.8px", color: "#fff",
    marginBottom: "5px"
  },
  subtitle: {
    fontSize: "13.5px", color: "#4a5568", fontWeight: 300
  },
  inputGroup: {
    position: "relative",
    marginBottom: "20px"
  },
  label: {
    display: "block",
    fontSize: "11.5px", fontWeight: 500,
    color: "rgba(148,163,184,0.8)",
    marginBottom: "6px",
    letterSpacing: "0.6px",
    textTransform: "uppercase"
  },
  input: {
    width: "100%",
    padding: "13px 15px",
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "12px",
    color: "white",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "14.5px",
    outline: "none",
    transition: "all 0.3s ease",
  },
  btnPrimary: {
    width: "100%", padding: "14.5px",
    background: "linear-gradient(135deg, #0099cc, #7c3aed)",
    border: "none", borderRadius: "13px",
    color: "white",
    fontFamily: "'Syne', sans-serif",
    fontSize: "14.5px", fontWeight: 600,
    letterSpacing: "0.3px",
    cursor: "pointer", marginTop: "10px",
    transition: "transform 0.25s ease, box-shadow 0.25s ease"
  },
  linkButton: {
    background: "none",
    border: "none",
    color: "#00d4ff",
    fontSize: "13px",
    cursor: "pointer",
    opacity: 0.8
  }
};
