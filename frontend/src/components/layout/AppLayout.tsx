/* ═══════════════════════════════════════════════════════════
   AppLayout — Main application shell
   ═══════════════════════════════════════════════════════════ */

import { useEffect, useRef, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from '../ui/CommandPalette';
import NotificationCenter from './NotificationCenter';
import { useSecurityStore } from '../../stores/useSecurityStore';
import { useNetworkStore } from '../../stores/useNetworkStore';
import { useUIStore } from '../../stores/useUIStore';
import { generateSecurityEvent, generateNetworkPacket, generateTrafficStats } from '../../utils/demo';
import { fetchFromAPI, WS_URL } from '../../utils/api';

export default function AppLayout() {
  const { initialize, addEvent, updateStats, refreshThreatIntel, isLive, isDemoMode } = useSecurityStore();
  const { addPacket, addPackets, updateTraffic } = useNetworkStore();
  const { toggleCommandPalette } = useUIStore();
  const initialized = useRef(false);

  // Initialize demo or real data
  useEffect(() => {
    if (!initialized.current) {
      initialize();
      initialized.current = true;
    }
  }, [initialize]);

  // Demo telemetry loop — security events & stats
  useEffect(() => {
    if (!isLive || !isDemoMode) return;

    const eventInterval = setInterval(() => {
      const event = generateSecurityEvent();
      addEvent(event);
    }, 1500 + Math.random() * 2000);

    const statsInterval = setInterval(() => {
      updateStats();
    }, 3000);

    return () => {
      clearInterval(eventInterval);
      clearInterval(statsInterval);
    };
  }, [isLive, isDemoMode, addEvent, updateStats]);

  // Real-time backend WebSocket for security events when in Real Mode
  useEffect(() => {
    if (!isLive || isDemoMode) return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: number;

    function connect() {
      socket = new WebSocket(WS_URL);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addEvent(data);
        } catch (e) {
          console.error("Failed to parse WebSocket event:", e);
        }
      };

      socket.onclose = () => {
        console.warn("WebSocket closed. Attempting reconnect...");
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        socket?.close();
      };
    }

    connect();

    return () => {
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [isLive, isDemoMode, addEvent]);

  // Real Mode polling intervals for stats, traffic, packets, and threat intelligence
  useEffect(() => {
    if (!isLive || isDemoMode) return;

    const fetchRealData = async () => {
      try {
        const traffic = await fetchFromAPI('/api/network/traffic');
        updateTraffic(traffic);
        const packets = await fetchFromAPI('/api/network/packets');
        addPackets(packets);
        await refreshThreatIntel();
      } catch (e) {
        console.error("Error fetching live network stats:", e);
      }
    };
    fetchRealData();

    const statsInterval = setInterval(() => {
      updateStats();
    }, 3000);

    const networkInterval = setInterval(async () => {
      try {
        const traffic = await fetchFromAPI('/api/network/traffic');
        updateTraffic(traffic);
        const packets = await fetchFromAPI('/api/network/packets');
        addPackets(packets);
      } catch (e) {
        console.error("Error fetching live network stats:", e);
      }
    }, 2000);

    const threatIntelInterval = setInterval(async () => {
      await refreshThreatIntel();
    }, 5000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(networkInterval);
      clearInterval(threatIntelInterval);
    };
  }, [isLive, isDemoMode, updateStats, updateTraffic, addPackets, refreshThreatIntel]);

  // Demo telemetry loop — network packets & traffic
  useEffect(() => {
    if (!isLive || !isDemoMode) return;

    const packetInterval = setInterval(() => {
      const packet = generateNetworkPacket();
      addPacket(packet);
    }, 200);

    const trafficInterval = setInterval(() => {
      updateTraffic(generateTrafficStats());
    }, 2000);

    return () => {
      clearInterval(packetInterval);
      clearInterval(trafficInterval);
    };
  }, [isLive, isDemoMode, addPacket, updateTraffic]);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      toggleCommandPalette();
    }
  }, [toggleCommandPalette]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex w-full h-screen overflow-hidden bg-cyber-bg">
      {/* Scanline overlay */}
      <div className="scanline-overlay" />

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Demo mode banner */}
        <div 
          className="demo-banner animate-pulse-glow"
          style={isDemoMode ? {} : {
            backgroundColor: 'rgba(0, 255, 136, 0.08)',
            borderBottom: '1px solid rgba(0, 255, 136, 0.2)',
            color: '#00FF88'
          }}
        >
          {isDemoMode 
            ? "◆ DEMO MODE — All security telemetry is simulated ◆" 
            : "◆ REAL-TIME SYSTEM MONITORING — Connected to Sentinel-X Host Backend ◆"}
        </div>

        <TopBar />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 grid-bg">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
      <NotificationCenter />
    </div>
  );
}
