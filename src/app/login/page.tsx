'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Eye, EyeOff } from 'lucide-react';

// ─── Animated Canvas Background ───────────────────────────────────────────────
function AnimatedBG() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        type Line = {
            x: number; y: number;
            vx: number; vy: number;
            length: number;
            opacity: number;
            life: number; maxLife: number;
            width: number;
        };

        const lines: Line[] = [];

        const spawnLine = (): Line => {
            const angle = (Math.random() * 40 - 20) * (Math.PI / 180);
            const speed = 18 + Math.random() * 28;
            const side = Math.random();
            let x: number, y: number;

            if (side < 0.5) {
                x = Math.random() * canvas.width;
                y = canvas.height + 20;
            } else {
                x = Math.random() < 0.5 ? -20 : canvas.width + 20;
                y = Math.random() * canvas.height;
            }

            return {
                x, y,
                vx: Math.sin(angle) * speed * (x < canvas.width / 2 ? 1 : -1),
                vy: -Math.cos(angle) * speed,
                length: 60 + Math.random() * 120,
                opacity: 0,
                life: 0,
                maxLife: 28 + Math.random() * 18,
                width: 0.5 + Math.random() * 1.2,
            };
        };

        for (let i = 0; i < 12; i++) {
            const l = spawnLine();
            l.life = Math.random() * l.maxLife;
            lines.push(l);
        }

        type Streak = {
            x: number; y: number;
            vx: number; vy: number;
            length: number; life: number; maxLife: number;
        };
        const streaks: Streak[] = [];

        const spawnStreak = (): Streak => ({
            x: Math.random() * canvas.width,
            y: canvas.height * 0.3 + Math.random() * canvas.height * 0.4,
            vx: (Math.random() - 0.5) * 6,
            vy: -(12 + Math.random() * 20),
            length: 180 + Math.random() * 200,
            life: 0,
            maxLife: 22 + Math.random() * 14,
        });

        let raf: number;
        let frame = 0;

        const draw = () => {
            frame++;
            ctx.fillStyle = 'rgba(10,10,10,0.45)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (lines.length < 35 && Math.random() < 0.55) lines.push(spawnLine());
            if (frame % 38 === 0) streaks.push(spawnStreak());

            for (let i = lines.length - 1; i >= 0; i--) {
                const l = lines[i];
                l.life++;
                l.x += l.vx;
                l.y += l.vy;

                const t = l.life / l.maxLife;
                l.opacity = t < 0.2 ? t / 0.2 : t < 0.7 ? 1 : (1 - (t - 0.7) / 0.3);

                if (l.life >= l.maxLife) { lines.splice(i, 1); continue; }

                const tailX = l.x - l.vx * (l.length / Math.hypot(l.vx, l.vy));
                const tailY = l.y - l.vy * (l.length / Math.hypot(l.vx, l.vy));

                const grad = ctx.createLinearGradient(tailX, tailY, l.x, l.y);
                grad.addColorStop(0, `rgba(204,120,92,0)`);
                grad.addColorStop(0.6, `rgba(220,130,95,${l.opacity * 0.6})`);
                grad.addColorStop(1, `rgba(255,200,170,${l.opacity})`);

                ctx.beginPath();
                ctx.moveTo(tailX, tailY);
                ctx.lineTo(l.x, l.y);
                ctx.strokeStyle = grad;
                ctx.lineWidth = l.width;
                ctx.lineCap = 'round';
                ctx.stroke();

                const tipGrad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 6);
                tipGrad.addColorStop(0, `rgba(255,210,180,${l.opacity * 0.9})`);
                tipGrad.addColorStop(1, `rgba(204,120,92,0)`);
                ctx.beginPath();
                ctx.arc(l.x, l.y, 6, 0, Math.PI * 2);
                ctx.fillStyle = tipGrad;
                ctx.fill();
            }

            for (let i = streaks.length - 1; i >= 0; i--) {
                const s = streaks[i];
                s.life++;
                s.x += s.vx;
                s.y += s.vy;

                const t = s.life / s.maxLife;
                const op = t < 0.15 ? t / 0.15 : t < 0.6 ? 1 : (1 - (t - 0.6) / 0.4);

                if (s.life >= s.maxLife) { streaks.splice(i, 1); continue; }

                const tx = s.x - s.vx * (s.length / Math.hypot(s.vx, s.vy));
                const ty = s.y - s.vy * (s.length / Math.hypot(s.vx, s.vy));

                const sg = ctx.createLinearGradient(tx, ty, s.x, s.y);
                sg.addColorStop(0, `rgba(204,120,92,0)`);
                sg.addColorStop(0.5, `rgba(230,150,110,${op * 0.4})`);
                sg.addColorStop(1, `rgba(255,230,210,${op})`);

                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(s.x, s.y);
                ctx.strokeStyle = sg;
                ctx.lineWidth = 1.5;
                ctx.lineCap = 'round';
                ctx.stroke();

                const sg2 = ctx.createLinearGradient(tx, ty, s.x, s.y);
                sg2.addColorStop(0, `rgba(204,120,92,0)`);
                sg2.addColorStop(1, `rgba(204,120,92,${op * 0.15})`);
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(s.x, s.y);
                ctx.strokeStyle = sg2;
                ctx.lineWidth = 12;
                ctx.stroke();
            }

            const ag = ctx.createRadialGradient(
                canvas.width * 0.5, canvas.height, 0,
                canvas.width * 0.5, canvas.height, canvas.width * 0.4
            );
            ag.addColorStop(0, 'rgba(204,120,92,0.06)');
            ag.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.beginPath();
            ctx.ellipse(canvas.width * 0.5, canvas.height, canvas.width * 0.4, canvas.height * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = ag;
            ctx.fill();

            raf = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
    );
}

