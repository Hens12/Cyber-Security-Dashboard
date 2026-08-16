/* ═══════════════════════════════════════════════════════════
   Type Definitions — System Domain
   ═══════════════════════════════════════════════════════════ */

export interface Host {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  cpu_usage: number;
  ram_usage: number;
  network_mbps: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  status: 'online' | 'offline' | 'degraded';
  open_ports: number[];
  services: string[];
  last_seen: string;
  events_count: number;
}

export interface SystemStatus {
  api_status: 'online' | 'degraded' | 'offline';
  ws_status: 'connected' | 'disconnected' | 'reconnecting';
  db_status: 'online' | 'offline';
  uptime_seconds: number;
  version: string;
  demo_mode: boolean;
  active_connections: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'soc_analyst' | 'security_engineer' | 'viewer';
  avatar?: string;
  last_login?: string;
}

export interface Notification {
  id: string;
  type: 'alert' | 'incident' | 'system' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  link?: string;
}
