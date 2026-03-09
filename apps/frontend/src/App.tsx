import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import {
  Shield,
  Upload,
  CheckCircle,
  FileText,
  Lock,
  Globe as GlobeIcon,
  Cpu,
  X,
  Scan,
  Database,
  Server,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase, isMock } from './lib/supabaseClient';

import ForensicDashboard from './components/ForensicDashboard';

// ─── Utilities ───────────────────────────────────────────────
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Particle Field ──────────────────────────────────────────
const ParticleField = () => {
  const particles = React.useMemo(() =>
    [...Array(60)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() > 0.8 ? 3 : Math.random() > 0.5 ? 2 : 1,
      dur: Math.random() * 15 + 25,
      delay: Math.random() * 15,
      opacity: Math.random() * 0.6 + 0.2,
    })), []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary"
          style={{ width: p.size, height: p.size, left: `${p.x}%` }}
          initial={{ y: `${p.y}%`, opacity: 0 }}
          animate={{ y: ["-5%", "105%"], opacity: [0, p.opacity, 0] }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            ease: "linear",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
};

// ─── Wireframe Globe ─────────────────────────────────────────
const VisualGlobe = () => (
  <div className="relative w-full aspect-square max-w-[480px] flex items-center justify-center">
    {/* Ambient glow */}
    <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 60%)' }} />

    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      className="relative w-full h-full border border-primary/10 rounded-full flex items-center justify-center overflow-hidden"
    >
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(var(--color-primary) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

      <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] text-primary opacity-20">
        {[...Array(10)].map((_, i) => (
          <ellipse
            key={`e-${i}`}
            cx="50" cy="50" rx="48" ry={8 + i * 6}
            fill="none" stroke="currentColor" strokeWidth="0.15"
            transform={`rotate(${i * 18} 50 50)`}
          />
        ))}
        {[...Array(7)].map((_, i) => (
          <circle
            key={`c-${i}`}
            cx="50" cy="50" r={8 + i * 7}
            fill="none" stroke="currentColor" strokeWidth="0.15"
          />
        ))}
      </svg>
    </motion.div>

    {/* Center icon */}
    <div className="absolute z-10 text-primary/50">
      <GlobeIcon size={100} strokeWidth={0.4} />
    </div>
  </div>
);

// ─── Score Counter ───────────────────────────────────────────
const ScoreCounter = ({ target }: { target: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let start = 0;
    const increment = target / 125; // ~2s at 60fps
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target]);

  return <span ref={ref}>{count}</span>;
};

// ─── 3D Tilt Card ────────────────────────────────────────────
const TiltCard = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mx = useSpring(x, { stiffness: 200, damping: 30 });
  const my = useSpring(y, { stiffness: 200, damping: 30 });
  const rotateX = useTransform(my, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mx, [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={cn("glass-card-premium", className)}
    >
      <div style={{ transform: "translateZ(40px)" }}>{children}</div>
    </motion.div>
  );
};