// ─── Left Panel ────────────────────────────────────────────────────────────────
function LeftPanel({ isSignup }: { isSignup: boolean }) {
    return (
        <div className="login-left-panel">
            <AnimatedBG />

            {/* Vignette */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse at 50% 100%, transparent 30%, rgba(10,10,10,0.6) 100%)',
            }} />

            {/* Brand */}
            <div style={{ position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Truck size={18} color="#CC785C" style={{ transform: 'scaleX(-1)' }} />
                    <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                        Blink N Ship
                    </span>
                </div>
            </div>

            <div />

            {/* Bottom tagline */}
            <div style={{ position: 'relative', zIndex: 10 }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isSignup ? 'su' : 'li'}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -14 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <h2 style={{
                            color: '#ffffff',
                            fontSize: '1.75rem',
                            fontWeight: 600,
                            letterSpacing: '-0.03em',
                            lineHeight: 1.25,
                            marginBottom: 12,
                        }}>
                            {isSignup ? 'Paste. Process. Profit.' : 'Orders in. Parcels out.'}
                        </h2>
                        <p style={{ color: '#CC785C', fontSize: '0.85rem', lineHeight: 1.75, maxWidth: 260 }}>
                            {isSignup
                                ? 'AI reads your customer messages and turns them into booked shipments — instantly.'
                                : 'Your dashboard is ready. Pick up right where you left off.'}
                        </p>
                    </motion.div>
                </AnimatePresence>
                <div style={{ width: 32, height: 2, background: '#ebe3e1ff', borderRadius: 2, marginTop: 20 }} />
            </div>

            <p style={{ color: '#dbcdcdff', fontSize: '0.72rem', position: 'relative', zIndex: 10 }}>
                © 2026 Blink N Ship
            </p>
        </div>
    );
}

// ─── Mobile Top Banner ─────────────────────────────────────────────────────────
function MobileBanner({ isSignup }: { isSignup: boolean }) {
    return (
        <div className="login-mobile-banner">
            <AnimatedBG />
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse at 50% 120%, transparent 30%, rgba(10,10,10,0.7) 100%)',
            }} />
            <div style={{ position: 'relative', zIndex: 10, padding: '28px 28px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Truck size={16} color="#CC785C" style={{ transform: 'scaleX(-1)' }} />
                    <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
                        Blink N Ship
                    </span>
                </div>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isSignup ? 'su-m' : 'li-m'}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <h2 style={{
                            color: '#ffffff',
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            letterSpacing: '-0.025em',
                            lineHeight: 1.3,
                            margin: '0 0 6px',
                        }}>
                            {isSignup ? 'Paste. Process. Profit.' : 'Orders in. Parcels out.'}
                        </h2>
                        <p style={{ color: '#CC785C', fontSize: '0.8rem', margin: 0, lineHeight: 1.6 }}>
                            {isSignup
                                ? 'AI reads messages & books shipments instantly.'
                                : 'Pick up right where you left off.'}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
    return (
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }}
        />
    );
}

