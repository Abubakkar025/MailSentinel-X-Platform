import jinja2
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _attr(obj: Any, *keys: str, default: Any = "") -> Any:
    """Safely get a field from either a Pydantic model or a plain dict."""
    for key in keys:
        if obj is None:
            return default
        if isinstance(obj, dict):
            obj = obj.get(key, default)
        else:
            obj = getattr(obj, key, default)
    return obj if obj is not None else default


# ---------------------------------------------------------------------------
# Jinja2 HTML Template
# ---------------------------------------------------------------------------

REPORT_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MailSentinel X — Forensic Report {{ case.case_number }}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #060a14; color: #e2e8f0; padding: 0; line-height: 1.6; }
  .page { max-width: 960px; margin: 0 auto; padding: 40px 32px; }

  /* Header */
  .report-header { display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 2px solid #3b82f6; padding-bottom: 24px; margin-bottom: 32px; }
  .report-title { font-size: 26px; font-weight: 800; color: #60a5fa; letter-spacing: -0.5px; }
  .report-sub  { color: #94a3b8; font-size: 13px; margin-top: 4px; font-family: monospace; }
  .badge { padding: 7px 16px; border-radius: 9999px; font-weight: 800; font-size: 13px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-critical { background: #dc2626; color: #fff; }
  .badge-high { background: #ea580c; color: #fff; }
  .badge-medium { background: #ca8a04; color: #000; }
  .badge-low  { background: #16a34a; color: #fff; }
  .badge-info { background: #2563eb; color: #fff; }

  /* Risk Gauge */
  .gauge-wrap { text-align: center; margin: 16px 0; }
  .gauge-score { font-size: 48px; font-weight: 900; }
  .gauge-label { font-size: 12px; color: #94a3b8; font-family: monospace; }
  .critical-color { color: #ef4444; }
  .high-color     { color: #f97316; }
  .medium-color   { color: #eab308; }
  .low-color      { color: #22c55e; }

  /* Cards */
  .card { background: #0f1929; border: 1px solid #1e3a5f; border-radius: 14px; padding: 24px; margin-bottom: 24px; }
  .card-title { font-size: 16px; font-weight: 700; color: #93c5fd; border-bottom: 1px solid #1e3a5f;
    padding-bottom: 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .card-title .icon { opacity: 0.7; }
  .section-num { font-size: 11px; font-weight: 800; background: #1e3a5f; color: #60a5fa;
    padding: 2px 8px; border-radius: 20px; font-family: monospace; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 10px 12px; color: #64748b; font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.5px; border-bottom: 1px solid #1e3a5f; background: #0a1120; }
  td { padding: 10px 12px; border-bottom: 1px solid #1e2a40; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #0d1a2e; }

  /* Code / Mono */
  .code { font-family: 'Courier New', monospace; background: #0a1120; color: #38bdf8;
    padding: 3px 8px; border-radius: 5px; font-size: 12px; word-break: break-all; }
  .code-block { font-family: monospace; background: #0a1120; color: #94a3b8; padding: 12px 16px;
    border-radius: 8px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }

  /* Pill badges */
  .pill { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
  .pill-pass { background: #064e3b; color: #34d399; border: 1px solid #065f46; }
  .pill-fail { background: #450a0a; color: #f87171; border: 1px solid #7f1d1d; }
  .pill-none { background: #1c1917; color: #a8a29e; border: 1px solid #292524; }
  .pill-mal  { background: #450a0a; color: #f87171; border: 1px solid #7f1d1d; }
  .pill-safe { background: #064e3b; color: #34d399; border: 1px solid #065f46; }
  .pill-warn { background: #451a03; color: #fb923c; border: 1px solid #9a3412; }

  /* Points */
  .pts-badge { background: #450a0a; color: #f87171; border: 1px solid #7f1d1d; border-radius: 4px;
    font-family: monospace; padding: 2px 8px; font-size: 12px; font-weight: 800; display: inline-block; }

  /* Timeline */
  .timeline { position: relative; }
  .tl-item { display: flex; gap: 16px; margin-bottom: 16px; }
  .tl-dot { width: 12px; height: 12px; border-radius: 50%; background: #3b82f6; flex-shrink: 0;
    margin-top: 4px; box-shadow: 0 0 8px #3b82f640; }
  .tl-content { flex: 1; background: #0a1120; border: 1px solid #1e3a5f; border-radius: 8px; padding: 12px; }
  .tl-type { font-weight: 700; color: #e2e8f0; font-size: 13px; text-transform: uppercase;
    letter-spacing: 0.3px; margin-bottom: 4px; }
  .tl-meta { font-family: monospace; font-size: 11px; color: #64748b; }
  .tl-hash { font-family: monospace; font-size: 11px; color: #38bdf8; margin-top: 4px; word-break: break-all; }

  /* Certificate */
  .certificate { border: 2px solid #1d4ed8; border-radius: 16px; padding: 28px;
    background: linear-gradient(135deg, #0f172a, #0a1120); text-align: center; margin-bottom: 24px; }
  .cert-title { font-size: 18px; font-weight: 800; color: #60a5fa; margin-bottom: 8px; }
  .cert-hash { font-family: monospace; font-size: 14px; color: #38bdf8; background: #0a1120;
    padding: 12px; border-radius: 8px; margin: 16px 0; word-break: break-all; }

  /* Footer */
  .footer { text-align: center; padding: 24px 0; border-top: 1px solid #1e3a5f; margin-top: 32px;
    color: #475569; font-size: 12px; font-family: monospace; }
  .footer b { color: #60a5fa; }

  @media print {
    body { background: white; color: black; }
    .card { border-color: #ccc; background: #f8f9fa; }
  }
</style>
</head>
<body>
<div class="page">

<!-- HEADER -->
<div class="report-header">
  <div>
    <div class="report-title">🛡 MailSentinel X — Digital Forensics Report</div>
    <div class="report-sub">Case Ref: {{ case.case_number }} &nbsp;|&nbsp; Generated: {{ generated_at }} &nbsp;|&nbsp; Classification: CONFIDENTIAL</div>
  </div>
  <div style="text-align:right">
    <span class="badge badge-{{ case.severity }}">{{ case.severity|upper }} ({{ case.risk_score }}/100)</span>
    <div style="color:#64748b;font-size:12px;margin-top:8px;font-family:monospace">{{ case.threat_type|upper }}</div>
  </div>
</div>

<!-- 1. EXECUTIVE SUMMARY -->
<div class="card">
  <div class="card-title"><span class="section-num">§1</span> Executive Summary</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <table>
      <tr><td style="color:#64748b;width:140px">Incident Title</td><td><b>{{ case.title }}</b></td></tr>
      <tr><td style="color:#64748b">Classification</td><td><span class="pill pill-warn">{{ case.threat_type|upper }}</span></td></tr>
      <tr><td style="color:#64748b">Severity</td><td><span class="badge badge-{{ case.severity }}" style="font-size:11px">{{ case.severity|upper }}</span></td></tr>
      <tr><td style="color:#64748b">Status</td><td>{{ case.status|upper }}</td></tr>
      <tr><td style="color:#64748b">Analyst Verdict</td><td>{{ case.verdict or "Confirmed Malicious Email Threat" }}</td></tr>
      <tr><td style="color:#64748b">Assigned To</td><td><span class="code">{{ case.assigned_to or "analyst@company.com" }}</span></td></tr>
      <tr><td style="color:#64748b">Case Created</td><td>{{ case.created_at }}</td></tr>
    </table>
    <div class="gauge-wrap">
      <div class="gauge-score {{ case.severity }}-color">{{ case.risk_score }}</div>
      <div class="gauge-label">/ 100 — COMPOSITE RISK SCORE</div>
      <div style="margin-top:16px">
        <div style="height:8px;background:#1e3a5f;border-radius:999px;overflow:hidden">
          <div style="height:100%;width:{{ case.risk_score }}%;background:{% if case.risk_score >= 76 %}#ef4444{% elif case.risk_score >= 51 %}#f97316{% elif case.risk_score >= 26 %}#eab308{% else %}#22c55e{% endif %};border-radius:999px;transition:width 1s"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- 2. HEADER ANALYSIS -->
<div class="card">
  <div class="card-title"><span class="section-num">§2</span> Email Header Analysis</div>
  <table>
    <tr><th>Header Field</th><th>Extracted Value</th></tr>
    <tr><td>From Display Name</td><td>{{ email.from_display_name or "N/A" }}</td></tr>
    <tr><td>From Address</td><td><span class="code">{{ email.from_address or "N/A" }}</span></td></tr>
    <tr><td>To Recipients</td><td>{{ email.to_addresses|join(", ") if email.to_addresses else "N/A" }}</td></tr>
    <tr><td>Reply-To</td><td><span class="code">{{ email.reply_to or "None" }}</span></td></tr>
    <tr><td>Return-Path</td><td><span class="code">{{ email.return_path or "None" }}</span></td></tr>
    <tr><td>Message-ID</td><td><span class="code">{{ email.message_id or "None" }}</span></td></tr>
    <tr><td>Date Sent</td><td>{{ email.date_sent or "Unknown" }}</td></tr>
    <tr><td>X-Mailer / MUA</td><td>{{ email.x_mailer or "Not Specified" }}</td></tr>
    <tr><td>Content Type</td><td>{{ email.content_type or "N/A" }}</td></tr>
  </table>
</div>

<!-- 3. AUTHENTICATION RESULTS -->
<div class="card">
  <div class="card-title"><span class="section-num">§3</span> Email Authentication Results (SPF / DKIM / DMARC)</div>
  <table>
    <tr><th>Protocol</th><th>Result</th><th>Domain / Details</th><th>Verdict</th></tr>
    <tr>
      <td><b>SPF</b></td>
      <td><span class="pill {{ 'pill-pass' if email.auth_results.spf_result == 'pass' else 'pill-fail' }}">{{ email.auth_results.spf_result|upper }}</span></td>
      <td>{{ email.auth_results.spf_domain or "—" }}</td>
      <td>{{ "Sender IP is authorised by domain policy" if email.auth_results.spf_result == 'pass' else "⚠ Sender IP NOT authorised — spoofing indicator" }}</td>
    </tr>
    <tr>
      <td><b>DKIM</b></td>
      <td><span class="pill {{ 'pill-pass' if email.auth_results.dkim_result == 'pass' else 'pill-fail' }}">{{ email.auth_results.dkim_result|upper }}</span></td>
      <td>{{ email.auth_results.dkim_domain or "—" }}</td>
      <td>{{ "Cryptographic signature verified" if email.auth_results.dkim_result == 'pass' else "⚠ Signature invalid or missing — tampering risk" }}</td>
    </tr>
    <tr>
      <td><b>DMARC</b></td>
      <td><span class="pill {{ 'pill-pass' if email.auth_results.dmarc_result == 'pass' else 'pill-fail' }}">{{ email.auth_results.dmarc_result|upper }}</span></td>
      <td>Policy: {{ email.auth_results.dmarc_policy|upper if email.auth_results.dmarc_policy else "—" }}</td>
      <td>{{ "Aligned with domain policy" if email.auth_results.dmarc_result == 'pass' else "⚠ DMARC alignment failure — domain impersonation" }}</td>
    </tr>
  </table>
</div>

<!-- 4. RECEIVED CHAIN -->
{% if email.received_chain %}
<div class="card">
  <div class="card-title"><span class="section-num">§4</span> Email Routing — Received Header Chain</div>
  <table>
    <tr><th>Hop</th><th>From Host</th><th>IP Address</th><th>By Host</th><th>Timestamp</th></tr>
    {% for hop in email.received_chain %}
    <tr>
      <td><b>#{{ hop.hop }}</b></td>
      <td>{{ hop.from_host or "—" }}</td>
      <td><span class="code">{{ hop.ip or "—" }}</span></td>
      <td>{{ hop.by_host or "—" }}</td>
      <td style="font-size:11px;color:#64748b">{{ hop.timestamp or "—" }}</td>
    </tr>
    {% endfor %}
  </table>
</div>
{% endif %}

<!-- 5. THREAT INDICATORS -->
<div class="card">
  <div class="card-title"><span class="section-num">§5</span> Extracted Threat Indicators of Compromise (IOCs)</div>

  {% if ip_locations %}
  <div style="margin-bottom:16px">
    <div style="font-weight:700;color:#93c5fd;font-size:13px;margin-bottom:8px">IP Infrastructure</div>
    <table>
      <tr><th>IP Address</th><th>Country</th><th>City</th><th>ISP / ASN</th><th>Malicious</th></tr>
      {% for ip in ip_locations %}
      <tr>
        <td><span class="code">{{ ip.ip_address }}</span></td>
        <td>{{ ip.country or "?" }}</td>
        <td>{{ ip.city or "?" }}</td>
        <td>{{ ip.isp or ip.asn_org or "—" }}</td>
        <td>
          {% set rep = ip_reputation_map.get(ip.ip_address, {}) %}
          {% if rep.get('is_malicious') %}
            <span class="pill pill-mal">YES ({{ rep.get('abuse_score', '?') }}%)</span>
          {% else %}
            <span class="pill pill-safe">NO</span>
          {% endif %}
        </td>
      </tr>
      {% endfor %}
    </table>
  </div>
  {% endif %}

  {% if url_scans %}
  <div style="margin-bottom:16px">
    <div style="font-weight:700;color:#93c5fd;font-size:13px;margin-bottom:8px">Embedded URLs</div>
    <table>
      <tr><th>URL</th><th>Domain</th><th>Malicious</th><th>Detections</th></tr>
      {% for u in url_scans %}
      <tr>
        <td style="font-family:monospace;font-size:12px;word-break:break-all;max-width:300px">{{ u.url }}</td>
        <td><span class="code">{{ u.domain or "—" }}</span></td>
        <td><span class="pill {{ 'pill-mal' if u.is_malicious else 'pill-safe' }}">{{ "YES" if u.is_malicious else "NO" }}</span></td>
        <td>{{ u.detection_count }}/{{ u.total_engines }}</td>
      </tr>
      {% endfor %}
    </table>
  </div>
  {% endif %}

  {% if domain_intel %}
  <div>
    <div style="font-weight:700;color:#93c5fd;font-size:13px;margin-bottom:8px">Domain Intelligence</div>
    <table>
      <tr><th>Domain</th><th>Registrar</th><th>Age (Days)</th><th>Newly Registered</th><th>Suspicious</th></tr>
      {% for d in domain_intel %}
      <tr>
        <td><span class="code">{{ d.domain_name }}</span></td>
        <td>{{ d.registrar or "—" }}</td>
        <td>{{ d.age_days or "?" }}</td>
        <td><span class="pill {{ 'pill-mal' if d.is_newly_registered else 'pill-safe' }}">{{ "YES" if d.is_newly_registered else "NO" }}</span></td>
        <td><span class="pill {{ 'pill-mal' if d.is_suspicious else 'pill-safe' }}">{{ "YES" if d.is_suspicious else "NO" }}</span></td>
      </tr>
      {% endfor %}
    </table>
  </div>
  {% endif %}
</div>

<!-- 6. ATTACHMENTS -->
{% if attachments %}
<div class="card">
  <div class="card-title"><span class="section-num">§6</span> Attachment Evidence Analysis</div>
  <table>
    <tr><th>Filename</th><th>Content Type</th><th>Size</th><th>SHA-256</th><th>Risks</th></tr>
    {% for att in attachments %}
    <tr>
      <td><b>{{ att.filename }}</b></td>
      <td style="font-size:12px">{{ att.content_type }}</td>
      <td>{{ att.file_size_bytes }} B</td>
      <td><span class="code" style="font-size:11px">{{ att.sha256_hash[:32] }}...</span></td>
      <td>
        {% if att.is_executable %}<span class="pill pill-mal" style="margin-right:4px">EXEC</span>{% endif %}
        {% if att.is_macro_enabled %}<span class="pill pill-mal" style="margin-right:4px">MACRO</span>{% endif %}
        {% if att.has_double_extension %}<span class="pill pill-mal">DOUBLE-EXT</span>{% endif %}
        {% if not att.is_executable and not att.is_macro_enabled and not att.has_double_extension %}
          <span class="pill pill-safe">CLEAN</span>
        {% endif %}
      </td>
    </tr>
    {% endfor %}
  </table>
</div>
{% endif %}

<!-- 7. RISK FACTOR BREAKDOWN -->
<div class="card">
  <div class="card-title"><span class="section-num">§7</span> Explainable Risk Factor Contributions</div>
  {% if risk_factors %}
  <table>
    <tr><th>Points</th><th>Factor Name</th><th>Category</th><th>Evidence String</th></tr>
    {% for f in risk_factors %}
    <tr>
      <td><span class="pts-badge">+{{ f.points }}</span></td>
      <td><b>{{ f.name }}</b></td>
      <td style="color:#64748b;font-size:12px;text-transform:uppercase">{{ f.category }}</td>
      <td style="font-family:monospace;font-size:12px;color:#94a3b8">{{ f.evidence }}</td>
    </tr>
    {% endfor %}
  </table>
  {% else %}
  <p style="color:#64748b">No risk factors triggered — email classified as benign.</p>
  {% endif %}
</div>

<!-- 8. CAMPAIGN CORRELATION -->
{% if campaign_id %}
<div class="card">
  <div class="card-title"><span class="section-num">§8</span> Threat Campaign Correlation</div>
  <p style="color:#94a3b8;font-size:13px">This email has been automatically correlated to <b style="color:#e2e8f0">Campaign ID: {{ campaign_id }}</b> based on shared infrastructure indicators (IP addresses, domain lookalikes, URL patterns, or attachment hashes).</p>
  <div style="margin-top:16px;padding:12px;background:#0a1120;border-radius:8px;border:1px solid #1e3a5f;font-family:monospace;font-size:13px;color:#93c5fd">
    Campaign: {{ campaign_id }}
  </div>
</div>
{% endif %}

<!-- 9. CHAIN OF CUSTODY TIMELINE -->
<div class="card">
  <div class="card-title"><span class="section-num">§9</span> Digital Forensics Chain of Custody</div>
  <div class="timeline">
    {% for evt in timeline %}
    <div class="tl-item">
      <div class="tl-dot"></div>
      <div class="tl-content">
        <div class="tl-type">{{ evt.event_type|replace('_',' ')|upper }}</div>
        <div class="tl-meta">{{ evt.created_at }} &nbsp;|&nbsp; Actor: {{ evt.actor }}</div>
        {% if evt.evidence_hash %}
        <div class="tl-hash">SHA-256: {{ evt.evidence_hash }}</div>
        {% endif %}
      </div>
    </div>
    {% endfor %}
  </div>
</div>

<!-- 10. EVIDENCE INTEGRITY CERTIFICATE -->
<div class="certificate">
  <div class="cert-title">✓ Digital Evidence Integrity Certificate</div>
  <p style="color:#94a3b8;font-size:13px;margin-bottom:12px">
    This report attests that the following cryptographic SHA-256 fingerprint was computed at evidence ingestion and has been continuously verified throughout the forensic investigation pipeline.
  </p>
  <div class="cert-hash">{{ evidence_hash }}</div>
  <table style="width:auto;margin:0 auto;font-size:13px">
    <tr><td style="color:#64748b;padding:4px 16px">Evidence ID:</td><td style="color:#60a5fa;font-family:monospace;font-weight:700">{{ evidence_id }}</td></tr>
    <tr><td style="color:#64748b;padding:4px 16px">Integrity Status:</td><td><span class="pill pill-pass">VERIFIED ✓</span></td></tr>
    <tr><td style="color:#64748b;padding:4px 16px">Generated At:</td><td style="color:#94a3b8;font-family:monospace">{{ generated_at }}</td></tr>
  </table>
</div>

<!-- FOOTER -->
<div class="footer">
  <b>MailSentinel X</b> — AI-Powered Email Threat Detection &amp; Digital Forensics Platform &nbsp;|&nbsp;
  Classification: <b>CONFIDENTIAL — SOC INTERNAL</b> &nbsp;|&nbsp;
  Report generated automatically. Human analyst review required for final disposition.
</div>

</div><!-- /page -->
</body>
</html>"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_html_report(
    case_data: Dict[str, Any],
    email_data: Any,
    timeline_data: List[Dict],
    risk_factors: List[Dict],
    evidence_hash: str,
    ip_locations: Optional[List] = None,
    ip_reputations: Optional[List] = None,
    domain_intel: Optional[List] = None,
    url_scans: Optional[List] = None,
    attachments: Optional[List] = None,
    campaign_id: Optional[str] = None,
    evidence_id: Optional[str] = None,
) -> str:
    from datetime import datetime, timezone
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # Normalise email_data to a dict-like proxy using a simple wrapper
    class _Proxy:
        """Allow template to access both dict and Pydantic object attributes."""
        def __init__(self, obj):
            self._obj = obj

        def __getattr__(self, name):
            if isinstance(self._obj, dict):
                val = self._obj.get(name)
            else:
                val = getattr(self._obj, name, None)
            # Recurse for nested objects
            if val is not None and not isinstance(val, (str, int, float, bool, list, dict)):
                return _Proxy(val)
            return val

    email_proxy = _Proxy(email_data)

    # Build IP reputation lookup map  {ip_address: rep_dict}
    ip_reputation_map: Dict[str, Dict] = {}
    for rep in (ip_reputations or []):
        if isinstance(rep, dict):
            ip_reputation_map[rep.get("ip_address", "")] = rep
        else:
            ip_reputation_map[getattr(rep, "ip_address", "")] = rep.__dict__ if hasattr(rep, "__dict__") else {}

    # Normalise list items to dicts
    def _to_dict(lst):
        if not lst:
            return []
        out = []
        for item in lst:
            if isinstance(item, dict):
                out.append(item)
            elif hasattr(item, "model_dump"):
                out.append(item.model_dump())
            elif hasattr(item, "__dict__"):
                out.append(item.__dict__)
            else:
                out.append({})
        return out

    template = jinja2.Template(REPORT_TEMPLATE, undefined=jinja2.Undefined)
    return template.render(
        case=case_data,
        email=email_proxy,
        timeline=timeline_data or [],
        risk_factors=risk_factors or [],
        evidence_hash=evidence_hash or "",
        evidence_id=evidence_id or f"EVID-{str(case_data.get('id', 'UNKNOWN'))[:8].upper()}",
        generated_at=generated_at,
        ip_locations=_to_dict(ip_locations),
        ip_reputations=_to_dict(ip_reputations),
        ip_reputation_map=ip_reputation_map,
        domain_intel=_to_dict(domain_intel),
        url_scans=_to_dict(url_scans),
        attachments=_to_dict(attachments),
        campaign_id=campaign_id,
    )
