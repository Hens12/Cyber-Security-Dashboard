/* ═══════════════════════════════════════════════════════════
   Zustand Store — Network State
   ═══════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import type { NetworkPacket, TrafficStats } from '../types/network';
import { generateTrafficStats } from '../utils/demo';

interface NetworkState {
  packets: NetworkPacket[];
  trafficHistory: TrafficStats[];
  currentTraffic: TrafficStats;

  addPacket: (packet: NetworkPacket) => void;
  addPackets: (packets: NetworkPacket[]) => void;
  updateTraffic: (stats: TrafficStats) => void;
  clearPackets: () => void;
}

const MAX_PACKETS = 500;
const MAX_TRAFFIC_HISTORY = 60;

export const useNetworkStore = create<NetworkState>((set) => ({
  packets: [],
  trafficHistory: [],
  currentTraffic: generateTrafficStats(),

  addPacket: (packet) =>
    set(s => ({
      packets: [packet, ...s.packets].slice(0, MAX_PACKETS),
    })),

  addPackets: (packets) =>
    set(s => ({
      packets: [...packets, ...s.packets].slice(0, MAX_PACKETS),
    })),

  updateTraffic: (stats) =>
    set(s => ({
      currentTraffic: stats,
      trafficHistory: [...s.trafficHistory, stats].slice(-MAX_TRAFFIC_HISTORY),
    })),

  clearPackets: () => set({ packets: [] }),
}));
