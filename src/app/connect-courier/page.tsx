'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ConnectCourierPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/account/connect-flaship', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const body = await res.json();
                throw new Error(body.error || 'Something went wrong');
            }

            router.push('/orders');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm w-full max-w-sm space-y-4">
                <h1 className="text-xl font-semibold text-gray-900">Connect your Flaship account</h1>
                <p className="text-sm text-gray-500">
                    We use this to book shipments, generate labels, and track orders on your behalf.
                    Your login is encrypted — we never show it back to you or anyone else.
                </p>

                <input
                    type="email"
                    placeholder="Flaship email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                    type="password"
                    placeholder="Flaship password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
                >
                    {loading ? 'Connecting...' : 'Connect'}
                </button>

                <button
                    type="button"
                    onClick={() => router.push('/orders')}
                    className="w-full text-sm text-gray-400"
                >
                    Skip for now
                </button>
            </form>
        </div>
    );
}