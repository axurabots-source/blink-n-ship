'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error: authError } = isSignup
            ? await supabase.auth.signUp({ email, password })
            : await supabase.auth.signInWithPassword({ email, password });

        setLoading(false);

        if (authError) {
            setError(authError.message);
            return;
        }

        router.push(isSignup ? '/account-type' : '/orders');
        router.refresh();
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded-xl shadow-sm w-full max-w-sm space-y-4"
            >
                <h1 className="text-xl font-semibold text-gray-900">
                    {isSignup ? 'Create your account' : 'Welcome back'}
                </h1>

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
                >
                    {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Log In'}
                </button>

                <button
                    type="button"
                    onClick={() => setIsSignup(!isSignup)}
                    className="w-full text-sm text-gray-500"
                >
                    {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                </button>
            </form>
        </div>
    );
}