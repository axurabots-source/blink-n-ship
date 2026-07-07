import { prisma } from '@/lib/prisma';

export interface LogEntry {
  ownerId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  action: string;
  module: string;
  description: string;
  metadata?: Record<string, any>;
}

export async function logActivity(entry: LogEntry): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        ownerId: entry.ownerId,
        userId: entry.userId,
        userName: entry.userName,
        userEmail: entry.userEmail || null,
        action: entry.action,
        module: entry.module,
        description: entry.description,
        metadata: entry.metadata || undefined,
      },
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
