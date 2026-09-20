import {
  DashboardStats,
  ThreatChartPoint,
  GeoThreat,
  CaseListResponse,
  CaseResponse,
  InvestigationResult,
  Campaign,
  ForensicEvent,
} from './types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Build an absolute API URL from a path like `/api/v1/cases`. */
export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

const DEFAULT_TIMEOUT_MS = 20_000;

/** Turn a raw fetch-level failure into a human-readable, actionable message. */
function toNetworkError(err: unknown, url: string): Error {
  if (err instanceof Error && err.name === 'AbortError') {
    return new Error(`Request timed out (${Math.round(DEFAULT_TIMEOUT_MS / 1000)}s). The API may be slow or unreachable.`);
  }
  if (err instanceof TypeError) {
    // Browsers throw TypeError('Failed to fetch') on network / CORS / preflight failures.
    return new Error(
      `Unable to reach the MailSentinel X analysis engine at ${url}. ` +
      `Check that the backend is running and CORS allows this origin, then retry.`
    );
  }
  return err instanceof Error ? err : new Error('Unknown network error.');
}

async function fetchJson<T>(url: string, options?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    throw toNetworkError(err, `${API_BASE_URL}${url}`);
  }
  clearTimeout(timer);

  if (res.status === 401) {
    throw new Error('Session unauthorized. Please sign in again.');
  }
  if (res.status === 429) {
    throw new Error('Request throttled. Please wait a moment and retry.');
  }
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const errObj = await res.json();
      if (errObj.detail) errorMsg = typeof errObj.detail === 'string' ? errObj.detail : JSON.stringify(errObj.detail);
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: { id: string; email: string; full_name: string; role: string };
}

export const api = {
  // Health
  getHealth: () => fetchJson<{ status: string; version: string }>('/health'),

  // Auth — token held in-memory only (never persisted)
  login: (email: string, password: string) =>
    fetchJson<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  signup: (payload: { email: string; password: string; full_name?: string }) =>
    fetchJson<AuthResponse>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMe: () => fetchJson<AuthResponse['user']>('/api/v1/auth/me'),

  // Dashboard
  getDashboardStats: () => fetchJson<DashboardStats>('/api/v1/dashboard/stats'),
  getThreatChart: () => fetchJson<ThreatChartPoint[]>('/api/v1/dashboard/threat-chart'),
  getRecentCases: () => fetchJson<CaseResponse[]>('/api/v1/dashboard/recent-cases'),
  getGeoThreats: () => fetchJson<GeoThreat[]>('/api/v1/dashboard/geo-threats'),

  // Investigation Upload
  uploadEml: async (file: File): Promise<InvestigationResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/investigate/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        let errorMsg = `Upload failed (${res.status})`;
        try {
          const err = await res.json();
          if (err.detail) errorMsg = err.detail;
        } catch {}
        throw new Error(errorMsg);
      }

      return res.json();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Upload timed out. Try a smaller file or check the connection to the analysis engine.');
      }
      throw toNetworkError(err, `${API_BASE_URL}/api/v1/investigate/upload`);
    } finally {
      clearTimeout(timer);
    }
  },

  // Cases
  getCases: (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    severity?: string;
    threat_type?: string;
    search?: string;
    campaign_id?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.page_size) query.append('page_size', params.page_size.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.severity) query.append('severity', params.severity);
    if (params?.threat_type) query.append('threat_type', params.threat_type);
    if (params?.search) query.append('search', params.search);
    if (params?.campaign_id) query.append('campaign_id', params.campaign_id);

    return fetchJson<CaseListResponse>(`/api/v1/cases?${query.toString()}`);
  },

  getCaseDetail: (id: string) => fetchJson<InvestigationResult>(`/api/v1/cases/${id}`),
  updateCase: (id: string, updates: Partial<CaseResponse>) =>
    fetchJson<CaseResponse>(
      `/api/v1/cases/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    ),
  getCaseTimeline: (id: string) => fetchJson<ForensicEvent[]>(`/api/v1/cases/${id}/timeline`),
  getCaseGraph: (id: string) => fetchJson<{ nodes: any[]; edges: any[] }>(`/api/v1/cases/${id}/graph`),

  // Threat Intel
  getIpIntel: (ip: string) => fetchJson<any>(`/api/v1/threat-intel/ip/${ip}`),
  getDomainIntel: (domain: string) => fetchJson<any>(`/api/v1/threat-intel/domain/${domain}`),
  getUrlIntel: (url: string) => fetchJson<any>(`/api/v1/threat-intel/url?url=${encodeURIComponent(url)}`),

  // AI Copilot
  sendAiQuery: (caseId: string, query: string) =>
    fetchJson<any>(
      '/api/v1/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({ case_id: caseId, query }),
      },
      45_000
    ),
  getAiHistory: (caseId: string) => fetchJson<any[]>(`/api/v1/ai/history/${caseId}`),

  // Campaigns
  getCampaigns: () => fetchJson<Campaign[]>('/api/v1/campaigns'),
  getCampaignDetail: (id: string) => fetchJson<Campaign>(`/api/v1/campaigns/${id}`),

  // Reports
  getReportUrl: (caseId: string) => buildApiUrl(`/api/v1/reports/${caseId}`),
  getReportManifestUrl: (caseId: string) => buildApiUrl(`/api/v1/reports/${caseId}/manifest`),
  getReportGenerateUrl: (caseId: string) => buildApiUrl(`/api/v1/reports/${caseId}/generate`),
  generateReport: (caseId: string) =>
    fetchJson<{ ok: boolean; [k: string]: any }>(
      `/api/v1/reports/${caseId}/generate`,
      { method: 'POST' },
      60_000
    ),
  verifyEvidenceIntegrity: (caseId: string, claimedHash: string) =>
    fetchJson<{ verified: boolean; [k: string]: any }>(
      `/api/v1/reports/${caseId}/verify`,
      {
        method: 'POST',
        body: JSON.stringify({ claimed_hash: claimedHash }),
      },
      60_000
    ),

  // Demo Mode
  seedDemoData: () => fetchJson<any>('/api/v1/demo/seed', { method: 'POST' }),
  resetDemoData: () => fetchJson<any>('/api/v1/demo/reset', { method: 'POST' }),
};