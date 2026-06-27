'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountTypePage() {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    async function choose(type: 'inventory_holder' | 'reseller') {
        setSaving(true);
        setError('');

        try {
            const res = await fetch('/api/account/account-type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_type: type }),
            });

            if (!res.ok) {
                const body = await res.json();
                throw new Error(body.error || 'Something went wrong');
            }

            router.push('/connect-courier');
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-2xl w-full">
                <h1 className="text-2xl font-semibold text-center mb-2 text-gray-900">
                    How does your business work?
                </h1>
                <p className="text-center text-gray-500 mb-8">
                    This decides which dashboards and features you'll see. You're not locked in forever.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        disabled={saving}
                        onClick={() => choose('inventory_holder')}
                        className="text-left border border-gray-200 rounded-xl p-6 hover:border-gray-900 transition disabled:opacity-50"
                    >
                        <h2 className="font-semibold text-lg mb-2">Inventory Holder</h2>
                        <p className="text-sm text-gray-500">
                            I own and manage my own stock. Track inventory, deduct stock on every order, and see profit
                            based on my real cost price.
                        </p>
                    </button>

                    <button
                        disabled={saving}
                        onClick={() => choose('reseller')}
                        className="text-left border border-gray-200 rounded-xl p-6 hover:border-gray-900 transition disabled:opacity-50"
                    >
                        <h2 className="font-semibold text-lg mb-2">Reseller</h2>
                        <p className="text-sm text-gray-500">
                            I don't hold stock. I just track selling price vs. cost price per order and see my profit
                            margin per sale.
                        </p>
                    </button>
                </div>

                {error && <p className="text-sm text-red-600 text-center mt-4">{error}</p>}
            </div>
        </div>
    );
}