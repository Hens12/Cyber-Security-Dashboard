/* ═══════════════════════════════════════════════════════════
   Security Logs Page — Terminal-style log viewer
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Pause, Play, Search } from 'lucide-react';
import { useSecurityStore } from '../stores/useSecurityStore';
import { pageVariants } from '../animations/variants';
import { formatTimestamp } from '../utils/formatters';

const severityStyle = (sev: string) => {
  switch (sev) {
    case 'critical': return 'text-cyber-red';
    case 'high': return 'text-[#FF6E40]';
    case 'medium': return 'text-cyber-yellow';
    case 'low': return 'text-cyber-cyan';
    default: return 'text-cyber-green';
  }
};

const logTypeLabel = (sev: string) => {
  switch (sev) {
    case 'critical': return 'ALERT';
    case 'high': return 'WARN ';
    case 'medium': return 'WARN ';
    case 'low': return 'INFO ';
    default: return 'INFO ';
  }
};

export default function SecurityLogs() {
  const { events, isLive, toggleLive } = useSecurityStore();
  const [searchFilter, setSearchFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredEvents = events.filter(e => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return e.description.toLowerCase().includes(q) || e.source_ip.includes(q) || e.attack_type.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length, autoScroll]);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-cyber-green" />
          <h2 className="text-lg font-heading font-bold text-cyber-text tracking-wider">Security Logs</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-cyber-text-dim" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search logs..."
              className="pl-7 pr-3 py-1.5 rounded bg-cyber-panel border border-cyber-border text-[10px] font-mono text-cyber-text w-48 focus:border-cyber-cyan/50"
            />
          </div>
          <button onClick={toggleLive} className="flex items-center gap-1 px-2 py-1.5 rounded bg-cyber-panel border border-cyber-border text-[10px] font-mono text-cyber-text-secondary hover:text-cyber-text transition-colors">
            {isLive ? <Pause size={10} /> : <Play size={10} />}
            {isLive ? 'PAUSE' : 'RESUME'}
          </button>
          <button onClick={() => setAutoScroll(!autoScroll)} className={`px-2 py-1.5 rounded border text-[10px] font-mono transition-colors ${autoScroll ? 'bg-cyber-green/10 border-cyber-green/30 text-cyber-green' : 'bg-cyber-panel border-cyber-border text-cyber-text-dim'}`}>
            AUTO-SCROLL
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div className="glass-panel flex-1 overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 220px)' }}>
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-cyber-border bg-cyber-bg">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-red/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-yellow/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-green/70" />
          </div>
          <span className="text-[10px] font-mono text-cyber-text-dim ml-2">root@soc:/var/log/security$ tail -f security.log</span>
        </div>

        {/* Log content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-cyber-bg/50 font-mono text-[11px] leading-relaxed">
          {filteredEvents.map((event) => (
            <div key={event.id} className="flex gap-2 py-0.5 hover:bg-cyber-panel-hover/30 px-1 rounded animate-slide-in">
              <span className="text-cyber-text-dim whitespace-nowrap">{formatTimestamp(event.timestamp)}</span>
              <span className={`${severityStyle(event.severity)} font-semibold whitespace-nowrap`}>
                {logTypeLabel(event.severity)}
              </span>
              <span className="text-cyber-text flex-1">{event.description}</span>
              <span className="text-cyber-cyan whitespace-nowrap">{event.source_ip}</span>
            </div>
          ))}
          {isLive && (
            <div className="flex items-center gap-1 py-0.5 px-1">
              <span className="text-cyber-green terminal-cursor" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
