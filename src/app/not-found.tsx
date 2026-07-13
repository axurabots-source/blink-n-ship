'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';

function Particles() {
    const [positions, setPositions] = useState<{ x: number; y: number; delay: number; dur: number }[]>([]);

    useEffect(() => {
        const pts = Array.from({ length: 20 }).map(() => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            delay: Math.random() * 5,
            dur: 3 + Math.random() * 4,
        }));
        setPositions(pts);
    }, []);

    return (
        <>
            {positions.map((p, i) => (
                <motion.div
                    key={i}
                    style={{
                        position: 'absolute',
                        width: 2,
                        height: 2,
                        borderRadius: '50%',
                        background: 'rgba(204,120,92,0.3)',
                    }}
                    animate={{ y: [0, -30, 0], opacity: [0, 0.8, 0] }}
                    transition={{
                        duration: p.dur,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: 'easeInOut',
                    }}
                    initial={{ x: p.x, y: p.y }}
                />
            ))}
        </>
    );
}

export default function NotFoundPage() {
    useEffect(() => {
        const style = document.createElement('style');
        style.id = 'not-found-hide-sidebar';
        style.textContent = `
            .desktop-sidebar, .mobile-toggle-btn { display: none !important; }
            main { margin-left: 0 !important; }
        `;
        document.head.appendChild(style);
        return () => {
            const el = document.getElementById('not-found-hide-sidebar');
            if (el) el.remove();
        };
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a0a',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'var(--font-geist-sans), sans-serif',
        }}>
            {/* Background grid */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                    linear-gradient(rgba(204,120,92,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(204,120,92,0.03) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px',
            }} />

            {/* Radial glow */}
            <div style={{
                position: 'absolute',
                width: '600px',
                height: '600px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(204,120,92,0.08) 0%, transparent 70%)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            }} />

            <Particles />

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    position: 'relative',
                    zIndex: 10,
                    textAlign: 'center',
                    padding: '40px 24px',
                }}
            >
                {/* Animated truck */}
                <motion.div
                    animate={{ x: [0, 12, -4, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ marginBottom: 24 }}
                >
                    <Truck
                        size={48}
                        color="#CC785C"
                        style={{ transform: 'scaleX(-1)' }}
                    />
                </motion.div>

                {/* 404 */}
                <motion.h1
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                        fontSize: 'clamp(5rem, 20vw, 10rem)',
                        fontWeight: 800,
                        color: '#ffffff',
                        margin: 0,
                        lineHeight: 1,
                        letterSpacing: '-0.05em',
                        textShadow: '0 0 80px rgba(204,120,92,0.15)',
                    }}
                >
                    404
                </motion.h1>

                {/* Glow line */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 80 }}
                    transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                        height: 2,
                        background: '#CC785C',
                        borderRadius: 2,
                        margin: '16px auto 20px',
                    }}
                />

                {/* Message */}
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    style={{
                        color: '#a3a3a3',
                        fontSize: '1.05rem',
                        margin: '0 0 8px',
                        lineHeight: 1.6,
                    }}
                >
                    This shipment got lost in transit
                </motion.p>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65, duration: 0.6 }}
                    style={{
                        color: '#737373',
                        fontSize: '0.85rem',
                        margin: '0 0 36px',
                        lineHeight: 1.6,
                    }}
                >
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </motion.p>

                {/* Back button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                >
                    <Link
                        href="/dashboard"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '12px 28px',
                            borderRadius: '10px',
                            background: '#CC785C',
                            color: '#ffffff',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#b8694e';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#CC785C';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <Truck size={16} style={{ transform: 'scaleX(-1)' }} />
                        Back to Dashboard
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}
