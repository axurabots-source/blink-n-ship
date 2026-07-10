import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError } from '@/lib/api-error';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { newEmail, currentPassword } = await request.json();
    if (!newEmail) {
      return NextResponse.json({ error: 'New email is required' }, { status: 400 });
    }
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required to change email' }, { status: 400 });
    }

    // Verify current password before allowing email change
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });
    if (signInError) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
    }

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      return apiError(error, 400);
    }

    return NextResponse.json({ success: true, message: 'Verification email sent to new address' });
  } catch (err: any) {
    return apiError(err);
  }
}
