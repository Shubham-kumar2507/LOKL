"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import Head from "next/head";

// Using the design provided by the user
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { setSession, session } = useSession();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [session, router]);

  // THREE.js Background Setup using the user's provided code structure adapted for React
  useEffect(() => {
    let animationFrameId: number;
    let camera: any, scene: any, renderer: any;
    let bigIco: any, midIco: any, torusKnot: any, stars: any;
    const floaters: any[] = [];
    
    // Lazy load THREE.js to avoid SSR issues
    import('three').then((THREE) => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      camera.position.z = 28;

      // Particle field
      const PARTICLE_COUNT = 260;
      const pPositions = new Float32Array(PARTICLE_COUNT * 3);
      for (let i = 0; i < PARTICLE_COUNT * 3; i++) pPositions[i] = (Math.random() - 0.5) * 110;
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
      const pMat = new THREE.PointsMaterial({ color: 0x00d4ff, size: 0.13, transparent: true, opacity: 0.55, sizeAttenuation: true });
      stars = new THREE.Points(pGeo, pMat);
      scene.add(stars);

      // Large background icosahedron
      bigIco = new THREE.Mesh(
        new THREE.IcosahedronGeometry(16, 1),
        new THREE.MeshBasicMaterial({ color: 0x0044dd, wireframe: true, transparent: true, opacity: 0.055 })
      );
      scene.add(bigIco);

      // Purple mid icosahedron (right side)
      midIco = new THREE.Mesh(
        new THREE.IcosahedronGeometry(9, 0),
        new THREE.MeshBasicMaterial({ color: 0x7c3aed, wireframe: true, transparent: true, opacity: 0.1 })
      );
      midIco.position.set(18, -6, -8);
      scene.add(midIco);

      // Torus knot (left side)
      torusKnot = new THREE.Mesh(
        new THREE.TorusKnotGeometry(7, 1, 90, 14),
        new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.05 })
      );
      torusKnot.position.set(-20, 8, -12);
      scene.add(torusKnot);

      // Small floating octahedra
      for (let i = 0; i < 10; i++) {
        const size = Math.random() * 0.9 + 0.25;
        const mesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(size),
          new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0x00d4ff : 0x8b5cf6,
            wireframe: true,
            transparent: true,
            opacity: Math.random() * 0.28 + 0.08
          })
        );
        mesh.position.set((Math.random() - 0.5) * 52, (Math.random() - 0.5) * 32, (Math.random() - 0.5) * 18);
        scene.add(mesh);
        floaters.push({
          mesh,
          rotSpeed: { x: (Math.random() - 0.5) * 0.012, y: (Math.random() - 0.5) * 0.012, z: 0 },
          floatOffset: Math.random() * Math.PI * 2
        });
      }

      for (let i = 0; i < 5; i++) {
        const mesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(Math.random() * 0.6 + 0.2),
          new THREE.MeshBasicMaterial({ color: 0x7c3aed, wireframe: true, transparent: true, opacity: 0.15 })
        );
        mesh.position.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 25, (Math.random() - 0.5) * 15);
        scene.add(mesh);
        floaters.push({ mesh, rotSpeed: { x: 0.008, y: 0.006, z: 0 }, floatOffset: Math.random() * 6 });
      }

      let t = 0;
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        t += 0.004;

        bigIco.rotation.x += 0.0008;
        bigIco.rotation.y += 0.0015;
        midIco.rotation.x -= 0.0012;
        midIco.rotation.y += 0.0018;
        torusKnot.rotation.x += 0.002;
        torusKnot.rotation.y += 0.004;

        stars.rotation.y += 0.00025;
        stars.rotation.x = Math.sin(t * 0.4) * 0.08;

        floaters.forEach(({ mesh, rotSpeed, floatOffset }) => {
          mesh.rotation.x += rotSpeed.x;
          mesh.rotation.y += rotSpeed.y;
          mesh.position.y += Math.sin(t + floatOffset) * 0.006;
        });

        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 3D Card Tilt Effect
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let animationFrameId: number;
    let targetRX = 0, targetRY = 0, curRX = 0, curRY = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      targetRY = ((e.clientX - cx) / cx) * 12;
      targetRX = ((cy - e.clientY) / cy) * 9;
    };
    const handleMouseLeave = () => { targetRX = 0; targetRY = 0; };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    const tiltLoop = () => {
      if (!cardRef.current) return;
      curRX += (targetRX - curRX) * 0.07;
      curRY += (targetRY - curRY) * 0.07;
      cardRef.current.style.transform = `rotateX(${curRX}deg) rotateY(${curRY}deg)`;
      animationFrameId = requestAnimationFrame(tiltLoop);
    };
    tiltLoop();
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);


  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "EMAIL_NOT_VERIFIED") {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        throw new Error(data.error || "Login failed");
      }

      setSession({
        userId: data.userId,
        username: data.username,
        token: data.token,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet" />
      </Head>
      <div style={styleSheet.body}>
        <canvas ref={canvasRef} style={styleSheet.canvas} />

        <div style={styleSheet.authWrapper}>
          <div ref={cardRef} style={styleSheet.card3d}>
            <div style={styleSheet.card}>
              <div style={styleSheet.cardShimmer}></div>
              <div style={styleSheet.cardWash}></div>

              <div style={{...styleSheet.orb, ...styleSheet.orb1}}></div>
              <div style={{...styleSheet.orb, ...styleSheet.orb2}}></div>

              {/* Header */}
              <div style={styleSheet.header}>
                <div style={styleSheet.logo}>
                  <div style={styleSheet.logoIcon}>
                    <svg viewBox="0 0 24 24" style={styleSheet.logoSvg}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <span style={styleSheet.logoText}>LOKL</span>
                </div>
                <h1 style={styleSheet.title}>Welcome back</h1>
                <p style={styleSheet.subtitle}>Sign in to your account to continue</p>
              </div>

              {/* Tabs */}
              <div style={styleSheet.tabs}>
                <button style={{...styleSheet.tab, ...styleSheet.tabActive}} disabled>Sign In</button>
                <button style={styleSheet.tab} onClick={() => router.push("/signup")}>Create Account</button>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin}>
                <div style={styleSheet.inputGroup}>
                  <label style={styleSheet.label}>Email address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styleSheet.input}
                    required
                  />
                  <span style={styleSheet.inputIcon}>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  </span>
                </div>

                <div style={styleSheet.inputGroup}>
                  <label style={styleSheet.label}>Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styleSheet.input}
                    required
                  />
                  <span style={styleSheet.inputIcon}>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  </span>
                </div>
                
                {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '14px', marginTop: '-6px' }}>{error}</div>}

                <div style={{ textAlign: "right" }}>
                  <a href="#" style={styleSheet.forgot}>Forgot password?</a>
                </div>

                <button type="submit" disabled={isSubmitting || !email || !password} style={styleSheet.btnPrimary}>
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </button>
                
                <div style={styleSheet.divider}><span>OR</span></div>
                
                <div style={styleSheet.socialBtns}>
                  <button type="button" style={styleSheet.btnSocial}>
                    <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                  </button>
                  <button type="button" style={styleSheet.btnSocial}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    GitHub
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
    position: "relative"
  },
  canvas: {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
    pointerEvents: "none"
  },
  authWrapper: {
    position: "relative",
    zIndex: 10,
    perspective: "1400px"
  },
  card3d: {
    width: "420px",
    transformStyle: "preserve-3d",
    willChange: "transform",
    transition: "transform 0.1s ease-out"
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
  cardWash: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(ellipse 60% 50% at 70% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)",
    pointerEvents: "none"
  },
  orb: {
    position: "absolute",
    borderRadius: "50%",
    pointerEvents: "none"
  },
  orb1: {
    width: "280px", height: "280px",
    background: "radial-gradient(circle, rgba(124,58,237,0.22), transparent 70%)",
    top: "-80px", right: "-80px"
  },
  orb2: {
    width: "200px", height: "200px",
    background: "radial-gradient(circle, rgba(0,212,255,0.15), transparent 70%)",
    bottom: "-50px", left: "-50px"
  },
  header: {
    marginBottom: "32px"
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "26px"
  },
  logoIcon: {
    width: "38px", height: "38px",
    borderRadius: "11px",
    background: "linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 0 20px rgba(0,212,255,0.25)"
  },
  logoSvg: {
    width: "18px", height: "18px", fill: "none", stroke: "white", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"
  },
  logoText: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700, fontSize: "19px",
    letterSpacing: "-0.6px", color: "white"
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
  tabs: {
    display: "flex",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "14px",
    padding: "4px", gap: "4px",
    marginBottom: "26px"
  },
  tab: {
    flex: 1, padding: "10px 12px",
    borderRadius: "10px", border: "none",
    background: "transparent",
    color: "#4a5568",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "14px", fontWeight: 500,
    cursor: "pointer",
    letterSpacing: "0.1px",
    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)"
  },
  tabActive: {
    background: "rgba(0,212,255,0.1)",
    color: "#00d4ff",
    boxShadow: "0 0 0 1px rgba(0,212,255,0.2)"
  },
  inputGroup: {
    position: "relative",
    marginBottom: "14px"
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
    padding: "13px 42px 13px 15px",
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "12px",
    color: "white",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "14.5px",
    outline: "none",
    transition: "all 0.3s ease",
  },
  inputIcon: {
    position: "absolute",
    right: "13px", bottom: "14px",
    opacity: 0.35, pointerEvents: "none",
    width: "16px", height: "16px"
  },
  forgot: {
    display: "inline-block",
    fontSize: "12px", color: "#00d4ff",
    textDecoration: "none", opacity: 0.7,
    marginTop: "-6px", marginBottom: "14px"
  },
  btnPrimary: {
    width: "100%", padding: "14.5px",
    background: "linear-gradient(135deg, #0099cc, #7c3aed)",
    border: "none", borderRadius: "13px",
    color: "white",
    fontFamily: "'Syne', sans-serif",
    fontSize: "14.5px", fontWeight: 600,
    letterSpacing: "0.3px",
    cursor: "pointer", marginTop: "6px",
    position: "relative", overflow: "hidden",
    transition: "transform 0.25s ease, box-shadow 0.25s ease"
  },
  divider: {
    display: "flex", alignItems: "center",
    gap: "12px", margin: "18px 0",
    color: "#4a5568", fontSize: "12px", letterSpacing: "0.8px"
  },
  socialBtns: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px"
  },
  btnSocial: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    padding: "11px 12px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "11px",
    color: "#64748b",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "13.5px", fontWeight: 400,
    cursor: "pointer",
    transition: "all 0.25s ease"
  }
};
