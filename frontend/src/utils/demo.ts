/* ═══════════════════════════════════════════════════════════
   Demo Data Generator — Realistic Security Telemetry
   ═══════════════════════════════════════════════════════════ */

import type { SecurityEvent, Threat, Incident, Vulnerability, IOC, DashboardStats, MitreAttack, Playbook, AIAnalysis } from '../types/security';
import type { NetworkPacket, TrafficStats, Protocol } from '../types/network';
import type { Host, Notification } from '../types/system';

// ── Geographic Data ──
const GEO_LOCATIONS = [
  { country: 'Russia', lat: 55.75, lon: 37.62, code: 'RU' },
  { country: 'China', lat: 39.91, lon: 116.39, code: 'CN' },
  { country: 'USA', lat: 38.90, lon: -77.04, code: 'US' },
  { country: 'Brazil', lat: -15.79, lon: -47.88, code: 'BR' },
  { country: 'India', lat: 28.61, lon: 77.23, code: 'IN' },
  { country: 'Germany', lat: 52.52, lon: 13.40, code: 'DE' },
  { country: 'Japan', lat: 35.68, lon: 139.69, code: 'JP' },
  { country: 'UK', lat: 51.51, lon: -0.13, code: 'GB' },
  { country: 'Singapore', lat: 1.35, lon: 103.82, code: 'SG' },
  { country: 'Australia', lat: -33.87, lon: 151.21, code: 'AU' },
  { country: 'South Korea', lat: 37.57, lon: 126.98, code: 'KR' },
  { country: 'Iran', lat: 35.69, lon: 51.39, code: 'IR' },
  { country: 'North Korea', lat: 39.02, lon: 125.75, code: 'KP' },
  { country: 'France', lat: 48.86, lon: 2.35, code: 'FR' },
  { country: 'Canada', lat: 45.42, lon: -75.70, code: 'CA' },
  { country: 'Netherlands', lat: 52.37, lon: 4.90, code: 'NL' },
  { country: 'Ukraine', lat: 50.45, lon: 30.52, code: 'UA' },
  { country: 'Turkey', lat: 41.01, lon: 28.98, code: 'TR' },
];

const ATTACK_TYPES = [
  'Brute Force', 'Port Scan', 'DDoS', 'SQL Injection', 'XSS',
  'Phishing', 'Malware', 'Ransomware', 'Man-in-the-Middle', 'DNS Tunneling',
  'Credential Stuffing', 'Buffer Overflow', 'Privilege Escalation',
  'Data Exfiltration', 'Command Injection', 'Directory Traversal',
  'Zero Day', 'Lateral Movement', 'Cryptomining', 'APT Activity',
];