// ─── Input Field ──────────────────────────────────────────────────────────────
function InputField({ type, placeholder, value, onChange, required, minLength, inputMode, autoComplete }: {
    type: string; placeholder: string; value: string;
    onChange: (v: string) => void; required?: boolean; minLength?: number; inputMode?: string; autoComplete?: string;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <input
            type={type}
            placeholder={placeholder}
            inputMode={inputMode as any}
            autoComplete={autoComplete}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            minLength={minLength}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
                width: '100%',
                padding: '0.875rem 1rem',
                fontSize: '16px', // Must be ≥16px to prevent iOS/Safari auto-zoom on focus
                borderRadius: '0.75rem',
                border: `1.5px solid ${focused ? '#CC785C' : '#e5e5e5'}`,
                background: focused ? '#fffcfb' : '#fafafa',
                color: '#0a0a0a',
                outline: 'none',
                transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                boxShadow: focused ? '0 0 0 3px rgba(204,120,92,0.12)' : 'none',
                boxSizing: 'border-box',
            }}
        />
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        setError(''); setEmail(''); setPassword(''); setBusinessName(''); setPhone('');
    }, [isSignup]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (isSignup && (!businessName.trim() || !phone.trim())) {
            setError('Please enter your business name and phone number.');
            setLoading(false);
            return;
        }

        const { error: authError } = isSignup
            ? await supabase.auth.signUp({ email, password })
            : await supabase.auth.signInWithPassword({ email, password });

        if (authError) { setError(authError.message); setLoading(false); return; }

        setLoading(false);
        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
        if (isSignup) {
            localStorage.removeItem('bns_account_type');
            const params = new URLSearchParams();
            if (businessName.trim()) params.set('businessName', businessName.trim());
            if (phone.trim()) params.set('phone', phone.trim());
            router.push('/account-type?' + params.toString());
        } else {
            // Clear stale account type so sidebar always re-fetches fresh from DB
            localStorage.removeItem('bns_account_type');
            router.push(isMobile ? '/courier/connect' : '/dashboard');
        }
        router.refresh();
    }

    return (
        <>
            <style>{`
                .login-wrapper {
                    min-height: 100vh;
                    display: flex;
                    background: #ffffff;
                    font-family: var(--font-geist-sans), sans-serif;
                }

                /* Desktop: left panel visible, mobile banner hidden */
                .login-left-panel {
                    width: 50%;
                    background: #0a0a0a;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 3rem;
                }
                .login-mobile-banner {
                    display: none;
                }
                .login-right-panel {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem 1.5rem;
                    overflow: hidden;
                }

                @media (max-width: 768px) {
                    .login-wrapper {
                        flex-direction: column;
                    }
                    .login-left-panel {
                        display: none;
                    }
                    .login-mobile-banner {
                        display: block;
                        position: relative;
                        overflow: hidden;
                        background: #0a0a0a;
                        min-height: 180px;
                        flex-shrink: 0;
                    }
                    .login-right-panel {
                        flex: 1;
                        align-items: flex-start;
                        padding: 28px 24px 40px;
                    }
                }
            `}</style>

            <div className="login-wrapper">
                {/* Desktop left panel */}
                <LeftPanel isSignup={isSignup} />

                {/* Mobile top banner */}
                <MobileBanner isSignup={isSignup} />

                {/* Right / Bottom panel — form */}
                <div className="login-right-panel">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isSignup ? 'signup' : 'login'}
                            initial={{ opacity: 0, x: isSignup ? 60 : -60 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isSignup ? -60 : 60 }}
                            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                            style={{ width: '100%', maxWidth: 380 }}
                        >
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#0a0a0a', letterSpacing: '-0.03em', marginBottom: 8 }}>
                                {isSignup ? 'Create account' : 'Welcome back'}
                            </h1>
                            <p style={{ fontSize: '0.875rem', color: '#737373', marginBottom: 36 }}>
                                {isSignup ? 'Start processing orders today' : 'Sign in to your account'}
                            </p>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {isSignup && (
                                    <>
                                        <InputField type="text" placeholder="Business name" inputMode="text" autoComplete="organization" value={businessName} onChange={setBusinessName} required />
                                        <InputField type="tel" placeholder="Phone number (e.g. 03XXXXXXXXX)" inputMode="tel" autoComplete="tel" value={phone} onChange={setPhone} required />
                                    </>
                                )}
                                <InputField type="email" placeholder="Email address" inputMode="email" autoComplete="email" value={email} onChange={setEmail} required />
                                <div style={{ position: 'relative' }}>
                                    <InputField
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder={isSignup ? 'Password (min. 6 characters)' : 'Password'}
                                        inputMode="text"
                                        autoComplete={isSignup ? 'new-password' : 'current-password'}
                                        value={password} onChange={setPassword} required minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: 12,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: 0,
                                            display: 'flex',
                                            color: '#a3a3a3',
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.22 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div style={{ padding: '0.75rem', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.75rem' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#e05252' }}>⚠ {error}</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    whileHover={!loading ? { scale: 1.015, filter: 'brightness(1.08)' } : {}}
                                    whileTap={!loading ? { scale: 0.975 } : {}}
                                    style={{
                                        marginTop: 6,
                                        width: '100%',
                                        padding: '0.9rem',
                                        borderRadius: '0.75rem',
                                        background: '#CC785C',
                                        color: '#ffffff',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        opacity: loading ? 0.8 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        letterSpacing: '-0.01em',
                                    }}
                                >
                                    {loading && <Spinner />}
                                    {loading ? 'Please wait…' : isSignup ? 'Create Account' : 'Sign In'}
                                </motion.button>
                            </form>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '1.75rem 0' }}>
                                <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
                                <span style={{ fontSize: '0.75rem', color: '#a3a3a3' }}>or</span>
                                <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
                            </div>

                            <motion.button
                                onClick={() => setIsSignup(!isSignup)}
                                whileHover={{ borderColor: '#CC785C', color: '#CC785C' }}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '0.75rem',
                                    border: '1.5px solid #e5e5e5',
                                    background: 'transparent',
                                    fontSize: '0.875rem',
                                    color: '#737373',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s, color 0.2s',
                                }}
                            >
                                {isSignup ? 'Already have an account? ' : "Don't have an account? "}
                                <span style={{ color: '#CC785C', fontWeight: 600 }}>
                                    {isSignup ? 'Sign in' : 'Sign up'}
                                </span>
                            </motion.button>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}