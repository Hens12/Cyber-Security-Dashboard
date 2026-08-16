/* ═══════════════════════════════════════════════════════════
   ThreatFeed — Real-time scrolling security events
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, ChevronRight } from 'lucide-react';
import { useSecurityStore } from '../../stores/useSecurityStore';
import SeverityBadge from '../ui/SeverityBadge';
import { formatTimestamp } from '../../utils/formatters';
import { threatFeedItem } from '../../animations/variants';

export default function ThreatFeed() {
  const { events, isLive, toggleLive } = useSecurityStore();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const displayEvents = events.slice(0, 50);

  return (
    <div className="glass-panel flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyber-red animate-pulse-glow" />
          <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text">
            Live Threat Feed
          </h3>
          <span className="text-[10px] font-mono text-cyber-text-dim">
            ({events.length} events)
          </span>
        </div>
        <button
          onClick={toggleLive}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono text-cyber-text-secondary hover:text-cyber-text bg-cyber-panel border border-cyber-border hover:border-cyber-border-light transition-colors"
        >
          {isLive ? <Pause size={10} /> : <Play size={10} />}
          {isLive ? 'PAUSE' : 'RESUME'}
        </button>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence initial={false}>
          {displayEvents.map((event) => (
            <motion.div
              key={event.id}
              variants={threatFeedItem}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
              onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
              className="px-4 py-2.5 border-b border-cyber-border/50 hover:bg-cyber-panel-hover cursor-pointer transition-colors group"
            >
              <div className="flex items-start gap-3">
                {/* Timestamp */}
                <span className="text-[10px] font-mono text-cyber-text-dim whitespace-nowrap mt-0.5">
                  [{formatTimestamp(event.timestamp)}]
                </span>

                {/* Severity */}
                <SeverityBadge severity={event.severity} size="sm" />

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-cyber-text truncate">
                    {event.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-cyber-text-dim">
                      {event.source_ip}
                    </span>
                    <ChevronRight size={8} className="text-cyber-text-dim" />
                    <span className="text-[10px] font-mono text-cyber-text-dim">
                      {event.destination_ip}
                    </span>
                    {event.mitre_technique && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/20">
                        {event.mitre_technique}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {selectedEvent === event.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 pt-2 border-t border-cyber-border/30 grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>
                        <span className="text-cyber-text-dim">Attack Type:</span>{' '}
                        <span className="text-cyber-text">{event.attack_type}</span>
                      </div>
                      <div>
                        <span className="text-cyber-text-dim">Source:</span>{' '}
                        <span className="text-cyber-text">{event.country_source}</span>
                      </div>
                      <div>
                        <span className="text-cyber-text-dim">Destination Port:</span>{' '}
                        <span className="text-cyber-text">{event.destination_port}</span>
                      </div>
                      <div>
                        <span className="text-cyber-text-dim">MITRE Tactic:</span>{' '}
                        <span className="text-cyber-text">{event.mitre_tactic || 'N/A'}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
