import { supabase } from '../lib/supabase';

/**
 * Uploads a loan repayment receipt file to Supabase Storage bucket 'loan-receipts'. Returns the public URL or throws on error.
 */
export async function uploadLoanReceipt(userId: string, file: File): Promise<string | null> {
  try {
    // Generate unique file path: userId/Date.now_filename (sanitize spaces to underscores)
    const sanitizedName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const filePath = `${userId}/${Date.now()}_${sanitizedName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('loan-receipts')
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      console.error('Erreur upload reçu:', uploadError);
      return null;
    }

    // Create signed URL (1 year validity) since bucket is private
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('loan-receipts')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    if (signedUrlError || !signedUrlData) {
      console.error('Erreur création URL signée:', signedUrlError);
      return null;
    }

    return signedUrlData.signedUrl;
  } catch (error) {
    console.error('Erreur dans uploadLoanReceipt:', error);
    return null;
  }
}
