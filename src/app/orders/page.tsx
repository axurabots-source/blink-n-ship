'use client';

import { useEffect, useState } from 'react';

type Order = {
    id: string;
    customerName: string | null;
    phoneNumber: string | null;
    address: string | null;
    city: string | null;
    productInfo: string | null;
    quantity: number;
    sellingPrice: string | null;
    status: string;
    trackingNumber: string | null;
};

export default function OrdersPage() {
    const [rawText, setRawText] = useState('');
    const [orders, setOrders] = useState<Order[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [extracting, setExtracting] = useState(false);
    const [booking, setBooking] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        refresh();
    }, []);

    async function refresh() {
        try {
            const res = await fetch('/api/orders');
            const body = await res.json();
            setOrders(body.orders || []);
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function handleExtract() {
        if (!rawText.trim()) return;
        setExtracting(true);
        setError('');
        try {
            const res = await fetch('/api/orders/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw_text: rawText }),
            });
            if (!res.ok) {
                const body = await res.json();
                throw new Error(body.error || 'Extraction failed');
            }
            setRawText('');
            await refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setExtracting(false);
        }
    }

    function handleFieldEdit(orderId: string, field: keyof Order, value: any) {
        setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, [field]: value } : o))
        );
    }

    async function saveField(orderId: string, field: string, value: any) {
        try {
            await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value }),
            });
        } catch (err: any) {
            setError(err.message);
        }
    }

    function toggleSelect(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    async function handleBookNow() {
        if (selected.size === 0) return;
        setBooking(true);
        setError('');
        try {
            const res = await fetch('/api/orders/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_ids: [...selected] }),
            });
            const body = await res.json();
            const failed = body.results.filter((r: any) => !r.success);
            if (failed.length) {
                setError(`${failed.length} order(s) failed to book: ${failed[0].error}`);
            }
            setSelected(new Set());
            await refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBooking(false);
        }
    }

    const draftOrders = orders.filter((o) => o.status === 'draft');
    const bookedOrders = orders.filter((o) => o.status !== 'draft');

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 mb-1">Order Processing</h1>
                    <p className="text-gray-500 text-sm mb-4">
                        Paste one order or many — same box, same button.
                    </p>

                    <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="Paste customer message(s) here..."
                        rows={6}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                    />

                    <button
                        onClick={handleExtract}
                        disabled={extracting || !rawText.trim()}
                        className="mt-3 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                        {extracting ? 'Extracting...' : 'Process Orders'}
                    </button>

                    {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                </div>

                {draftOrders.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-medium text-gray-900">Review & complete ({draftOrders.length})</h2>
                            <button
                                onClick={handleBookNow}
                                disabled={selected.size === 0 || booking}
                                className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                            >
                                {booking ? 'Booking...' : `Book Now (${selected.size})`}
                            </button>
                        </div>

                        <div className="space-y-3">
                            {draftOrders.map((order) => (
                                <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selected.has(order.id)}
                                            onChange={() => toggleSelect(order.id)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1 grid grid-cols-2 gap-3">
                                            <Field label="Customer Name" value={order.customerName}
                                                onChange={(v) => handleFieldEdit(order.id, 'customerName', v)}
                                                onBlur={(v) => saveField(order.id, 'customerName', v)} />
                                            <Field label="Phone" value={order.phoneNumber}
                                                onChange={(v) => handleFieldEdit(order.id, 'phoneNumber', v)}
                                                onBlur={(v) => saveField(order.id, 'phoneNumber', v)} />
                                            <Field label="City" value={order.city}
                                                onChange={(v) => handleFieldEdit(order.id, 'city', v)}
                                                onBlur={(v) => saveField(order.id, 'city', v)} />
                                            <Field label="Quantity" type="number" value={order.quantity}
                                                onChange={(v) => handleFieldEdit(order.id, 'quantity', v)}
                                                onBlur={(v) => saveField(order.id, 'quantity', v)} />
                                            <div className="col-span-2">
                                                <Field label="Address" value={order.address}
                                                    onChange={(v) => handleFieldEdit(order.id, 'address', v)}
                                                    onBlur={(v) => saveField(order.id, 'address', v)} />
                                            </div>
                                            <div className="col-span-2">
                                                <Field label="Product" value={order.productInfo}
                                                    onChange={(v) => handleFieldEdit(order.id, 'productInfo', v)}
                                                    onBlur={(v) => saveField(order.id, 'productInfo', v)} />
                                            </div>
                                            <Field label="Selling Price" type="number" value={order.sellingPrice || ''}
                                                onChange={(v) => handleFieldEdit(order.id, 'sellingPrice', v)}
                                                onBlur={(v) => saveField(order.id, 'sellingPrice', v)} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {bookedOrders.length > 0 && (
                    <div>
                        <h2 className="font-medium text-gray-900 mb-3">Booked orders ({bookedOrders.length})</h2>
                        <div className="space-y-2">
                            {bookedOrders.map((order) => (
                                <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-3 text-sm flex justify-between">
                                    <span>{order.customerName} — {order.city}</span>
                                    <span className="text-gray-500">{order.trackingNumber} · {order.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Field({
    label, value, onChange, onBlur, type = 'text',
}: {
    label: string;
    value: string | number | null;
    onChange: (v: string) => void;
    onBlur: (v: string) => void;
    type?: string;
}) {
    return (
        <label className="block">
            <span className="text-xs text-gray-500">{label}</span>
            <input
                type={type}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={(e) => onBlur(e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm mt-0.5"
            />
        </label>
    );
}