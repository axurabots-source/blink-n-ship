'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toastFn = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: toastFn }}>
      {children}
      <div style={{
        position: 'fixed', top: 16, right: 16, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            role="alert"
            style={{
              pointerEvents: 'auto',
              padding: '12px 16px',
              borderRadius: 10,
              fontSize: '0.85rem',
              fontWeight: 500,
              lineHeight: 1.4,
              maxWidth: 380,
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              color: '#fff',
              background: t.type === 'error' ? '#dc2626' : t.type === 'success' ? '#16a34a' : '#2563eb',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              animation: 'bns-toast-in 0.25s ease-out',
            }}
          >
            {t.message}
          </button>
        ))}
      </div>
      <style>{`@keyframes bns-toast-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </ToastContext.Provider>
  );
}
