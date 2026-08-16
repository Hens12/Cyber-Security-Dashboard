/* ═══════════════════════════════════════════════════════════
   NotificationCenter.tsx — Slide-out Notification Panel
   ═══════════════════════════════════════════════════════════ */

import { motion } from 'framer-motion';
import { X, Bell, Info, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { useSecurityStore } from '../../stores/useSecurityStore';
import SeverityBadge from '../ui/SeverityBadge';
import { formatTimestamp } from '../../utils/formatters';

const iconMap = {
  alert: ShieldAlert,
  incident: AlertTriangle,
  system: Info,
  info: Info,
};

export default function NotificationCenter() {
  const { notificationPanelOpen, toggleNotificationPanel } = useUIStore();
  const { notifications, markNotificationRead, clearNotifications } = useSecurityStore();

  const handleMarkRead = (id: string) => {
    markNotificationRead(id);
  };

  const handleClearAll = () => {
    clearNotifications();
  };

  if (!notificationPanelOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs" 
        onClick={toggleNotificationPanel}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full max-w-sm h-full glass-panel-strong border-l border-cyber-border bg-cyber-bg-secondary flex flex-col z-50 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-border">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-cyber-cyan" />
            <h3 className="text-sm font-heading font-semibold text-cyber-text uppercase tracking-wider">
              System Notifications
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {notifications.some(n => !n.read) && (
              <button 
                onClick={handleClearAll}
                className="text-[10px] font-mono text-cyber-cyan hover:text-cyber-cyan-dim transition-colors"
              >
                MARK ALL READ
              </button>
            )}
            <button 
              onClick={toggleNotificationPanel}
              className="text-cyber-text-dim hover:text-cyber-text"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-cyber-text-dim">
              No recent notifications
            </div>
          ) : (
            notifications.map(n => {
              const Icon = iconMap[n.type] || Info;
              return (
                <div 
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer relative ${
                    n.read 
                      ? 'bg-cyber-panel/40 border-cyber-border/40 opacity-70' 
                      : 'bg-cyber-panel border-cyber-border hover:border-cyber-border-light'
                  }`}
                >
                  {/* Unread indicator */}
                  {!n.read && (
                    <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse-glow" />
                  )}
                  
                  <div className="flex gap-2">
                    <Icon size={14} className="text-cyber-cyan flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-cyber-text uppercase tracking-wider truncate">
                          {n.title}
                        </span>
                        <span className="text-[9px] font-mono text-cyber-text-dim whitespace-nowrap">
                          {formatTimestamp(n.timestamp)}
                        </span>
                      </div>
                      <p className="text-[10px] text-cyber-text-secondary leading-normal">
                        {n.message}
                      </p>
                      <div className="pt-1">
                        <SeverityBadge severity={n.severity} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
