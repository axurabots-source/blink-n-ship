import { prisma } from './prisma';

export async function isFlashipConnected(userId: string): Promise<boolean> {
    const profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { flashipConnected: true },
    });
    return profile?.flashipConnected === true;
}