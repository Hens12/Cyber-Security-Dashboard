/* ═══════════════════════════════════════════════════════════
   Threat Intelligence & MITRE ATT&CK Matrix Page
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, Globe, Hash, Link2, Layers, Grid, X } from 'lucide-react';
import { useSecurityStore } from '../stores/useSecurityStore';
import { pageVariants, staggerContainer, staggerItem } from '../animations/variants';

const repColor = (rep: string) => {
  if (rep === 'malicious') return '#FF1744';
  if (rep === 'suspicious') return '#FFD600';
  if (rep === 'clean') return '#00FF88';
  return '#8899AA';
};

const TACTICS_ORDER = [
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Command and Control',
  'Exfiltration',
  'Impact'
];

interface MitreTechniqueDetail {
  id: string;
  name: string;
  tactic: string;
  description: string;
  count: number;
}

const MITRE_TECHNIQUES_DETAILS: Record<string, string> = {
  'T1110': 'Adversaries may attempt to gain access to accounts by guessing passwords or employing brute force techniques to compromise valid credentials.',
  'T1046': 'Adversaries may attempt to find active services on a network to identify potential points of entry or targets for exploitation.',
  'T1498': 'Adversaries may perform Network Denial of Service (DoS) attacks to disrupt availability of systems and network resources.',
  'T1190': 'Adversaries may exploit a vulnerability or misconfiguration in a public-facing application to gain unauthorized access.',
  'T1566': 'Adversaries may send phishing messages to gain access to sensitive information or execute malicious code on target systems.',
  'T1059': 'Adversaries may use command and scripting interpreters to execute commands, scripts, or binaries on target systems.',
  'T1078': 'Adversaries may obtain and abuse credentials of existing accounts as a means of gaining access, evading defenses, or maintaining persistence.',
  'T1071': 'Adversaries may communicate using application layer protocols to avoid detection and blend in with normal network traffic.',
  'T1048': 'Adversaries may exfiltrate data using alternative protocols than those used for command and control to bypass monitoring.',
  'T1021': 'Adversaries may use remote services to log into internal systems from a compromised host to move laterally.',
  'T1547': 'Adversaries may configure system settings to automatically execute programs upon boot or logon to maintain persistence.',
  'T1068': 'Adversaries may exploit software vulnerabilities to elevate privileges on compromised systems.'
};

export default function ThreatIntelligence() {
  const iocs = useSecurityStore(s => s.iocs);
  const mitreMatrix = useSecurityStore(s => s.mitreMatrix);
  const [activeTab, setActiveTab] = useState<'iocs' | 'mitre'>('iocs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTechnique, setSelectedTechnique] = useState<MitreTechniqueDetail | null>(null);

  const filteredIocs = iocs.filter(ioc => {
    if (!searchQuery) return true;
    return (ioc.value ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
           (ioc.type ?? '').includes(searchQuery.toLowerCase());
  });

  const iconMap = { ip: Globe, domain: Link2, hash: Hash, url: Link2, email: Link2 };

  // Group MITRE techniques by tactic
  const groupedMitre = TACTICS_ORDER.reduce((acc, tactic) => {
    acc[tactic] = mitreMatrix.filter(m => m.tactic === tactic);
    return acc;
  }, {} as Record<string, typeof mitreMatrix>);

  const handleTechniqueClick = (techId: string, techName: string, tactic: string, count: number) => {
    setSelectedTechnique({
      id: techId,
      name: techName,
      tactic,
      description: MITRE_TECHNIQUES_DETAILS[techId] || 'No detailed description available in simulated telemetry.',
      count
    });
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-cyber-border pb-3">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-cyber-cyan" />
          <h2 className="text-lg font-heading font-bold text-cyber-text tracking-wider">Threat Intelligence</h2>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-1.5 bg-cyber-panel p-1 rounded-lg border border-cyber-border">
          <button
            onClick={() => setActiveTab('iocs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeTab === 'iocs'
                ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/20'
                : 'text-cyber-text-secondary hover:text-cyber-text'
            }`}
          >
            <Layers size={12} />
            IOC DATABASE
          </button>
          <button
            onClick={() => setActiveTab('mitre')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
              activeTab === 'mitre'
                ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/20'
                : 'text-cyber-text-secondary hover:text-cyber-text'
            }`}
          >
            <Grid size={12} />
            MITRE ATT&CK MATRIX
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'iocs' ? (
          <motion.div
            key="iocs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Search */}
            <div className="glass-panel p-4">
              <div className="relative max-w-2xl">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyber-text-dim" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search IP / Domain / Hash / URL..."
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-cyber-bg border border-cyber-border text-sm font-mono text-cyber-text placeholder:text-cyber-text-dim focus:border-cyber-cyan/50 transition-colors"
                />
              </div>
            </div>

            {/* IOC Stats */}
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['malicious', 'suspicious', 'clean', 'unknown'].map(rep => (
                <motion.div key={rep} variants={staggerItem} className="glass-panel p-3 text-center">
                  <span className="w-2 h-2 rounded-full inline-block mb-1" style={{ backgroundColor: repColor(rep) }} />
                  <p className="text-xl font-bold font-mono" style={{ color: repColor(rep) }}>
                    {iocs.filter(i => i.reputation === rep).length}
                  </p>
                  <p className="text-[10px] font-mono text-cyber-text-dim uppercase tracking-wider">{rep}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* IOC Table */}
            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
                <table className="w-full text-[11px] font-mono">
                  <thead className="sticky top-0 bg-cyber-panel z-10">
                    <tr className="text-cyber-text-dim border-b border-cyber-border">
                      <th className="text-left py-2.5 px-3">Type</th>
                      <th className="text-left py-2.5 px-3">Value</th>
                      <th className="text-left py-2.5 px-3">Reputation</th>
                      <th className="text-right py-2.5 px-3">Confidence</th>
                      <th className="text-left py-2.5 px-3">Threat Type</th>
                      <th className="text-left py-2.5 px-3">Tags</th>
                      <th className="text-left py-2.5 px-3">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIocs.map(ioc => {
                      const Icon = iconMap[ioc.type] || Globe;
                      return (
                        <tr key={ioc.id} className="border-b border-cyber-border/30 hover:bg-cyber-panel-hover transition-colors cursor-pointer">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <Icon size={12} className="text-cyber-text-dim" />
                              <span className="uppercase text-cyber-text-secondary">{ioc.type}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-cyber-cyan max-w-[200px] truncate">{ioc.value}</td>
                          <td className="py-2.5 px-3">
                            <span className="flex items-center gap-1.5 font-semibold uppercase" style={{ color: repColor(ioc.reputation) }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: repColor(ioc.reputation) }} />
                              {ioc.reputation}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-cyber-text">{ioc.confidence}%</td>
                          <td className="py-2.5 px-3 text-cyber-text-secondary">{ioc.threat_type || '—'}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex gap-1 flex-wrap">
                              {ioc.tags.map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/20">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-cyber-text-dim">{ioc.source}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="mitre"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* MITRE MATRIX GRID */}
            <div className="glass-panel p-4 overflow-x-auto">
              <div className="min-w-[1200px] grid grid-cols-11 gap-2">
                {TACTICS_ORDER.map(tactic => (
                  <div key={tactic} className="space-y-2">
                    {/* Tactic Header */}
                    <div className="bg-cyber-panel border border-cyber-border px-2 py-1.5 rounded text-center">
                      <p className="text-[10px] font-heading font-semibold text-cyber-text truncate">
                        {tactic}
                      </p>
                      <p className="text-[8px] font-mono text-cyber-text-dim mt-0.5">
                        {groupedMitre[tactic]?.length || 0} techniques
                      </p>
                    </div>

                    {/* Techniques List */}
                    <div className="space-y-1.5">
                      {groupedMitre[tactic]?.map(tech => (
                        <div
                          key={tech.technique_id}
                          onClick={() => handleTechniqueClick(tech.technique_id, tech.technique_name, tactic, tech.count)}
                          className={`p-2 rounded border border-cyber-border hover:border-cyber-cyan/30 bg-cyber-bg/40 hover:bg-cyber-panel-hover cursor-pointer transition-all ${
                            tech.count > 0 ? 'border-l-2 border-l-cyber-red' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-mono text-cyber-cyan">{tech.technique_id}</span>
                            {tech.count > 0 && (
                              <span className="text-[8px] font-mono px-1 rounded bg-cyber-red/20 text-cyber-red font-semibold">
                                {tech.count}
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] font-mono text-cyber-text mt-1 truncate leading-tight">
                            {tech.technique_name}
                          </p>
                        </div>
                      ))}
                      {(!groupedMitre[tactic] || groupedMitre[tactic].length === 0) && (
                        <div className="p-2 text-center text-[8px] font-mono text-cyber-text-dim border border-cyber-border/30 rounded border-dashed">
                          No alerts
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix Legend */}
            <div className="glass-panel p-3 flex items-center justify-between text-[10px] font-mono text-cyber-text-dim">
              <div className="flex gap-4">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-cyber-red rounded-xs" />
                  <span>Detected Technique</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 border border-cyber-border rounded-xs" />
                  <span>Unobserved Technique</span>
                </div>
              </div>
              <span>Click any technique tile to view description and simulation info.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Technique Detail Modal */}
      <AnimatePresence>
        {selectedTechnique && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={() => setSelectedTechnique(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md glass-panel-strong p-6 border border-cyber-border relative"
            >
              <button
                onClick={() => setSelectedTechnique(null)}
                className="absolute top-4 right-4 text-cyber-text-dim hover:text-cyber-text"
              >
                <X size={18} />
              </button>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Grid size={16} className="text-cyber-cyan" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyber-cyan-dim">
                    MITRE ATT&CK Technique
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-heading font-bold text-cyber-text">
                    {selectedTechnique.id}: {selectedTechnique.name}
                  </h3>
                  <p className="text-xs font-mono text-cyber-text-dim mt-1">
                    Tactic: {selectedTechnique.tactic}
                  </p>
                </div>

                <div className="glass-panel p-3 border-cyber-purple/20 bg-cyber-purple/5">
                  <span className="text-[9px] font-mono text-cyber-purple uppercase tracking-wider block mb-1">
                    Observed Detections
                  </span>
                  <span className="text-xl font-bold font-mono text-cyber-purple">
                    {selectedTechnique.count} occurrences
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[10px] font-heading font-semibold text-cyber-text-secondary uppercase tracking-wider">
                    Technique Description
                  </h4>
                  <p className="text-xs text-cyber-text-secondary leading-relaxed font-mono">
                    {selectedTechnique.description}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