const MITRE_TECHNIQUES = [
  { id: 'T1110', name: 'Brute Force', tactic: 'Credential Access' },
  { id: 'T1046', name: 'Network Service Scanning', tactic: 'Discovery' },
  { id: 'T1498', name: 'Network Denial of Service', tactic: 'Impact' },
  { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
  { id: 'T1566', name: 'Phishing', tactic: 'Initial Access' },
  { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution' },
  { id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion' },
  { id: 'T1071', name: 'Application Layer Protocol', tactic: 'Command and Control' },
  { id: 'T1048', name: 'Exfiltration Over Alternative Protocol', tactic: 'Exfiltration' },
  { id: 'T1021', name: 'Remote Services', tactic: 'Lateral Movement' },
  { id: 'T1547', name: 'Boot or Logon Autostart Execution', tactic: 'Persistence' },
  { id: 'T1068', name: 'Exploitation for Privilege Escalation', tactic: 'Privilege Escalation' },
];

const EVENT_DESCRIPTIONS = [
  'Brute-force attack detected on SSH service',
  'Port scan detected from external IP',
  'Suspicious DNS request to known C2 domain',
  'Authentication failure for admin account',
  'Multiple failed login attempts detected',
  'Outbound connection to malicious IP',
  'Unusual data transfer volume detected',
  'SQL injection attempt on web application',
  'Cross-site scripting attempt blocked',
  'Unauthorized privilege escalation attempt',
  'Suspicious PowerShell execution detected',
  'Malware signature detected in network traffic',
  'Lateral movement activity detected',
  'Abnormal process execution on endpoint',
  'Data exfiltration attempt detected',
  'Certificate anomaly detected',
  'Cryptomining activity detected on server',
  'Phishing email with malicious attachment',
  'Unauthorized API access attempt',
  'Abnormal login location detected',
];

const HOSTNAMES = [
  'WEB-SERVER-01', 'WEB-SERVER-02', 'WEB-SERVER-03',
  'DB-SERVER-01', 'DB-SERVER-02',
  'APP-SERVER-01', 'APP-SERVER-02', 'APP-SERVER-03',
  'MAIL-SERVER-01', 'DNS-SERVER-01',
  'FW-01', 'FW-02',
  'PROXY-01', 'PROXY-02',
  'DC-01', 'DC-02',
  'FILE-SERVER-01', 'BACKUP-01',
  'MONITOR-01', 'LOG-SERVER-01',
];

const OS_TYPES = ['Ubuntu 22.04', 'CentOS 8', 'Windows Server 2022', 'Debian 12', 'RHEL 9', 'FreeBSD 14'];
const SERVICES = ['nginx', 'apache2', 'sshd', 'postgresql', 'mysql', 'redis', 'docker', 'haproxy', 'bind9', 'postfix'];
const PROTOCOLS: Protocol[] = ['TCP', 'UDP', 'ICMP', 'DNS', 'HTTP', 'HTTPS', 'SSH', 'SMB'];

// ── Helpers ──
let _id = 0;
function genId(prefix = 'evt'): string {
  return `${prefix}-${Date.now()}-${++_id}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randIP(internal = false): string {
  if (internal) return `10.0.${randInt(0, 5)}.${randInt(1, 254)}`;
  return `${randInt(1, 223)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;
}

function randSeverity(): 'critical' | 'high' | 'medium' | 'low' {
  const r = Math.random();
  if (r < 0.08) return 'critical';
  if (r < 0.25) return 'high';
  if (r < 0.55) return 'medium';
  return 'low';
}

function now(): string {
  return new Date().toISOString();
}

function pastMinutes(min: number): string {
  return new Date(Date.now() - min * 60000).toISOString();
}

// ── Generators ──

export function generateSecurityEvent(): SecurityEvent {
  const source = pick(GEO_LOCATIONS);
  const dest = pick(GEO_LOCATIONS.filter(g => g.code !== source.code));
  const mitre = pick(MITRE_TECHNIQUES);
  const severity = randSeverity();

  return {
    id: genId('evt'),
    type: 'threat_detected',
    severity,
    source_ip: randIP(),
    source_port: randInt(1024, 65535),
    destination_ip: randIP(true),
    destination_port: pick([22, 80, 443, 3306, 5432, 8080, 8443, 3389]),
    country_source: source.country,
    country_destination: dest.country,
    lat_source: source.lat + randFloat(-2, 2),
    lon_source: source.lon + randFloat(-2, 2),
    lat_destination: dest.lat + randFloat(-2, 2),
    lon_destination: dest.lon + randFloat(-2, 2),
    attack_type: pick(ATTACK_TYPES),
    description: pick(EVENT_DESCRIPTIONS),
    mitre_technique: mitre.id,
    mitre_tactic: mitre.tactic,
    timestamp: now(),
  };
}

export function generateNetworkPacket(): NetworkPacket {
  const protocol = pick(PROTOCOLS);
  const status = Math.random() < 0.05 ? 'suspicious' : Math.random() < 0.02 ? 'malicious' : 'normal';
  return {
    id: genId('pkt'),
    timestamp: now(),
    source_ip: Math.random() < 0.4 ? randIP() : randIP(true),
    source_port: randInt(1024, 65535),
    destination_ip: Math.random() < 0.6 ? randIP(true) : randIP(),
    destination_port: pick([22, 53, 80, 443, 3306, 5432, 8080, 8443, 445, 25]),
    protocol,
    size: randInt(64, 9000),
    flags: protocol === 'TCP' ? pick(['SYN', 'ACK', 'SYN-ACK', 'FIN', 'RST', 'PSH-ACK']) : undefined,
    status,
    threat: status !== 'normal' ? pick(ATTACK_TYPES) : undefined,
  };
}

export function generateTrafficStats(): TrafficStats {
  return {
    timestamp: now(),
    packets_per_sec: randInt(15000, 22000),
    bandwidth_mbps: randFloat(120, 380),
    inbound_mbps: randFloat(60, 200),
    outbound_mbps: randFloat(40, 180),
    connections: randInt(800, 2500),
    tcp_count: randInt(8000, 15000),
    udp_count: randInt(2000, 5000),
    icmp_count: randInt(50, 500),
    dns_count: randInt(1000, 4000),
    http_count: randInt(2000, 6000),
    https_count: randInt(5000, 12000),
    ssh_count: randInt(100, 800),
    smb_count: randInt(50, 300),
  };
}

export function generateDashboardStats(): DashboardStats {
  return {
    security_score: randInt(78, 95),
    active_threats: randInt(200, 300),
    critical_threats: randInt(5, 15),
    active_incidents: randInt(8, 18),
    vulnerabilities: randInt(35, 65),
    packets_per_sec: randInt(16000, 21000),
    monitored_hosts: 128,
    blocked_ips: randInt(1100, 1500),
    system_health: randFloat(99.5, 99.99),
  };
}

export function generateHosts(): Host[] {
  return HOSTNAMES.map((hostname, i) => ({
    id: `host-${i + 1}`,
    hostname,
    ip: `10.0.${Math.floor(i / 5)}.${(i % 5) * 10 + 10}`,
    os: pick(OS_TYPES),
    cpu_usage: randFloat(5, 85),
    ram_usage: randFloat(20, 90),
    network_mbps: randFloat(1, 50),
    risk_level: pick(['critical', 'high', 'medium', 'low'] as const),
    status: Math.random() < 0.9 ? 'online' : Math.random() < 0.5 ? 'degraded' : 'offline',
    open_ports: [22, 80, 443, 3306, 5432, 8080].slice(0, randInt(2, 6)),
    services: SERVICES.slice(0, randInt(2, 5)),
    last_seen: pastMinutes(randInt(0, 30)),
    events_count: randInt(0, 50),
  }));
}

export function generateThreats(count = 15): Threat[] {
  return Array.from({ length: count }, (_, i) => {
    const mitre = pick(MITRE_TECHNIQUES);
    return {
      id: `thr-${1000 + i}`,
      name: pick(ATTACK_TYPES),
      severity: randSeverity(),
      status: pick(['active', 'investigating', 'mitigated', 'resolved'] as const),
      source_ip: randIP(),
      destination_ip: randIP(true),
      attack_type: pick(ATTACK_TYPES),
      description: pick(EVENT_DESCRIPTIONS),
      mitre_technique: mitre.id,
      mitre_tactic: mitre.tactic,
      confidence: randInt(60, 99),
      first_seen: pastMinutes(randInt(30, 1440)),
      last_seen: pastMinutes(randInt(0, 30)),
      event_count: randInt(1, 500),
      affected_hosts: HOSTNAMES.slice(0, randInt(1, 4)),
    };
  });
}

export function generateIncidents(count = 8): Incident[] {
  const states: Incident['state'][] = ['new', 'triaged', 'investigating', 'contained', 'resolved', 'false_positive'];
  return Array.from({ length: count }, (_, i) => ({
    id: `INC-2026-${String(421 + i).padStart(5, '0')}`,
    title: pick(['Brute Force Attack', 'Port Scan Activity', 'Malware Detected', 'Data Exfiltration Attempt', 'Unauthorized Access', 'DDoS Attack', 'Phishing Campaign', 'Ransomware Detected']),
    severity: randSeverity(),
    state: pick(states),
    description: pick(EVENT_DESCRIPTIONS),
    source_ip: randIP(),
    affected_hosts: HOSTNAMES.slice(0, randInt(1, 3)),
    assigned_to: pick(['analyst01', 'analyst02', 'admin', undefined]),
    created_at: pastMinutes(randInt(10, 2880)),
    updated_at: pastMinutes(randInt(0, 60)),
    timeline: [
      { timestamp: pastMinutes(120), action: 'Detection', description: 'Threat detected by IDS', user: 'system' },
      { timestamp: pastMinutes(90), action: 'Analysis', description: 'Automated analysis completed', user: 'system' },
      { timestamp: pastMinutes(60), action: 'Triage', description: 'Incident triaged as high priority', user: 'analyst01' },
      { timestamp: pastMinutes(30), action: 'Containment', description: 'Source IP blocked', user: 'analyst01' },
    ],
    response_actions: [],
  }));
}

export function generateVulnerabilities(count = 20): Vulnerability[] {
  const cveDescriptions = [
    'Remote code execution via buffer overflow',
    'SQL injection in authentication module',
    'Cross-site scripting in admin panel',
    'Privilege escalation via misconfigured SUID',
    'Information disclosure in error handling',
    'Denial of service via malformed packets',
    'Authentication bypass via default credentials',
    'Path traversal in file upload component',
    'Insecure deserialization vulnerability',
    'Server-side request forgery (SSRF)',
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `vuln-${i + 1}`,
    cve_id: `CVE-DEMO-${2026}-${String(1000 + i).padStart(5, '0')}`,
    title: pick(cveDescriptions),
    description: `Demo vulnerability: ${pick(cveDescriptions)}. This is simulated data for demonstration purposes.`,
    severity: pick(['critical', 'high', 'medium', 'low'] as const),
    cvss_score: randFloat(2, 10),
    host: pick(HOSTNAMES),
    service: pick(['HTTPS', 'SSH', 'HTTP', 'MySQL', 'PostgreSQL', 'SMB', 'DNS']),
    port: pick([22, 80, 443, 3306, 5432, 445, 53]),
    status: pick(['open', 'patched', 'mitigated', 'accepted'] as const),
    remediation: pick(['Apply latest security patch', 'Update to latest version', 'Restrict network access', 'Disable vulnerable service', 'Apply WAF rules']),
    detected_at: pastMinutes(randInt(60, 10080)),
  }));
}

export function generateIOCs(count = 12): IOC[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ioc-${i + 1}`,
    type: pick(['ip', 'domain', 'hash', 'url'] as const),
    value: pick([
      randIP(),
      `malware-c2-${randInt(1, 99)}.example.net`,
      `${Array.from({ length: 32 }, () => '0123456789abcdef'[randInt(0, 15)]).join('')}`,
      `https://phishing-${randInt(1, 99)}.example.com/login`,
    ]),
    reputation: pick(['malicious', 'suspicious', 'clean', 'unknown'] as const),
    confidence: randInt(50, 99),
    threat_type: pick(ATTACK_TYPES),
    first_seen: pastMinutes(randInt(60, 43200)),
    last_seen: pastMinutes(randInt(0, 1440)),
    tags: pick([['apt', 'nation-state'], ['botnet'], ['phishing', 'credential-theft'], ['malware', 'c2'], ['scanner']]),
    source: pick(['internal_ids', 'threat_feed', 'community', 'osint', 'partner']),
  }));
}

