import { create } from "zustand";

export interface AnalystUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface SessionState {
  user: AnalystUser | null;
  token: string | null;
  setSession: (user: AnalystUser | null, token?: string | null) => void;
  clear: () => void;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  token: null,
  setSession: (user, token) => set({ user, token: token ?? null }),
  clear: () => set({ user: null, token: null }),
}));