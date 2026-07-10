import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient> | null = null;

export function createServiceRoleClient() {
    if (!client) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        client = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return client;
}