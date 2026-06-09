/**
 * Scanner QR caméra (modal plein écran) — basé sur la lib gratuite html5-qrcode.
 * Démarre la caméra arrière, appelle `onResult(text)` au premier décodage réussi puis
 * s'arrête. Gère l'absence de caméra / refus de permission sans planter.
 */
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, AlertTriangle, ScanLine } from 'lucide-react';

export default function EauQrScanner({
  onResult,
  onClose,
}: {
  onResult: (text: string) => void;
  onClose: () => void;
}) {
  const elementId = 'eau-qr-reader';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(elementId, { verbose: false });
    scannerRef.current = scanner;

    const stop = async () => {
      try {
        if (scanner.getState && scanner.getState() === 2 /* SCANNING */) {
          await scanner.stop();
        }
        await scanner.clear();
      } catch {
        /* ignore */
      }
    };

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (handledRef.current) return;
          handledRef.current = true;
          void stop().then(() => {
            if (!cancelled) onResult(decodedText);
          });
        },
        () => {
          /* erreurs de décodage par frame — ignorées */
        }
      )
      .catch((e) => {
        if (!cancelled) {
          setError(
            e?.toString?.().includes('NotAllowedError')
              ? "Accès caméra refusé. Autorisez la caméra ou saisissez le compteur manuellement."
              : "Caméra indisponible. Saisissez le compteur manuellement."
          );
        }
      });

    return () => {
      cancelled = true;
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="inline-flex items-center gap-1.5 font-semibold text-ahuvi-forest">
            <ScanLine className="w-5 h-5" aria-hidden="true" />
            Scanner un QR
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 -mr-1" aria-label="Fermer">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-3">
          {error ? (
            <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              <div id={elementId} className="w-full overflow-hidden rounded-lg bg-black" />
              <p className="text-xs text-gray-500 text-center mt-2">Visez le QR du compteur ou du compte propriétaire.</p>
            </>
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
