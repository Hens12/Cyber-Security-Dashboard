/* ═══════════════════════════════════════════════════════════
   Settings Page
   ═══════════════════════════════════════════════════════════ */

import { motion } from 'framer-motion';
import { Settings as SettingsIcon, User, Shield, Database, Monitor, Info } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useSecurityStore } from '../stores/useSecurityStore';
import StatusIndicator from '../components/ui/StatusIndicator';
import { pageVariants, staggerContainer, staggerItem } from '../animations/variants';

export default function Settings() {
  const user = useAuthStore(s => s.user);
  const isLive = useSecurityStore(s => s.isLive);
  const toggleLive = useSecurityStore(s => s.toggleLive);

  const sections = [
    {
      title: 'User Profile',
      icon: User,
      items: [
        { label: 'Username', value: user?.username || 'N/A' },
        { label: 'Role', value: user?.role?.toUpperCase().replace('_', ' ') || 'N/A' },
        { label: 'Email', value: user?.email || 'N/A' },
      ],
    },
    {
      title: 'System Status',
      icon: Monitor,
      items: [
        { label: 'API Status', value: 'Online', status: 'online' as const },
        { label: 'WebSocket', value: 'Connected', status: 'connected' as const },
        { label: 'Database', value: 'Online', status: 'online' as const },
        { label: 'Demo Mode', value: 'Active' },
      ],
    },
    {
      title: 'Security',
      icon: Shield,
      items: [
        { label: 'Authentication', value: 'JWT + MFA' },
        { label: 'Session Timeout', value: '60 minutes' },
        { label: 'CORS', value: 'Configured' },
        { label: 'Rate Limiting', value: 'Enabled' },
      ],
    },
  ];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <SettingsIcon size={20} className="text-cyber-text-secondary" />
        <h2 className="text-lg font-heading font-bold text-cyber-text tracking-wider">Settings</h2>
      </div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map(section => (
          <motion.div key={section.title} variants={staggerItem} className="glass-panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <section.icon size={16} className="text-cyber-cyan" />
              <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text">{section.title}</h3>
            </div>
            <div className="space-y-3">
              {section.items.map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-cyber-text-secondary font-mono">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {'status' in item && item.status && <StatusIndicator status={item.status} size="sm" showPulse={false} />}
                    <span className="text-xs font-mono text-cyber-text">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Controls */}
        <motion.div variants={staggerItem} className="glass-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-cyber-cyan" />
            <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-cyber-text">Controls</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-cyber-text-secondary font-mono">Live Telemetry</span>
              <button
                onClick={toggleLive}
                className={`px-3 py-1 rounded text-[10px] font-mono font-semibold transition-all ${isLive ? 'bg-cyber-green/15 text-cyber-green border border-cyber-green/30' : 'bg-cyber-panel text-cyber-text-dim border border-cyber-border'}`}
              >
                {isLive ? 'ACTIVE' : 'PAUSED'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-cyber-text-secondary font-mono">Sound Alerts</span>
              <button className="px-3 py-1 rounded text-[10px] font-mono text-cyber-text-dim bg-cyber-panel border border-cyber-border">OFF</button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-cyber-text-secondary font-mono">Auto-refresh</span>
              <button className="px-3 py-1 rounded text-[10px] font-mono text-cyber-green bg-cyber-green/15 border border-cyber-green/30 font-semibold">3s</button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* App info */}
      <div className="glass-panel p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono text-cyber-text-dim">
          <Info size={14} />
          <span>SENTINEL-X v1.0.0 | Cyber Security Operations Center | Demo Mode</span>
        </div>
        <span className="text-[10px] font-mono text-cyber-text-dim">© 2026 SENTINEL-X</span>
      </div>
    </motion.div>
  );
}
