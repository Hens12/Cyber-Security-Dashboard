/* ═══════════════════════════════════════════════════════════
   Packet Analyzer Page
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useNetworkStore } from '../stores/useNetworkStore';
import { pageVariants } from '../animations/variants';
import { formatTimestamp } from '../utils/formatters';

export default function PacketAnalyzer() {
  const packets = useNetworkStore(s => s.packets);
  const [filter, setFilter] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('ALL');
  const [selectedPacket, setSelectedPacket] = useState<string | null>(null);

  const filteredPackets = useMemo(() => {
    return packets.filter(p => {
      if (protocolFilter !== 'ALL' && p.protocol !== protocolFilter) return false;
      if (filter) {
        const q = filter.toLowerCase();
        return (
          p.source_ip.includes(q) ||
          p.destination_ip.includes(q) ||
          p.protocol.toLowerCase().includes(q) ||
          (p.threat?.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [packets, filter, protocolFilter]);

  const statusColor = (status: string) => {
    if (status === 'malicious') return '#FF1744';
    if (status === 'suspicious') return '#FFD600';
    return '#00FF88';
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse-glow" />
          <h2 className="text-lg font-heading font-bold text-cyber-text tracking-wider">Packet Analyzer</h2>
          <span className="text-xs font-mono text-cyber-text-dim">({filteredPackets.length} packets)</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-text-dim" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by IP, protocol, threat..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-cyber-panel border border-cyber-border text-xs font-mono text-cyber-text placeholder:text-cyber-text-dim focus:border-cyber-cyan/50 transition-colors"
          />
        </div>
        <select
          value={protocolFilter}
          onChange={e => setProtocolFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-cyber-panel border border-cyber-border text-xs font-mono text-cyber-text cursor-pointer"
        >
          <option value="ALL">All Protocols</option>
          {['TCP', 'UDP', 'ICMP', 'DNS', 'HTTP', 'HTTPS', 'SSH', 'SMB'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Packet table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <table className="w-full text-[11px] font-mono">
            <thead className="sticky top-0 bg-cyber-panel z-10">
              <tr className="text-cyber-text-dim border-b border-cyber-border">
                <th className="text-left py-2.5 px-3">Time</th>
                <th className="text-left py-2.5 px-3">Source IP</th>
                <th className="text-left py-2.5 px-3">Port</th>
                <th className="text-left py-2.5 px-3">Dest IP</th>
                <th className="text-left py-2.5 px-3">Port</th>
                <th className="text-left py-2.5 px-3">Proto</th>
                <th className="text-right py-2.5 px-3">Size</th>
                <th className="text-left py-2.5 px-3">Flags</th>
                <th className="text-left py-2.5 px-3">Status</th>
                <th className="text-left py-2.5 px-3">Threat</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackets.slice(0, 100).map(pkt => (
                <tr
                  key={pkt.id}
                  onClick={() => setSelectedPacket(selectedPacket === pkt.id ? null : pkt.id)}
                  className={`border-b border-cyber-border/30 cursor-pointer transition-colors ${
                    pkt.status === 'malicious' ? 'bg-cyber-red/5 hover:bg-cyber-red/10' :
                    pkt.status === 'suspicious' ? 'bg-cyber-yellow/5 hover:bg-cyber-yellow/10' :
                    'hover:bg-cyber-panel-hover'
                  }`}
                >
                  <td className="py-2 px-3 text-cyber-text-dim">{formatTimestamp(pkt.timestamp)}</td>
                  <td className="py-2 px-3 text-cyber-cyan">{pkt.source_ip}</td>
                  <td className="py-2 px-3 text-cyber-text-dim">{pkt.source_port}</td>
                  <td className="py-2 px-3 text-cyber-cyan">{pkt.destination_ip}</td>
                  <td className="py-2 px-3 text-cyber-text-dim">{pkt.destination_port}</td>
                  <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded bg-cyber-panel text-cyber-text text-[10px]">{pkt.protocol}</span></td>
                  <td className="py-2 px-3 text-right text-cyber-text-dim">{pkt.size}</td>
                  <td className="py-2 px-3 text-cyber-text-dim">{pkt.flags || '—'}</td>
                  <td className="py-2 px-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor(pkt.status) }} />
                      <span style={{ color: statusColor(pkt.status) }}>{pkt.status.toUpperCase()}</span>
                    </span>
                  </td>
                  <td className="py-2 px-3 text-cyber-red text-[10px]">{pkt.threat || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
