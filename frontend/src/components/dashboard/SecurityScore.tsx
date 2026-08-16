/* ═══════════════════════════════════════════════════════════
   SecurityScore — Circular gauge with animated progress
   ═══════════════════════════════════════════════════════════ */

import { motion } from 'framer-motion';
import LiveCounter from '../ui/LiveCounter';

interface SecurityScoreProps {
  score: number;
  maxScore?: number;
}

export default function SecurityScore({ score, maxScore = 100 }: SecurityScoreProps) {
  const percentage = (score / maxScore) * 100;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on score
  const getColor = (s: number) => {
    if (s >= 85) return '#00FF88';
    if (s >= 70) return '#FFD600';
    if (s >= 50) return '#FF6E40';
    return '#FF1744';
  };

  const color = getColor(score);
  const bgColor = `${color}10`;

  return (
    <div className="glass-panel p-6 flex flex-col items-center justify-center">
      <div className="relative w-48 h-48">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          {/* Track */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="rgba(26, 35, 50, 0.8)"
            strokeWidth="8"
          />
          {/* Glow track */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={`${color}10`}
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Progress */}
          <motion.circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              filter: `drop-shadow(0 0 8px ${color}60)`,
            }}
          />
          {/* Inner glow */}
          <motion.circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            opacity={0.3}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <LiveCounter
            value={score}
            className="text-4xl font-heading font-bold"
            duration={1000}
          />
          <span className="text-xs text-cyber-text-dim font-mono">/ {maxScore}</span>
        </div>
      </div>

      {/* Label */}
      <div className="mt-3 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-cyber-text-secondary">
          Security Posture
        </p>
        <div
          className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
          style={{ color, backgroundColor: bgColor }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          {score >= 85 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : score >= 50 ? 'FAIR' : 'CRITICAL'}
        </div>
      </div>
    </div>
  );
}
