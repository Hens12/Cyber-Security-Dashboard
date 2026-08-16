/* ═══════════════════════════════════════════════════════════
   Automation Page — SOAR Playbooks
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Workflow, ChevronDown, ChevronUp, Zap, Search, BarChart2, AlertTriangle, Bell } from 'lucide-react';
import { useSecurityStore } from '../stores/useSecurityStore';
import { pageVariants, staggerContainer, staggerItem } from '../animations/variants';
import { timeAgo } from '../utils/formatters';

const stepIcons = {
  trigger: Zap,
  analyze: Search,
  decision: BarChart2,
  action: AlertTriangle,
  notification: Bell,
};

const stepColors = {
  trigger: '#FF1744',
  analyze: '#00E5FF',
  decision: '#FFD600',
  action: '#FF6E40',
  notification: '#9C6BFF',
};

export default function Automation() {
  const playbooks = useSecurityStore(s => s.playbooks);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Workflow size={20} className="text-cyber-green" />
        <h2 className="text-lg font-heading font-bold text-cyber-text tracking-wider">Automation Center</h2>
      </div>

      <p className="text-xs text-cyber-text-secondary">
        Security playbooks for automated incident response. All actions are simulated in Demo Mode.
      </p>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
        {playbooks.map(pb => {
          const isExpanded = expanded === pb.id;
          return (
            <motion.div key={pb.id} variants={staggerItem} className="glass-panel overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-cyber-panel-hover transition-colors"
                onClick={() => setExpanded(isExpanded ? null : pb.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${pb.status === 'active' ? 'bg-cyber-green/10 border border-cyber-green/20' : 'bg-cyber-panel border border-cyber-border'}`}>
                    <Workflow size={16} className={pb.status === 'active' ? 'text-cyber-green' : 'text-cyber-text-dim'} />
                  </div>
                  <div>
                    <h3 className="text-sm font-heading font-semibold text-cyber-text">{pb.name}</h3>
                    <p className="text-[10px] text-cyber-text-secondary mt-0.5">{pb.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-[10px] font-mono text-cyber-text-dim">Runs: {pb.run_count}</p>
                    {pb.last_run && <p className="text-[10px] font-mono text-cyber-text-dim">Last: {timeAgo(pb.last_run)}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${pb.status === 'active' ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/20' : 'bg-cyber-panel text-cyber-text-dim border border-cyber-border'}`}>
                    {pb.status}
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-cyber-text-dim" /> : <ChevronDown size={16} className="text-cyber-text-dim" />}
                </div>
              </div>

              {/* Expanded workflow */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-cyber-border pt-4">
                      <p className="text-[10px] font-mono text-cyber-text-dim mb-4">Trigger: {pb.trigger}</p>

                      {/* Visual workflow */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {pb.steps.map((step, i) => {
                          const Icon = stepIcons[step.type] || Zap;
                          const color = stepColors[step.type] || '#8899AA';
                          return (
                            <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex flex-col items-center gap-1.5 w-28"
                              >
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                                  style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
                                >
                                  <Icon size={18} style={{ color }} />
                                </div>
                                <span className="text-[10px] font-heading font-semibold text-cyber-text text-center">{step.name}</span>
                                <span className="text-[9px] font-mono text-cyber-text-dim text-center leading-tight">{step.description}</span>
                              </motion.div>
                              {i < pb.steps.length - 1 && (
                                <div className="flex items-center flex-shrink-0">
                                  <div className="w-8 h-[2px] rounded" style={{ backgroundColor: `${color}40` }} />
                                  <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px]" style={{ borderLeftColor: `${color}60` }} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
