/* ═══════════════════════════════════════════════════════════
   Type Definitions — Security Domain
   ═══════════════════════════════════════════════════════════ */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type IncidentState = 'new' | 'triaged' | 'investigating' | 'contained' | 'resolved' | 'false_positive';
export type ThreatStatus = 'active' | 'mitigated' | 'resolved' | 'investigating';
export type VulnStatus = 'open' | 'patched' | 'mitigated' | 'accepted';
export type ActionType = 'block_ip' | 'isolate_host' | 'disable_account' | 'terminate_session' | 'create_incident' | 'escalate' | 'mark_false_positive';
export type UserRole = 'admin' | 'soc_analyst' | 'security_engineer' | 'viewer';

export interface SecurityEvent {
  id: string;
  type: string;
  severity: Severity;
  source_ip: string;
  source_port?: number;
  destination_ip: string;
  destination_port?: number;
  country_source?: string;
  country_destination?: string;
  lat_source?: number;
  lon_source?: number;
  lat_destination?: number;
  lon_destination?: number;
  attack_type: string;
  description: string;
  mitre_technique?: string;
  mitre_tactic?: string;
  timestamp: string;
  raw_log?: string;
}

export interface Threat {
  id: string;
  name: string;
  severity: Severity;
  status: ThreatStatus;
  source_ip: string;
  destination_ip: string;
  attack_type: string;
  description: string;
  mitre_technique?: string;
  mitre_tactic?: string;
  confidence: number;
  first_seen: string;
  last_seen: string;
  event_count: number;
  affected_hosts: string[];
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  state: IncidentState;
  description: string;
  source_ip?: string;
  affected_hosts: string[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  timeline: IncidentTimelineEntry[];
  response_actions: ResponseAction[];
}

export interface IncidentTimelineEntry {
  timestamp: string;
  action: string;
  description: string;
  user?: string;
}

export interface ResponseAction {
  id: string;
  type: ActionType;
  target: string;
  status: 'pending' | 'executed' | 'simulated' | 'failed';
  executed_by?: string;
  executed_at?: string;
  result?: string;
}

export interface Vulnerability {
  id: string;
  cve_id: string;
  title: string;
  description: string;
  severity: Severity;
  cvss_score: number;
  host: string;
  service: string;
  port?: number;
  status: VulnStatus;
  remediation: string;
  detected_at: string;
  patched_at?: string;
}

export interface IOC {
  id: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email';
  value: string;
  reputation: 'malicious' | 'suspicious' | 'clean' | 'unknown';
  confidence: number;
  threat_type?: string;
  first_seen: string;
  last_seen: string;
  tags: string[];
  source: string;
}

export interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  motivation: string;
  country?: string;
  techniques: string[];
  targets: string[];
  first_seen: string;
  confidence: number;
}

export interface MitreAttack {
  tactic: string;
  technique_id: string;
  technique_name: string;
  count: number;
  severity: Severity;
  last_seen: string;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: PlaybookStep[];
  status: 'active' | 'inactive' | 'draft';
  last_run?: string;
  run_count: number;
}

export interface PlaybookStep {
  id: string;
  name: string;
  type: 'trigger' | 'analyze' | 'decision' | 'action' | 'notification';
  description: string;
  status?: 'pending' | 'running' | 'completed' | 'skipped';
}

export interface DashboardStats {
  security_score: number;
  active_threats: number;
  critical_threats: number;
  active_incidents: number;
  vulnerabilities: number;
  packets_per_sec: number;
  monitored_hosts: number;
  blocked_ips: number;
  system_health: number;
}

export interface AuditLogEntry {
  id: string;
  user: string;
  action: string;
  target: string;
  result: string;
  timestamp: string;
  details?: string;
}

export interface AIAnalysis {
  id: string;
  threat_id?: string;
  analysis: string;
  risk_level: Severity;
  confidence: number;
  attack_category: string;
  affected_assets: string[];
  investigation_steps: string[];
  containment_actions: string[];
  timestamp: string;
}
