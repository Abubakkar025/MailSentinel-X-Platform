export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ThreatType = 'phishing' | 'bec' | 'spoofing' | 'malware' | 'credential_harvesting' | 'social_engineering' | 'suspicious' | 'benign';
export type CaseStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface ReceivedHop {
  hop: number;
  from_host?: string;
  by_host?: string;
  ip?: string;
  protocol?: string;
  timestamp?: string;
  raw: string;
}

export interface AttachmentInfo {
  filename: string;
  content_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  md5_hash: string;
  is_executable: boolean;
  is_macro_enabled: boolean;
  has_double_extension: boolean;
}

export interface AuthResults {
  spf_result: string;
  dkim_result: string;
  dmarc_result: string;
  auth_header_raw?: string;
  spf_domain?: string;
  dkim_domain?: string;
  dmarc_policy?: string;
}

export interface EmailParsed {
  subject?: string;
  from_address?: string;
  from_display_name?: string;
  to_addresses: string[];
  cc_addresses: string[];
  reply_to?: string;
  return_path?: string;
  message_id?: string;
  date_sent?: string;
  received_chain: ReceivedHop[];
  x_mailer?: string;
  content_type?: string;
  body_text?: string;
  body_html?: string;
  raw_headers: string;
  auth_results: AuthResults;
  attachments: AttachmentInfo[];
  original_filename?: string;
  file_sha256: string;
  file_size_bytes: number;
}

export interface RiskFactor {
  name: string;
  points: number;
  max_points: number;
  evidence: string;
  triggered: boolean;
  category: string;
}

export interface RiskScoreResponse {
  score: number;
  severity: RiskSeverity;
  threat_type: ThreatType;
  factors: RiskFactor[];
}

export interface CaseResponse {
  id: string;
  case_number: string;
  title: string;
  status: CaseStatus;
  severity: RiskSeverity;
  threat_type: ThreatType;
  risk_score: number;
  risk_factors: RiskFactor[];
  verdict?: string;
  assigned_to?: string;
  created_by?: string;
  campaign_id?: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaseListResponse {
  items: CaseResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface GeoLocation {
  ip_address: string;
  country?: string;
  country_code?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  asn?: string;
  asn_org?: string;
  isp?: string;
  is_private: boolean;
  label?: string;
}

export interface IPReputation {
  ip_address: string;
  abuse_score: number;
  total_reports: number;
  is_malicious: boolean;
  usage_type?: string;
  isp?: string;
  country?: string;
  domain?: string;
}

export interface DomainIntel {
  domain_name: string;
  registrar?: string;
  registration_date?: string;
  age_days?: number;
  is_newly_registered: boolean;
  is_suspicious: boolean;
}

export interface URLScanResult {
  url: string;
  domain?: string;
  display_text?: string;
  is_shortened: boolean;
  is_malicious: boolean;
  threat_type?: string;
  detection_count: number;
  total_engines: number;
}

export interface InvestigationResult {
  case: CaseResponse;
  email: EmailParsed;
  risk_assessment: RiskScoreResponse;
  ip_locations: GeoLocation[];
  ip_reputations: IPReputation[];
  domain_intel: DomainIntel[];
  url_scans: URLScanResult[];
  attachments: AttachmentInfo[];
  campaign_id?: string;
  forensic_evidence_id: string;
  sha256_fingerprint: string;
}

export interface DashboardStats {
  total_analyzed: number;
  threats_detected: number;
  critical_incidents: number;
  phishing_count: number;
  bec_count: number;
}

export interface ThreatChartPoint {
  date: string;
  phishing: number;
  bec: number;
  malware: number;
  benign: number;
}

export interface GeoThreat {
  ip: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  abuse_score: number;
  severity: RiskSeverity;
  case_number: string;
  /** True when the backend marks this indicator as demo/fixture data. */
  is_demo?: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  case_count: number;
  shared_indicators: Record<string, any>;
  threat_type: ThreatType;
  severity: RiskSeverity;
  is_active: boolean;
}

export interface ForensicEvent {
  id: string;
  case_id: string;
  event_type: string;
  actor: string;
  details: Record<string, any>;
  evidence_hash: string;
  created_at: string;
}
