import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-error';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;

        const loadsheet = await prisma.loadsheet.findFirst({
            where: { id, userId: user.id },
            include: {
                orders: {
                    include: {
                        shipment: {
                            select: {
                                trackingNumber: true, recipientName: true,
                                recipientCity: true, status: true, codAmount: true,
                            },
                        },
                    },
                },
            },
        });

        if (!loadsheet) return NextResponse.json({ error: 'Loadsheet not found' }, { status: 404 });
        return NextResponse.json({ loadsheet });
    } catch (err: any) {
        return apiError(err);
    }
}
