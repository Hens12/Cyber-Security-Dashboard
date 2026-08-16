/* ═══════════════════════════════════════════════════════════
   TopBar — System status & controls
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, User, Wifi, WifiOff, Radio, Clock } from 'lucide-react';
import { useSecurityStore } from '../../stores/useSecurityStore';
import { useUIStore } from '../../stores/useUIStore';
import StatusIndicator from '../ui/StatusIndicator';

export default function TopBar() {
  const { stats, notifications, isLive } = useSecurityStore();
  const { toggleCommandPalette, toggleNotificationPanel } = useUIStore();
  const [time, setTime] = useState(new Date());
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const statusColor = stats.critical_threats > 5 ? '#FF1744' : stats.critical_threats > 0 ? '#FFD600' : '#00FF88';
  const statusText = stats.critical_threats > 5
    ? `${stats.critical_threats} CRITICAL INCIDENTS`
    : stats.critical_threats > 0
    ? `${stats.active_incidents} ACTIVE INCIDENTS`
    : 'SYSTEM SECURE';

  return (
    <header className="h-12 border-b border-cyber-border bg-cyber-bg-secondary flex items-center justify-between px-4 flex-shrink-0 z-20">
      {/* Left: Search */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-panel border border-cyber-border text-cyber-text-secondary hover:text-cyber-text hover:border-cyber-border-light transition-all text-xs"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyber-bg border border-cyber-border text-cyber-text-dim">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Center: Global Security Status */}
      <div className="flex items-center gap-2">
        <motion.div
          className="flex items-center gap-2 px-4 py-1 rounded-full border"
          style={{
            borderColor: `${statusColor}30`,
            backgroundColor: `${statusColor}08`,
          }}
          animate={{
            borderColor: [`${statusColor}30`, `${statusColor}50`, `${statusColor}30`],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse-glow"
            style={{ backgroundColor: statusColor }}
          />
          <span
            className="text-[11px] font-mono font-semibold tracking-wider"
            style={{ color: statusColor }}
          >
            {statusText}
          </span>
        </motion.div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyber-panel border border-cyber-border">
          {isLive ? (
            <>
              <Radio size={12} className="text-cyber-red animate-pulse-glow" />
              <span className="text-[10px] font-mono font-bold text-cyber-red tracking-wider">LIVE</span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-cyber-text-dim" />
              <span className="text-[10px] font-mono text-cyber-text-dim">PAUSED</span>
            </>
          )}
        </div>

        {/* API Status */}
        <StatusIndicator status="online" label="API" size="sm" />

        {/* WebSocket Status */}
        <div className="hidden md:flex items-center gap-1.5">
          <Wifi size={12} className="text-cyber-green" />
          <span className="text-[10px] font-mono text-cyber-green">WS</span>
        </div>

        {/* Time */}
        <div className="hidden lg:flex items-center gap-1.5 text-cyber-text-secondary">
          <Clock size={12} />
          <span className="text-[11px] font-mono tabular-nums">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>

        {/* Notifications */}
        <button
          onClick={toggleNotificationPanel}
          className="relative p-2 rounded-lg hover:bg-cyber-panel transition-colors text-cyber-text-secondary hover:text-cyber-text"
        >
          <Bell size={16} />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-cyber-red text-white text-[9px] font-bold flex items-center justify-center"
              >
                {unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* User */}
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-cyber-panel transition-colors">
          <div className="w-7 h-7 rounded-full bg-cyber-cyan/15 border border-cyber-cyan/30 flex items-center justify-center">
            <User size={14} className="text-cyber-cyan" />
          </div>
        </button>
      </div>
    </header>
  );
}