export function generateMitreMatrix(): MitreAttack[] {
  return MITRE_TECHNIQUES.map(t => ({
    tactic: t.tactic,
    technique_id: t.id,
    technique_name: t.name,
    count: randInt(0, 50),
    severity: randSeverity(),
    last_seen: pastMinutes(randInt(0, 1440)),
  }));
}

export function generatePlaybooks(): Playbook[] {
  return [
    {
      id: 'pb-1', name: 'Brute Force Response', description: 'Automated response to brute force attacks',
      trigger: 'Multiple failed login attempts (>10 in 5min)', status: 'active', run_count: 47, last_run: pastMinutes(15),
      steps: [
        { id: 's1', name: 'Detect', type: 'trigger', description: 'Detect brute force pattern' },
        { id: 's2', name: 'Analyze Source', type: 'analyze', description: 'Check source IP reputation' },
        { id: 's3', name: 'Evaluate Risk', type: 'decision', description: 'Determine if legitimate or attack' },
        { id: 's4', name: 'Block IP', type: 'action', description: 'Block source IP at firewall' },
        { id: 's5', name: 'Alert SOC', type: 'notification', description: 'Notify SOC team' },
      ],
    },
    {
      id: 'pb-2', name: 'Port Scan Response', description: 'Detection and response to port scanning activity',
      trigger: 'Port scan pattern detected', status: 'active', run_count: 23, last_run: pastMinutes(45),
      steps: [
        { id: 's1', name: 'Detect Scan', type: 'trigger', description: 'IDS detects port scan' },
        { id: 's2', name: 'Correlate Events', type: 'analyze', description: 'Correlate with other events' },
        { id: 's3', name: 'Risk Assessment', type: 'decision', description: 'Assess threat level' },
        { id: 's4', name: 'Rate Limit', type: 'action', description: 'Apply rate limiting rules' },
        { id: 's5', name: 'Log & Report', type: 'notification', description: 'Log and notify team' },
      ],
    },
    {
      id: 'pb-3', name: 'Malware Detection', description: 'Automated malware detection and containment',
      trigger: 'Malware signature detected', status: 'active', run_count: 12, last_run: pastMinutes(180),
      steps: [
        { id: 's1', name: 'Signature Match', type: 'trigger', description: 'AV/IDS detects malware signature' },
        { id: 's2', name: 'Sandbox Analysis', type: 'analyze', description: 'Submit to sandbox for analysis' },
        { id: 's3', name: 'Confirm Threat', type: 'decision', description: 'Confirm if true positive' },
        { id: 's4', name: 'Isolate Host', type: 'action', description: 'Isolate affected host' },
        { id: 's5', name: 'Escalate', type: 'notification', description: 'Escalate to incident response' },
      ],
    },
    {
      id: 'pb-4', name: 'Suspicious Login', description: 'Response to anomalous authentication',
      trigger: 'Login from unusual location/device', status: 'active', run_count: 89, last_run: pastMinutes(5),
      steps: [
        { id: 's1', name: 'Anomaly Detected', type: 'trigger', description: 'Auth anomaly detected' },
        { id: 's2', name: 'User Context', type: 'analyze', description: 'Check user travel/device history' },
        { id: 's3', name: 'Risk Score', type: 'decision', description: 'Calculate risk score' },
        { id: 's4', name: 'MFA Challenge', type: 'action', description: 'Require additional MFA' },
        { id: 's5', name: 'Notify User', type: 'notification', description: 'Notify user of login attempt' },
      ],
    },
    {
      id: 'pb-5', name: 'DDoS Indicator', description: 'Detection and mitigation of DDoS patterns',
      trigger: 'Traffic anomaly exceeding baseline', status: 'active', run_count: 5, last_run: pastMinutes(720),
      steps: [
        { id: 's1', name: 'Traffic Spike', type: 'trigger', description: 'Traffic exceeds threshold' },
        { id: 's2', name: 'Pattern Analysis', type: 'analyze', description: 'Analyze traffic patterns' },
        { id: 's3', name: 'DDoS Confirm', type: 'decision', description: 'Confirm DDoS vs. legitimate spike' },
        { id: 's4', name: 'Enable Mitigation', type: 'action', description: 'Enable DDoS mitigation rules' },
        { id: 's5', name: 'War Room', type: 'notification', description: 'Initiate war room if critical' },
      ],
    },
  ];
}