// ─── Animated Flow Line SVG ──────────────────────────────────
const FlowLine = () => (
  <svg
    className="absolute top-1/2 left-0 w-full h-8 hidden md:block -translate-y-1/2 pointer-events-none z-0"
    preserveAspectRatio="none"
    viewBox="0 0 1200 20"
  >
    {/* Static dashed track */}
    <line x1="60" y1="10" x2="1140" y2="10" stroke="rgba(16,185,129,0.1)" strokeWidth="1" strokeDasharray="6 14" />
    {/* Animated pulse */}
    <motion.line
      x1="60" y1="10" x2="1140" y2="10"
      stroke="rgba(16,185,129,0.6)" strokeWidth="2" strokeLinecap="round"
      strokeDasharray="30 1170"
      animate={{ strokeDashoffset: [-1200, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
    />
    {/* Node dots */}
    {[60, 600, 1140].map((cx, i) => (
      <motion.circle
        key={i} cx={cx} cy="10" r="4"
        fill="rgba(16,185,129,0.3)"
        animate={{ scale: [0.75, 1.25, 0.75], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
      />
    ))}
  </svg>
);


// ─── Main App ────────────────────────────────────────────────
const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [activeApiUrl, setActiveApiUrl] = useState<string>(import.meta.env.VITE_API_URL || 'http://localhost:3001');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [nodeStatus, setNodeStatus] = useState<'searching' | 'online' | 'offline' | 'misconfigured'>('searching');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.15], [0, -50]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0.4]);
  const dashboardY = useTransform(scrollYProgress, [0, 0.15], [0, 30]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setIsAuthModalOpen(false);
    });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      subscription.unsubscribe();
    };
  }, []);

  // ─── Dynamic Discovery Loop ───
  useEffect(() => {
    const discoverBackend = async () => {
      try {
        console.log('Searching for active forensic nodes...');
        const { data, error } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'active_tunnel_url')
          .single();

        if (error) {
          console.error('Discovery: Supabase query failed.', error);
          setNodeStatus(isMock ? 'misconfigured' : 'offline');
          return;
        }

        if (data?.value) {
          console.log('Discovery: Forensic gateway found at', data.value);
          setActiveApiUrl(data.value);
          setNodeStatus('online');
        } else {
          console.warn('Discovery: No active tunnel URL registered in Supabase.');
          setNodeStatus('offline');
        }
      } catch (err) {
        console.error('Discovery: Unexpected error.', err);
        setNodeStatus('offline');
      }
    };

    // Initial discovery
    discoverBackend();

    // Discovery loop: Faster when searching/offline, slower when online
    const interval = setInterval(discoverBackend, nodeStatus === 'online' ? 2 * 60 * 1000 : 10000);
    return () => clearInterval(interval);
  }, [nodeStatus]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { error } = authMode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) { setIsAuthModalOpen(true); return; }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('media_type', file.type.startsWith('video') ? 'video' : 'image');
    setIsAnalyzing(true);
    setAnalysisError(null);

    const uploadFile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setIsAnalyzing(false);
          setUser(null);
          setIsAuthModalOpen(true);
          return;
        }
        let apiUrl = activeApiUrl;
        console.log('Engaging forensic engine at:', apiUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        let response;
        try {
          response = await fetch(`${apiUrl}/v1/analyze`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: formData,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
        } catch (connectionError: any) {
          clearTimeout(timeoutId);
          console.error('Primary fetch failed:', connectionError);

          // If it was an abort, it's a timeout
          if (connectionError.name === 'AbortError') {
            throw new Error('GATEWAY_TIMEOUT: The forensic engine took too long to respond. Please check your connection.');
          }

          // If we were using a transient Cloudflare tunnel URL, fall back to a local gateway
          if (apiUrl.includes('trycloudflare.com')) {
            const fallbackUrl = 'http://localhost:3001';
            console.warn('Falling back to local forensic gateway at:', fallbackUrl);

            try {
              apiUrl = fallbackUrl;
              response = await fetch(`${apiUrl}/v1/analyze`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: formData,
              });
            } catch (fallbackError) {
              console.error('Fallback fetch to local gateway failed:', fallbackError);
              const isHttps = window.location.protocol === 'https:';
              const discoveryFailed = nodeStatus !== 'online';
              let msg = `FORENSIC_OFFLINE: TruthLens Gateway is unreachable.`;

              if (isHttps) {
                msg = `SECURE_CONTEXT_ERROR: Your browser is blocking the local forensic fallback (HTTP) because this site is HTTPS. `;
                msg += `Please ensure the Cloudflare Tunnel is running or access the site via HTTP for local development.`;
              } else if (discoveryFailed) {
                msg = `DISCOVERY_FAILURE: The system could not locate an active forensic node in the cloud. `;
                msg += `Check if 'start_truthlens.ps1' is running and Supabase secrets are configured.`;
              } else {
                msg = `GATEWAY_FAILURE: Both the cloud tunnel and local gateway failed to respond. Check backend logs.`;
              }

              throw new Error(msg);
            }
          } else {
            throw new Error(`NODE_UNREACHABLE: Could not connect to forensic gateway at ${apiUrl}. Status: ${nodeStatus.toUpperCase()}.`);
          }
        }

        if (response.status === 401) {
          throw new Error('Session expired. Please sign in again.');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Upload failed with status ${response.status}`);
        }

        const initialResult = await response.json();
        const jobId = initialResult.data.id;

        // --- Polling Logic ---
        const pollForResult = async (id: string, attempts = 0) => {
          if (attempts > 30) { // Timeout after 60 seconds (30 * 2s)
            setIsAnalyzing(false);
            setAnalysisError('Forensic analysis timed out. Please check your history in a few moments.');
            return;
          }

          try {
            const pollRes = await fetch(`${apiUrl}/v1/jobs/${id}`, {
              headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (pollRes.status === 304) {
              // Not modified, continues polling
              setTimeout(() => pollForResult(id, attempts + 1), 1500);
              return;
            }

            const jobData = await pollRes.json();
            if (!jobData || !jobData.data) {
              console.warn('Incomplete job data received:', jobData);
              setTimeout(() => pollForResult(id, attempts + 1), 1500);
              return;
            }

            const attr = jobData.data.attributes;
            if (attr.status === 'complete') {
              setResult({
                score: attr.trust_score,
                verdict: attr.verdict || (attr.trust_score > 70 ? 'Authentic' : 'Suspicious'),
                id: id,
                layers: Object.entries(attr.layers || {}).map(([label, value]) => ({
                  label: label.charAt(0).toUpperCase() + label.slice(1),
                  value: value as number,
                })),
              });
              setIsAnalyzing(false);
            } else if (attr.status === 'failed') {
              throw new Error('Forensic engine reported a processing failure.');
            } else {
              // Still processing, poll again in 1.5s
              setTimeout(() => pollForResult(id, attempts + 1), 1500);
            }
          } catch (err: any) {
            console.error('Polling error:', err);
            setIsAnalyzing(false);
            setAnalysisError(err.message || 'Error tracking forensic job status.');
          }
        };

        // Start polling
        pollForResult(jobId);

      } catch (err: any) {
        console.error(err);
        setIsAnalyzing(false);
        setAnalysisError(err.message || 'Connection to forensic engine failed. Ensure the API gateway is running.');
      }
    };
    uploadFile();
  };

  const handleDemoUpload = () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setTimeout(() => {
      setIsAnalyzing(false);
      setResult({
        id: "demo-vdr-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
        score: 96,
        verdict: 'Authentic',
        layers: [
          { label: 'Visual', value: 98 },
          { label: 'Metadata', value: 92 }
        ]
      });
    }, 2500);
  };

  // ─── Stagger animation presets ───
  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  };

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      {/* Ambient layers */}
      <div className="noise-overlay" />
      <div className="cursor-glow" style={{ left: mousePos.x, top: mousePos.y }} />

      {/* ═══════════════════════════════════════════════════════
          NAVIGATION
      ═══════════════════════════════════════════════════════ */}
      <nav className="nav-island-premium">
        <div className="flex items-center gap-4 cursor-pointer group">
          <Shield className="text-primary group-hover:rotate-12 transition-transform duration-500" size={32} />
          <span className="text-2xl font-black tracking-tighter text-metallic">VERIDARA</span>
        </div>
        <div className="hidden lg:flex items-center gap-10 text-[9px] font-black uppercase tracking-[0.4em] text-white/25">
          <a href="#pipeline" className="hover:text-white transition-colors duration-300">Pipeline</a>
          <a href="#security" className="hover:text-white transition-colors duration-300">Security</a>
          <a href="#usecases" className="hover:text-white transition-colors duration-300">Use Cases</a>
        </div>
        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05]">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  nodeStatus === 'online' ? "bg-primary shadow-[0_0_8px_var(--color-primary)]" :
                    nodeStatus === 'searching' ? "bg-yellow-500" : "bg-risk"
                )} />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">
                  Node: {nodeStatus.toUpperCase()}
                </span>
              </div>
              <button onClick={() => supabase.auth.signOut()} className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 hover:text-white transition-colors">Sign Out</button>
            </div>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="btn-cinematic-outline py-3 px-8 text-[9px] border-white/[0.06]">Access Console</button>
          )}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════ */}
      <section className="relative pt-60 pb-48 px-6 overflow-hidden">
        <div className="spotlight-hero" />
        <div className="spotlight-bottom" />
        <ParticleField />

        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center gap-24 relative z-10">
          {/* Left: Copy */}
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-primary text-[10px] font-black uppercase tracking-[0.6em] mb-10 flex items-center justify-center lg:justify-start gap-4"
            >
              <span className="w-12 h-[1px] bg-primary/40" />
              Series A Cyber-Forensics
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-6xl md:text-8xl lg:text-[10rem] font-black leading-[0.82] font-condensed mb-12 text-metallic tracking-[-0.06em]"
            >
              Verify<br />Digital Truth.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-xl md:text-2xl text-text-muted max-w-lg leading-[1.5] mb-16 font-medium mx-auto lg:mx-0 opacity-75"
            >
              Elite-tier media authentication for the modern enterprise. Built for sovereign legal teams and institutional truth seekers.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start"
            >
              <label className="cursor-pointer">
                <input id="demo-upload-input" type="file" className="hidden" onChange={handleFileUpload} />
                <div className="btn-cinematic-primary py-6 px-14 text-[10px] group">
                  <Scan size={18} className="group-hover:rotate-90 transition-transform duration-500" /> ANALYZE MEDIA
                </div>
              </label>
              <button onClick={handleDemoUpload} className="btn-cinematic-outline py-6 px-14 text-[10px]">
                VIEW SAMPLE REPORT
              </button>
            </motion.div>
          </motion.div>

          {/* Right: 3D Dashboard */}
          <motion.div style={{ y: dashboardY }} className="flex-1 relative perspective-1200">
            <TiltCard className="max-w-[460px] mx-auto p-10 bg-white/[0.015] border-white/[0.08] backdrop-blur-3xl">
              {/* Header */}
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)] animate-data-pulse" />
                  <span className="text-[9px] text-white/35 uppercase tracking-[0.4em] font-black">Forensic Engine v9</span>
                </div>
                <div className="text-white/15 font-data text-[9px]">#029-A12</div>
              </div>

              {/* Score Ring */}
              <div className="flex items-center justify-center mb-12">
                <div className="relative w-56 h-56 flex items-center justify-center">
                  <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 256 256">
                    <circle cx="128" cy="128" r="115" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                    <motion.circle
                      cx="128" cy="128" r="115"
                      fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      className="text-primary"
                      strokeDasharray={2 * Math.PI * 115}
                      initial={{ strokeDashoffset: 2 * Math.PI * 115 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 115 * (1 - 23 / 100) }}
                      transition={{ duration: 2.5, delay: 0.8, ease: "easeOut" }}
                      style={{ filter: 'drop-shadow(0 0 16px rgba(16,185,129,0.5))' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[5.5rem] font-black leading-none text-metallic tracking-tighter">
                      <ScoreCounter target={23} />
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-[0.6em] text-primary/50 mt-1">Trust Level</span>
                  </div>
                </div>
              </div>

              {/* Signal Bars */}
              <div className="space-y-5 pt-8 border-t border-white/[0.04]">
                {[
                  { label: "Visual", val: 18 },
                  { label: "Temporal", val: 21 },
                  { label: "Audio", val: 31 },
                ].map((l, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[8px] uppercase tracking-[0.3em] text-white/25 font-black w-20">{l.label} Signal</span>
                    <div className="flex items-center gap-4 flex-1 max-w-[180px]">
                      <div className="h-[2px] bg-white/[0.03] rounded-full flex-1 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${l.val}%` }}
                          transition={{ duration: 1.5, delay: 1.5 + i * 0.2, ease: "easeOut" }}
                          className={cn("h-full rounded-full", l.val < 30 ? "bg-risk" : "bg-primary")}
                        />
                      </div>
                      <span className={cn("text-[9px] font-data tabular-nums", l.val < 30 ? "text-risk" : "text-primary")}>{l.val}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </TiltCard>
            <div className="absolute -z-10 -bottom-16 -right-16 w-72 h-72 floating-glow" />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FORENSIC PIPELINE
      ═══════════════════════════════════════════════════════ */}
      <section id="pipeline" className="py-40 px-6 relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-32"
          >
            <motion.h2 variants={fadeUp} className="text-5xl md:text-7xl font-black tracking-tighter mb-8 text-metallic">
              The Authentication Grid.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-text-muted text-lg max-w-2xl mx-auto opacity-60 leading-relaxed">
              Triple-layered verification logic providing definitive clarity on digital origins.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <FlowLine />

            {[
              { icon: Upload, title: "Intake", desc: "Submit raw source media via our institutional enterprise ingest bridge." },
              { icon: Cpu, title: "Neural Scan", desc: "Multi-model neural networks perform frame-by-frame forensic analysis." },
              { icon: FileText, title: "Certification", desc: "Generate a cryptographically signed report with verified chain of custody." },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="group relative z-10"
              >
                <div className="glass-card-edge-glow p-14 text-center shimmer-on-hover">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-8 border border-primary/15 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all duration-500">
                    <step.icon size={28} strokeWidth={1.5} />
                  </div>
                  <h4 className="text-2xl mb-4 font-black tracking-tight text-white group-hover:text-primary transition-colors duration-300">{step.title}</h4>
                  <p className="text-text-muted text-sm leading-relaxed max-w-xs mx-auto opacity-60">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CERTIFICATE SHOWCASE
      ═══════════════════════════════════════════════════════ */}
      <section className="py-48 px-6 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, var(--color-background) 0%, var(--color-surface-layered) 40%, var(--color-background) 100%)' }}>
        <div className="mesh-texture" />
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center gap-24 relative z-10">

          {/* Certificate Card */}
          <div className="flex-1 order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="glass-card-premium p-1 bg-gradient-to-br from-white/[0.08] to-transparent">
                <div className="bg-background/95 rounded-[30px] p-16 text-left border border-white/[0.04] relative overflow-hidden">

                  {/* Embossed Seal */}
                  <div className="absolute top-10 right-10 w-32 h-32 flex items-center justify-center opacity-10">
                    <Shield size={120} strokeWidth={0.5} className="text-primary" />
                  </div>

                  {/* Certificate header */}
                  <div className="mb-16">
                    <div className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-5 flex items-center gap-3">
                      <span className="w-6 h-[1px] bg-primary/50" /> SERIES A COMPLIANT
                    </div>
                    <h3 className="text-4xl font-black tracking-tighter text-metallic">Legal Certificate</h3>
                    <p className="text-white/20 text-[10px] mt-3 uppercase tracking-[0.3em] font-data">Chain of Custody ID: VDR-992-SECURE</p>
                  </div>

                  {/* Certificate rows */}
                  <div className="space-y-8 mb-16">
                    {[
                      { k: "Hash Value", v: "0x82...BF91a" },
                      { k: "Timestamp", v: "MAR 03, 2026 // 12:45 UTC" },
                      { k: "Forensic Sig", v: "RSA-4096 VALIDATED" },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-end border-b border-white/[0.04] pb-3">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/17">{item.k}</span>
                        <span className="text-white/50 font-data text-[11px]">{item.v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Verification animation */}
                  <div className="flex items-center gap-6 mb-16">
                    <motion.div
                      initial={{ scale: 0.3, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                      className="w-14 h-14 bg-primary/15 rounded-full flex items-center justify-center text-primary shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                    >
                      <CheckCircle size={28} />
                    </motion.div>
                    <div className="flex-1 h-[1px] bg-white/[0.06]" />
                    <span className="text-[9px] font-black text-white/17 uppercase tracking-[0.3em]">Auth System Active</span>
                  </div>

                  <button className="btn-cinematic-primary w-full group">
                    DOWNLOAD CERTIFIED REPORT <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                  </button>
                </div>
              </div>
              <div className="absolute -z-10 -bottom-10 -left-10 w-56 h-56 bg-primary/15 blur-[100px] opacity-30" />
            </motion.div>
          </div>

          {/* Certificate copy */}
          <div className="flex-1 order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-5xl lg:text-7xl font-black tracking-tighter mb-8 text-metallic leading-[0.9]">
                Elite-Grade<br />Certification.
              </h2>
              <p className="text-text-muted text-xl leading-relaxed opacity-60 mb-14">
                Generate bulletproof forensic evidence suitable for litigation and boardroom transparency.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="text-primary font-black text-3xl">99.9%</div>
                  <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25">Accuracy SLA</div>
                </div>
                <div className="space-y-2">
                  <div className="text-primary font-black text-3xl font-data">AES-256</div>
                  <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25">Depth Encryption</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECURITY GRID
      ═══════════════════════════════════════════════════════ */}
      <section id="security" className="py-40 px-6 relative">
        <div className="absolute inset-0 grid-line-pattern opacity-30 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="flex flex-col md:flex-row items-end justify-between mb-24 gap-10"
          >
            <div className="max-w-2xl">
              <motion.h2 variants={fadeUp} className="text-5xl md:text-7xl font-black tracking-tighter text-metallic mb-5">Built for Depth.</motion.h2>
              <motion.p variants={fadeUp} className="text-text-muted text-lg opacity-60">Sovereign security infrastructure with zero-retention defaults.</motion.p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Lock, title: "Zero Retention", desc: "Binary media data is purged instantly after neural scanning. No traces left." },
              { icon: Shield, title: "GDPR Compliant", desc: "Built with privacy-by-design principles fulfilling strict EU mandates." },
              { icon: Server, title: "DPDP Act 2023", desc: "Fully compliant with Indian data protection laws for enterprise operations." },
              { icon: Database, title: "Immortal Ledger", desc: "Optional blockchain anchoring for immutable cryptographic proof-of-record." },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6 }}
                className="glass-card-edge-glow p-10 group shimmer-on-hover"
              >
                <s.icon className="text-primary mb-8 opacity-35 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" size={28} />
                <h4 className="text-xl font-black mb-3 tracking-tight">{s.title}</h4>
                <p className="text-text-muted text-sm leading-relaxed opacity-50">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          USE CASES
      ═══════════════════════════════════════════════════════ */}
      <section id="usecases" className="py-40 px-6 border-t border-white/[0.04] relative">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-24">
          <div className="flex-1">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-6xl lg:text-8xl font-black tracking-tighter mb-14 text-metallic leading-[0.85]"
            >
              Versatile<br />Verification.
            </motion.h2>

            <div className="space-y-12">
              {[
                { r: "Journalism", d: "Verify citizen source media with definitive forensic signals." },
                { r: "Legal Teams", d: "Prepare authenticated evidence for high-stakes litigation." },
                { r: "HR / Corporate", d: "Verify identity in remote-first global hiring pipelines." },
                { r: "Trust & Safety", d: "Automate deepfake detection for social platform moderation." },
                { r: "Defamation Targets", d: "Secure cryptographic proof to combat synthetic character assassination." },
                { r: "Venture Capital", d: "Due diligence on founder claims and video-based pitches." },
              ].map((u, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -25 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.6 }}
                  className="group cursor-pointer"
                >
                  <h3 className="text-3xl font-black mb-3 flex items-center gap-5 group-hover:text-primary transition-colors duration-300">
                    <span className="text-primary/20 group-hover:text-primary font-data text-lg transition-colors">0{i + 1}</span>
                    {u.r}
                    <ChevronRight size={20} className="text-white/10 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                  </h3>
                  <p className="text-text-muted text-base opacity-50 max-w-md ml-12">{u.d}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <VisualGlobe />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════ */}
      <section className="py-56 px-6 relative overflow-hidden">
        <div className="spotlight-hero scale-125 rotate-180 opacity-50" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.h2
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="text-8xl md:text-[12rem] font-black tracking-tighter font-condensed text-metallic leading-[0.85] mb-20"
          >
            Verify<br />the Truth.
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-8"
          >
            <button
              onClick={() => {
                const element = document.getElementById('demo-upload-input');
                if (element) {
                  element.click();
                }
              }}
              className="btn-cinematic-primary py-8 px-16 text-sm font-black group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-3">
                START FREE EVALUATION <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform duration-300" />
              </span>
              {/* Bottom progress bar on hover */}
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-700" />
            </button>
            <div className="flex items-center gap-4 text-white/40 text-[10px] font-black tracking-[0.2em] uppercase">
              <span>Free tier available</span>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span>No credit card required</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer className="py-24 px-6 border-t border-white/[0.04] bg-black/30 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-20">
          <div className="col-span-2 space-y-10">
            <div className="flex items-center gap-6">
              <Shield className="text-primary" size={48} />
              <span className="text-4xl font-black tracking-tighter text-metallic">VERIDARA</span>
            </div>
            <p className="text-text-muted text-base max-w-sm opacity-50">
              The definitive institutional standard for digital authenticity and forensic verification.
            </p>
            <div className="flex gap-3 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-data-pulse" />
              <span className="text-[9px] font-black tracking-[0.3em] text-primary uppercase">All Systems Ready</span>
            </div>
          </div>
          <div className="space-y-6">
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/25">Platform</div>
            <div className="flex flex-col gap-3 text-[13px] font-medium text-white/40">
              <a href="#" className="hover:text-primary transition-colors duration-300">Forensic Model v9</a>
              <a href="#" className="hover:text-primary transition-colors duration-300">API Console</a>
              <a href="#" className="hover:text-primary transition-colors duration-300">Audit Logs</a>
            </div>
          </div>
          <div className="space-y-6">
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/25">Company</div>
            <div className="flex flex-col gap-3 text-[13px] font-medium text-white/40">
              <a href="#" className="hover:text-primary transition-colors duration-300">About</a>
              <a href="#" className="hover:text-primary transition-colors duration-300">Security</a>
              <a href="#" className="hover:text-primary transition-colors duration-300">Contact</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-24 pt-10 border-t border-white/[0.03] flex justify-between items-center text-[9px] font-black uppercase tracking-[0.5em] text-white/8">
          <span>© 2026 VERIDARA Inc.</span>
          <span>Forensic Engine // SECURE_INTEL</span>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════
          AUTH MODAL
      ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-background/95 backdrop-blur-3xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md glass-card-premium p-14 relative"
            >
              <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-10 right-10 text-white/15 hover:text-white transition-colors">
                <X size={22} />
              </button>
              <h2 className="text-5xl mb-3 font-black tracking-tighter text-metallic">{authMode === 'login' ? 'Login.' : 'Register.'}</h2>
              <p className="text-text-muted text-[9px] font-black uppercase tracking-[0.4em] mb-10">{authMode === 'login' ? 'Enter Secure Portal' : 'Create Your Identity'}</p>

              {/* Google Sign-In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white/80 text-sm font-semibold hover:bg-white/[0.08] hover:border-white/15 transition-all duration-300 mb-8 group"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" className="group-hover:scale-110 transition-transform">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-[1px] bg-white/[0.06]" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/15">or</span>
                <div className="flex-1 h-[1px] bg-white/[0.06]" />
              </div>

              <form onSubmit={handleAuth} className="space-y-6">
                <div className="space-y-4">
                  <input
                    type="email" placeholder="Identifier" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-5 px-8 text-white text-sm focus:outline-none focus:border-primary/40 placeholder:text-white/15 transition-colors"
                  />
                  <input
                    type="password" placeholder="Passkey" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-5 px-8 text-white text-sm focus:outline-none focus:border-primary/40 placeholder:text-white/15 transition-colors"
                  />
                </div>
                {authError && <p className="text-risk text-[9px] font-black uppercase tracking-wider text-center">{authError}</p>}
                <button type="submit" disabled={authLoading} className="btn-cinematic-primary w-full py-5 text-[10px] tracking-[0.3em]">
                  {authLoading ? "Verifying..." : (authMode === 'login' ? "Access Console" : "Create Identity")}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="w-full text-[9px] font-black uppercase tracking-[0.3em] text-white/17 hover:text-primary transition-colors text-center"
                >
                  {authMode === 'login' ? "Missing Access? Register" : "Existing Identity? Login"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════
          ANALYZING OVERLAY
      ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-background/90 backdrop-blur-3xl flex items-center justify-center p-6"
          >
            <div className="text-center">
              <div className="w-40 h-40 mx-auto mb-16 relative">
                <motion.div
                  animate={{ scale: [1, 1.6, 1], opacity: [0.08, 0.3, 0.08] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 border-2 border-primary/30 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Scan className="text-primary animate-pulse" size={64} strokeWidth={1} />
                </div>
              </div>
              <h3 className="text-5xl font-black tracking-tighter text-metallic mb-6">Neural Scan.</h3>
              <div className="text-[10px] font-black uppercase tracking-[0.6em] text-primary/50 bg-primary/5 py-3 px-10 rounded-full border border-primary/15 inline-block">
                Processing Forensic Vectors
              </div>
              <div className="mt-12">
                <button
                  onClick={() => setIsAnalyzing(false)}
                  className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors py-2 px-6 border border-white/5 hover:border-white/20 rounded-full"
                >
                  ABORT SCAN
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════
          ANALYSIS ERROR OVERLAY
      ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {analysisError && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-background/95 backdrop-blur-3xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card-premium p-16 max-w-lg w-full text-center"
            >
              <div className="w-20 h-20 mx-auto mb-10 bg-risk/10 rounded-full flex items-center justify-center border border-risk/20">
                <X size={40} className="text-risk" />
              </div>
              <h3 className="text-4xl font-black tracking-tighter text-metallic mb-4">Scan Failed.</h3>
              <p className="text-text-muted text-sm mb-3 opacity-60">The forensic engine could not process your request.</p>
              <div className="text-risk/80 text-[10px] font-data bg-risk/5 py-3 px-6 rounded-xl border border-risk/10 mb-10 inline-block">
                {analysisError}
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setAnalysisError(null)}
                  className="btn-cinematic-outline py-4 px-10 text-[10px]"
                >
                  DISMISS
                </button>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={(e) => { setAnalysisError(null); handleFileUpload(e); }} />
                  <div className="btn-cinematic-primary py-4 px-10 text-[10px]">
                    RETRY SCAN
                  </div>
                </label>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════
          RESULT OVERLAY
      ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1200] bg-background/95 backdrop-blur-3xl overflow-y-auto px-6 py-10"
          >
            <div className="max-w-7xl mx-auto">
              {result && (
                <ForensicDashboard result={result} apiUrl={activeApiUrl} onClose={() => setResult(null)} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
