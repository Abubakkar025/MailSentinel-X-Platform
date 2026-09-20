import { create } from "zustand";

export type EventSeverity = "critical" | "high" | "medium" | "low" | "info";
export type SysEventType =
  | "case"
  | "threat"
  | "indicator"
  | "campaign"
  | "alert"
  | "analyst"
  | "report"
  | "system";

export interface SysEvent {
  id: string;
  type: SysEventType;
  title: string;
  body?: string;
  severity: EventSeverity;
  time: string;
  link?: string;
  source?: string;
}

interface SystemState {
  apiOnline: boolean | null;
  aiOnline: boolean | null;
  tiAvailable: boolean | null;
  lastSync: string | null;
  events: SysEvent[];
  pushEvent: (e: Omit<SysEvent, "id" | "time">) => void;
  clearEvents: () => void;
  setApiOnline: (v: boolean | null) => void;
  setAiOnline: (v: boolean | null) => void;
  setTiAvailable: (v: boolean | null) => void;
  setLastSync: (t: string | null) => void;
}

let seq = 0;

export const useSystem = create<SystemState>((set) => ({
  apiOnline: null,
  aiOnline: null,
  tiAvailable: null,
  lastSync: null,
  events: [],
  pushEvent: (e) =>
    set((s) => ({
      events: [
        { ...e, id: `evt-${Date.now()}-${seq++}`, time: new Date().toISOString() },
        ...s.events,
      ].slice(0, 40),
    })),
  clearEvents: () => set({ events: [] }),
  setApiOnline: (v) => set({ apiOnline: v }),
  setAiOnline: (v) => set({ aiOnline: v }),
  setTiAvailable: (v) => set({ tiAvailable: v }),
  setLastSync: (t) => set({ lastSync: t }),
}));

export function timeAgo(iso: string): string {
  const dt = new Date(iso).getTime();
  if (Number.isNaN(dt)) return "unknown";
  const secs = Math.max(0, Math.floor((Date.now() - dt) / 1000));
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}