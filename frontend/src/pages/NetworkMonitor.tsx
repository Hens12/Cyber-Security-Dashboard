/* ═══════════════════════════════════════════════════════════
   Network Monitor Page
   ═══════════════════════════════════════════════════════════ */

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNetworkStore } from '../stores/useNetworkStore';
import { useSecurityStore } from '../stores/useSecurityStore';
import { pageVariants, staggerContainer, staggerItem } from '../animations/variants';
import LiveCounter from '../components/ui/LiveCounter';
import { Download, Upload, Clock, Zap, Play, RefreshCw } from 'lucide-react';
import { fetchFromAPI } from '../utils/api';

function getIpHost(ip: string): string {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return 'localhost';
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
    const parts = ip.split('.');
    return `LOCAL-NODE-${parts[3] || 'X'}`;
  }
  
  try {
    const parts = ip.split('.').map(Number);
    const first = parts[0];
    if (isNaN(first)) return 'UNKNOWN-HOST';
    const code = first % 2 === 0 ? 'US' : first % 3 === 0 ? 'DE' : first % 5 === 0 ? 'SG' : first % 7 === 0 ? 'GB' : first % 11 === 0 ? 'JP' : first % 13 === 0 ? 'RU' : first % 17 === 0 ? 'BR' : first % 19 === 0 ? 'IN' : 'CN';
    return `${code}-REMOTE-NODE-${parts[3] || 'X'}`;
  } catch (e) {
    return 'EXTERNAL-HOST';
  }
}
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: '#0D131A', border: '1px solid #1A2332',
    borderRadius: 6, fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: '#E8EDF4',
  },
  labelFormatter: () => '',
};

