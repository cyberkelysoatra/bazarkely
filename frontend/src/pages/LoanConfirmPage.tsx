import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { confirmAcknowledgment } from '../services/loanAcknowledgmentService';
import type { AcknowledgmentResult } from '../services/loanAcknowledgmentService';

type PageState = 'loading' | 'success' | 'error';

const mapErrorMessage = (code?: string): string => {
  if (code === 'invalid_token') return 'Ce lien de confirmation est invalide.';
  if (code === 'already_acknowledged') return 'Ce prêt a déjà été confirmé.';
  if (code === 'token_expired') return 'Ce lien a expiré (validité 48h). Demandez un nouveau lien à votre prêteur.';
  return 'Une erreur est survenue.';
};

const LoanConfirmPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>('loading');
  const [result, setResult] = useState<AcknowledgmentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setErrorMessage('Lien invalide.');
        setState('error');
        return;
      }
      const ackResult = await confirmAcknowledgment(token);
      if (ackResult.success) {
        setResult(ackResult);
        setState('success');
        return;
      }
      setErrorMessage(mapErrorMessage(ackResult.error));
      setState('error');
    };
    run();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md bg-white shadow rounded-xl p-8 flex flex-col items-center gap-4 text-center">
        {state === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600">Vérification en cours...</p>
          </>
        )}

        {state === 'success' && result && (
          <>
            <CheckCircle2 size={64} className="text-green-500" />
            <h1 className="text-2xl font-semibold text-gray-900">Prêt confirmé !</h1>
            <p className="text-gray-700">
              <span className="font-medium">{result.borrower_name || 'Emprunteur'}</span> —{' '}
              <span className="font-semibold">{(result.amount_initial || 0).toLocaleString('fr-FR')} {result.currency || 'MGA'}</span>
            </p>
            {result.lender_name && <p className="text-gray-600">Prêteur : {result.lender_name}</p>}
            {result.acknowledged_at && (
              <p className="text-gray-600">
                Confirmé le{' '}
                {new Date(result.acknowledged_at).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            )}
            <p className="text-gray-600">Votre confirmation a bien été enregistrée.</p>
            <Link to="/" className="text-green-600 hover:text-green-700 font-medium underline">
              Accéder à BazarKELY
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle size={64} className="text-red-400" />
            <h1 className="text-2xl font-semibold text-gray-900">Confirmation impossible</h1>
            <p className="text-gray-600">{errorMessage}</p>
            <Link to="/" className="text-green-600 hover:text-green-700 font-medium underline">
              Accéder à BazarKELY
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default LoanConfirmPage;
