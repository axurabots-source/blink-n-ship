import { prisma } from './prisma';

/**
 * Normalizes phone numbers to standard 11-digit Pakistani format
 */
export function normalizePhoneNumber(phone: string | null): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) return digits;
    if (digits.length === 10 && digits.startsWith('3')) return '0' + digits;
    if (digits.startsWith('92') && digits.length === 12) return '0' + digits.substring(2);
    return digits;
}

/**
 * Audits a user activity log for tracking connection, bookings, and sync actions
 */
export async function logActivity(
    userId: string,
    eventType: string,
    description: string,
    referenceId: string | null = null,
    referenceType: string | null = null,
    metadata: any = null
) {
    try {
        await prisma.courierActivityLog.create({
            data: {
                userId,
                eventType,
                description,
                referenceId,
                referenceType,
                metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
            },
        });
    } catch (err) {
        console.error('Activity log error:', err);
    }
}
