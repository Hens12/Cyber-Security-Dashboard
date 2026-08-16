/* ═══════════════════════════════════════════════════════════
   Hosts Page — Host Monitoring
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, X, Cpu, HardDrive, Wifi } from 'lucide-react';
import { pageVariants } from '../animations/variants';
import { generateHosts } from '../utils/demo';
import type { Host } from '../types/system';
import { useSecurityStore } from '../stores/useSecurityStore';
import { fetchFromAPI } from '../utils/api';

const riskColors = { critical: '#FF1744', high: '#FF6E40', medium: '#FFD600', low: '#00E5FF' };

export default function Hosts() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selected, setSelected] = useState<Host | null>(null);
  const isDemoMode = useSecurityStore(s => s.isDemoMode);

  useEffect(() => {
    if (!isDemoMode) {
      const fetchHosts = async () => {
        try {
          const data = await fetchFromAPI('/api/hosts');
          setHosts(data);
          setSelected(prev => {
            if (!prev) return null;
            const updated = data.find((h: Host) => h.id === prev.id);
            return updated || null;
          });
        } catch (e) {
          console.error("Failed to fetch live hosts:", e);
        }
      };
      fetchHosts();
      const iv = setInterval(fetchHosts, 3000);
      return () => clearInterval(iv);
    } else {
      setHosts(generateHosts());
      const iv = setInterval(() => {
        setHosts(prev => prev.map(h => ({
          ...h,
          cpu_usage: Math.max(5, Math.min(95, h.cpu_usage + (Math.random() - 0.5) * 8)),
          ram_usage: Math.max(10, Math.min(95, h.ram_usage + (Math.random() - 0.5) * 4)),
          network_mbps: Math.max(0.5, Math.min(100, h.network_mbps + (Math.random() - 0.5) * 5)),
        })));
      }, 3000);
      return () => clearInterval(iv);
    }
  }, [isDemoMode]);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Server size={20} className="text-cyber-cyan" />
        <h2 className="text-lg font-heading font-bold text-cyber-text tracking-wider">Host Monitoring</h2>
        <span className="text-xs font-mono text-cyber-text-dim">({hosts.length} hosts)</span>
      </div>

      {/* Host table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <table className="w-full text-[11px] font-mono">
            <thead className="sticky top-0 bg-cyber-panel z-10">
              <tr className="text-cyber-text-dim border-b border-cyber-border">
                <th className="text-left py-2.5 px-3">Hostname</th>
                <th className="text-left py-2.5 px-3">IP</th>
                <th className="text-left py-2.5 px-3">OS</th>
                <th className="text-center py-2.5 px-3">CPU</th>
                <th className="text-center py-2.5 px-3">RAM</th>
                <th className="text-center py-2.5 px-3">Network</th>
                <th className="text-center py-2.5 px-3">Risk</th>
                <th className="text-center py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {hosts.map(h => (
                <tr key={h.id} onClick={() => setSelected(h)} className="border-b border-cyber-border/30 hover:bg-cyber-panel-hover cursor-pointer transition-colors">
                  <td className="py-2.5 px-3 text-cyber-text font-semibold">{h.hostname}</td>
                  <td className="py-2.5 px-3 text-cyber-cyan">{h.ip}</td>
                  <td className="py-2.5 px-3 text-cyber-text-secondary">{h.os}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-cyber-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${h.cpu_usage}%`,
                          backgroundColor: h.cpu_usage > 80 ? '#FF1744' : h.cpu_usage > 60 ? '#FFD600' : '#00FF88',
                        }} />
                      </div>
                      <span className="text-cyber-text-dim w-8 text-right">{Math.round(h.cpu_usage)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-cyber-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${h.ram_usage}%`,
                          backgroundColor: h.ram_usage > 80 ? '#FF1744' : h.ram_usage > 60 ? '#FFD600' : '#00E5FF',
                        }} />
                      </div>
                      <span className="text-cyber-text-dim w-8 text-right">{Math.round(h.ram_usage)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center text-cyber-text-secondary">{h.network_mbps.toFixed(1)} Mbps</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase" style={{
                      color: riskColors[h.risk_level], backgroundColor: `${riskColors[h.risk_level]}12`,
                    }}>{h.risk_level}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="flex items-center justify-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${h.status === 'online' ? 'bg-cyber-green' : h.status === 'degraded' ? 'bg-cyber-yellow' : 'bg-cyber-red'}`} />
                      <span className={`text-[10px] uppercase ${h.status === 'online' ? 'text-cyber-green' : h.status === 'degraded' ? 'text-cyber-yellow' : 'text-cyber-red'}`}>{h.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
            <div className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} onClick={e => e.stopPropagation()} className="relative w-full max-w-lg glass-panel-strong p-6 overflow-y-auto border-l border-cyber-border">
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-cyber-text-dim hover:text-cyber-text"><X size={18} /></button>
              <h3 className="text-lg font-heading font-bold text-cyber-text">{selected.hostname}</h3>
              <p className="text-sm font-mono text-cyber-cyan mt-1">{selected.ip}</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="glass-panel p-3"><Cpu size={14} className="text-cyber-text-dim mb-1" /><p className="text-lg font-bold font-mono">{Math.round(selected.cpu_usage)}%</p><p className="text-[10px] text-cyber-text-dim">CPU Usage</p></div>
                <div className="glass-panel p-3"><HardDrive size={14} className="text-cyber-text-dim mb-1" /><p className="text-lg font-bold font-mono">{Math.round(selected.ram_usage)}%</p><p className="text-[10px] text-cyber-text-dim">RAM Usage</p></div>
                <div className="glass-panel p-3"><Wifi size={14} className="text-cyber-text-dim mb-1" /><p className="text-lg font-bold font-mono">{selected.network_mbps.toFixed(1)}</p><p className="text-[10px] text-cyber-text-dim">Network Mbps</p></div>
                <div className="glass-panel p-3"><Server size={14} className="text-cyber-text-dim mb-1" /><p className="text-lg font-bold font-mono">{selected.open_ports.length}</p><p className="text-[10px] text-cyber-text-dim">Open Ports</p></div>
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-heading font-semibold text-cyber-text-secondary uppercase tracking-wider mb-2">Open Ports</h4>
                <div className="flex flex-wrap gap-1">{selected.open_ports.map(p => <span key={p} className="px-2 py-0.5 rounded bg-cyber-panel border border-cyber-border text-[10px] font-mono text-cyber-cyan">{p}</span>)}</div>
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-heading font-semibold text-cyber-text-secondary uppercase tracking-wider mb-2">Services</h4>
                <div className="flex flex-wrap gap-1">{selected.services.map(s => <span key={s} className="px-2 py-0.5 rounded bg-cyber-purple/10 border border-cyber-purple/20 text-[10px] font-mono text-cyber-purple">{s}</span>)}</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
