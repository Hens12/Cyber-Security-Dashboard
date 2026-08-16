"""SQLAlchemy Database Models for SENTINEL-X Operations Database."""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Table, JSON
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()


def utc_now():
    """Return naive UTC datetime (replaces deprecated datetime.utcnow)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Role(Base):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)  # ADMIN, SOC_ANALYST, SECURITY_ENGINEER, VIEWER
    description = Column(String)


class User(Base):
    __tablename__ = 'users'

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role_id = Column(Integer, ForeignKey('roles.id'))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    role = relationship("Role")


class Host(Base):
    __tablename__ = 'hosts'

    id = Column(String, primary_key=True, index=True)
    hostname = Column(String, unique=True, index=True, nullable=False)
    ip = Column(String, index=True, nullable=False)
    os = Column(String)
    cpu_usage = Column(Float, default=0.0)
    ram_usage = Column(Float, default=0.0)
    network_mbps = Column(Float, default=0.0)
    risk_level = Column(String, default="low")  # critical, high, medium, low
    status = Column(String, default="online")  # online, offline, degraded
    open_ports = Column(JSON)  # List of open ports
    services = Column(JSON)  # List of service names
    last_seen = Column(DateTime, default=utc_now)


class Threat(Base):
    __tablename__ = 'threats'

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    severity = Column(String, nullable=False)  # critical, high, medium, low
    status = Column(String, default="active")  # active, mitigated, resolved, investigating
    source_ip = Column(String, index=True)
    destination_ip = Column(String, index=True)
    attack_type = Column(String, index=True)
    description = Column(String)
    mitre_technique = Column(String)
    mitre_tactic = Column(String)
    confidence = Column(Integer, default=50)
    first_seen = Column(DateTime, default=utc_now)
    last_seen = Column(DateTime, default=utc_now)
    event_count = Column(Integer, default=1)


class Incident(Base):
    __tablename__ = 'incidents'

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    state = Column(String, default="new")  # new, triaged, investigating, contained, resolved, false_positive
    description = Column(String)
    source_ip = Column(String)
    assigned_to = Column(String)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    response_actions = relationship("ResponseAction", back_populates="incident")


class Vulnerability(Base):
    __tablename__ = 'vulnerabilities'

    id = Column(String, primary_key=True, index=True)
    cve_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String)
    severity = Column(String, nullable=False)
    cvss_score = Column(Float, nullable=False)
    host_id = Column(String, ForeignKey('hosts.id'))
    service = Column(String)
    port = Column(Integer)
    status = Column(String, default="open")  # open, patched, mitigated, accepted
    remediation = Column(String)
    detected_at = Column(DateTime, default=utc_now)


class NetworkPacket(Base):
    __tablename__ = 'network_packets'

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime, default=utc_now)
    source_ip = Column(String, index=True, nullable=False)
    source_port = Column(Integer)
    destination_ip = Column(String, index=True, nullable=False)
    destination_port = Column(Integer)
    protocol = Column(String, index=True, nullable=False)  # TCP, UDP, ICMP, etc.
    size = Column(Integer)
    flags = Column(String)
    status = Column(String, default="normal")  # normal, suspicious, malicious, blocked
    threat = Column(String)


class SecurityEvent(Base):
    __tablename__ = 'security_events'

    id = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    source_ip = Column(String, index=True, nullable=False)
    source_port = Column(Integer)
    destination_ip = Column(String, index=True, nullable=False)
    destination_port = Column(Integer)
    country_source = Column(String)
    country_destination = Column(String)
    lat_source = Column(Float)
    lon_source = Column(Float)
    lat_destination = Column(Float)
    lon_destination = Column(Float)
    attack_type = Column(String)
    description = Column(String)
    mitre_technique = Column(String)
    mitre_tactic = Column(String)
    timestamp = Column(DateTime, default=utc_now)


class IOC(Base):
    __tablename__ = 'iocs'

    id = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False)  # ip, domain, url, hash, email
    value = Column(String, index=True, nullable=False)
    reputation = Column(String, default="unknown")  # malicious, suspicious, clean, unknown
    confidence = Column(Integer, default=50)
    threat_type = Column(String)
    first_seen = Column(DateTime, default=utc_now)
    last_seen = Column(DateTime, default=utc_now)
    tags = Column(JSON)  # List of tags
    source = Column(String)


class ThreatActor(Base):
    __tablename__ = 'threat_actors'

    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    aliases = Column(JSON)
    description = Column(String)
    motivation = Column(String)
    country = Column(String)
    techniques = Column(JSON)
    targets = Column(JSON)
    first_seen = Column(DateTime, default=utc_now)
    confidence = Column(Integer, default=50)


class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(String, primary_key=True, index=True)
    user = Column(String, nullable=False)
    action = Column(String, nullable=False)
    target = Column(String)
    result = Column(String)
    timestamp = Column(DateTime, default=utc_now)
    details = Column(String)


class Notification(Base):
    __tablename__ = 'notifications'

    id = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False)  # alert, incident, system, info
    severity = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    read = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=utc_now)
    link = Column(String)


class Playbook(Base):
    __tablename__ = 'playbooks'

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    trigger = Column(String)
    steps = Column(JSON)  # List of steps with type/description
    status = Column(String, default="draft")  # active, inactive, draft
    last_run = Column(DateTime)
    run_count = Column(Integer, default=0)


class ResponseAction(Base):
    __tablename__ = 'response_actions'

    id = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False)  # block_ip, isolate_host, etc.
    target = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, executed, simulated, failed
    executed_by = Column(String)
    executed_at = Column(DateTime)
    result = Column(String)
    incident_id = Column(String, ForeignKey('incidents.id'))

    incident = relationship("Incident", back_populates="response_actions")
