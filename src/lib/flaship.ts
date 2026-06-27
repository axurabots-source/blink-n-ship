// ============================================================
// FLASHIP — abhi MOCKED hai. Jab Flaship API docs dunga tum mujhe,
// sirf isi file mein real calls daalenge — baqi app ko chhuna nahi padega.
// ============================================================

import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

async function getCredentials(userId: string) {
    const account = await prisma.courierAccount.findFirst({
        where: { userId, provider: 'flaship', isActive: true },
    });

    if (!account) throw new Error('No active Flaship connection for this user');
    return JSON.parse(decrypt(account.encryptedCredentials));
}

// TODO(real): yahan Flaship ki asli booking API call lagani hai.
export async function bookShipment(userId: string) {
    await getCredentials(userId); // confirm karta hai connection real hai

    const fakeTrackingNumber = 'FLP-' + Math.floor(10000000 + Math.random() * 89999999);
    return {
        success: true,
        tracking_number: fakeTrackingNumber,
        label_url: `https://example.com/mock-labels/${fakeTrackingNumber}.pdf`,
        courier_provider: 'flaship-mock',
    };
}