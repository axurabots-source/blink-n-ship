import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

interface AuditEntry {
  ownerId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  action: string;
  module: string;
  description: string;
  metadata?: Record<string, any>;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.activityLog.create({ data: entry });
    log.info('AUDIT', `${entry.action} | ${entry.module} | ${entry.description}`, {
      userId: entry.userId,
      module: entry.module,
      action: entry.action,
    });
  } catch (err) {
    log.error('AUDIT', 'Failed to persist audit entry', { error: String(err) });
  }
}
