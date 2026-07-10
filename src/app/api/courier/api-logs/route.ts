import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { safePagination } from '@/lib/validation';
import { apiError } from '@/lib/api-error';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const isSuccess = searchParams.get('success');
        const endpoint = searchParams.get('endpoint');
        const { page, limit, skip } = safePagination(searchParams.get('page'), searchParams.get('limit'));

        const where: any = { userId: user.id };
        if (isSuccess !== null) where.isSuccess = isSuccess === 'true';
        if (endpoint) where.endpoint = { contains: endpoint, mode: 'insensitive' };

        const [logs, total] = await Promise.all([
            prisma.apiLog.findMany({ where, orderBy: { calledAt: 'desc' }, skip, take: limit }),
            prisma.apiLog.count({ where }),
        ]);

        return NextResponse.json({ logs, total, page, limit });
    } catch (err: any) {
        return apiError(err);
    }
}
