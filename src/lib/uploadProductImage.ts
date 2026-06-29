import { createClient } from '@/lib/supabase/client';

export async function uploadProductImage(file: File, userId: string): Promise<string> {
    const supabase = createClient();

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

    if (error) throw error;

    const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

    return data.publicUrl;
}