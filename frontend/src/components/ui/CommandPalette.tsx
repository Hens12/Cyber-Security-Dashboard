/* ═══════════════════════════════════════════════════════════
   CommandPalette.tsx — Global Search Command Palette (Ctrl+K)
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from 'react';
import { Search, AlertTriangle, Shield, Bug, FileText, X } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { useSecurityStore } from '../../stores/useSecurityStore';

export default function CommandPalette() {
  const { commandPaletteOpen, toggleCommandPalette } = useUIStore();
  const { threats, incidents, vulnerabilities, events } = useSecurityStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
    }
  }, [commandPaletteOpen]);

  // Handle escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && commandPaletteOpen) {
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, toggleCommandPalette]);

  if (!commandPaletteOpen) return null;

  // Filter items
  const q = query.toLowerCase();
  
  const matchedThreats = threats.filter(t => 
    t.name.toLowerCase().includes(q) || t.source_ip.includes(q)
  ).slice(0, 3);

  const matchedIncidents = incidents.filter(i => 
    i.title.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)
  ).slice(0, 3);

  const matchedVulnerabilities = vulnerabilities.filter(v => 
    v.cve_id.toLowerCase().includes(q) || v.title.toLowerCase().includes(q)
  ).slice(0, 3);

  const matchedLogs = events.filter(e => 
    e.description.toLowerCase().includes(q) || e.source_ip.includes(q)
  ).slice(0, 5);

  const hasResults = matchedThreats.length > 0 || matchedIncidents.length > 0 || matchedVulnerabilities.length > 0 || matchedLogs.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="fixed inset-0 -z-10" 
        onClick={toggleCommandPalette}
      />
      <div className="w-full max-w-lg glass-panel-strong overflow-hidden shadow-2xl border border-cyber-border-light flex flex-col max-h-[60vh] animate-border-glow">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-cyber-border bg-cyber-panel">
          <Search size={16} className="text-cyber-cyan" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search hosts, incidents, IPs, domains, logs..."
            className="flex-1 bg-transparent border-none text-cyber-text text-sm font-mono focus:outline-none placeholder:text-cyber-text-dim"
          />
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyber-bg border border-cyber-border text-cyber-text-dim">
            ESC
          </kbd>
          <button 
            onClick={toggleCommandPalette} 
            className="text-cyber-text-dim hover:text-cyber-text"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3 bg-cyber-bg/90">
          {!query && (
            <div className="p-3 text-center text-xs font-mono text-cyber-text-dim">
              Type to search SENTINEL-X operations database...
            </div>
          )}

          {query && !hasResults && (
            <div className="p-3 text-center text-xs font-mono text-cyber-text-dim">
              No telemetry matched your query.
            </div>
          )}

          {query && hasResults && (
            <div className="space-y-3">
              {/* Threats */}
              {matchedThreats.length > 0 && (
                <div>
                  <h4 className="px-2 py-1 text-[9px] font-mono text-cyber-text-dim uppercase tracking-wider">Threats</h4>
                  {matchedThreats.map(t => (
                    <div key={t.id} className="flex items-center gap-2 p-2 rounded hover:bg-cyber-panel-hover cursor-pointer text-xs font-mono">
                      <Shield size={12} className="text-cyber-red" />
                      <span className="text-cyber-text flex-1 truncate">{t.name}</span>
                      <span className="text-cyber-cyan text-[10px]">{t.source_ip}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Incidents */}
              {matchedIncidents.length > 0 && (
                <div>
                  <h4 className="px-2 py-1 text-[9px] font-mono text-cyber-text-dim uppercase tracking-wider">Incidents</h4>
                  {matchedIncidents.map(i => (
                    <div key={i.id} className="flex items-center gap-2 p-2 rounded hover:bg-cyber-panel-hover cursor-pointer text-xs font-mono">
                      <AlertTriangle size={12} className="text-cyber-yellow" />
                      <span className="text-cyber-text flex-1 truncate">{i.title}</span>
                      <span className="text-cyber-text-secondary text-[10px]">{i.id}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Vulnerabilities */}
              {matchedVulnerabilities.length > 0 && (
                <div>
                  <h4 className="px-2 py-1 text-[9px] font-mono text-cyber-text-dim uppercase tracking-wider">Vulnerabilities</h4>
                  {matchedVulnerabilities.map(v => (
                    <div key={v.id} className="flex items-center gap-2 p-2 rounded hover:bg-cyber-panel-hover cursor-pointer text-xs font-mono">
                      <Bug size={12} className="text-cyber-purple" />
                      <span className="text-cyber-text flex-1 truncate">{v.cve_id} - {v.title}</span>
                      <span className="text-cyber-text-secondary text-[10px]">{v.host}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Logs */}
              {matchedLogs.length > 0 && (
                <div>
                  <h4 className="px-2 py-1 text-[9px] font-mono text-cyber-text-dim uppercase tracking-wider">Security Logs</h4>
                  {matchedLogs.map(e => (
                    <div key={e.id} className="flex items-center gap-2 p-2 rounded hover:bg-cyber-panel-hover cursor-pointer text-xs font-mono">
                      <FileText size={12} className="text-cyber-green" />
                      <span className="text-cyber-text flex-1 truncate">{e.description}</span>
                      <span className="text-cyber-text-dim text-[10px]">{e.source_ip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