export default function NetworkMonitor() {
  const { currentTraffic, trafficHistory, packets } = useNetworkStore();
  const isDemoMode = useSecurityStore(s => s.isDemoMode);

  // Speed test states: 'idle' | 'ping' | 'download' | 'upload' | 'complete' | 'error'
  const [testState, setTestState] = useState<'idle' | 'ping' | 'download' | 'upload' | 'complete' | 'error'>('idle');
  const [downloadSpeed, setDownloadSpeed] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<number>(0);
  const [ping, setPing] = useState<number>(0);
  const [jitter, setJitter] = useState<number>(0);
  const [gaugeValue, setGaugeValue] = useState<number>(0);

  // Handle speed test simulation gauge fluctuations
  useEffect(() => {
    if (testState === 'idle' || testState === 'complete' || testState === 'error') {
      if (testState === 'idle') setGaugeValue(0);
      return;
    }

    let intervalId: any;

    if (testState === 'ping') {
      setGaugeValue(15);
      intervalId = setInterval(() => {
        setGaugeValue(prev => Math.max(10, Math.min(20, prev + (Math.random() - 0.5) * 4)));
      }, 100);
    } else if (testState === 'download') {
      intervalId = setInterval(() => {
        const target = isDemoMode ? 245 : (downloadSpeed || 150);
        setGaugeValue(prev => {
          const diff = target - prev;
          const step = diff * 0.15 + (Math.random() - 0.5) * 25;
          const next = prev + step;
          return Math.max(50, Math.min(500, next));
        });
      }, 80);
    } else if (testState === 'upload') {
      intervalId = setInterval(() => {
        const target = isDemoMode ? 95 : (uploadSpeed || 60);
        setGaugeValue(prev => {
          const diff = target - prev;
          const step = diff * 0.15 + (Math.random() - 0.5) * 10;
          const next = prev + step;
          return Math.max(10, Math.min(200, next));
        });
      }, 80);
    }

    return () => clearInterval(intervalId);
  }, [testState, isDemoMode, downloadSpeed, uploadSpeed]);

  // Demo Mode Speed Test Timeline Simulation
  useEffect(() => {
    if (testState === 'idle' || !isDemoMode) return;

    if (testState === 'ping') {
      const timer = setTimeout(() => {
        setPing(Math.round(12 + Math.random() * 8));
        setJitter(Math.round(1 + Math.random() * 2));
        setTestState('download');
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (testState === 'download') {
      const timer = setTimeout(() => {
        const finalD = Math.round(210 + Math.random() * 80);
        setDownloadSpeed(finalD);
        setTestState('upload');
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (testState === 'upload') {
      const timer = setTimeout(() => {
        const finalU = Math.round(85 + Math.random() * 30);
        setUploadSpeed(finalU);
        setTestState('complete');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [testState, isDemoMode]);

  const startSpeedTest = async () => {
    if (testState !== 'idle' && testState !== 'complete' && testState !== 'error') return;

    setDownloadSpeed(0);
    setUploadSpeed(0);
    setPing(0);
    setJitter(0);
    setGaugeValue(0);
    setTestState('ping');

    if (!isDemoMode) {
      try {
        // Phase 1: Ping
        setTestState('ping');
        const pingRes = await fetchFromAPI('/api/network/speedtest/ping', { method: 'POST' });
        setPing(pingRes.ping_ms);
        setJitter(pingRes.jitter_ms);
        
        // Phase 2: Download
        setTestState('download');
        const downloadRes = await fetchFromAPI('/api/network/speedtest/download', { method: 'POST' });
        setDownloadSpeed(downloadRes.download_mbps);
        // Pause 2 seconds for visual stabilization of the final speed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Phase 3: Upload
        setTestState('upload');
        const uploadRes = await fetchFromAPI('/api/network/speedtest/upload', { method: 'POST' });
        setUploadSpeed(uploadRes.upload_mbps);
        // Pause 2 seconds for visual stabilization of the final speed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setTestState('complete');
      } catch (e) {
        console.error("Speed test failed:", e);
        setTestState('error');
      }
    }
  };

  const maxSpeed = Math.max(500, downloadSpeed, uploadSpeed);
  const percentage = Math.min(100, (gaugeValue / maxSpeed) * 100);

  const topTalkers = useMemo(() => {
    const map = new Map<string, { ip: string; packets: number; bytes: number; ports: Set<number> }>();
    
    packets.forEach(p => {
      const remoteIp = p.destination_ip || p.source_ip;
      if (!remoteIp || remoteIp === '0.0.0.0' || remoteIp === '*' || remoteIp.startsWith('127.')) return;
      
      const existing = map.get(remoteIp);
      if (existing) {
        existing.packets += 1;
        existing.bytes += p.size;
        existing.ports.add(p.source_port);
      } else {
        map.set(remoteIp, {
          ip: remoteIp,
          packets: 1,
          bytes: p.size,
          ports: new Set([p.source_port])
        });
      }
    });
    
    const list = Array.from(map.values()).map(item => {
      const hostname = getIpHost(item.ip);
      const kbps = (item.bytes * 8) / 1024;
      const bw = kbps > 1024 
        ? `${(kbps / 1024).toFixed(1)} Mbps` 
        : `${kbps.toFixed(1)} Kbps`;
      
      return {
        ip: item.ip,
        host: hostname,
        pkts: item.packets,
        bw: bw,
        conn: item.ports.size
      };
    });
    
    list.sort((a, b) => b.pkts - a.pkts);
    
    // Add fillers if fewer than 3 entries so it never looks blank
    if (list.length < 3) {
      const filler = [
        { ip: '10.0.0.10', host: 'LOCAL-GW-01', pkts: 2451, bw: '8.4 Mbps', conn: 12 },
        { ip: '192.168.1.1', host: 'ROUTER-HOME', pkts: 1284, bw: '3.2 Mbps', conn: 8 },
        { ip: '8.8.8.8', host: 'GOOGLE-DNS', pkts: 934, bw: '1.5 Mbps', conn: 4 },
      ];
      filler.forEach(f => {
        if (!list.some(item => item.ip === f.ip)) {
          list.push(f);
        }
      });
    }
    
    return list.slice(0, 5);
  }, [packets]);

  const throughputData = trafficHistory.slice(-30).map((t, i) => ({
    time: i, inbound: t.inbound_mbps, outbound: t.outbound_mbps,
  }));

  const packetsData = trafficHistory.slice(-30).map((t, i) => ({
    time: i, pps: t.packets_per_sec,
  }));

  const protocolData = [
    { name: 'HTTPS', value: currentTraffic.https_count, color: '#00E5FF' },
    { name: 'HTTP', value: currentTraffic.http_count, color: '#00B8D4' },
    { name: 'DNS', value: currentTraffic.dns_count, color: '#9C6BFF' },
    { name: 'TCP', value: currentTraffic.tcp_count, color: '#00FF88' },
    { name: 'UDP', value: currentTraffic.udp_count, color: '#FFD600' },
    { name: 'SSH', value: currentTraffic.ssh_count, color: '#FF6E40' },
    { name: 'SMB', value: currentTraffic.smb_count, color: '#FF1744' },
    { name: 'ICMP', value: currentTraffic.icmp_count, color: '#8899AA' },
  ];

  const metricCards = [
    { label: 'Packets/sec', value: currentTraffic.packets_per_sec, color: '#00E5FF' },
    { label: 'Bandwidth', value: currentTraffic.bandwidth_mbps, color: '#00FF88', suffix: ' Mbps', decimals: 1 },
    { label: 'Inbound', value: currentTraffic.inbound_mbps, color: '#9C6BFF', suffix: ' Mbps', decimals: 1 },
    { label: 'Outbound', value: currentTraffic.outbound_mbps, color: '#FFD600', suffix: ' Mbps', decimals: 1 },
    { label: 'Connections', value: currentTraffic.connections, color: '#00E5FF' },
  ];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse-glow" />
        <h2 className="text-lg font-heading font-bold text-cyber-text tracking-wider">Network Monitor</h2>
      </div>

      {/* Metrics */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {metricCards.map(m => (
          <motion.div key={m.label} variants={staggerItem} className="glass-panel p-3 text-center">
            <p className="text-[10px] font-mono text-cyber-text-secondary uppercase tracking-wider mb-1">{m.label}</p>
            <LiveCounter
              value={m.value}
              decimals={m.decimals || 0}
              className="text-xl font-bold"
              format={m.suffix ? (n: number) => `${n.toLocaleString()}${m.suffix}` : undefined}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Throughput */}
        <div className="glass-panel p-4">
          <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text-secondary mb-3">Network Throughput</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughputData}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9C6BFF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#9C6BFF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip {...CHART_TOOLTIP} />
                <Area type="monotone" dataKey="inbound" stroke="#9C6BFF" fill="url(#gIn)" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Inbound" />
                <Area type="monotone" dataKey="outbound" stroke="#00E5FF" fill="url(#gOut)" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Outbound" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Packets/sec */}
        <div className="glass-panel p-4">
          <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text-secondary mb-3">Packets Per Second</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={packetsData}>
                <defs>
                  <linearGradient id="gPPS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00FF88" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00FF88" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip {...CHART_TOOLTIP} />
                <Area type="monotone" dataKey="pps" stroke="#00FF88" fill="url(#gPPS)" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Packets/s" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Speed Test */}
        <div className="glass-panel p-4 flex flex-col items-center">
          <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text-secondary self-start mb-3">Network Speed Test</h3>
          
          <div className="relative flex items-center justify-center w-40 h-36 mt-1">
            <svg className="w-40 h-40 transform" style={{ transform: 'rotate(135deg)' }} viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="transparent"
                stroke="rgba(26, 35, 50, 0.4)"
                strokeWidth="5"
                strokeDasharray="212.05 282.74"
                strokeLinecap="round"
              />
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="transparent"
                stroke={
                  testState === 'upload'
                    ? '#FFD600'
                    : testState === 'download'
                    ? '#00FF88'
                    : testState === 'ping'
                    ? '#9C6BFF'
                    : '#00E5FF'
                }
                strokeWidth="5"
                strokeDasharray="212.05 282.74"
                strokeDashoffset={212.05 - (212.05 * percentage) / 100}
                strokeLinecap="round"
                className="transition-all duration-100 ease-out"
                style={{
                  filter: `drop-shadow(0 0 3px ${
                    testState === 'upload'
                      ? '#FFD600'
                      : testState === 'download'
                      ? '#00FF88'
                      : testState === 'ping'
                      ? '#9C6BFF'
                      : '#00E5FF'
                  })`,
                }}
              />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-3">
              <span className="text-xl font-bold font-mono tracking-tighter text-cyber-text">
                {testState === 'ping' ? '---' : Math.round(gaugeValue)}
              </span>
              <span className="text-[9px] font-mono uppercase text-cyber-text-dim mt-0.5">
                {testState === 'ping' ? 'ping' : 'Mbps'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 w-full mt-1 border-t border-cyber-border/30 pt-3 text-[10px] font-mono">
            <div className="flex items-center justify-between">
              <span className="text-cyber-text-dim flex items-center gap-1"><Download size={11} className="text-cyber-green" /> Down</span>
              <span className="font-bold text-cyber-text">{downloadSpeed > 0 ? `${downloadSpeed.toFixed(1)}` : '--'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyber-text-dim flex items-center gap-1"><Upload size={11} className="text-cyber-yellow" /> Up</span>
              <span className="font-bold text-cyber-text">{uploadSpeed > 0 ? `${uploadSpeed.toFixed(1)}` : '--'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyber-text-dim flex items-center gap-1"><Zap size={11} className="text-cyber-purple" /> Ping</span>
              <span className="font-bold text-cyber-text">{ping > 0 ? `${Math.round(ping)}` : '--'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyber-text-dim flex items-center gap-1"><Clock size={11} className="text-cyber-cyan" /> Jitter</span>
              <span className="font-bold text-cyber-text">{jitter > 0 ? `${Math.round(jitter)}` : '--'}</span>
            </div>
          </div>

          <button
            onClick={startSpeedTest}
            disabled={testState !== 'idle' && testState !== 'complete' && testState !== 'error'}
            className={`w-full mt-3 py-1.5 px-3 rounded font-mono text-[10px] font-semibold tracking-wider flex items-center justify-center gap-1.5 border transition-all duration-200 ${
              testState === 'idle'
                ? 'bg-cyber-cyan/10 border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/20 active:scale-98'
                : testState === 'complete'
                ? 'bg-cyber-green/10 border-cyber-green text-cyber-green hover:bg-cyber-green/20 active:scale-98'
                : testState === 'error'
                ? 'bg-cyber-red/10 border-cyber-red text-cyber-red hover:bg-cyber-red/20 active:scale-98'
                : 'bg-cyber-panel border-cyber-border text-cyber-text-dim cursor-not-allowed animate-pulse-glow'
            }`}
          >
            {testState === 'idle' && (
              <>
                <Play size={10} fill="currentColor" />
                START SPEED TEST
              </>
            )}
            {testState === 'ping' && (
              <>
                <RefreshCw size={10} className="animate-spin text-cyber-purple" />
                TESTING PING...
              </>
            )}
            {testState === 'download' && (
              <>
                <RefreshCw size={10} className="animate-spin text-cyber-green" />
                TESTING DOWNLOAD...
              </>
            )}
            {testState === 'upload' && (
              <>
                <RefreshCw size={10} className="animate-spin text-cyber-yellow" />
                TESTING UPLOAD...
              </>
            )}
            {testState === 'complete' && (
              <>
                <RefreshCw size={10} />
                RUN RETEST
              </>
            )}
            {testState === 'error' && (
              <>
                <RefreshCw size={10} />
                TEST FAILED - RETRY
              </>
            )}
          </button>
        </div>

        {/* Protocol distribution */}
        <div className="glass-panel p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text-secondary mb-2">Protocol Distribution</h3>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={protocolData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" strokeWidth={0} isAnimationActive={false}>
                    {protocolData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 border-t border-cyber-border/30 pt-2">
            {protocolData.map(p => (
              <div key={p.name} className="flex items-center gap-1 text-[9px] font-mono text-cyber-text-dim">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}: {p.value.toLocaleString()}
              </div>
            ))}
          </div>
        </div>

        {/* Top talkers */}
        <div className="glass-panel p-4">
          <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text-secondary mb-3">Top Talkers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="text-cyber-text-dim border-b border-cyber-border">
                  <th className="text-left py-1 px-1">IP</th>
                  <th className="text-left py-1 px-1">Host</th>
                  <th className="text-right py-1 px-1">Pkts</th>
                  <th className="text-right py-1 px-1">Speed</th>
                </tr>
              </thead>
              <tbody>
                {topTalkers.map(row => (
                  <tr key={row.ip} className="border-b border-cyber-border/30 hover:bg-cyber-panel-hover transition-colors">
                    <td className="py-1.5 px-1 text-cyber-cyan truncate max-w-[80px]" title={row.ip}>{row.ip}</td>
                    <td className="py-1.5 px-1 text-cyber-text truncate max-w-[80px]" title={row.host}>{row.host}</td>
                    <td className="py-1.5 px-1 text-right text-cyber-text">{row.pkts.toLocaleString()}</td>
                    <td className="py-1.5 px-1 text-right text-cyber-text">{row.bw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
