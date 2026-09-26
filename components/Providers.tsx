"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import type { Role } from "@/lib/types";
import { explorerTx, shortAddr } from "@/lib/explorer";

type Toast = { id: number; kind: "ok" | "err"; title: string; sig?: string };

type Ctx = {
  role: Role;
  setRole: (r: Role) => void;
  toast: (t: Omit<Toast, "id">) => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside Providers");
  return c;
}

const ROLE_KEY = "tradelock-role";

export function Providers({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("buyer");
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
      const r = localStorage.getItem(ROLE_KEY) as Role | null;
      if (r === "buyer" || r === "seller" || r === "inspector") setRoleState(r);
    } catch {}
  }, []);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    try {
      localStorage.setItem(ROLE_KEY, r);
    } catch {}
  }, []);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 5500);
  }, []);

  return (
    <AppCtx.Provider value={{ role, setRole, toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className="card pointer-events-auto flex w-full max-w-sm items-start gap-3 p-3.5 shadow-2xl shadow-black/60"
            >
              {t.kind === "ok" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-money" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />
              )}
              <div className="min-w-0 text-sm">
                <div className="font-medium">{t.title}</div>
                {t.sig && (
                  <a
                    href={explorerTx(t.sig)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-fg"
                  >
                    tx {shortAddr(t.sig, 6)} <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AppCtx.Provider>
  );
}
