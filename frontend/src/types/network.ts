/* ═══════════════════════════════════════════════════════════
   Type Definitions — Network Domain
   ═══════════════════════════════════════════════════════════ */

export type Protocol = 'TCP' | 'UDP' | 'ICMP' | 'DNS' | 'HTTP' | 'HTTPS' | 'SSH' | 'SMB' | 'FTP' | 'SMTP' | 'OTHER';
export type PacketStatus = 'normal' | 'suspicious' | 'malicious' | 'blocked';

export interface NetworkPacket {
  id: string;
  timestamp: string;
  source_ip: string;
  source_port: number;
  destination_ip: string;
  destination_port: number;
  protocol: Protocol;
  size: number;
  flags?: string;
  status: PacketStatus;
  threat?: string;
}

export interface TrafficStats {
  timestamp: string;
  packets_per_sec: number;
  bandwidth_mbps: number;
  inbound_mbps: number;
  outbound_mbps: number;
  connections: number;
  tcp_count: number;
  udp_count: number;
  icmp_count: number;
  dns_count: number;
  http_count: number;
  https_count: number;
  ssh_count: number;
  smb_count: number;
}

export interface TopTalker {
  ip: string;
  hostname?: string;
  bytes: number;
  packets: number;
  connections: number;
  protocol: Protocol;
}
