/* ═══════════════════════════════════════════════════════════
   API Utility — Connect to Sentinel-X Backend
   ═══════════════════════════════════════════════════════════ */

export const API_BASE = 'http://localhost:8000';
export const WS_URL = 'ws://localhost:8000/ws/security-events';

export async function checkBackendStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/system/status`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.api_status === 'online';
  } catch (e) {
    return false;
  }
}

export async function fetchFromAPI(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  if (!res.ok) {
    throw new Error(`API Error: ${res.statusText}`);
  }
  return res.json();
}
