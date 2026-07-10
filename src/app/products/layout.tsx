import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isFlashipConnected } from '@/lib/courier-guard';
import CourierLock from '@/components/CourierLock';

export default async function ProductsLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const connected = await isFlashipConnected(user.id);

    return <CourierLock>{connected ? children : <div />}</CourierLock>;
}