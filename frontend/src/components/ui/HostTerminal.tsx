/* ═══════════════════════════════════════════════════════════
   HostTerminal.tsx — Embedded WebSocket Terminal
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Wifi, WifiOff, Trash2 } from 'lucide-react';

interface TerminalLine {
  type: 'output' | 'error' | 'system' | 'input' | 'prompt';
  data: string;
}

interface Props {
  hostIp: string;
}

const WS_TERMINAL_URL = 'ws://localhost:8000/ws/terminal';

export default function HostTerminal({ hostIp }: Props) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [prompt, setPrompt] = useState('~');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  // Connect WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_TERMINAL_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'prompt') {
          setPrompt(msg.data);
          return;
        }
        if (msg.type === 'exit') {
          // Show exit code if non-zero
          if (msg.data !== 0) {
            setLines(prev => [...prev, { type: 'error', data: `Process exited with code ${msg.data}\n` }]);
          }
          return;
        }
        setLines(prev => [...prev, { type: msg.type, data: msg.data }]);
      } catch {
        setLines(prev => [...prev, { type: 'output', data: event.data }]);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setLines(prev => [...prev, { type: 'system', data: '⚡ Connection closed.\n' }]);
    };

    ws.onerror = () => {
      setConnected(false);
    };
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  // Send command
  const sendCommand = () => {
    const cmd = input.trim();
    if (!cmd || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setLines(prev => [...prev, { type: 'input', data: `${prompt}> ${cmd}\n` }]);
    wsRef.current.send(cmd);
    setHistory(prev => [cmd, ...prev].slice(0, 50));
    setHistoryIdx(-1);
    setInput('');
  };

  // Keyboard handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = Math.min(historyIdx + 1, history.length - 1);
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const newIdx = historyIdx - 1;
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      } else {
        setHistoryIdx(-1);
        setInput('');
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const colorForType = (type: string) => {
    switch (type) {
      case 'error': return 'text-cyber-red';
      case 'system': return 'text-cyber-yellow';
      case 'input': return 'text-cyber-cyan';
      default: return 'text-cyber-green';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-3 py-2 bg-cyber-bg border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-red/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-yellow/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-green/70" />
          </div>
          <Terminal size={12} className="text-cyber-cyan ml-1" />
          <span className="text-[10px] font-mono text-cyber-text-dim">
            sentinel-x@{hostIp}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLines([])}
            className="text-cyber-text-dim hover:text-cyber-text transition-colors"
            title="Clear terminal"
          >
            <Trash2 size={12} />
          </button>
          <div className="flex items-center gap-1">
            {connected ? (
              <>
                <Wifi size={10} className="text-cyber-green" />
                <span className="text-[9px] font-mono text-cyber-green">LIVE</span>
              </>
            ) : (
              <button onClick={connect} className="flex items-center gap-1 hover:text-cyber-cyan transition-colors">
                <WifiOff size={10} className="text-cyber-red" />
                <span className="text-[9px] font-mono text-cyber-red">RECONNECT</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Terminal output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 bg-[#0a0e14] font-mono text-[11px] leading-relaxed min-h-[200px] max-h-[350px]"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line, i) => (
          <div key={i} className={`${colorForType(line.type)} whitespace-pre-wrap break-all`}>
            {line.data}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 bg-cyber-bg border-t border-cyber-border">
        <span className="text-[10px] font-mono text-cyber-cyan whitespace-nowrap">
          {prompt}&gt;
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connected ? 'Type a command...' : 'Disconnected'}
          disabled={!connected}
          className="flex-1 bg-transparent border-none text-cyber-green text-[11px] font-mono focus:outline-none placeholder:text-cyber-text-dim disabled:opacity-40"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-cyber-panel border border-cyber-border text-cyber-text-dim">
          Ctrl+L clear
        </kbd>
      </div>
    </div>
  );
}
