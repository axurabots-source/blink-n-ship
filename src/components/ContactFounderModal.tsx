'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Sparkles } from 'lucide-react';

const T = {
    bg: '#ffffff',
    fg: '#0a0a0a',
    accent: '#CC785C',
    accentHover: '#b8694e',
    accentLight: '#fff5f0',
    border: '#e5e5e5',
    muted: '#737373',
    card: '#fafafa',
};

const WA_NUMBER = '923291866966';
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    "Hello!\n\nI'm a Blink N Ship user and I need some assistance.\n\nMy question is:"
)}`;

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function ContactFounderModal({ open, onClose }: Props) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    // Focus trap — move focus inside when opened
    useEffect(() => {
        if (open) {
            // Small delay so the element is mounted
            const id = setTimeout(() => closeRef.current?.focus(), 50);
            return () => clearTimeout(id);
        }
    }, [open]);

    // ESC key to close
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (open) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [open, handleKeyDown]);

    return (
        <AnimatePresence>
            {open && (
                <div
                    role="presentation"
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9998,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                    }}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: '#000',
                        }}
                    />

                    {/* Dialog */}
                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Contact Founder"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '420px',
                            background: T.bg,
                            borderRadius: '16px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.06)',
                            overflow: 'hidden',
                            pointerEvents: 'auto',
                        }}
                    >
                        {/* Close button */}
                        <button
                            ref={closeRef}
                            onClick={onClose}
                            aria-label="Close dialog"
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: 'none',
                                background: T.card,
                                color: T.muted,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                                zIndex: 1,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = T.border;
                                e.currentTarget.style.color = T.fg;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = T.card;
                                e.currentTarget.style.color = T.muted;
                            }}
                        >
                            <X size={16} strokeWidth={2} />
                        </button>

                        {/* Content */}
                        <div style={{ padding: '36px 32px 28px' }}>
                            {/* Icon */}
                            <div
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '16px',
                                    background: T.accentLight,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '20px',
                                }}
                            >
                                <MessageCircle size={26} color={T.accent} strokeWidth={2} />
                            </div>

                            {/* Heading */}
                            <h2
                                style={{
                                    fontSize: '1.3rem',
                                    fontWeight: 700,
                                    color: T.fg,
                                    margin: '0 0 4px',
                                    lineHeight: 1.3,
                                }}
                            >
                                Contact Founder
                            </h2>

                            {/* Subtitle */}
                            <p
                                style={{
                                    fontSize: '0.85rem',
                                    color: T.muted,
                                    margin: '0 0 24px',
                                    lineHeight: 1.6,
                                }}
                            >
                                Need help? Have a question? Found a bug? Want to suggest a feature?
                                <br />
                                I&apos;m always happy to hear your feedback.
                            </p>

                            {/* Divider */}
                            <div
                                style={{
                                    height: '1px',
                                    background: T.border,
                                    marginBottom: '24px',
                                }}
                            />

                            {/* WhatsApp CTA */}
                            <a
                                href={WA_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    width: '100%',
                                    padding: '14px 24px',
                                    borderRadius: '12px',
                                    background: '#25D366',
                                    color: '#ffffff',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxSizing: 'border-box',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#20bd5a';
                                    e.currentTarget.style.transform = 'scale(1.01)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#25D366';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                <MessageCircle size={18} strokeWidth={2.5} />
                                Chat on WhatsApp
                            </a>

                            {/* Pre-filled message preview */}
                            <div
                                style={{
                                    marginTop: '16px',
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    background: T.card,
                                    border: `1px solid ${T.border}`,
                                    fontSize: '0.78rem',
                                    color: T.muted,
                                    lineHeight: 1.6,
                                    display: 'flex',
                                    gap: '10px',
                                    alignItems: 'flex-start',
                                }}
                            >
                                <Sparkles size={14} color={T.accent} strokeWidth={2} style={{ marginTop: 2, flexShrink: 0 }} />
                                <span>
                                    <strong style={{ color: T.fg }}>Pre-filled message:</strong>{' '}
                                    Hello! I&apos;m a Blink N Ship user and I need some assistance. My question is:
                                </span>
                            </div>

                            {/* Business hours note */}
                            <p
                                style={{
                                    marginTop: '20px',
                                    fontSize: '0.75rem',
                                    color: T.muted,
                                    textAlign: 'center',
                                    lineHeight: 1.5,
                                }}
                            >
                                Founder usually replies as soon as possible during business hours.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
