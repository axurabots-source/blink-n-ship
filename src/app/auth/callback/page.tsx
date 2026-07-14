'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

export default function AuthCallbackPage() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        async function handleRedirect() {
            const { data, error } = await supabase.auth.getSession();
            if (error || !data.session) {
                router.push('/login');
                return;
            }
            router.push('/login?verified=1');
        }
        handleRedirect();
    }, [router, supabase]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            fontFamily: 'var(--font-geist-sans), sans-serif',
        }}>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                style={{ width: 20, height: 20, border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#CC785C', borderRadius: '50%' }}
            />
        </div>
    );
}
