/**
 * Minimal, dependency-free domain parser used for display and
 * local correlation only — never as an authoritative verdict.
 */

export function extractDomain(emailOrUrl: string): string | null {
  const s = emailOrUrl.trim();
  if (!s) return null;
  // Email: take everything after the last @
  const at = s.lastIndexOf("@");
  if (at >= 0) return s.slice(at + 1).toLowerCase().replace(/[^a-z0-9.\-]/gi, "");
  // URL: take host after :// , then strip port/path
  let host = s;
  const scheme = s.indexOf("://");
  if (scheme >= 0) host = s.slice(scheme + 3);
  const slash = host.indexOf("/");
  if (slash >= 0) host = host.slice(0, slash);
  const colon = host.lastIndexOf(":");
  if (colon > 0 && !host.includes("[")) host = host.slice(0, colon);
  if (host.includes("[")) host = host.slice(1, host.indexOf("]"));
  return host.toLowerCase() || null;
}

export function isIp(value: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  return ipv4.test(value);
}

export function isHash(value: string): boolean {
  return /^[a-f0-9]{32,64}$/i.test(value);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Returns a small set of visually similar lookalike labels for a domain,
 * using only characters that commonly appear in encoding-style abuses.
 * Used to pre-populate the "similar domains" explore box.
 */
export function lookalikeDomains(domain: string): string[] {
  const d = domain.toLowerCase().replace(/\.$/, "");
  const altChars: Record<string, string[]> = {
    "o": ["0", "ö", "ø"],
    "0": ["o"],
    "l": ["1", "i"],
    "i": ["1", "l"],
    "1": ["l", "i"],
    "e": ["é", "ë"],
    "a": ["@", "á", "à"],
    "s": ["5", "§"],
    "t": ["7"],
    "g": ["q", "9"],
    "q": ["g", "9"],
    "r": ["®"],
    "c": ["¢", "©"],
    "m": ["rn", "nn"],
    "rn": ["m"],
  };
  const unique = new Set<string>();
  for (let i = 0; i < d.length; i++) {
    const ch = d[i];
    const subs = altChars[ch] || [];
    for (const sub of subs) {
      const variant = d.slice(0, i) + sub + d.slice(i + 1);
      if (variant !== d) unique.add(variant);
    }
  }
  // Homograph-ish unicode lookalikes for the whole domain (demo exploration)
  const homos: Record<string, string[]> = {
    a: ["а", "à", "á"],
    e: ["е", "é"],
    o: ["о", "ó"],
    p: ["р"],
    c: ["с"],
    i: ["і"],
    l: ["l"],
  };
  for (const ch of d.toLowerCase()) {
    const subs = homos[ch] || [];
    for (const sub of subs) {
      const v = d.split(ch).join(sub);
      if (v !== d) unique.add(v);
    }
  }
  return Array.from(unique).slice(0, 12);
}