"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type PDFViewerProps = {
  blob: Blob | null;
  onClose: () => void;
  filename?: string;
};

const T = {
  bg: "#ffffff",
  fg: "#0a0a0a",
  accent: "#CC785C",
  border: "#e5e5e5",
  muted: "#737373",
  card: "#fafafa",
};

export default function PDFViewer({ blob, onClose, filename = "labels.pdf" }: PDFViewerProps) {
  const urlRef = useRef<string | null>(null);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!blob) return;
    urlRef.current = URL.createObjectURL(blob);
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [blob]);

  function handlePrint() {
    if (printFrameRef.current) {
      const win = printFrameRef.current.contentWindow;
      if (win) win.print();
    }
  }

  function handleDownload() {
    if (!urlRef.current) return;
    const a = document.createElement("a");
    a.href = urlRef.current;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleClose() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    onClose();
  }

  return (
    <AnimatePresence>
      {blob && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "#fff", display: "flex", flexDirection: "column",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", borderBottom: `1px solid ${T.border}`,
            background: T.bg, zIndex: 10,
          }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: T.fg }}>
              Label Preview
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleDownload}
                style={{
                  padding: "8px 14px", background: T.card, color: T.fg,
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  fontWeight: 500, fontSize: "0.82rem", cursor: "pointer",
                }}
              >Download</button>
              <button onClick={handlePrint}
                style={{
                  padding: "8px 16px", background: T.accent, color: "#fff",
                  border: "none", borderRadius: 8, fontWeight: 600,
                  fontSize: "0.82rem", cursor: "pointer",
                }}
              >Print</button>
              <button onClick={handleClose}
                style={{
                  padding: "8px 12px", background: T.card, color: T.muted,
                  border: `1px solid ${T.border}`, borderRadius: 8,
                  fontWeight: 500, fontSize: "0.82rem", cursor: "pointer",
                }}
              >Close</button>
            </div>
          </div>
          <iframe
            ref={printFrameRef}
            src={urlRef.current ?? undefined}
            style={{ flex: 1, width: "100%", border: "none" }}
            title="PDF Label"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
