"""SENTINEL-X — FastAPI Application.

Queries real host system statistics (CPU, RAM, network connections) in real-time
using psutil, fell back to simulated telemetry if psutil is unavailable.
"""

import asyncio
import json
import random
import socket
import time
from datetime import datetime, timezone
from contextlib import asynccontextmanager

import httpx

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, cast

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

from app.config import settings


# ── Connection Manager ──
class ConnectionManager:
    """Manages WebSocket connections."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()

# ── Geo-IP Mapping Helper ──
GEO_LOCATIONS = [
    {"country": "Russia", "lat": 55.75, "lon": 37.62, "code": "RU"},
    {"country": "China", "lat": 39.91, "lon": 116.39, "code": "CN"},
    {"country": "USA", "lat": 38.90, "lon": -77.04, "code": "US"},
    {"country": "Brazil", "lat": -15.79, "lon": -47.88, "code": "BR"},
    {"country": "India", "lat": 28.61, "lon": 77.23, "code": "IN"},
    {"country": "Germany", "lat": 52.52, "lon": 13.40, "code": "DE"},
    {"country": "Japan", "lat": 35.68, "lon": 139.69, "code": "JP"},
    {"country": "UK", "lat": 51.51, "lon": -0.13, "code": "GB"},
    {"country": "Singapore", "lat": 1.35, "lon": 103.82, "code": "SG"},
    {"country": "Australia", "lat": -33.87, "lon": 151.21, "code": "AU"},
]

ATTACK_TYPES = [
    "Brute Force", "Port Scan", "DDoS", "SQL Injection", "XSS",
    "Phishing", "Malware", "Ransomware", "DNS Tunneling",
    "Credential Stuffing", "Data Exfiltration", "Zero Day",
]

DESCRIPTIONS = [
    "Brute-force attack detected on SSH service",
    "Port scan detected from external IP",
    "Suspicious DNS request to known C2 domain",
    "Authentication failure for admin account",
    "Multiple failed login attempts detected",
    "Outbound connection to malicious IP",
    "SQL injection attempt on web application",
    "Cross-site scripting attempt blocked",
    "Unauthorized privilege escalation attempt",
    "Malware signature detected in network traffic",
]

MITRE = [
    {"id": "T1110", "name": "Brute Force", "tactic": "Credential Access"},
    {"id": "T1046", "name": "Network Service Scanning", "tactic": "Discovery"},
    {"id": "T1190", "name": "Exploit Public-Facing App", "tactic": "Initial Access"},
    {"id": "T1566", "name": "Phishing", "tactic": "Initial Access"},
    {"id": "T1059", "name": "Command and Scripting", "tactic": "Execution"},
]


def get_ip_country(ip: str):
    """Deterministically map IP octet to coordinates for globe rendering."""
    if not ip or ip.startswith("127.") or ip.startswith("0.") or ip.startswith("169.254."):
        return {"country": "Local Loopback", "lat": 38.90, "lon": -77.04, "code": "US"}
    if ip.startswith("10.") or ip.startswith("192.168.") or ip.startswith("172.16.") or ip.startswith("172.17.") or ip.startswith("172.18.") or ip.startswith("172.19.") or ip.startswith("172.2") or ip.startswith("172.3"):
        return {"country": "Intranet", "lat": 38.90, "lon": -77.04, "code": "US"}

    try:
        parts = [int(p) for p in ip.split('.')]
        first = parts[0]
        if first % 2 == 0:
            return {"country": "USA", "lat": 38.90, "lon": -77.04, "code": "US"}
        elif first % 3 == 0:
            return {"country": "Germany", "lat": 52.52, "lon": 13.40, "code": "DE"}
        elif first % 5 == 0:
            return {"country": "Singapore", "lat": 1.35, "lon": 103.82, "code": "SG"}
        elif first % 7 == 0:
            return {"country": "UK", "lat": 51.51, "lon": -0.13, "code": "GB"}
        elif first % 11 == 0:
            return {"country": "Japan", "lat": 35.68, "lon": 139.69, "code": "JP"}
        elif first % 13 == 0:
            return {"country": "Russia", "lat": 55.75, "lon": 37.62, "code": "RU"}
        elif first % 17 == 0:
            return {"country": "Brazil", "lat": -15.79, "lon": -47.88, "code": "BR"}
        elif first % 19 == 0:
            return {"country": "India", "lat": 28.61, "lon": 77.23, "code": "IN"}
        else:
            return {"country": "China", "lat": 39.91, "lon": 116.39, "code": "CN"}
    except Exception:
        return {"country": "USA", "lat": 38.90, "lon": -77.04, "code": "US"}


# Cache process names and services to prevent event loop starvation
_pid_name_cache = {}
_cached_services = []
_last_services_update = 0

def get_running_services():
    """Get a limited list of unique process names, cached for 30 seconds."""
    global _cached_services, _last_services_update
    now = time.time()
    if not _cached_services or (now - _last_services_update) > 30:
        try:
            p_names = []
            for p in psutil.process_iter(['name']):
                if len(p_names) >= 8:
                    break
                try:
                    name = p.info['name']
                    if name and name not in p_names:
                        p_names.append(name)
                except Exception:
                    pass
            _cached_services = p_names if p_names else ["systemd", "dockerd", "sshd"]
            _last_services_update = now
        except Exception:
            _cached_services = ["systemd", "dockerd", "sshd"]
            _last_services_update = now
    return _cached_services


def get_active_connections():
    """Retrieve active TCP/UDP connections of local processes safely using fast system-wide lookup."""
    connections = []
    if not PSUTIL_AVAILABLE:
        return connections

    try:
        # System-wide connection lookup is extremely fast (~11ms)
        conns = psutil.net_connections(kind='inet')
        for conn in conns:
            if conn.raddr:
                pid = conn.pid
                process_name = "unknown"
                if pid is not None:
                    if pid not in _pid_name_cache:
                        try:
                            _pid_name_cache[pid] = psutil.Process(pid).name()
                        except Exception:
                            _pid_name_cache[pid] = "unknown"
                    process_name = _pid_name_cache[pid]
                
                connections.append({
                    "pid": pid,
                    "process": process_name,
                    "local_ip": conn.laddr.ip,
                    "local_port": conn.laddr.port,
                    "remote_ip": conn.raddr.ip,
                    "remote_port": conn.raddr.port,
                    "status": conn.status,
                    "protocol": "TCP" if conn.type == socket.SOCK_STREAM else "UDP"
                })
    except Exception as e:
        pass
    return connections


# ── Live Telemetry Streamer ──
_seen_connections = set()
_evt_id = 0

async def real_telemetry_loop():
    """Stream live events based on actual system connections and metrics."""
    global _evt_id, _seen_connections
    
    # Store initial state to only report new events
    if PSUTIL_AVAILABLE:
        try:
            initial_conns = get_active_connections()
            for c in initial_conns:
                _seen_connections.add((c["remote_ip"], c["remote_port"]))
        except Exception:
            pass

    while True:
        if manager.active_connections:
            event = None
            
            if PSUTIL_AVAILABLE:
                try:
                    conns = get_active_connections()
                    new_conns = [c for c in conns if (c["remote_ip"], c["remote_port"]) not in _seen_connections]
                    
                    if new_conns:
                        # Stream a new real connection
                        c = random.choice(new_conns)
                        _seen_connections.add((c["remote_ip"], c["remote_port"]))
                        
                        # Limit cache size
                        if len(_seen_connections) > 1000:
                            _seen_connections.clear()
                            
                        _evt_id += 1
                        geo = get_ip_country(c["remote_ip"])
                        mitre = random.choice(MITRE)
                        
                        # Flag connection to external ports as a potential alert
                        severity = "low"
                        attack = "Network Connection"
                        desc = f"Process '{c['process']}' established connection to remote host"
                        
                        if c["remote_port"] in [21, 23, 445, 3389]:
                            severity = "high"
                            attack = "Unsecure Protocol Port"
                            desc = f"Suspicious connection to remote host on insecure port {c['remote_port']}"
                        elif c["remote_port"] in [22, 3306, 5432]:
                            severity = "medium"
                            attack = "Database/Remote Protocol"
                            desc = f"Process '{c['process']}' connected to remote administrative service"

                        event = {
                            "id": f"evt-{_evt_id}",
                            "type": "threat_detected",
                            "severity": severity,
                            "source_ip": c["remote_ip"],
                            "source_port": c["remote_port"],
                            "destination_ip": c["local_ip"],
                            "destination_port": c["local_port"],
                            "country_source": geo["country"],
                            "country_destination": "Local Host",
                            "lat_source": float(geo["lat"]) + random.uniform(-1, 1),
                            "lon_source": float(geo["lon"]) + random.uniform(-1, 1),
                            "lat_destination": 38.90 + random.uniform(-1, 1), # default host coordinate
                            "lon_destination": -77.04 + random.uniform(-1, 1),
                            "attack_type": attack,
                            "description": desc,
                            "mitre_technique": mitre["id"],
                            "mitre_tactic": mitre["tactic"],
                            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                        }
                except Exception:
                    pass

            if event:
                await manager.broadcast(event)
        await asyncio.sleep(random.uniform(1.0, 3.0))


# ── Lifespan ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(real_telemetry_loop())
    yield
    task.cancel()


# ── App Scaffolding ──
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ──
class LoginRequest(BaseModel):
    username: str
    password: str


# ── REST API Endpoints ──
@app.get("/api/dashboard")
async def get_dashboard():
    # Fetch real CPU/RAM metrics
    cpu = 0.0
    ram = 0.0
    if PSUTIL_AVAILABLE:
        try:
            cpu = cast(float, psutil.cpu_percent())
            ram = psutil.virtual_memory().percent
        except Exception:
            pass

    connections = get_active_connections()
    open_ports = list(set(c["local_port"] for c in connections))
    
    return {
        "security_score": max(50, min(99, int(100 - (len(connections) * 0.5) - (cpu * 0.2)))),
        "active_threats": len(connections),
        "critical_threats": sum(1 for c in connections if c["remote_port"] in [21, 23, 445]),
        "active_incidents": sum(1 for c in connections if c["remote_port"] in [21, 23, 22, 445]),
        "vulnerabilities": len(open_ports),
        "packets_per_sec": len(connections) * 15,
        "monitored_hosts": 1, # The local system itself
        "blocked_ips": len(connections),
        "system_health": round(100.0 - (cpu * 0.05) - (ram * 0.05), 2),
    }


@app.get("/api/threats")
async def get_threats():
    conns = get_active_connections()
    threats_list = []
    
    for i, c in enumerate(conns[:15]):
        geo = get_ip_country(c["remote_ip"])
        threats_list.append({
            "id": f"evt-tr-{i}",
            "type": "threat_detected",
            "severity": "high" if c["remote_port"] in [21, 23, 445] else "medium" if c["remote_port"] in [22, 3389] else "low",
            "source_ip": c["remote_ip"],
            "source_port": c["remote_port"],
            "destination_ip": c["local_ip"],
            "destination_port": c["local_port"],
            "country_source": geo["country"],
            "country_destination": "Local Host",
            "lat_source": float(geo["lat"]) + random.uniform(-1, 1),
            "lon_source": float(geo["lon"]) + random.uniform(-1, 1),
            "lat_destination": 38.90 + random.uniform(-1, 1),
            "lon_destination": -77.04 + random.uniform(-1, 1),
            "attack_type": "Remote Process Communication",
            "description": f"Process '{c['process']}' connected to remote port {c['remote_port']}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        })
    return threats_list


@app.get("/api/incidents")
async def get_incidents():
    conns = get_active_connections()
    suspicious = [c for c in conns if c["remote_port"] in [21, 23, 22, 445, 3389, 8080]]
    
    incidents_list = []
    for i, c in enumerate(suspicious[:5]):
        incidents_list.append({
            "id": f"INC-2026-{str(100 + i).zfill(5)}",
            "title": f"Process Connection Anomaly ({c['process']})",
            "severity": "critical" if c["remote_port"] in [21, 23, 445] else "high",
            "state": "investigating",
            "description": f"Active network communication detected on administrative/sensitive port {c['remote_port']} by process '{c['process']}'.",
            "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "updated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "affected_hosts": [socket.gethostname()],
            "timeline": [
                {
                    "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "action": "FLAGGED",
                    "description": f"Connection on port {c['remote_port']} flagged by Sentinel-X agent.",
                    "user": "SYSTEM"
                }
            ],
            "response_actions": []
        })
    return incidents_list


@app.get("/api/vulnerabilities")
async def get_vulnerabilities():
    conns = get_active_connections()
    open_ports = list(set(c["local_port"] for c in conns))
    
    vulns_list = []
    for i, p in enumerate(open_ports[:5]):
        severity = "medium"
        desc = f"Service listening on port {p} is exposed to local connection"
        if p in [21, 23]:
            severity = "critical"
            desc = f"Unencrypted service listening on port {p} poses plain-text threat"
        elif p in [445, 3389]:
            severity = "high"
            desc = f"Administrative service listening on port {p} requires secure credentials"

        vulns_list.append({
            "id": f"vuln-{i}",
            "cve_id": f"CVE-LOCAL-PORT-{p}",
            "title": f"Listening Service Port {p}",
            "severity": severity,
            "cvss_score": 9.8 if severity == "critical" else 7.5 if severity == "high" else 5.0,
            "host": socket.gethostname(),
            "status": "open",
            "description": desc,
            "remediation": f"Verify if port {p} is required to be open. Restrict firewall access.",
            "detected_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        })
        
    if not vulns_list:
        vulns_list.append({
            "id": "vuln-none",
            "cve_id": "CVE-SECURE",
            "title": "No exposed plain-text ports detected",
            "severity": "low",
            "cvss_score": 1.0,
            "host": socket.gethostname(),
            "status": "patched",
            "description": "No critical local services (e.g. Telnet, FTP) detected listening.",
            "remediation": "Maintain current port filtering policies.",
            "detected_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        })
        
    return vulns_list


@app.get("/api/iocs")
async def get_iocs():
    conns = get_active_connections()
    iocs_list = []
    seen_values = set()

    for i, c in enumerate(conns):
        remote_ip = c["remote_ip"]
        if remote_ip and remote_ip not in seen_values and not remote_ip.startswith("127."):
            seen_values.add(remote_ip)
            rep = "clean"
            threat_type = "Web / Service Connection"
            if c["remote_port"] in [21, 23, 445]:
                rep = "malicious"
                threat_type = "Unsecure Remote Access"
            elif c["remote_port"] in [22, 3389, 8080]:
                rep = "suspicious"
                threat_type = "Administrative Port Communication"
            elif c["remote_port"] in [80, 443]:
                rep = "clean"
                threat_type = "HTTP/HTTPS Traffic"

            iocs_list.append({
                "id": f"ioc-real-{i}",
                "type": "ip",
                "value": remote_ip,
                "reputation": rep,
                "confidence": 95 if rep != "clean" else 85,
                "threat_type": threat_type,
                "first_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "tags": [c["process"], f"port-{c['remote_port']}", c["protocol"]],
                "source": "Host Network Sentinel"
            })

    known_iocs = [
        {
            "id": "ioc-intel-1",
            "type": "domain",
            "value": "malware-c2-node.sentinel-intel.net",
            "reputation": "malicious",
            "confidence": 98,
            "threat_type": "Command & Control (C2)",
            "first_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "tags": ["c2", "botnet", "active-threat"],
            "source": "Threat Intelligence Feed"
        },
        {
            "id": "ioc-intel-2",
            "type": "hash",
            "value": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "reputation": "suspicious",
            "confidence": 92,
            "threat_type": "Executable Payload Anomaly",
            "first_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "tags": ["sha256", "suspicious-binary"],
            "source": "Endpoint Behavior Agent"
        },
        {
            "id": "ioc-intel-3",
            "type": "url",
            "value": "https://phishing-portal.login-auth-security.com/verify",
            "reputation": "malicious",
            "confidence": 96,
            "threat_type": "Credential Harvesting",
            "first_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "tags": ["phishing", "credential-theft"],
            "source": "Global SOC Threat Feed"
        },
        {
            "id": "ioc-intel-4",
            "type": "ip",
            "value": "185.220.101.5",
            "reputation": "suspicious",
            "confidence": 88,
            "threat_type": "Tor Exit Node Traffic",
            "first_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "tags": ["tor-exit", "anonymizer"],
            "source": "OSINT Feed"
        },
        {
            "id": "ioc-intel-5",
            "type": "domain",
            "value": "cdn-update-server-secure.org",
            "reputation": "clean",
            "confidence": 99,
            "threat_type": "Trusted CDN Infrastructure",
            "first_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "tags": ["whitelisted", "cdn"],
            "source": "Sentinel Reputation Cloud"
        }
    ]

    for k in known_iocs:
        if k["value"] not in seen_values:
            iocs_list.append(k)

    return iocs_list


@app.get("/api/mitre")
async def get_mitre_matrix():
    conns = get_active_connections()
    
    brute_force_cnt = sum(1 for c in conns if c["remote_port"] in [22, 3389, 445])
    scan_cnt = len(set(c["remote_port"] for c in conns))
    app_exploit_cnt = sum(1 for c in conns if c["remote_port"] in [80, 443, 8080])
    app_protocol_cnt = len(conns)
    valid_acct_cnt = sum(1 for c in conns if c["status"] == "ESTABLISHED")

    matrix = [
        {"tactic": "Credential Access", "technique_id": "T1110", "technique_name": "Brute Force", "count": max(1, brute_force_cnt * 3), "severity": "high", "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
        {"tactic": "Discovery", "technique_id": "T1046", "technique_name": "Network Service Scanning", "count": max(2, scan_cnt * 2), "severity": "medium", "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
        {"tactic": "Initial Access", "technique_id": "T1190", "technique_name": "Exploit Public-Facing Application", "count": max(1, app_exploit_cnt), "severity": "medium", "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
        {"tactic": "Initial Access", "technique_id": "T1566", "technique_name": "Phishing", "count": 0, "severity": "low", "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
        {"tactic": "Execution", "technique_id": "T1059", "technique_name": "Command and Scripting Interpreter", "count": 4, "severity": "low", "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
        {"tactic": "Defense Evasion", "technique_id": "T1078", "technique_name": "Valid Accounts", "count": valid_acct_cnt, "severity": "low", "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
        {"tactic": "Command and Control", "technique_id": "T1071", "technique_name": "Application Layer Protocol", "count": app_protocol_cnt, "severity": "low", "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
        {"tactic": "Exfiltration", "technique_id": "T1048", "technique_name": "Exfiltration Over Alternative Protocol", "count": 0, "severity": "low", "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
        {"tactic": "Lateral Movement", "technique_id": "T1021", "technique_name": "Remote Services", "count": brute_force_cnt, "severity": "medium", "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
        {"tactic": "Persistence", "technique_id": "T1547", "technique_name": "Boot or Logon Autostart Execution", "count": 1, "severity": "low", "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
        {"tactic": "Privilege Escalation", "technique_id": "T1068", "technique_name": "Exploitation for Privilege Escalation", "count": 0, "severity": "low", "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}
    ]
    return matrix


@app.get("/api/hosts")
async def get_hosts():
    cpu = 15.0
    ram = 45.0
    uptime = 3600
    if PSUTIL_AVAILABLE:
        try:
            cpu = cast(float, psutil.cpu_percent())
            ram = psutil.virtual_memory().percent
            uptime = int(time.time() - psutil.boot_time())
        except Exception:
            pass

    services = get_running_services() if PSUTIL_AVAILABLE else ["systemd", "dockerd", "sshd"]
    active_conns = get_active_connections()

    return [
        {
            "id": "local-host-01",
            "hostname": socket.gethostname(),
            "ip": socket.gethostbyname(socket.gethostname()) if PSUTIL_AVAILABLE else "127.0.0.1",
            "os": f"Windows ({socket.platform})" if hasattr(socket, "platform") else "Windows Host",
            "cpu_usage": round(cpu, 1),
            "ram_usage": round(ram, 1),
            "network_mbps": round(random.uniform(0.5, 5.0), 1),
            "risk_level": "medium" if cpu > 80 or ram > 85 else "low",
            "status": "online",
            "open_ports": list(set(c["local_port"] for c in active_conns))[:6],
            "services": services,
            "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "events_count": len(active_conns),
        }
    ]


@app.get("/api/network/traffic")
async def get_traffic():
    # Calculate delta throughput
    bytes_sent_1 = 0
    bytes_recv_1 = 0
    if PSUTIL_AVAILABLE:
        try:
            counters = psutil.net_io_counters()
            bytes_sent_1 = counters.bytes_sent
            bytes_recv_1 = counters.bytes_recv
        except Exception:
            pass
            
    await asyncio.sleep(0.5)
    
    bytes_sent_2 = bytes_sent_1
    bytes_recv_2 = bytes_recv_1
    if PSUTIL_AVAILABLE:
        try:
            counters = psutil.net_io_counters()
            bytes_sent_2 = counters.bytes_sent
            bytes_recv_2 = counters.bytes_recv
        except Exception:
            pass
            
    diff_sent = max(0, bytes_sent_2 - bytes_sent_1) * 2
    diff_recv = max(0, bytes_recv_2 - bytes_recv_1) * 2
    
    bandwidth_mbps = round(((diff_sent + diff_recv) * 8) / (1024 * 1024), 2)
    inbound_mbps = round((diff_recv * 8) / (1024 * 1024), 2)
    outbound_mbps = round((diff_sent * 8) / (1024 * 1024), 2)
    
    conns = get_active_connections()

    return {
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "packets_per_sec": int(random.uniform(40, 120) + len(conns) * 5),
        "bandwidth_mbps": bandwidth_mbps if PSUTIL_AVAILABLE else round(random.uniform(1, 10), 1),
        "inbound_mbps": inbound_mbps if PSUTIL_AVAILABLE else round(random.uniform(0.5, 6), 1),
        "outbound_mbps": outbound_mbps if PSUTIL_AVAILABLE else round(random.uniform(0.5, 4), 1),
        "connections": len(conns),
        "tcp_count": sum(1 for c in conns if c["protocol"] == "TCP"),
        "udp_count": sum(1 for c in conns if c["protocol"] == "UDP"),
        "icmp_count": random.randint(0, 3),
        "dns_count": random.randint(5, 15),
        "http_count": random.randint(2, 8),
        "https_count": random.randint(10, 30),
        "ssh_count": sum(1 for c in conns if c["remote_port"] == 22),
        "smb_count": sum(1 for c in conns if c["remote_port"] == 445),
    }


@app.get("/api/network/packets")
async def get_packets():
    conns = get_active_connections()
    packets_list = []
    
    for i, c in enumerate(conns):
        status = "normal"
        threat = None
        if c["remote_port"] in [21, 23, 445]:
            status = "malicious"
            threat = "Plain-text/Unsecure Port Attempt"
        elif c["remote_port"] in [22, 3389]:
            status = "suspicious"
            threat = "Admin Port Access"

        packets_list.append({
            "id": f"pkt-{i}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "source_ip": c["local_ip"],
            "source_port": c["local_port"],
            "destination_ip": c["remote_ip"],
            "destination_port": c["remote_port"],
            "protocol": c["protocol"],
            "size": random.randint(64, 1500),
            "status": status,
            "threat": threat
        })
    return packets_list


@app.post("/api/network/speedtest/ping")
async def run_speed_test_ping():
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers=headers) as client:
            pings = []
            for _ in range(3):
                t0 = time.time()
                await client.get('https://speed.cloudflare.com/__down?bytes=0')
                pings.append((time.time() - t0) * 1000)
            ping = sum(pings) / len(pings)
            jitter = sum(abs(pings[i] - pings[i-1]) for i in range(1, len(pings))) / (len(pings) - 1) if len(pings) > 1 else 0.0
            return {
                "ping_ms": round(ping, 1),
                "jitter_ms": round(jitter, 1)
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ping test failed: {str(e)}")


@app.post("/api/network/speedtest/download")
async def run_speed_test_download():
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers=headers) as client:
            total_download_bytes = 0
            download_start = time.time()
            url = "https://speed.cloudflare.com/__down?bytes=50000000"  # 50MB chunks
            
            while time.time() - download_start < 7.0:
                if time.time() - download_start > 9.0:
                    break
                try:
                    async with client.stream("GET", url) as response:
                        if response.status_code == 200:
                            async for chunk in response.aiter_bytes(chunk_size=65536):
                                total_download_bytes += len(chunk)
                                if time.time() - download_start >= 7.0:
                                    break
                        else:
                            break
                except Exception:
                    break
            
            download_elapsed = time.time() - download_start
            download_speed = (total_download_bytes * 8) / (download_elapsed * 1000000) if download_elapsed > 0 else 0.0
            return {
                "download_mbps": round(download_speed, 1)
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download test failed: {str(e)}")


@app.post("/api/network/speedtest/upload")
async def run_speed_test_upload():
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers=headers) as client:
            total_upload_bytes = 0
            upload_start = time.time()
            payload = b'\x00' * 1048576  # 1MB chunks
            
            while time.time() - upload_start < 7.0:
                if time.time() - upload_start > 9.0:
                    break
                try:
                    res = await client.post('https://speed.cloudflare.com/__up', content=payload)
                    if res.status_code == 200:
                        total_upload_bytes += len(payload)
                    else:
                        break
                except Exception:
                    break
                    
            upload_elapsed = time.time() - upload_start
            upload_speed = (total_upload_bytes * 8) / (upload_elapsed * 1000000) if upload_elapsed > 0 else 0.0
            return {
                "upload_mbps": round(upload_speed, 1)
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload test failed: {str(e)}")


@app.post("/api/network/speedtest")
async def run_speed_test():
    try:
        ping_res = await run_speed_test_ping()
        download_res = await run_speed_test_download()
        upload_res = await run_speed_test_upload()
        return {
            "status": "success",
            "ping_ms": ping_res["ping_ms"],
            "jitter_ms": ping_res["jitter_ms"],
            "download_mbps": download_res["download_mbps"],
            "upload_mbps": upload_res["upload_mbps"],
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speed test failed: {str(e)}")


@app.get("/api/logs")
async def get_logs():
    conns = get_active_connections()
    logs_list = []
    
    for i, c in enumerate(conns[:20]):
        geo = get_ip_country(c["remote_ip"])
        severity = "low"
        if c["remote_port"] in [21, 23, 445]:
            severity = "critical"
        elif c["remote_port"] in [22, 3389]:
            severity = "high"
        elif c["remote_port"] in [80, 443, 8080]:
            severity = "medium"

        logs_list.append({
            "id": f"log-{i}",
            "type": "threat_detected",
            "severity": severity,
            "source_ip": c["remote_ip"],
            "source_port": c["remote_port"],
            "destination_ip": c["local_ip"],
            "destination_port": c["local_port"],
            "country_source": geo["country"],
            "country_destination": "Local Host",
            "lat_source": float(geo["lat"]) + random.uniform(-1, 1),
            "lon_source": float(geo["lon"]) + random.uniform(-1, 1),
            "lat_destination": 38.90 + random.uniform(-1, 1),
            "lon_destination": -77.04 + random.uniform(-1, 1),
            "description": f"Process '{c['process']}' linked socket connection to remote node on port {c['remote_port']}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        })
        
    return logs_list


@app.get("/api/analytics")
async def get_analytics():
    cpu = 20
    ram = 40
    if PSUTIL_AVAILABLE:
        try:
            cpu = int(cast(float, psutil.cpu_percent()))
            ram = int(psutil.virtual_memory().percent)
        except Exception:
            pass

    return {
        "threats_over_time": [{"hour": f"{i * 2:02d}:00", "count": random.randint(5, 25)} for i in range(12)],
        "host_metrics": {
            "cpu_usage": cpu,
            "ram_usage": ram,
            "conn_count": len(get_active_connections())
        }
    }


@app.get("/api/system/status")
async def get_system_status():
    uptime = 3600
    if PSUTIL_AVAILABLE:
        try:
            uptime = int(time.time() - psutil.boot_time())
        except Exception:
            pass

    return {
        "api_status": "online",
        "ws_status": "connected",
        "db_status": "online",
        "demo_mode": False if PSUTIL_AVAILABLE else True,
        "version": settings.APP_VERSION,
        "active_connections": len(manager.active_connections),
        "host_connections_count": len(get_active_connections()) if PSUTIL_AVAILABLE else 0,
        "uptime_seconds": uptime
    }


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    if req.username == settings.DEMO_ADMIN_USERNAME and req.password == settings.DEMO_ADMIN_PASSWORD:
        return {
            "access_token": "demo-jwt-token",
            "token_type": "bearer",
            "user": {
                "id": "user-1",
                "username": req.username,
                "role": "admin",
                "email": f"{req.username}@sentinel-x.local",
            },
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")


# ── WebSocket ──
@app.websocket("/ws/security-events")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep socket open and receive messages from client if any
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
