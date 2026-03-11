import { supabase } from '../lib/supabase';

export interface AcknowledgmentResult {
  success: boolean;
  error?: string;
  borrower_name?: string;
  amount_initial?: number;
  currency?: string;
  lender_name?: string;
  acknowledged_at?: string;
}

export interface AcknowledgmentRow {
  id: string;
  loan_id: string;
  status: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  expires_at: string;
  created_at: string;
}

/**
 * Creates a new loan acknowledgment token
 * @param loanId - ID of the loan to create acknowledgment for
 * @returns The raw token (not hashed) to be shared with the borrower
 */
export async function createAcknowledgment(loanId: string): Promise<string> {
  try {
    // Generate raw UUID token
    const token = crypto.randomUUID();

    // Compute SHA-256 hash
    const msgBuffer = new TextEncoder().encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Insert into loan_acknowledgments
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('loan_acknowledgments')
      .insert({
        loan_id: loanId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        status: 'pending'
      });

    if (error) {
      console.error('Erreur création acknowledgment:', error);
      throw new Error(`Erreur création acknowledgment: ${error.message}`);
    }

    return token;
  } catch (error) {
    console.error('Erreur dans createAcknowledgment:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue lors de la création de l\'acknowledgment');
  }
}

/**
 * Generates a WhatsApp link with loan confirmation message
 * @param phone - Borrower phone number
 * @param borrowerName - Borrower name
 * @param amountInitial - Loan amount
 * @param currency - Currency code (MGA or EUR)
 * @param token - Confirmation token
 * @returns WhatsApp link URL
 */
export function getWhatsAppLink(
  phone: string,
  borrowerName: string,
  amountInitial: number,
  currency: string,
  token: string
): string {
  // Build confirmation URL
  const confirmUrl = 'https://1sakely.org/loan-confirm/' + token;

  // Format amount
  const formattedAmount = amountInitial.toLocaleString('fr-FR');

  // Build WhatsApp message (in French)
  const lenderName = 'votre prêteur'; // Placeholder, will be improved later
  const message = `Bonjour ${borrowerName}, ${lenderName} vous a accordé un prêt de ${formattedAmount} ${currency}. Veuillez confirmer sa réception en cliquant sur ce lien : ${confirmUrl}`;

  // Clean phone: remove spaces, dashes, parentheses
  let cleanPhone = phone.replace(/[\s\-()]/g, '');
  
  // If starts with 0, replace with +261
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '+261' + cleanPhone.substring(1);
  }

  // Return WhatsApp link
  return 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(message);
}

/**
 * Confirms a loan acknowledgment using the RPC function
 * @param token - The raw token from the acknowledgment
 * @param name - Optional borrower name
 * @returns AcknowledgmentResult with success status and loan details
 */
export async function confirmAcknowledgment(
  token: string,
  name?: string
): Promise<AcknowledgmentResult> {
  try {
    const { data, error } = await supabase.rpc('confirm_loan_acknowledgment', {
      p_token: token,
      p_name: name ?? null
    });

    if (error) {
      console.error('Erreur confirmation acknowledgment:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Return data as-is (caller handles success === false)
    return data as AcknowledgmentResult;
  } catch (error) {
    console.error('Erreur dans confirmAcknowledgment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue lors de la confirmation'
    };
  }
}

/**
 * Retrieves the most recent acknowledgment for a loan
 * @param loanId - ID of the loan
 * @returns AcknowledgmentRow or null if not found
 */
export async function getAcknowledgmentByLoanId(loanId: string): Promise<AcknowledgmentRow | null> {
  try {
    const { data, error } = await supabase
      .from('loan_acknowledgments')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erreur récupération acknowledgment:', error);
      throw new Error(`Erreur récupération acknowledgment: ${error.message}`);
    }

    return data as AcknowledgmentRow | null;
  } catch (error) {
    console.error('Erreur dans getAcknowledgmentByLoanId:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue lors de la récupération de l\'acknowledgment');
  }
}
