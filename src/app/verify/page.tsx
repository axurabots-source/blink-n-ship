'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

const T = {
    bg: '#ffffff',
    fg: '#0a0a0a',
    accent: '#CC785C',
    accentHover: '#b8694e',
    accentLight: '#fff5f0',
    border: '#e5e5e5',
    muted: '#737373',
};

function VerifyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();

    const email = searchParams.get('email') || '';
    const businessName = searchParams.get('businessName') || '';
    const phone = searchParams.get('phone') || '';

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendMessage, setResendMessage] = useState('');

    useEffect(() => {
        if (!email) {
            router.push('/login');
        }
    }, [email, router]);

    async function handleVerify(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: otp.trim(),
                type: 'signup',
            });

            if (verifyError) {
                throw new Error(verifyError.message);
            }

            // Successfully verified and logged in. Redirect to courier connect
            router.push('/courier/connect');
        } catch (err: any) {
            setError(err.message || 'Verification failed. Please check your code.');
            setLoading(false);
        }
    }

    async function handleResend() {
        setError('');
        setResendMessage('');
        try {
            // Note: Since password isn't stored locally on this screen,
            // we request supabase to resend signup verification OTP/link
            const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email,
            });

            if (resendError) {
                throw new Error(resendError.message);
            }
            setResendMessage('Verification code resent successfully.');
        } catch (err: any) {
            setError(err.message || 'Failed to resend code.');
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
                        Verify your email
                    </h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                        We have sent a verification code to <strong style={{ color: T.fg }}>{email}</strong>. Enter the code below to complete registration.
                    </p>
                </div>

                <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: T.fg }}>
                            Verification Code (OTP)
                        </label>
                        <input
                            type="text"
                            placeholder="Enter verification code"
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

                    {resendMessage && (
                        <p style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>
                            {resendMessage}
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
                </form>

                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem' }}>
                    <span style={{ color: T.muted }}>Didn't receive the code? </span>
                    <button
                        onClick={handleResend}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: T.accent,
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                        }}
                    >
                        Resend Code
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-geist-sans), sans-serif' }}>
                <p style={{ color: '#737373', fontSize: '0.875rem' }}>Loading...</p>
            </div>
        }>
            <VerifyContent />
        </Suspense>
    );
}
