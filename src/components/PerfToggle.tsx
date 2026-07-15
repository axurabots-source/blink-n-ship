"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { enablePerfMonitor, isPerfMonitorEnabled, printSummary, setPageLabel } from "@/lib/perf-monitor";

export default function PerfToggle() {
  const pathname = usePathname();

  useEffect(() => {
    if (isPerfMonitorEnabled()) {
      setPageLabel(pathname);
      enablePerfMonitor();
    }
  }, [pathname]);

  useEffect(() => {
    if (isPerfMonitorEnabled()) {
      setPageLabel(pathname);
    }
  }, [pathname]);

  if (typeof window === "undefined") return null;
  if (!isPerfMonitorEnabled()) return null;

  return (
    <button
      onClick={printSummary}
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 9999,
        background: "#0a0a0a",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: "0.7rem",
        fontFamily: "monospace",
        cursor: "pointer",
        opacity: 0.5,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
      title="Click to print request summary in DevTools console"
    >
      🐢 Perf
    </button>
  );
}
