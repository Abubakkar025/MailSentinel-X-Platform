import { create } from "zustand";
import type { CaseResponse, InvestigationResult, Campaign } from "@/lib/types";
import { extractDomain } from "./domain";

export interface IndexedCase {
  id: string;
  case_number: string;
  title: string;
  threat_type: string;
  severity: string;
  risk_score: number;
  status: string;
  created_at: string;
  updated_at?: string;
  from_address?: string;
  from_domain?: string;
  ips: string[];
  domains: string[];
  urls: string[];
  hashes: string[];
  campaign_id?: string;
  is_demo?: boolean;
}

export interface IndexedCampaign {
  id: string;
  name: string;
  severity: string;
  threat_type: string;
  case_count: number;
  is_active?: boolean;
}

export interface SimilarResult {
  target: IndexedCase;
  score: number;
  shared: string[];
}

interface EvidenceState {
  cases: Record<string, IndexedCase>;
  campaigns: Record<string, IndexedCampaign>;
  registerCases: (items: CaseResponse[]) => void;
  registerCaseDetail: (res: InvestigationResult) => void;
  registerCampaigns: (list: Campaign[]) => void;
  all: () => IndexedCase[];
  byId: (id: string) => IndexedCase | undefined;
  search: (q: string) => {
    cases: IndexedCase[];
    indicators: IndexedCase[];
    campaigns: IndexedCampaign[];
  };
  similarTo: (id: string, max?: number) => SimilarResult[];
  findByHash: (hash: string) => IndexedCase[];
  findByIndicator: (
    kind: "ip" | "domain" | "url" | "email" | "hash",
    value: string
  ) => IndexedCase[];
  indicatorCount: (kind: "ip" | "domain" | "url" | "email" | "hash", value: string) => number;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function asArray<T>(v: T[] | undefined | null): T[] {
  return Array.isArray(v) ? v : [];
}

function fromCaseList(c: CaseResponse): IndexedCase {
  return {
    id: c.id,
    case_number: c.case_number,
    title: c.title,
    threat_type: c.threat_type,
    severity: c.severity,
    risk_score: c.risk_score,
    status: c.status,
    created_at: c.created_at,
    updated_at: c.updated_at,
    campaign_id: c.campaign_id,
    is_demo: c.is_demo,
    ips: [],
    domains: [],
    urls: [],
    hashes: [],
  };
}

function fromCaseDetail(res: InvestigationResult): IndexedCase {
  const email = res.email;
  const fromAddress = email?.from_address || "";
  const c = res.case;
  const ips = new Set<string>();
  const domains = new Set<string>();
  const urls = new Set<string>();
  const hashes = new Set<string>();

  asArray(res.ip_locations).forEach((g) => g?.ip_address && ips.add(g.ip_address));
  asArray(res.domain_intel)
    .map((d) => d?.domain_name)
    .filter(Boolean)
    .forEach((d) => domains.add(d as string));
  asArray(res.url_scans)
    .map((u) => u?.url)
    .filter(Boolean)
    .forEach((u) => urls.add(u as string));
  asArray(res.attachments)
    .map((a) => a?.sha256_hash)
    .filter(Boolean)
    .forEach((h) => hashes.add(h as string));
  asArray(res.url_scans)
    .map((u) => u?.domain)
    .filter(Boolean)
    .forEach((d) => domains.add(d as string));
  if (fromAddress) domains.add(extractDomain(fromAddress) || fromAddress);

  return {
    id: c.id,
    case_number: c.case_number,
    title: c.title,
    threat_type: c.threat_type,
    severity: c.severity,
    risk_score: c.risk_score,
    status: c.status,
    created_at: c.created_at,
    updated_at: c.updated_at,
    from_address: fromAddress || undefined,
    from_domain: fromAddress ? extractDomain(fromAddress) || undefined : undefined,
    campaign_id: res.campaign_id || c.campaign_id,
    is_demo: c.is_demo,
    ips: Array.from(ips),
    domains: Array.from(domains),
    urls: Array.from(urls),
    hashes: Array.from(hashes),
  };
}

export const useEvidence = create<EvidenceState>((set, get) => ({
  cases: {},
  campaigns: {},

  registerCases: (items) =>
    set((s) => {
      const next = { ...s.cases };
      items.forEach((c) => {
        const existing = next[c.id];
        const base = existing || fromCaseList(c);
        next[c.id] = {
          ...base,
          case_number: base.case_number || c.case_number,
          title: base.title || c.title,
          threat_type: c.threat_type || base.threat_type,
          severity: c.severity || base.severity,
          risk_score: c.risk_score ?? base.risk_score,
          status: c.status || base.status,
          created_at: base.created_at || c.created_at,
          updated_at: c.updated_at || base.updated_at,
          campaign_id: c.campaign_id || base.campaign_id,
          is_demo: c.is_demo ?? base.is_demo,
        };
      });
      return { cases: next };
    }),

  registerCaseDetail: (res) =>
    set((s) => {
      const idx = fromCaseDetail(res);
      const existing = s.cases[idx.id];
      // Preserve list metadata if a detail record is missing some (shouldn't be)
      return { cases: { ...s.cases, [idx.id]: { ...existing, ...idx } } };
    }),

  registerCampaigns: (list) =>
    set((s) => {
      const next = { ...s.campaigns };
      list.forEach((c) => {
        next[c.id] = {
          id: c.id,
          name: c.name,
          severity: c.severity,
          threat_type: c.threat_type,
          case_count: c.case_count,
          is_active: c.is_active,
        };
      });
      return { campaigns: next };
    }),

  all: () => Object.values(get().cases),
  byId: (id) => get().cases[id],

  search: (qRaw) => {
    const q = normalize(qRaw);
    if (!q) return { cases: [], indicators: [], campaigns: [] };
    const all = get().all();
    const cases = all.filter(
      (c) =>
        normalize(c.case_number).includes(q) ||
        normalize(c.title).includes(q) ||
        normalize(c.from_address || "").includes(q)
    );
    const indicators = all.filter(
      (c) =>
        c.ips.some((v) => normalize(v).includes(q)) ||
        c.domains.some((v) => normalize(v).includes(q)) ||
        c.urls.some((v) => normalize(v).includes(q)) ||
        c.hashes.some((v) => normalize(v).startsWith(q) || normalize(v).toString().includes(q))
    );
    const campaigns = Object.values(get().campaigns).filter(
      (c) => normalize(c.name).includes(q) || c.id.toLowerCase().includes(q)
    );
    return { cases, indicators, campaigns };
  },

  similarTo: (id, max = 5) => {
    const target = get().byId(id);
    if (!target) return [];
    const targets = new Set(target.ips.map(normalize));
    const tDomains = new Set(target.domains.map(normalize));
    const tUrls = new Set(target.urls.map(normalize));
    const tHashes = new Set(target.hashes.map(normalize));

    return get()
      .all()
      .filter((c) => c.id !== id)
      .map((c) => {
        const shared: string[] = [];
        let score = 0;
        if (target.threat_type === c.threat_type) {
          score += 1;
          shared.push(`same threat type: ${c.threat_type}`);
        }
        if (target.from_domain && c.from_domain && normalize(target.from_domain) === normalize(c.from_domain)) {
          score += 2;
          shared.push(`same sender domain: ${c.from_domain}`);
        }
        c.ips.forEach((ip) => {
          if (targets.has(normalize(ip))) {
            score += 3;
            shared.push(`shared IP: ${ip}`);
          }
        });
        c.domains.forEach((d) => {
          if (tDomains.has(normalize(d))) {
            score += 3;
            shared.push(`shared domain: ${d}`);
          }
        });
        c.urls.forEach((u) => {
          if (tUrls.has(normalize(u))) {
            score += 2;
            shared.push(`shared URL`);
          }
        });
        c.hashes.forEach((h) => {
          if (tHashes.has(normalize(h))) {
            score += 4;
            shared.push(`same attachment hash`);
          }
        });
        if (target.campaign_id && c.campaign_id === target.campaign_id) {
          score += 5;
          shared.push(`same campaign: ${c.campaign_id}`);
        }
        return { target: c, score, shared };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, max);
  },

  findByHash: (hash) =>
    get()
      .all()
      .filter((c) => c.hashes.some((h) => normalize(h) === normalize(hash))),

  findByIndicator: (kind, value) => {
    const v = normalize(value);
    return TypeFilterMap[kind](get().all(), v);
  },

  indicatorCount: (kind, value) => get().findByIndicator(kind, value).length,
}));

const TypeFilterMap: Record<string, (list: IndexedCase[], v: string) => IndexedCase[]> = {
  ip: (list, v) => list.filter((c) => c.ips.some((x) => normalize(x) === v || normalize(x).includes(v))),
  domain: (list, v) =>
    list.filter((c) => c.domains.some((x) => normalize(x) === v || normalize(x).includes(v))),
  url: (list, v) => list.filter((c) => c.urls.some((x) => normalize(x) === v || normalize(x).includes(v))),
  email: (list, v) =>
    list.filter((c) => c.from_address && normalize(c.from_address!).includes(v)),
  hash: (list, v) => list.filter((c) => c.hashes.some((x) => normalize(x) === v)),
};

/**
 * Levenshtein edit distance — used for honest domain-similarity display,
 * not as an authoritative verdict.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function similarityPct(a: string, b: string): number {
  const max = Math.max(a.length, b.length, 1);
  return Math.round((1 - levenshtein(a, b) / max) * 100);
}