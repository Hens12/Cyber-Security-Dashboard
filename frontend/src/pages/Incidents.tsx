/* ═══════════════════════════════════════════════════════════
   Incidents Page — Incident Response Center
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, User, X, Ban, ServerOff, UserX, LogOut, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useSecurityStore } from '../stores/useSecurityStore';
import SeverityBadge from '../components/ui/SeverityBadge';
import { pageVariants, staggerContainer, staggerItem } from '../animations/variants';
import type { Incident } from '../types/security';
import { formatFullTimestamp, timeAgo } from '../utils/formatters';

const stateColors: Record<string, { bg: string; text: string }> = {
  new: { bg: 'rgba(255, 23, 68, 0.12)', text: '#FF1744' },
  triaged: { bg: 'rgba(255, 110, 64, 0.12)', text: '#FF6E40' },
  investigating: { bg: 'rgba(255, 214, 0, 0.12)', text: '#FFD600' },
  contained: { bg: 'rgba(0, 229, 255, 0.12)', text: '#00E5FF' },
  resolved: { bg: 'rgba(0, 255, 136, 0.12)', text: '#00FF88' },
  false_positive: { bg: 'rgba(136, 153, 170, 0.12)', text: '#8899AA' },
};

export default function Incidents() {
  const incidents = useSecurityStore(s => s.incidents);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [actionConfirm, setActionConfirm] = useState<string | null>(null);

  const responseActions = [
    { id: 'block_ip', label: 'Block IP', icon: Ban, color: '#FF1744' },
    { id: 'isolate_host', label: 'Isolate Host', icon: ServerOff, color: '#FF6E40' },
    { id: 'disable_account', label: 'Disable Account', icon: UserX, color: '#FFD600' },
    { id: 'terminate_session', label: 'Terminate Session', icon: LogOut, color: '#9C6BFF' },
    { id: 'escalate', label: 'Escalate', icon: ArrowUpRight, color: '#00E5FF' },
    { id: 'false_positive', label: 'Mark False Positive', icon: CheckCircle2, color: '#8899AA' },
  ];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={20} className="text-cyber-yellow" />
        <h2 className="text-lg font-heading font-bold text-cyber-text tracking-wider">Incident Response Center</h2>
        <span className="text-xs font-mono text-cyber-text-dim">({incidents.length} incidents)</span>
      </div>

      {/* Incident cards */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {incidents.map(inc => {
          const sc = stateColors[inc.state];
          return (
            <motion.div
              key={inc.id}
              variants={staggerItem}
              whileHover={{ y: -2, borderColor: 'rgba(0, 229, 255, 0.2)' }}
              onClick={() => setSelected(inc)}
              className="glass-panel p-4 cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <SeverityBadge severity={inc.severity} size="sm" />
                <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ backgroundColor: sc.bg, color: sc.text }}>
                  {inc.state.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <h4 className="text-sm font-heading font-semibold text-cyber-text mb-1">{inc.title}</h4>
              <p className="text-[10px] font-mono text-cyber-cyan mb-2">{inc.id}</p>
              <div className="flex items-center gap-3 text-[10px] font-mono text-cyber-text-dim">
                <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(inc.created_at)}</span>
                {inc.assigned_to && <span className="flex items-center gap-1"><User size={10} /> {inc.assigned_to}</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {inc.affected_hosts.map(h => (
                  <span key={h} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyber-panel text-cyber-text-secondary">{h}</span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-2xl glass-panel-strong p-6 overflow-y-auto border-l border-cyber-border"
            >
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-cyber-text-dim hover:text-cyber-text"><X size={18} /></button>

              <SeverityBadge severity={selected.severity} size="lg" />
              <h3 className="text-xl font-heading font-bold text-cyber-text mt-3">{selected.title}</h3>
              <p className="text-sm font-mono text-cyber-cyan mt-1">{selected.id}</p>
              <p className="text-sm text-cyber-text-secondary mt-2">{selected.description}</p>

              {/* Timeline */}
              <div className="mt-6">
                <h4 className="text-xs font-heading font-semibold text-cyber-text-secondary uppercase tracking-wider mb-4">Incident Timeline</h4>
                <div className="space-y-0 relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-cyber-border" />
                  {selected.timeline.map((entry, i) => (
                    <div key={i} className="flex gap-3 pb-4 relative">
                      <div className="w-4 h-4 rounded-full bg-cyber-cyan/20 border-2 border-cyber-cyan flex-shrink-0 mt-0.5 z-10" />
                      <div>
                        <p className="text-xs font-heading font-semibold text-cyber-text">{entry.action}</p>
                        <p className="text-[10px] text-cyber-text-secondary mt-0.5">{entry.description}</p>
                        <p className="text-[9px] font-mono text-cyber-text-dim mt-0.5">{formatFullTimestamp(entry.timestamp)} • {entry.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response Actions */}
              <div className="mt-6">
                <h4 className="text-xs font-heading font-semibold text-cyber-text-secondary uppercase tracking-wider mb-3">Response Actions</h4>
                <p className="text-[10px] text-cyber-text-dim font-mono mb-3">⚠ Demo Mode: Actions are simulated</p>
                <div className="grid grid-cols-2 gap-2">
                  {responseActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => setActionConfirm(action.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-mono hover:scale-[1.02]"
                      style={{ borderColor: `${action.color}30`, color: action.color, backgroundColor: `${action.color}08` }}
                    >
                      <action.icon size={14} />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Confirmation */}
              <AnimatePresence>
                {actionConfirm && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="mt-4 p-3 rounded-lg border border-cyber-yellow/30 bg-cyber-yellow/5"
                  >
                    <p className="text-xs text-cyber-yellow font-mono mb-2">⚠ Confirm action: {actionConfirm.replace('_', ' ').toUpperCase()}?</p>
                    <p className="text-[10px] text-cyber-text-dim mb-3">This is a SIMULATED action in Demo Mode</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { alert(`✓ SIMULATED: ${actionConfirm} executed`); setActionConfirm(null); }}
                        className="px-3 py-1.5 rounded bg-cyber-red/15 text-cyber-red text-xs font-mono border border-cyber-red/30 hover:bg-cyber-red/25"
                      >
                        Confirm (Simulated)
                      </button>
                      <button
                        onClick={() => setActionConfirm(null)}
                        className="px-3 py-1.5 rounded bg-cyber-panel text-cyber-text-secondary text-xs font-mono border border-cyber-border hover:bg-cyber-panel-hover"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
