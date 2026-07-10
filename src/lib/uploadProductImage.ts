import { createClient } from '@/lib/supabase/client';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function sanitizeFilename(userId: string, file: File): string {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : 'jpg';
  const safeName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  return safeName;
}

export function validateProductImage(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB).`;
  }

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return 'Invalid file extension. Allowed: jpg, jpeg, png, webp, avif.';
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return 'Invalid file type. Allowed: JPEG, PNG, WebP, AVIF.';
  }

  return null;
}

export async function uploadProductImage(file: File, userId: string): Promise<string> {
  const validationError = validateProductImage(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = createClient();
  const fileName = sanitizeFilename(userId, file);

  const { error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}
