/* ═══════════════════════════════════════════════════════════
   LoginScreen — Cinematic cyber login experience
   ═══════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const login = useAuthStore(s => s.login);

  // ── Particle Network Background ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;
    let particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }

    function initParticles() {
      particles = [];
      const count = Math.floor((canvas!.width * canvas!.height) / 12000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 1.5 + 0.5,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 229, 255, ${0.08 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.fill();

        // Move
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas!.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas!.height) p.vy *= -1;
      });

      animId = requestAnimationFrame(draw);
    }

    resize();
    initParticles();
    draw();

    window.addEventListener('resize', () => { resize(); initParticles(); });
    return () => { cancelAnimationFrame(animId); };
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));

    const success = await login(username, password);
    if (!success) {
      setError('Invalid credentials. Try: admin / sentinel2026');
    }
    setLoading(false);
  }, [username, password, login]);

  return (
    <div className="fixed inset-0 bg-cyber-bg flex items-center justify-center overflow-hidden">
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg opacity-30" />

      {/* Vignette */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,7,10,0.8) 100%)',
      }} />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center justify-center mb-4"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center glow-cyan">
                <Hexagon size={32} className="text-cyber-cyan" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-2xl border border-cyber-cyan/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-heading font-bold text-cyber-cyan text-glow-cyan tracking-widest mb-1"
          >
            SENTINEL-X
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[11px] text-cyber-text-secondary tracking-[0.3em] uppercase"
          >
            Cyber Security Operations Center
          </motion.p>
        </div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <span className="text-[10px] text-cyber-text-dim uppercase tracking-widest">System Status</span>
          <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse-glow" />
          <span className="text-[10px] text-cyber-green font-mono font-semibold tracking-wider">ONLINE</span>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-panel-strong p-6 animate-border-glow"
        >
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck size={18} className="text-cyber-cyan" />
            <h2 className="text-sm font-heading font-semibold text-cyber-text tracking-wider uppercase">
              Cyber Command Access
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-cyber-text-secondary uppercase tracking-widest mb-1.5 font-mono">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-cyber-bg border border-cyber-border text-cyber-text font-mono text-sm placeholder:text-cyber-text-dim focus:border-cyber-cyan/50 transition-colors"
                placeholder="Enter username"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-cyber-text-secondary uppercase tracking-widest mb-1.5 font-mono">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg bg-cyber-bg border border-cyber-border text-cyber-text font-mono text-sm placeholder:text-cyber-text-dim focus:border-cyber-cyan/50 transition-colors"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-text-dim hover:text-cyber-text transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-cyber-red font-mono p-2 rounded bg-cyber-red/10 border border-cyber-red/20"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan font-heading font-semibold text-sm tracking-wider uppercase hover:bg-cyber-cyan/25 hover:border-cyber-cyan/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                'AUTHORIZE ACCESS'
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-4 pt-4 border-t border-cyber-border">
            <p className="text-[10px] text-cyber-text-dim font-mono text-center">
              DEMO CREDENTIALS: admin / sentinel2026
            </p>
          </div>
        </motion.div>

        {/* Terminal logs footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 text-center"
        >
          <div className="font-mono text-[10px] text-cyber-text-dim space-y-0.5">
            <p>sentinel-x v1.0.0 | Secure Connection Established</p>
            <p>TLS 1.3 | AES-256-GCM | RSA-4096</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
