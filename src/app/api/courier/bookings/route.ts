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
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const { page, limit, skip } = safePagination(searchParams.get('page'), searchParams.get('limit'));

        const where: any = { userId: user.id };
        if (status && status !== 'all') where.status = status;
        if (search) {
            where.OR = [
                { trackingNumber: { contains: search, mode: 'insensitive' } },
                { recipientName: { contains: search, mode: 'insensitive' } },
                { recipientCity: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [shipments, total] = await Promise.all([
            prisma.shipment.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    company: { select: { name: true, code: true } },
                    pickupLocation: { select: { name: true, city: true } },
                },
            }),
            prisma.shipment.count({ where }),
        ]);

        return NextResponse.json({ shipments, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (err: any) {
        return apiError(err);
    }
}