export function generateNotifications(count = 5): Notification[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `notif-${i + 1}`,
    type: pick(['alert', 'incident', 'system', 'info'] as const),
    severity: randSeverity(),
    title: pick(['Critical Threat Detected', 'New Incident Created', 'System Update Available', 'Scan Complete', 'Host Offline']),
    message: pick(EVENT_DESCRIPTIONS),
    read: Math.random() < 0.3,
    timestamp: pastMinutes(randInt(1, 120)),
  }));
}

export function generateAIAnalysis(threat?: Threat): AIAnalysis {
  return {
    id: genId('ai'),
    threat_id: threat?.id,
    analysis: threat
      ? `Multiple failed authentication attempts were detected from a single external source (${threat.source_ip}) against SSH service on ${threat.affected_hosts[0]}. The attack pattern is consistent with an automated brute-force tool targeting common credentials. The source IP has been observed in 3 previous incidents over the past 24 hours.`
      : 'Network analysis indicates elevated threat activity with multiple attack vectors observed across the monitored infrastructure. The primary concern is a coordinated scanning effort targeting web-facing services.',
    risk_level: threat?.severity || 'high',
    confidence: randInt(85, 98),
    attack_category: threat?.attack_type || 'Multi-Vector Attack',
    affected_assets: threat?.affected_hosts || HOSTNAMES.slice(0, 3),
    investigation_steps: [
      'Investigate source IP reputation and history',
      'Review authentication logs for affected hosts',
      'Check for any successful compromises',
      'Analyze network traffic patterns from source',
      'Correlate with other security events',
    ],
    containment_actions: [
      'Block source IP at perimeter firewall',
      'Apply rate limiting on affected services',
      'Enable enhanced logging on target hosts',
      'Notify SOC team for monitoring',
      'Consider temporary geo-blocking if pattern persists',
    ],
    timestamp: now(),
  };
}

// ── Continuous Update Helpers ──
export function jitterValue(current: number, range: number, min: number, max: number): number {
  const delta = (Math.random() - 0.5) * 2 * range;
  return Math.max(min, Math.min(max, current + delta));
}

export function updateDashboardStats(prev: DashboardStats): DashboardStats {
  return {
    security_score: Math.round(jitterValue(prev.security_score, 2, 70, 99)),
    active_threats: Math.round(jitterValue(prev.active_threats, 5, 180, 350)),
    critical_threats: Math.round(jitterValue(prev.critical_threats, 1, 3, 20)),
    active_incidents: Math.round(jitterValue(prev.active_incidents, 1, 5, 25)),
    vulnerabilities: Math.round(jitterValue(prev.vulnerabilities, 2, 30, 80)),
    packets_per_sec: Math.round(jitterValue(prev.packets_per_sec, 500, 14000, 24000)),
    monitored_hosts: prev.monitored_hosts,
    blocked_ips: Math.round(jitterValue(prev.blocked_ips, 3, 1000, 1800)),
    system_health: parseFloat(jitterValue(prev.system_health, 0.02, 99.0, 99.99).toFixed(2)),
  };
}
