import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '30');
        const eventType = searchParams.get('type');
        const skip = (page - 1) * limit;

        const where: any = { userId: user.id };
        if (eventType) where.eventType = eventType;

        const [logs, total] = await Promise.all([
            prisma.courierActivityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            prisma.courierActivityLog.count({ where }),
        ]);

        return NextResponse.json({ logs, total, page, limit });
    } catch (err: any) {
        return apiError(err);
    }
}
