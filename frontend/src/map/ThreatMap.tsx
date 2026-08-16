/* ═══════════════════════════════════════════════════════════
   ThreatMap — Canvas-based animated threat visualization
   Uses a stylized dark world map with animated attack arcs
   ═══════════════════════════════════════════════════════════ */

import { useEffect, useRef, useCallback } from 'react';
import { useSecurityStore } from '../stores/useSecurityStore';
import type { SecurityEvent } from '../types/security';

interface AttackArc {
  from: { x: number; y: number };
  to: { x: number; y: number };
  progress: number;
  severity: string;
  opacity: number;
  life: number;
}

// Simplified world map dot coordinates (major landmasses)
const WORLD_DOTS: [number, number][] = [];

// Generate a simplified dot grid for continents
function generateWorldDots() {
  // Approximate continent outlines with dot density
  const continents = [
    // North America
    { latMin: 25, latMax: 70, lonMin: -170, lonMax: -50, density: 0.3 },
    // South America
    { latMin: -55, latMax: 15, lonMin: -85, lonMax: -30, density: 0.25 },
    // Europe
    { latMin: 35, latMax: 72, lonMin: -10, lonMax: 40, density: 0.4 },
    // Africa
    { latMin: -35, latMax: 37, lonMin: -20, lonMax: 55, density: 0.25 },
    // Asia
    { latMin: 5, latMax: 75, lonMin: 40, lonMax: 180, density: 0.25 },
    // Oceania
    { latMin: -45, latMax: -10, lonMin: 110, lonMax: 180, density: 0.2 },
  ];

  continents.forEach(c => {
    for (let lat = c.latMin; lat <= c.latMax; lat += 3) {
      for (let lon = c.lonMin; lon <= c.lonMax; lon += 4) {
        if (Math.random() < c.density) {
          WORLD_DOTS.push([lat, lon]);
        }
      }
    }
  });
}
generateWorldDots();

function latLonToXY(lat: number, lon: number, w: number, h: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return { x, y };
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#FF1744',
  high: '#FF6E40',
  medium: '#FFD600',
  low: '#00E5FF',
};

export default function ThreatMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arcsRef = useRef<AttackArc[]>([]);
  const eventsRef = useRef<SecurityEvent[]>([]);
  const animRef = useRef<number>(0);
  const events = useSecurityStore(s => s.events);
  const isDemoMode = useSecurityStore(s => s.isDemoMode);

  // Sync events from store
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Add new arcs when events come in
  useEffect(() => {
    if (events.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    events.slice(0, 15).forEach((ev) => {
      if (!ev.lat_source || !ev.lon_source || !ev.lat_destination || !ev.lon_destination) return;

      const from = latLonToXY(ev.lat_source, ev.lon_source, canvas.width, canvas.height);
      const to = latLonToXY(ev.lat_destination, ev.lon_destination, canvas.width, canvas.height);

      // Check if arc already exists to prevent duplication
      const exists = arcsRef.current.some(arc => 
        Math.abs(arc.from.x - from.x) < 0.1 && 
        Math.abs(arc.to.x - to.x) < 0.1
      );

      if (!exists) {
        arcsRef.current.push({
          from, to,
          progress: Math.random(), // Stagger starting points for immediate active look
          severity: ev.severity,
          opacity: 1,
          life: 1,
        });
      }
    });
  }, [events]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw background gradient
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
    bgGrad.addColorStop(0, 'rgba(0, 229, 255, 0.02)');
    bgGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw world dots
    WORLD_DOTS.forEach(([lat, lon]) => {
      const { x, y } = latLonToXY(lat, lon, w, h);
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.fill();
    });

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 7; i++) {
      const y = (h / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 13; i++) {
      const x = (w / 12) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Draw attack arcs
    arcsRef.current.forEach((arc) => {
      const color = SEVERITY_COLORS[arc.severity] || '#00E5FF';

      // Calculate control point for bezier curve
      const midX = (arc.from.x + arc.to.x) / 2;
      const midY = (arc.from.y + arc.to.y) / 2;
      const dx = arc.to.x - arc.from.x;
      const dy = arc.to.y - arc.from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const cpY = midY - dist * 0.3; // Arc upward

      // Draw full path (faded)
      ctx.beginPath();
      ctx.moveTo(arc.from.x, arc.from.y);
      ctx.quadraticCurveTo(midX, cpY, arc.to.x, arc.to.y);
      ctx.strokeStyle = `${color}${Math.round(arc.opacity * 15).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw animated particle along arc
      if (arc.progress < 1) {
        const t = arc.progress;
        const px = (1 - t) * (1 - t) * arc.from.x + 2 * (1 - t) * t * midX + t * t * arc.to.x;
        const py = (1 - t) * (1 - t) * arc.from.y + 2 * (1 - t) * t * cpY + t * t * arc.to.y;

        // Particle glow
        const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, 8);
        glowGrad.addColorStop(0, `${color}AA`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();

        // Particle core
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      // Source point pulse
      ctx.beginPath();
      ctx.arc(arc.from.x, arc.from.y, 3 + arc.opacity * 2, 0, Math.PI * 2);
      ctx.fillStyle = `${color}${Math.round(arc.opacity * 80).toString(16).padStart(2, '0')}`;
      ctx.fill();

      // Target point
      ctx.beginPath();
      ctx.arc(arc.to.x, arc.to.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `#00E5FF${Math.round(arc.opacity * 150).toString(16).padStart(2, '0')}`;
      ctx.fill();

      // Animate
      arc.progress = Math.min(arc.progress + 0.012, 1);
      if (arc.progress >= 1) {
        arc.life -= 0.008;
        arc.opacity = Math.max(0, arc.life);
      }
    });

    // Remove dead arcs
    arcsRef.current = arcsRef.current.filter(a => a.life > 0);

    // Telemetry source label
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = isDemoMode ? 'rgba(156, 107, 255, 0.4)' : 'rgba(0, 229, 255, 0.4)';
    ctx.textAlign = 'right';
    ctx.fillText(isDemoMode ? '◆ DEMO TELEMETRY' : '◆ REAL-TIME TELEMETRY', w - 12, h - 12);

    animRef.current = requestAnimationFrame(draw);
  }, [isDemoMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);
    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
    };
  }, [draw]);

  return (
    <div className="glass-panel overflow-hidden relative" style={{ minHeight: 300 }}>
      {/* Header */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse-glow" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-cyber-text-secondary">
          Global Threat Activity
        </span>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ minHeight: 300 }}
      />

      {/* Legend */}
      <div className="absolute bottom-3 left-4 flex items-center gap-4 text-[9px] font-mono text-cyber-text-dim">
        {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
          <div key={sev} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="uppercase">{sev}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
