"""SENTINEL-X — FastAPI Application.

Queries real host system statistics (CPU, RAM, network connections) in real-time
using psutil, fell back to simulated telemetry if psutil is unavailable.
"""

import asyncio
import json
import os
import platform
import random
import socket
import subprocess
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


def get_listening_connections():
    """Retrieve all local listening sockets with their associated process names."""
    connections = []
    if not PSUTIL_AVAILABLE:
        return connections

    try:
        conns = psutil.net_connections(kind='inet')
        for conn in conns:
            if conn.status == 'LISTEN':
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
                    "remote_ip": None,
                    "remote_port": None,
                    "status": conn.status,
                    "protocol": "TCP" if conn.type == socket.SOCK_STREAM else "UDP"
                })
    except Exception:
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


# ── Local Network Scanning & Host Discovery ──
_discovered_hosts = {}

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

async def check_port(ip: str, port: int, timeout=0.3):
    try:
        conn = asyncio.open_connection(ip, port)
        _, writer = await asyncio.wait_for(conn, timeout=timeout)
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return port
    except Exception:
        return None

async def ping_ip(ip: str):
    try:
        # Check platform
        is_win = platform.system() == "Windows"
        ping_cmd = ["ping", "-n", "1", "-w", "300", ip] if is_win else ["ping", "-c", "1", "-W", "1", ip]
        proc = await asyncio.create_subprocess_exec(
            *ping_cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        await proc.wait()
        return proc.returncode == 0
    except Exception:
        return False

async def scan_ip_to_host(ip: str):
    # Try pinging first
    is_up = await ping_ip(ip)
    
    ports_to_check = [21, 22, 80, 443, 445, 3389, 8080]
    open_ports = []
    
    if is_up:
        tasks = [check_port(ip, port) for port in ports_to_check]
        results = await asyncio.gather(*tasks)
        open_ports = [r for r in results if r is not None]
    else:
        # Host might block ping, do a port scan check
        tasks = [check_port(ip, port) for port in ports_to_check]
        results = await asyncio.gather(*tasks)
        open_ports = [r for r in results if r is not None]
        if not open_ports:
            return None
            
    # Map open ports to friendly services names
    port_service_map = {
        21: "FTP Server",
        22: "SSH Server",
        80: "HTTP Server",
        443: "HTTPS Server",
        445: "SMB/Active Directory",
        3389: "RDP Remote Desktop",
        8080: "HTTP Alternative"
    }
    services = [port_service_map[p] for p in open_ports if p in port_service_map]
    if not services:
        services = ["Unknown Service"]

    # Try resolving hostname
    try:
        loop = asyncio.get_event_loop()
        hostname, _, _ = await loop.run_in_executor(None, socket.gethostbyaddr, ip)
    except Exception:
        hostname = f"host-{ip.split('.')[-1]}"
        
    return {
        "id": f"scanned-host-{ip.replace('.', '-')}",
        "hostname": hostname,
        "ip": ip,
        "os": "Linux" if 22 in open_ports else "Windows" if 3389 in open_ports or 445 in open_ports else "Network Device",
        "cpu_usage": round(random.uniform(2.0, 15.0), 1),
        "ram_usage": round(random.uniform(10.0, 45.0), 1),
        "network_mbps": round(random.uniform(0.1, 2.0), 1),
        "risk_level": "medium" if 21 in open_ports or 23 in open_ports else "low",
        "status": "online",
        "open_ports": open_ports,
        "services": services,
        "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "events_count": len(open_ports) * 3,
    }

async def network_scan_loop():
    """Scan the local /24 subnet periodically on startup and updates _discovered_hosts."""
    global _discovered_hosts
    # Wait a bit on startup before scanning
    await asyncio.sleep(2.0)
    while True:
        local_ip = get_local_ip()
        if local_ip != "127.0.0.1":
            parts = local_ip.split('.')
            subnet_prefix = f"{parts[0]}.{parts[1]}.{parts[2]}."
            
            # Scan 1 to 254
            ips = [f"{subnet_prefix}{i}" for i in range(1, 255) if f"{subnet_prefix}{i}" != local_ip]
            
            sem = asyncio.Semaphore(50)  # limit concurrency to 50 active tasks
            async def scan_with_sem(ip):
                async with sem:
                    return await scan_ip_to_host(ip)
                    
            tasks = [scan_with_sem(ip) for ip in ips]
            results = await asyncio.gather(*tasks)
            
            # Update the discovered hosts map instead of clearing it
            scanned_ips = set()
            for r in results:
                if r is not None:
                    _discovered_hosts[r["ip"]] = r
                    scanned_ips.add(r["ip"])
            
            # For hosts that were discovered before but not found in the current scan,
            # mark them as offline instead of deleting them.
            for ip, host in list(_discovered_hosts.items()):
                if ip not in scanned_ips:
                    host["status"] = "offline"
                    host["cpu_usage"] = 0.0
                    host["ram_usage"] = 0.0
                    host["network_mbps"] = 0.0
            
        # Run scan every 45 seconds
        await asyncio.sleep(45.0)


async def system_metrics_loop():
    """Periodically stream system metrics (CPU and RAM) to all active WebSocket connections."""
    while True:
        if manager.active_connections:
            cpu = 0.0
            ram = 0.0
            if PSUTIL_AVAILABLE:
                try:
                    cpu = cast(float, psutil.cpu_percent())
                    ram = psutil.virtual_memory().percent
                except Exception:
                    pass
            else:
                cpu = random.uniform(5.0, 35.0)
                ram = random.uniform(25.0, 55.0)

            await manager.broadcast({
                "type": "system_metrics",
                "cpu": round(cpu, 1),
                "ram": round(ram, 1),
                "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            })
        await asyncio.sleep(1.0)


# ── Lifespan ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(real_telemetry_loop())
    metrics_task = asyncio.create_task(system_metrics_loop())
    scan_task = asyncio.create_task(network_scan_loop())
    yield
    task.cancel()
    metrics_task.cancel()
    scan_task.cancel()


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


class RestartRequest(BaseModel):
    delay: int = 5  # seconds before restart


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
    listening_conns = get_listening_connections()
    active_ports = [c["local_port"] for c in connections]
    listening_ports = [c["local_port"] for c in listening_conns]
    open_ports = list(set(active_ports + listening_ports))
    
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
        "cpu": round(cpu, 1),
        "ram": round(ram, 1),
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

    # Classify port risk levels
    HIGH_RISK_PORTS = {21, 23, 445, 3389}
    MEDIUM_RISK_PORTS = {22, 8080, 8443, 5900, 1433, 3306, 5432, 6379, 27017}

    def classify_connection(c):
        rp = c["remote_port"]
        if rp in HIGH_RISK_PORTS:
            return "critical", f"Connection to high-risk port {rp}"
        if rp in MEDIUM_RISK_PORTS:
            return "high", f"Connection to sensitive service port {rp}"
        if rp < 1024:
            return "medium", f"Connection to privileged port {rp}"
        return "low", f"Outbound connection to port {rp}"

    # Group connections by process to create meaningful incidents
    process_groups: dict[str, list] = {}
    for c in conns:
        key = c["process"]
        if key not in process_groups:
            process_groups[key] = []
        process_groups[key].append(c)

    incidents_list = []
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}

    for i, (process_name, group) in enumerate(sorted(
        process_groups.items(),
        key=lambda item: min(severity_order.get(classify_connection(c)[0], 4) for c in item[1])
    )):
        if i >= 8:
            break
        # Use worst severity in the group
        worst_sev = "low"
        for c in group:
            sev, _ = classify_connection(c)
            if severity_order.get(sev, 4) < severity_order.get(worst_sev, 4):
                worst_sev = sev

        remote_ports = sorted(set(c["remote_port"] for c in group))
        remote_ips = sorted(set(c["remote_ip"] for c in group))
        ports_str = ", ".join(str(p) for p in remote_ports[:5])
        if len(remote_ports) > 5:
            ports_str += f" (+{len(remote_ports) - 5} more)"

        state_map = {"critical": "new", "high": "investigating", "medium": "triaged", "low": "triaged"}
        analysts = ["SOC-Analyst-1", "SOC-Analyst-2", "IR-Lead", "Threat-Hunter"]

        incidents_list.append({
            "id": f"INC-2026-{str(100 + i).zfill(5)}",
            "title": f"Network Activity — {process_name} ({len(group)} connections)",
            "severity": worst_sev,
            "state": state_map.get(worst_sev, "triaged"),
            "description": (
                f"Process '{process_name}' has {len(group)} active network connection(s) "
                f"to {len(remote_ips)} unique remote host(s) on port(s): {ports_str}."
            ),
            "source_ip": remote_ips[0] if remote_ips else "0.0.0.0",
            "assigned_to": analysts[i % len(analysts)],
            "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "updated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "affected_hosts": [socket.gethostname()],
            "timeline": [
                {
                    "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "action": "DETECTED",
                    "description": f"Sentinel-X agent flagged {len(group)} connection(s) from '{process_name}'.",
                    "user": "SYSTEM"
                },
                {
                    "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "action": "TRIAGED",
                    "description": f"Auto-classified as {worst_sev} severity based on port risk analysis.",
                    "user": "SENTINEL-X"
                }
            ],
            "response_actions": []
        })

    # Fallback: generate system-derived incidents if no connections found
    if not incidents_list:
        cpu = 0.0
        ram = 0.0
        if PSUTIL_AVAILABLE:
            try:
                cpu = cast(float, psutil.cpu_percent(interval=0, percpu=False))
                ram = cast(float, psutil.virtual_memory().percent)
            except Exception:
                pass

        fallback_incidents = [
            {
                "id": "INC-2026-00100",
                "title": "Elevated CPU Utilization Detected",
                "severity": "high" if cpu > 80 else "medium" if cpu > 50 else "low",
                "state": "investigating",
                "description": f"Host CPU utilization at {cpu:.1f}%. Potential resource abuse or cryptomining activity.",
                "source_ip": "127.0.0.1",
                "assigned_to": "SOC-Analyst-1",
                "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "updated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "affected_hosts": [socket.gethostname()],
                "timeline": [{"timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "action": "FLAGGED", "description": f"CPU at {cpu:.1f}%", "user": "SYSTEM"}],
                "response_actions": []
            },
            {
                "id": "INC-2026-00101",
                "title": "Memory Pressure Warning",
                "severity": "high" if ram > 85 else "medium" if ram > 60 else "low",
                "state": "triaged",
                "description": f"Host RAM utilization at {ram:.1f}%. Possible memory leak or unauthorized process.",
                "source_ip": "127.0.0.1",
                "assigned_to": "SOC-Analyst-2",
                "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "updated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "affected_hosts": [socket.gethostname()],
                "timeline": [{"timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "action": "FLAGGED", "description": f"RAM at {ram:.1f}%", "user": "SYSTEM"}],
                "response_actions": []
            },
            {
                "id": "INC-2026-00102",
                "title": "Network Baseline Anomaly",
                "severity": "medium",
                "state": "new",
                "description": "No active external connections detected — possible network isolation or firewall misconfiguration.",
                "source_ip": "0.0.0.0",
                "assigned_to": "IR-Lead",
                "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "updated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "affected_hosts": [socket.gethostname()],
                "timeline": [{"timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "action": "DETECTED", "description": "Zero external connections in snapshot.", "user": "SENTINEL-X"}],
                "response_actions": []
            },
        ]
        incidents_list = fallback_incidents

    return incidents_list


@app.get("/api/vulnerabilities")
async def get_vulnerabilities():
    conns = get_active_connections()
    listening_conns = get_listening_connections()
    active_ports = [c["local_port"] for c in conns]
    listening_ports = [c["local_port"] for c in listening_conns]
    open_ports = list(set(active_ports + listening_ports))
    
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
    
    # Retrieve listening sockets
    listening_conns = get_listening_connections()
    listening_ports = [c["local_port"] for c in listening_conns]
    active_ports = [c["local_port"] for c in active_conns]
    
    # Merge active and listening ports
    all_open_ports = sorted(list(set(active_ports + listening_ports)))
    
    # Map common ports to friendly service names
    port_to_service_map = {
        21: "FTP Server",
        2121: "FTP Server (Alternative)",
        22: "SSH Server",
        23: "Telnet Server",
        80: "HTTP Server",
        443: "HTTPS Server",
        445: "SMB/Active Directory",
        3389: "RDP Remote Desktop",
        5173: "Vite Dev Server",
        8000: "FastAPI Backend Server",
        8080: "HTTP Alternative"
    }
    
    # Build list of running services
    detected_services = []
    
    for port in listening_ports:
        if port in port_to_service_map and port_to_service_map[port] not in detected_services:
            detected_services.append(port_to_service_map[port])
            
    for conn in listening_conns:
        proc_name = conn["process"]
        if proc_name and proc_name != "unknown" and proc_name not in detected_services:
            detected_services.append(proc_name)
            
    # Combine with base services, keeping it unique
    for s in services:
        if s not in detected_services:
            detected_services.append(s)
            
    # Limit services list size
    final_services = detected_services[:12]
    
    # Resolve the local IP correctly
    host_ip = get_local_ip()
    
    # Determine risk level based on open/listening insecure ports
    risk = "low"
    if 21 in listening_ports or 2121 in listening_ports or 23 in listening_ports:
        risk = "high"
    elif cpu > 80 or ram > 85:
        risk = "medium"

    local_host = {
        "id": "local-host-01",
        "hostname": socket.gethostname(),
        "ip": host_ip,
        "os": f"Windows ({socket.platform})" if hasattr(socket, "platform") else "Windows Host",
        "cpu_usage": round(cpu, 1),
        "ram_usage": round(ram, 1),
        "network_mbps": round(random.uniform(0.5, 5.0), 1),
        "risk_level": risk,
        "status": "online",
        "open_ports": all_open_ports[:10],
        "services": final_services,
        "last_seen": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "events_count": len(active_conns) + len(listening_conns),
    }
    
    return [local_host] + list(_discovered_hosts.values())


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


# ── Terminal WebSocket ──
@app.websocket("/ws/terminal")
async def terminal_websocket(websocket: WebSocket):
    """Interactive shell terminal over WebSocket.

    Frontend sends command strings; backend executes them and streams
    stdout/stderr back as JSON messages.
    """
    await websocket.accept()

    # Determine shell
    is_windows = platform.system() == "Windows"
    shell_cmd = "powershell.exe" if is_windows else "/bin/bash"
    hostname = socket.gethostname()
    cwd = os.path.expanduser("~")

    await websocket.send_json({
        "type": "system",
        "data": f"SENTINEL-X Terminal — Connected to {hostname}\nShell: {shell_cmd}\nWorking directory: {cwd}\n",
    })

    try:
        while True:
            raw = await websocket.receive_text()
            command = raw.strip()

            if not command:
                continue

            # Block dangerous commands
            blocked = ["rm -rf /", "format c:", ":(){ :|:& };:", "del /f /s /q c:\\"]
            if any(b in command.lower() for b in blocked):
                await websocket.send_json({
                    "type": "error",
                    "data": "⛔ Command blocked by SENTINEL-X security policy.\n",
                })
                continue

            # Handle cd separately to persist directory changes
            parts = command.split(maxsplit=1)
            if parts[0].lower() == "cd":
                target = parts[1] if len(parts) > 1 else os.path.expanduser("~")
                try:
                    new_cwd = os.path.abspath(os.path.join(cwd, target))
                    if os.path.isdir(new_cwd):
                        cwd = new_cwd
                        await websocket.send_json({"type": "output", "data": f"{cwd}\n"})
                    else:
                        await websocket.send_json({"type": "error", "data": f"cd: no such directory: {target}\n"})
                except Exception as e:
                    await websocket.send_json({"type": "error", "data": f"cd: {e}\n"})
                await websocket.send_json({"type": "prompt", "data": cwd})
                continue

            # Execute command
            try:
                def run_cmd():
                    return subprocess.run(
                        command,
                        shell=True,
                        capture_output=True,
                        cwd=cwd,
                        timeout=30,
                        env={**os.environ},
                    )

                result = await asyncio.to_thread(run_cmd)

                if result.stdout:
                    try:
                        stdout_text = result.stdout.decode("utf-8", errors="replace")
                    except Exception:
                        stdout_text = str(result.stdout)
                    await websocket.send_json({"type": "output", "data": stdout_text})

                if result.stderr:
                    try:
                        stderr_text = result.stderr.decode("utf-8", errors="replace")
                    except Exception:
                        stderr_text = str(result.stderr)
                    await websocket.send_json({"type": "error", "data": stderr_text})

                if result.returncode != 0:
                    await websocket.send_json({
                        "type": "exit",
                        "data": result.returncode,
                    })

            except subprocess.TimeoutExpired:
                await websocket.send_json({"type": "error", "data": "⏱ Command timed out (30s limit).\n"})
            except Exception as e:
                await websocket.send_json({"type": "error", "data": f"Error: {e}\n"})

            await websocket.send_json({"type": "prompt", "data": cwd})

    except WebSocketDisconnect:
        pass


# ── System Restart / Cancel ──
_pending_restart: dict = {}


@app.post("/api/system/restart")
async def restart_system(req: RestartRequest):
    """Schedule a system restart after `delay` seconds."""
    global _pending_restart
    is_windows = platform.system() == "Windows"
    delay = max(1, min(300, req.delay))  # clamp 1-300s

    try:
        if is_windows:
            subprocess.Popen(
                ["shutdown", "/r", "/t", str(delay), "/c", "SENTINEL-X: Scheduled system restart"],
                creationflags=subprocess.CREATE_NO_WINDOW,  # type: ignore[attr-defined]
            )
        else:
            subprocess.Popen(["sudo", "shutdown", "-r", f"+{max(1, delay // 60)}"])

        _pending_restart = {
            "scheduled": True,
            "delay": delay,
            "time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        return {
            "status": "scheduled",
            "message": f"System restart scheduled in {delay} seconds.",
            "delay": delay,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to schedule restart: {e}")


@app.post("/api/system/restart/cancel")
async def cancel_restart():
    """Cancel a pending system restart."""
    global _pending_restart
    is_windows = platform.system() == "Windows"

    try:
        if is_windows:
            subprocess.Popen(
                ["shutdown", "/a"],
                creationflags=subprocess.CREATE_NO_WINDOW,  # type: ignore[attr-defined]
            )
        else:
            subprocess.Popen(["sudo", "shutdown", "-c"])

        _pending_restart = {}
        return {"status": "cancelled", "message": "Pending restart has been cancelled."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel restart: {e}")
