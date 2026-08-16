/* ═══════════════════════════════════════════════════════════
   KPICards — Dashboard metric card grid
   ═══════════════════════════════════════════════════════════ */

import { motion } from 'framer-motion';
import {
  ShieldAlert, AlertTriangle, Zap, Bug,
  Activity, Server, Ban, HeartPulse,
} from 'lucide-react';
import MetricCard from '../ui/MetricCard';
import { useSecurityStore } from '../../stores/useSecurityStore';
import { staggerContainer } from '../../animations/variants';

export default function KPICards() {
  const stats = useSecurityStore(s => s.stats);

  const cards = [
    {
      title: 'Active Threats',
      value: stats.active_threats,
      icon: ShieldAlert,
      color: '#FF1744',
      trend: 'up' as const,
      trendValue: '+12',
    },
    {
      title: 'Critical Threats',
      value: stats.critical_threats,
      icon: AlertTriangle,
      color: '#FF6E40',
      format: (n: number) => String(n).padStart(2, '0'),
    },
    {
      title: 'Active Incidents',
      value: stats.active_incidents,
      icon: Zap,
      color: '#FFD600',
      trend: 'stable' as const,
      trendValue: '0',
    },
    {
      title: 'Vulnerabilities',
      value: stats.vulnerabilities,
      icon: Bug,
      color: '#9C6BFF',
      trend: 'down' as const,
      trendValue: '-3',
    },
    {
      title: 'Packets / sec',
      value: stats.packets_per_sec,
      icon: Activity,
      color: '#00E5FF',
    },
    {
      title: 'Monitored Hosts',
      value: stats.monitored_hosts,
      icon: Server,
      color: '#00E5FF',
    },
    {
      title: 'Blocked IPs',
      value: stats.blocked_ips,
      icon: Ban,
      color: '#FF1744',
      trend: 'up' as const,
      trendValue: '+24',
    },
    {
      title: 'System Health',
      value: stats.system_health,
      icon: HeartPulse,
      color: '#00FF88',
      decimals: 2,
      suffix: '%',
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3"
    >
      {cards.map((card) => (
        <MetricCard key={card.title} {...card} />
      ))}
    </motion.div>
  );
}
