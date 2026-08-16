/* ═══════════════════════════════════════════════════════════
   Zustand Store — Security State
   ═══════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import type { SecurityEvent, Threat, Incident, Vulnerability, IOC, DashboardStats, MitreAttack, Playbook } from '../types/security';
import type { Notification } from '../types/system';
import {
  generateSecurityEvent, generateDashboardStats, generateThreats,
  generateIncidents, generateVulnerabilities, generateIOCs,
  generateMitreMatrix, generatePlaybooks, generateNotifications,
  updateDashboardStats,
} from '../utils/demo';
import { checkBackendStatus, fetchFromAPI } from '../utils/api';

interface SecurityState {
  // Dashboard
  stats: DashboardStats;
  events: SecurityEvent[];
  threats: Threat[];
  incidents: Incident[];
  vulnerabilities: Vulnerability[];
  iocs: IOC[];
  mitreMatrix: MitreAttack[];
  playbooks: Playbook[];
  notifications: Notification[];

  // Real-time
  isLive: boolean;
  eventCount: number;
  isDemoMode: boolean;

  // Actions
  initialize: () => Promise<void>;
  addEvent: (event: SecurityEvent) => void;
  updateStats: () => Promise<void>;
  refreshThreatIntel: () => Promise<void>;
  toggleLive: () => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  setDemoMode: (isDemo: boolean) => void;
}

const MAX_EVENTS = 200;

export const useSecurityStore = create<SecurityState>((set, get) => ({
  stats: generateDashboardStats(),
  events: [],
  threats: [],
  incidents: [],
  vulnerabilities: [],
  iocs: [],
  mitreMatrix: [],
  playbooks: [],
  notifications: [],
  isLive: true,
  eventCount: 0,
  isDemoMode: true,

  initialize: async () => {
    try {
      const isOnline = await checkBackendStatus();
      if (isOnline) {
        const stats = await fetchFromAPI('/api/dashboard');
        const threats = await fetchFromAPI('/api/threats');
        const incidents = await fetchFromAPI('/api/incidents');
        const vulnerabilities = await fetchFromAPI('/api/vulnerabilities');
        const events = await fetchFromAPI('/api/logs');

        let iocs = [];
        try {
          iocs = await fetchFromAPI('/api/iocs');
        } catch (e) {
          console.warn("Failed to fetch API IOCs, using fallback:", e);
          iocs = generateIOCs(15);
        }

        let mitreMatrix = [];
        try {
          mitreMatrix = await fetchFromAPI('/api/mitre');
        } catch (e) {
          console.warn("Failed to fetch API MITRE matrix, using fallback:", e);
          mitreMatrix = generateMitreMatrix();
        }
        
        set({
          isDemoMode: false,
          stats,
          threats,
          incidents,
          vulnerabilities,
          events,
          iocs,
          mitreMatrix,
          playbooks: generatePlaybooks(),
          notifications: generateNotifications(3),
          eventCount: events.length,
        });
        return;
      }
    } catch (e) {
      console.error("Backend initialize failed, falling back to demo mode", e);
    }

    // Generate initial demo data fallback
    const initialEvents = Array.from({ length: 30 }, () => generateSecurityEvent());
    set({
      isDemoMode: true,
      events: initialEvents,
      threats: generateThreats(15),
      incidents: generateIncidents(8),
      vulnerabilities: generateVulnerabilities(20),
      iocs: generateIOCs(12),
      mitreMatrix: generateMitreMatrix(),
      playbooks: generatePlaybooks(),
      notifications: generateNotifications(5),
      eventCount: 30,
    });
  },

  addEvent: (event: SecurityEvent) => {
    const state = get();
    if (!state.isLive) return;

    // Dynamically build real-time IOC from event
    const newIoc: IOC = {
      id: `ioc-${event.id}`,
      type: 'ip',
      value: event.source_ip,
      reputation: event.severity === 'critical' || event.severity === 'high' ? 'malicious' : event.severity === 'medium' ? 'suspicious' : 'clean',
      confidence: Math.min(99, 75 + (event.source_port % 24)),
      threat_type: event.attack_type || 'Host Traffic Event',
      first_seen: event.timestamp,
      last_seen: event.timestamp,
      tags: [event.country_source || 'Remote', `port-${event.destination_port}`],
      source: 'Host Network Sentinel',
    };

    set(s => {
      const currentIocs = s.iocs || [];
      const exists = currentIocs.some(i => i.value === event.source_ip);
      const updatedIocs = exists ? currentIocs : [newIoc, ...currentIocs].slice(0, 100);

      return {
        events: [event, ...s.events].slice(0, MAX_EVENTS),
        eventCount: s.eventCount + 1,
        iocs: updatedIocs,
      };
    });
  },

  updateStats: async () => {
    const { isDemoMode } = get();
    if (!isDemoMode) {
      try {
        const stats = await fetchFromAPI('/api/dashboard');
        set({ stats });
      } catch (e) {
        console.error("Failed to update live stats", e);
      }
    } else {
      set(s => ({
        stats: updateDashboardStats(s.stats),
      }));
    }
  },

  refreshThreatIntel: async () => {
    const { isDemoMode } = get();
    if (!isDemoMode) {
      try {
        const iocs = await fetchFromAPI('/api/iocs');
        const mitreMatrix = await fetchFromAPI('/api/mitre');
        set({ iocs, mitreMatrix });
      } catch (e) {
        console.error("Failed to refresh real threat intel", e);
      }
    }
  },

  toggleLive: () => set(s => ({ isLive: !s.isLive })),

  markNotificationRead: (id: string) =>
    set(s => ({
      notifications: s.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  clearNotifications: () =>
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, read: true })),
    })),

  setDemoMode: (isDemoMode) => set({ isDemoMode }),
}));
