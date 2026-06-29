'use client';

const T = {
    accent: '#CC785C',
    border: '#e5e5e5',
    card: '#fafafa',
    muted: '#737373',
};

export default function PageLoader({ label = 'Loading…' }: { label?: string }) {
    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                gap: 20,
            }}
        >
            <style>{`
                @keyframes bns-spin {
                    0%   { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes bns-pulse-ring {
                    0%   { transform: scale(0.85); opacity: 0.7; }
                    50%  { transform: scale(1.15); opacity: 0.2; }
                    100% { transform: scale(0.85); opacity: 0.7; }
                }
                @keyframes bns-dot-bounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                    40%           { transform: translateY(-6px); opacity: 1; }
                }
                .bns-loader-ring {
                    position: relative;
                    width: 56px;
                    height: 56px;
                }
                .bns-loader-ring::before {
                    content: '';
                    position: absolute;
                    inset: -6px;
                    border-radius: 50%;
                    background: rgba(204,120,92,0.12);
                    animation: bns-pulse-ring 1.6s ease-in-out infinite;
                }
                .bns-loader-ring::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    border: 3px solid ${T.border};
                    border-top-color: ${T.accent};
                    border-right-color: rgba(204,120,92,0.5);
                    animation: bns-spin 0.85s linear infinite;
                }
                .bns-loader-dots {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                }
                .bns-loader-dots span {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: ${T.accent};
                    animation: bns-dot-bounce 1.1s ease-in-out infinite;
                }
                .bns-loader-dots span:nth-child(2) { animation-delay: 0.18s; }
                .bns-loader-dots span:nth-child(3) { animation-delay: 0.36s; }
            `}</style>

            {/* Spinning ring with pulse */}
            <div className="bns-loader-ring" />

            {/* Label + dots */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <p style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#0a0a0a',
                    margin: 0,
                    letterSpacing: '-0.02em',
                }}>
                    {label}
                </p>
                <div className="bns-loader-dots">
                    <span /><span /><span />
                </div>
            </div>
        </div>
    );
}
