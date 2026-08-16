/* ═══════════════════════════════════════════════════════════
   Analytics Page — Security Analytics Dashboard
   ═══════════════════════════════════════════════════════════ */

import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

import { pageVariants, staggerContainer, staggerItem } from '../animations/variants';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

const TT = {
  contentStyle: { backgroundColor: '#0D131A', border: '1px solid #1A2332', borderRadius: 6, fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: '#E8EDF4' },
  labelFormatter: () => '',
};

export default function Analytics() {


  // Threats over time (last 24h buckets)
  const threatsOverTime = Array.from({ length: 12 }, (_, i) => ({
    hour: `${(i * 2).toString().padStart(2, '0')}:00`,
    threats: Math.round(20 + Math.random() * 40),
    critical: Math.round(1 + Math.random() * 5),
  }));

  const countryData = [
    { country: 'Russia', attacks: 89 }, { country: 'China', attacks: 72 },
    { country: 'Brazil', attacks: 45 }, { country: 'India', attacks: 38 },
    { country: 'Iran', attacks: 24 }, { country: 'N. Korea', attacks: 18 },
    { country: 'Turkey', attacks: 15 }, { country: 'USA', attacks: 12 },
  ];

  const categoryData = [
    { name: 'Brute Force', value: 34, color: '#FF1744' },
    { name: 'Port Scan', value: 28, color: '#FF6E40' },
    { name: 'DDoS', value: 15, color: '#FFD600' },
    { name: 'Phishing', value: 12, color: '#9C6BFF' },
    { name: 'Malware', value: 8, color: '#00E5FF' },
    { name: 'Other', value: 3, color: '#8899AA' },
  ];

  const protocolRadar = [
    { protocol: 'HTTPS', count: 85 }, { protocol: 'HTTP', count: 60 },
    { protocol: 'DNS', count: 45 }, { protocol: 'SSH', count: 30 },
    { protocol: 'TCP', count: 75 }, { protocol: 'UDP', count: 40 },
    { protocol: 'SMB', count: 15 }, { protocol: 'ICMP', count: 10 },
  ];

  const topIPs = [
    { ip: '203.0.113.50', attacks: 142, country: 'Russia' },
    { ip: '198.51.100.22', attacks: 98, country: 'China' },
    { ip: '192.0.2.100', attacks: 67, country: 'Brazil' },
    { ip: '198.51.100.45', attacks: 54, country: 'Iran' },
    { ip: '203.0.113.80', attacks: 41, country: 'India' },
  ];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 size={20} className="text-cyber-purple" />
        <h2 className="text-lg font-heading font-bold text-cyber-text tracking-wider">Security Analytics</h2>
      </div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Threats over time */}
        <motion.div variants={staggerItem} className="glass-panel p-4">
          <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text-secondary mb-3">Threats Over Time</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={threatsOverTime}>
                <defs>
                  <linearGradient id="gThreat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF1744" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#FF1744" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#4A5568' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip {...TT} />
                <Area type="monotone" dataKey="threats" stroke="#FF1744" fill="url(#gThreat)" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Threats" />
                <Area type="monotone" dataKey="critical" stroke="#FFD600" fill="none" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} name="Critical" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Attacks by country */}
        <motion.div variants={staggerItem} className="glass-panel p-4">
          <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text-secondary mb-3">Attacks by Country</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="country" tick={{ fontSize: 10, fill: '#8899AA' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip {...TT} />
                <Bar dataKey="attacks" fill="#FF1744" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Attack categories */}
        <motion.div variants={staggerItem} className="glass-panel p-4">
          <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text-secondary mb-3">Attack Categories</h3>
          <div className="flex items-center gap-6">
            <div style={{ width: 160, height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" strokeWidth={0} isAnimationActive={false}>
                    {categoryData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip {...TT} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {categoryData.map(c => (
                <div key={c.name} className="flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-cyber-text-secondary">{c.name}</span>
                  </div>
                  <span className="text-cyber-text font-semibold">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Protocol distribution radar */}
        <motion.div variants={staggerItem} className="glass-panel p-4">
          <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text-secondary mb-3">Protocol Distribution</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={protocolRadar}>
                <PolarGrid stroke="#1A2332" />
                <PolarAngleAxis dataKey="protocol" tick={{ fontSize: 10, fill: '#8899AA' }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar dataKey="count" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.div>

      {/* Top Attacking IPs */}
      <div className="glass-panel p-4">
        <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text-secondary mb-3">Top Attacking IPs</h3>
        <div className="space-y-2">
          {topIPs.map((ip, i) => (
            <div key={ip.ip} className="flex items-center gap-4 text-xs font-mono">
              <span className="text-cyber-text-dim w-4">{i + 1}.</span>
              <span className="text-cyber-cyan flex-1">{ip.ip}</span>
              <span className="text-cyber-text-secondary">{ip.country}</span>
              <span className="text-cyber-red font-semibold w-12 text-right">{ip.attacks}</span>
              <div className="w-32 h-1.5 bg-cyber-border rounded-full overflow-hidden">
                <motion.div className="h-full bg-cyber-red rounded-full" initial={{ width: 0 }} animate={{ width: `${(ip.attacks / 142) * 100}%` }} transition={{ duration: 1 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
