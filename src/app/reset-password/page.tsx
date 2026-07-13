'use client';

import { useEffect, useState } from 'react';
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

export default function ResetPasswordPage() {
    const router = useRouter();
    const supabase = createClient();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        // Confirm user has active session (link reset or OTP verification redirects to this page with an active session)
        async function checkSession() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Reset session expired or invalid. Please request a new link.');
            }
            setCheckingSession(false);
        }
        checkSession();
    }, [supabase]);

    async function handleResetPassword(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password.trim(),
            });

            if (updateError) {
                throw new Error(updateError.message);
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard');
            }, 2500);
        } catch (err: any) {
            setError(err.message || 'Failed to update password.');
            setLoading(false);
        }
    }

    if (checkingSession) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-geist-sans), sans-serif' }}>
                <p style={{ color: '#737373', fontSize: '0.875rem' }}>Verifying reset session...</p>
            </div>
        );
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
                        Set New Password
                    </h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                        Enter your new secure password below to regain access to your account.
                    </p>
                </div>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <p style={{ color: '#16a34a', fontSize: '0.95rem', fontWeight: 600, margin: '0 0 8px' }}>
                            Password updated successfully!
                        </p>
                        <p style={{ color: T.muted, fontSize: '0.85rem', margin: 0 }}>
                            Redirecting to your dashboard...
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: T.fg }}>
                                New Password
                            </label>
                            <input
                                type="password"
                                placeholder="Min. 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: T.fg }}>
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
                            disabled={loading || !!error.includes('expired')}
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
                            {loading ? 'Updating...' : 'Update Password'}
                        </motion.button>
                    </form>
                )}

                {error.includes('expired') && (
                    <div style={{ textAlign: 'center', marginTop: '24px' }}>
                        <button
                            onClick={() => router.push('/forgot-password')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: T.accent,
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '0.85rem',
                            }}
                        >
                            Request New Reset Link
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
