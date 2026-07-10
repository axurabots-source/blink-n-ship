import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isFlashipConnected } from '@/lib/courier-guard';
import CourierLock from '@/components/CourierLock';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const connected = await isFlashipConnected(user.id);

    return <CourierLock>{connected ? <DashboardClient /> : <div />}</CourierLock>;
}