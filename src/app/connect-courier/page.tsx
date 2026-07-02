import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function RedirectPage() {
    redirect('/courier/connect');
    return null;
}