'use client';

export default function DashboardLoading() {
    return (
        <div
            style={{
                minHeight: '100vh',
                background: '#ffffff',
                padding: '40px 48px',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                boxSizing: 'border-box',
            }}
            className="bns-page"
        >
            <style>{`
                @keyframes shimmer {
                    0% { background-position: -600px 0; }
                    100% { background-position: 600px 0; }
                }
                .skel {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 600px 100%;
                    animation: shimmer 1.4s infinite linear;
                    border-radius: 8px;
                }
            `}</style>

            {/* Header skeleton */}
            <div style={{ marginBottom: 40 }}>
                <div className="skel" style={{ height: 32, width: 220, marginBottom: 10 }} />
                <div className="skel" style={{ height: 16, width: 300 }} />
            </div>

            {/* Stat cards skeleton */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 20,
                    marginBottom: 40,
                }}
                className="bns-stat-grid"
            >
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        style={{
                            background: '#fafafa',
                            border: '1px solid #e5e5e5',
                            borderRadius: 12,
                            padding: '24px 24px 20px',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div className="skel" style={{ height: 14, width: 90 }} />
                            <div className="skel" style={{ height: 32, width: 32, borderRadius: 8 }} />
                        </div>
                        <div className="skel" style={{ height: 38, width: 120, marginTop: 16 }} />
                    </div>
                ))}
            </div>

            {/* Chart skeleton */}
            <div
                style={{
                    background: '#fafafa',
                    border: '1px solid #e5e5e5',
                    borderRadius: 12,
                    padding: '24px',
                    marginBottom: 40,
                }}
            >
                <div className="skel" style={{ height: 18, width: 180, marginBottom: 8 }} />
                <div className="skel" style={{ height: 14, width: 240, marginBottom: 24 }} />
                <div className="skel" style={{ height: 220, width: '100%', borderRadius: 8 }} />
            </div>

            {/* Table skeleton */}
            <div>
                <div className="skel" style={{ height: 18, width: 200, marginBottom: 16 }} />
                <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: 12, padding: 24 }}>
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                gap: 16,
                                marginBottom: i < 3 ? 16 : 0,
                                paddingBottom: i < 3 ? 16 : 0,
                                borderBottom: i < 3 ? '1px solid #f0f0f0' : 'none',
                            }}
                        >
                            <div className="skel" style={{ height: 16, flex: 2 }} />
                            <div className="skel" style={{ height: 16, flex: 1 }} />
                            <div className="skel" style={{ height: 16, flex: 2 }} />
                            <div className="skel" style={{ height: 16, flex: 1.5 }} />
                            <div className="skel" style={{ height: 16, flex: 1 }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
