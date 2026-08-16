/* ═══════════════════════════════════════════════════════════
   AI Security Analyst Page
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Send, Shield, AlertTriangle, Server, CheckCircle, Loader2 } from 'lucide-react';
import { useSecurityStore } from '../stores/useSecurityStore';
import { generateAIAnalysis } from '../utils/demo';
import SeverityBadge from '../components/ui/SeverityBadge';
import { pageVariants } from '../animations/variants';
import type { AIAnalysis } from '../types/security';

export default function AIAnalyst() {
  const threats = useSecurityStore(s => s.threats);
  const [analyses, setAnalyses] = useState<AIAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prompt, setPrompt] = useState('');

  // Initial analysis
  useEffect(() => {
    const initial = generateAIAnalysis();
    setAnalyses([initial]);
  }, []);

  const runAnalysis = async (query?: string) => {
    setIsAnalyzing(true);
    // Simulate AI processing
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    const threat = threats.length > 0 ? threats[Math.floor(Math.random() * threats.length)] : undefined;
    const analysis = generateAIAnalysis(threat);
    if (query) analysis.analysis = `Analysis for "${query}": ${analysis.analysis}`;
    setAnalyses(prev => [analysis, ...prev]);
    setIsAnalyzing(false);
    setPrompt('');
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Brain size={20} className="text-cyber-purple" />
        <h2 className="text-lg font-heading font-bold text-cyber-text tracking-wider">AI Security Analyst</h2>
      </div>

      {/* Disclaimer */}
      <div className="glass-panel p-3 border-cyber-yellow/20">
        <p className="text-[10px] font-mono text-cyber-yellow">
          ⚠ AI recommendations require analyst approval before execution. Destructive actions are not executed autonomously.
        </p>
      </div>

      {/* Quick analysis buttons */}
      <div className="flex flex-wrap gap-2">
        {['Analyze Current Threats', 'Network Anomaly Check', 'Incident Summary', 'Vulnerability Assessment'].map(q => (
          <button
            key={q}
            onClick={() => runAnalysis(q)}
            disabled={isAnalyzing}
            className="px-3 py-1.5 rounded-lg bg-cyber-panel border border-cyber-border text-xs font-mono text-cyber-text-secondary hover:text-cyber-cyan hover:border-cyber-cyan/30 transition-all disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="glass-panel p-4">
        <form onSubmit={e => { e.preventDefault(); if (prompt.trim()) runAnalysis(prompt); }} className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Ask the AI analyst about security events, threats, or recommendations..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-cyber-bg border border-cyber-border text-sm font-mono text-cyber-text placeholder:text-cyber-text-dim focus:border-cyber-purple/50"
            disabled={isAnalyzing}
          />
          <button
            type="submit"
            disabled={isAnalyzing || !prompt.trim()}
            className="px-4 py-2.5 rounded-lg bg-cyber-purple/15 border border-cyber-purple/30 text-cyber-purple hover:bg-cyber-purple/25 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-mono"
          >
            {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Analyze
          </button>
        </form>
      </div>

      {/* Analysis results */}
      <div className="space-y-4">
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-panel p-6"
            >
              <div className="flex items-center gap-3">
                <Loader2 size={20} className="text-cyber-purple animate-spin" />
                <div>
                  <p className="text-sm text-cyber-text">Analyzing security telemetry...</p>
                  <p className="text-[10px] text-cyber-text-dim font-mono mt-1">Processing events, correlating threats, generating recommendations</p>
                </div>
              </div>
              <div className="mt-3 h-1 bg-cyber-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-cyber-purple rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {analyses.map((analysis) => (
          <motion.div
            key={analysis.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-cyber-purple" />
                <span className="text-xs font-heading font-semibold text-cyber-text uppercase tracking-wider">Threat Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={analysis.risk_level} size="sm" />
                <span className="text-[10px] font-mono text-cyber-text-dim px-2 py-0.5 rounded bg-cyber-purple/10 border border-cyber-purple/20">
                  Confidence: {analysis.confidence}%
                </span>
              </div>
            </div>

            <p className="text-sm text-cyber-text leading-relaxed mb-4 pl-6">
              "{analysis.analysis}"
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
              {/* Affected Assets */}
              <div>
                <h4 className="text-[10px] font-heading font-semibold text-cyber-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Server size={12} /> Affected Assets
                </h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.affected_assets.map(a => (
                    <span key={a} className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-panel border border-cyber-border text-cyber-cyan">{a}</span>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <h4 className="text-[10px] font-heading font-semibold text-cyber-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Attack Category
                </h4>
                <span className="text-sm font-mono text-cyber-red">{analysis.attack_category}</span>
              </div>

              {/* Investigation Steps */}
              <div>
                <h4 className="text-[10px] font-heading font-semibold text-cyber-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Shield size={12} /> Investigation Steps
                </h4>
                <ol className="space-y-1">
                  {analysis.investigation_steps.map((step, i) => (
                    <li key={i} className="text-[10px] font-mono text-cyber-text-secondary flex gap-2">
                      <span className="text-cyber-cyan">{i + 1}.</span> {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Containment Actions */}
              <div>
                <h4 className="text-[10px] font-heading font-semibold text-cyber-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle size={12} /> Recommended Actions
                </h4>
                <ol className="space-y-1">
                  {analysis.containment_actions.map((action, i) => (
                    <li key={i} className="text-[10px] font-mono text-cyber-text-secondary flex gap-2">
                      <span className="text-cyber-green">{i + 1}.</span> {action}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
