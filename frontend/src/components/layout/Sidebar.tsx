/* ═══════════════════════════════════════════════════════════
   Sidebar — Collapsible navigation
   ═══════════════════════════════════════════════════════════ */

import { motion, AnimatePresence } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Shield, Network, PackageSearch, Bug,
  AlertTriangle, Server, FileText, BarChart3, Brain,
  Workflow, Settings, ChevronLeft, ChevronRight, Hexagon,
} from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Overview' },
  { path: '/threats', icon: Shield, label: 'Threat Intelligence' },
  { path: '/network', icon: Network, label: 'Network Monitor' },
  { path: '/packets', icon: PackageSearch, label: 'Packet Analyzer' },
  { path: '/vulnerabilities', icon: Bug, label: 'Vulnerability Scanner' },
  { path: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { path: '/hosts', icon: Server, label: 'Hosts' },
  { path: '/logs', icon: FileText, label: 'Security Logs' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/ai-analyst', icon: Brain, label: 'AI Security Analyst' },
  { path: '/automation', icon: Workflow, label: 'Automation' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="h-screen flex flex-col border-r border-cyber-border bg-cyber-bg-secondary z-30 flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-cyber-border flex-shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/20">
          <Hexagon size={18} className="text-cyber-cyan" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="text-sm font-heading font-bold text-cyber-cyan tracking-wider">
                SENTINEL-X
              </h1>
              <p className="text-[9px] text-cyber-text-secondary tracking-widest">
                CYBER OPERATIONS
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-2.5 rounded-lg transition-all duration-200 group relative
              ${isActive
                ? 'bg-cyber-cyan/10 text-cyber-cyan font-semibold shadow-[inset_0_0_8px_rgba(0,229,255,0.05)]'
                : 'text-cyber-text-secondary hover:text-cyber-text hover:bg-cyber-panel-hover'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator - full height left border style */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r bg-cyber-cyan shadow-[0_0_10px_rgba(0,229,255,0.7)]"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}

                <item.icon size={18} className="flex-shrink-0" />

                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip when collapsed */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 rounded bg-cyber-panel border border-cyber-border text-xs text-cyber-text whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-10 border-t border-cyber-border text-cyber-text-secondary hover:text-cyber-cyan transition-colors"
      >
        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </motion.aside>
  );
}
