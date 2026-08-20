/* ═══════════════════════════════════════════════════════════
   Hosts Page — Host Monitoring
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, X, Cpu, HardDrive, Wifi, Terminal, RotateCcw, Power, Ban } from 'lucide-react';
import { pageVariants } from '../animations/variants';
import { generateHosts } from '../utils/demo';
import type { Host } from '../types/system';
import { useSecurityStore } from '../stores/useSecurityStore';
import { fetchFromAPI, API_BASE } from '../utils/api';
import HostTerminal from '../components/ui/HostTerminal';

const riskColors: Record<string, string> = { critical: '#FF1744', high: '#FF6E40', medium: '#FFD600', low: '#00E5FF' };

export default function Hosts() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selected, setSelected] = useState<Host | null>(null);
  const isDemoMode = useSecurityStore(s => s.isDemoMode);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [restartDialog, setRestartDialog] = useState(false);
  const [restartDelay, setRestartDelay] = useState(30);
  const [restartPending, setRestartPending] = useState(false);
  const [restartMsg, setRestartMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'compute' | 'network'>('compute');

  const computeHosts = hosts.filter(h => h.os !== 'Network Device');
  const networkDevices = hosts.filter(h => h.os === 'Network Device');
  const displayedHosts = activeTab === 'compute' ? computeHosts : networkDevices;

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

  // Close terminal when drawer closes
  useEffect(() => {
    if (!selected) {
      setTerminalOpen(false);
      setRestartDialog(false);
    }
  }, [selected]);

  const handleRestart = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/system/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delay: restartDelay }),
      });
      const data = await res.json();
      if (res.ok) {
        setRestartPending(true);
        setRestartMsg(data.message);
        setRestartDialog(false);
      } else {
        setRestartMsg(`Error: ${data.detail}`);
      }
    } catch (e) {
      setRestartMsg(`Failed: ${e}`);
    }
  };

  const handleCancelRestart = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/system/restart/cancel`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setRestartPending(false);
        setRestartMsg(data.message);
        setTimeout(() => setRestartMsg(''), 3000);
      } else {
        setRestartMsg(`Error: ${data.detail}`);
      }
    } catch (e) {
      setRestartMsg(`Failed: ${e}`);
    }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Server size={20} className="text-cyber-cyan" />
          <h2 className="text-lg font-heading font-bold text-cyber-text tracking-wider">Host Monitoring</h2>
          <span className="text-xs font-mono text-cyber-text-dim">({displayedHosts.length} active)</span>
        </div>
      </div>

      {/* Cyberpunk Tab Selection */}
      <div className="flex gap-2 border-b border-cyber-border/40 pb-px mb-3">
        <button
          onClick={() => {
            setActiveTab('compute');
            setSelected(null);
          }}
          className={`px-4 py-2 border-b-2 text-xs font-heading font-semibold tracking-wider uppercase transition-all duration-200 ${
            activeTab === 'compute'
              ? 'border-cyber-cyan text-cyber-cyan bg-cyber-cyan/5 shadow-[inset_0_0_8px_rgba(0,229,255,0.03)]'
              : 'border-transparent text-cyber-text-dim hover:text-cyber-text hover:bg-cyber-panel/20'
          }`}
        >
          Compute Hosts & Servers ({computeHosts.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('network');
            setSelected(null);
          }}
          className={`px-4 py-2 border-b-2 text-xs font-heading font-semibold tracking-wider uppercase transition-all duration-200 ${
            activeTab === 'network'
              ? 'border-cyber-cyan text-cyber-cyan bg-cyber-cyan/5 shadow-[inset_0_0_8px_rgba(0,229,255,0.03)]'
              : 'border-transparent text-cyber-text-dim hover:text-cyber-text hover:bg-cyber-panel/20'
          }`}
        >
          Network Devices & Infrastructure ({networkDevices.length})
        </button>
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
              {displayedHosts.map(h => (
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
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} onClick={e => e.stopPropagation()} className="relative w-full max-w-xl glass-panel-strong p-6 overflow-y-auto border-l border-cyber-border">
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

              {/* ── Host Actions ── */}
              <div className="mt-6">
                <h4 className="text-xs font-heading font-semibold text-cyber-text-secondary uppercase tracking-wider mb-3">Host Actions</h4>
                
                {selected.os === 'Network Device' ? (
                  <div className="p-3.5 rounded-lg border border-cyber-border/85 bg-cyber-panel/20 text-[10px] font-mono text-cyber-text-dim leading-relaxed">
                    ℹ️ Remote operations agent is not deployed on network infrastructure hardware. Terminal sessions and server restarts are unavailable for this device.
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      {/* Terminal Toggle */}
                      <button
                        onClick={() => setTerminalOpen(!terminalOpen)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-all hover:scale-[1.02] ${
                          terminalOpen
                            ? 'bg-cyber-cyan/15 border-cyber-cyan/40 text-cyber-cyan'
                            : 'bg-cyber-panel border-cyber-border text-cyber-text-secondary hover:border-cyber-cyan/30 hover:text-cyber-cyan'
                        }`}
                      >
                        <Terminal size={14} />
                        {terminalOpen ? 'Close Terminal' : 'Open Terminal'}
                      </button>

                      {/* Restart Button */}
                      {!restartPending ? (
                        <button
                          onClick={() => setRestartDialog(true)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyber-red/30 text-cyber-red text-xs font-mono bg-cyber-red/5 hover:bg-cyber-red/15 transition-all hover:scale-[1.02]"
                        >
                          <Power size={14} />
                          Restart System
                        </button>
                      ) : (
                        <button
                          onClick={handleCancelRestart}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyber-yellow/30 text-cyber-yellow text-xs font-mono bg-cyber-yellow/5 hover:bg-cyber-yellow/15 transition-all hover:scale-[1.02] animate-pulse"
                        >
                          <Ban size={14} />
                          Cancel Restart
                        </button>
                      )}
                    </div>

                    {/* Restart status message */}
                    {restartMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-2 px-3 py-2 rounded-lg text-[11px] font-mono border ${
                          restartPending
                            ? 'bg-cyber-red/8 border-cyber-red/20 text-cyber-red'
                            : 'bg-cyber-green/8 border-cyber-green/20 text-cyber-green'
                        }`}
                      >
                        {restartPending && <RotateCcw size={10} className="inline mr-1 animate-spin" />}
                        {restartMsg}
                      </motion.div>
                    )}
                  </>
                )}
              </div>

              {/* ── Restart Confirmation Dialog ── */}
              <AnimatePresence>
                {restartDialog && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-4 p-4 rounded-lg border border-cyber-red/30 bg-cyber-red/5"
                  >
                    <p className="text-xs text-cyber-red font-heading font-semibold mb-1">
                      ⚠ Confirm System Restart
                    </p>
                    <p className="text-[10px] text-cyber-text-dim mb-3">
                      This will restart the host machine ({selected.hostname}). All active processes will be terminated.
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-mono text-cyber-text-secondary">Delay:</span>
                      {[5, 30, 60, 120].map(d => (
                        <button
                          key={d}
                          onClick={() => setRestartDelay(d)}
                          className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                            restartDelay === d
                              ? 'bg-cyber-red/15 border-cyber-red/40 text-cyber-red'
                              : 'bg-cyber-panel border-cyber-border text-cyber-text-dim hover:border-cyber-red/20'
                          }`}
                        >
                          {d}s
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRestart}
                        className="px-3 py-1.5 rounded bg-cyber-red/15 text-cyber-red text-xs font-mono border border-cyber-red/30 hover:bg-cyber-red/25 transition-colors"
                      >
                        <Power size={10} className="inline mr-1" />
                        Confirm Restart
                      </button>
                      <button
                        onClick={() => setRestartDialog(false)}
                        className="px-3 py-1.5 rounded bg-cyber-panel text-cyber-text-secondary text-xs font-mono border border-cyber-border hover:bg-cyber-panel-hover transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Embedded Terminal ── */}
              <AnimatePresence>
                {terminalOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 rounded-lg overflow-hidden border border-cyber-border"
                  >
                    <HostTerminal hostIp={selected.ip} />
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
