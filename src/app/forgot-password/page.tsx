'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

const T = {
    bg: '#ffffff',
    fg: '#0a0a0a',
    accent: '#CC785C',
    accentHover: '#b8694e',
    border: '#e5e5e5',
    muted: '#737373',
};

export default function ForgotPasswordPage() {
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'request' | 'verify'>('request');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    async function handleRequestReset(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (resetError) {
                throw new Error(resetError.message);
            }

            setSuccessMessage('Reset link and recovery code sent to your email.');
            setStep('verify');
        } catch (err: any) {
            setError(err.message || 'Failed to send password reset email.');
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyOtp(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email: email.trim(),
                token: otp.trim(),
                type: 'recovery',
            });

            if (verifyError) {
                throw new Error(verifyError.message);
            }

            // OTP verified. User is now authenticated under a temporary recovery session.
            // Redirect to the reset password page.
            router.push('/reset-password');
        } catch (err: any) {
            setError(err.message || 'Invalid recovery code. Please check and try again.');
            setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: T.bg,
            color: T.fg,
            fontFamily: 'var(--font-geist-sans), sans-serif',
            padding: '24px',
            boxSizing: 'border-box',
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                    maxWidth: '420px',
                    width: '100%',
                    border: `1px solid ${T.border}`,
                    borderRadius: '16px',
                    padding: '40px 32px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.03)',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: T.fg, margin: '0 0 10px' }}>
                        Reset Password
                    </h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                        {step === 'request'
                            ? "Enter your email address and we'll send you a link and code to reset your password."
                            : `We sent a recovery code to ${email}. You can click the link in your email or enter the code here.`
                        }
                    </p>
                </div>

                {step === 'request' ? (
                    <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: T.fg }}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: `1px solid ${T.border}`,
                                    borderRadius: '8px',
                                    fontSize: '0.95rem',
                                    color: T.fg,
                                    background: '#ffffff',
                                    transition: 'border-color 0.15s',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        {error && (
                            <p style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>
                                {error}
                            </p>
                        )}

                        <motion.button
                            disabled={loading}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            style={{
                                width: '100%',
                                background: T.accent,
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '12px 18px',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                            }}
                        >
                            {loading ? 'Sending...' : 'Send Reset Instructions'}
                        </motion.button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: T.fg }}>
                                Recovery Code (OTP)
                            </label>
                            <input
                                type="text"
                                placeholder="Enter 6-digit recovery code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: `1px solid ${T.border}`,
                                    borderRadius: '8px',
                                    fontSize: '0.95rem',
                                    color: T.fg,
                                    background: '#ffffff',
                                    transition: 'border-color 0.15s',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        {error && (
                            <p style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>
                                {error}
                            </p>
                        )}

                        {successMessage && (
                            <p style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>
                                {successMessage}
                            </p>
                        )}

                        <motion.button
                            disabled={loading}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            style={{
                                width: '100%',
                                background: T.accent,
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '12px 18px',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                            }}
                        >
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </motion.button>

                        <div style={{ textAlign: 'center', marginTop: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setStep('request')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: T.muted,
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                }}
                            >
                                ← Back to Email Request
                            </button>
                        </div>
                    </form>
                )}

                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem' }}>
                    <button
                        onClick={() => router.push('/login')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: T.accent,
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                        }}
                    >
                        Back to Sign In
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
