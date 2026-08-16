/* ═══════════════════════════════════════════════════════════
   Overview Page — Main SOC Dashboard
   ═══════════════════════════════════════════════════════════ */

import { motion } from 'framer-motion';
import { useSecurityStore } from '../stores/useSecurityStore';
import { useNetworkStore } from '../stores/useNetworkStore';
import SecurityScore from '../components/dashboard/SecurityScore';
import KPICards from '../components/dashboard/KPICards';
import ThreatFeed from '../components/dashboard/ThreatFeed';
import ThreatMap from '../map/ThreatMap';
import { pageVariants, staggerContainer, staggerItem } from '../animations/variants';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

export default function Overview() {
  const stats = useSecurityStore(s => s.stats);
  const trafficHistory = useNetworkStore(s => s.trafficHistory);

  // Chart data
  const trafficData = trafficHistory.slice(-20).map((t, i) => ({
    time: i,
    packets: t.packets_per_sec,
    bandwidth: t.bandwidth_mbps,
  }));

  const severityData = [
    { name: 'Critical', value: stats.critical_threats, color: '#FF1744' },
    { name: 'High', value: Math.round(stats.active_threats * 0.15), color: '#FF6E40' },
    { name: 'Medium', value: Math.round(stats.active_threats * 0.35), color: '#FFD600' },
    { name: 'Low', value: Math.round(stats.active_threats * 0.42), color: '#00E5FF' },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-4"
    >
      {/* KPI Cards */}
      <KPICards />

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Security Score */}
        <div className="xl:col-span-1">
          <SecurityScore score={stats.security_score} />
        </div>

        {/* Threat Map */}
        <div className="xl:col-span-3">
          <ThreatMap />
        </div>
      </div>

      {/* Bottom grid */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* Threat Feed */}
        <motion.div variants={staggerItem} className="lg:col-span-2" style={{ height: 420 }}>
          <ThreatFeed />
        </motion.div>

        {/* Right column */}
        <motion.div variants={staggerItem} className="space-y-4">
          {/* Network throughput mini-chart */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text-secondary">
                Network Throughput
              </h3>
              <span className="text-[10px] font-mono text-cyber-cyan">
                {trafficData.length > 0 ? `${Math.round(trafficData[trafficData.length - 1]?.bandwidth || 0)} Mbps` : '-- Mbps'}
              </span>
            </div>
            <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <defs>
                    <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D131A',
                      border: '1px solid #1A2332',
                      borderRadius: 6,
                      fontSize: 11,
                      fontFamily: '"JetBrains Mono", monospace',
                      color: '#E8EDF4',
                    }}
                    labelFormatter={() => ''}
                    formatter={(value: any) => [`${Math.round(Number(value))} Mbps`, 'Bandwidth']}
                  />
                  <Area
                    type="monotone"
                    dataKey="bandwidth"
                    stroke="#00E5FF"
                    fill="url(#gradCyan)"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Severity Distribution */}
          <div className="glass-panel p-4">
            <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text-secondary mb-3">
              Threat Severity
            </h3>
            <div className="flex items-center gap-4">
              <div style={{ width: 100, height: 100 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%" cy="50%"
                      innerRadius={28} outerRadius={45}
                      dataKey="value"
                      strokeWidth={0}
                      isAnimationActive={false}
                    >
                      {severityData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {severityData.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-mono text-cyber-text-secondary">{s.name}</span>
                    </div>
                    <span className="font-mono font-semibold text-cyber-text">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Attacks by Country */}
          <div className="glass-panel p-4">
            <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text-secondary mb-3">
              Top Attack Sources
            </h3>
            <div className="space-y-2">
              {[
                { country: 'Russia', count: 89, pct: 85 },
                { country: 'China', count: 72, pct: 70 },
                { country: 'Brazil', count: 45, pct: 43 },
                { country: 'India', count: 38, pct: 37 },
                { country: 'Iran', count: 24, pct: 23 },
              ].map(c => (
                <div key={c.country} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-cyber-text-secondary">{c.country}</span>
                    <span className="font-mono text-cyber-text">{c.count}</span>
                  </div>
                  <div className="h-1 bg-cyber-border rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: '#FF1744' }}
                      initial={{ width: '0%' }}
                      animate={{ width: `${c.pct}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
