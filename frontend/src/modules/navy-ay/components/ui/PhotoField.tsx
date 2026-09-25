/**
 * Photo of a document (phase 1A): taken with the phone camera or chosen from the
 * gallery, compressed on the phone (long side ≈ 1600 px, JPEG ≈ 0.7), previewed, can
 * be taken again. SENSITIVE PERSONAL DATA (identity documents): the preview URL is a
 * local object URL, revoked as soon as it is replaced.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Camera, CheckCircle2, ImagePlus, Loader2, RotateCcw } from 'lucide-react';
import { compressPhoto } from '../../utils/imageCompress';

interface PhotoFieldProps {
  label: string;
  hint?: string;
  /** New photo chosen on this device (compressed). */
  blob: Blob | undefined;
  /** Signed URL of the photo already on the server (correction of a request). */
  existingUrl?: string | null;
  /** True when a photo already exists on the server even if its preview is not loaded. */
  hasExisting?: boolean;
  onChange: (blob: Blob) => void;
}

export default function PhotoField({ label, hint, blob, existingUrl, hasExisting, onChange }: PhotoFieldProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  useEffect(() => {
    if (!blob) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await compressPhoto(file));
    } catch {
      setError('Cette image n’a pas pu être lue. Reprenez la photo.');
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  };

  const shown = preview ?? existingUrl ?? null;
  const done = !!blob || !!hasExisting;

  return (
    <div className="rounded-2xl border border-navyay-charcoal/15 bg-white p-3" role="group" aria-labelledby={id}>
      <div className="flex items-center gap-2">
        {done ? (
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-700" aria-hidden="true" />
        ) : (
          <Camera className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        )}
        <p id={id} className="flex-1 min-w-0 font-medium">
          {label}
        </p>
      </div>
      {hint && <p className="mt-1 text-xs text-navyay-charcoal/70">{hint}</p>}

      {shown ? (
        <img src={shown} alt={`Aperçu : ${label}`} className="mt-3 w-full max-h-56 object-contain rounded-xl bg-navyay-charcoal/5" />
      ) : done ? (
        <p className="mt-3 rounded-xl bg-navyay-charcoal/5 px-3 py-6 text-center text-sm text-navyay-charcoal/70">
          Photo déjà envoyée
        </p>
      ) : null}

      {error && (
        <p className="mt-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-navyay-charcoal px-3 py-2.5 text-sm font-semibold text-white hover:bg-navyay-charcoal/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : done ? <RotateCcw className="w-4 h-4" aria-hidden="true" /> : <Camera className="w-4 h-4" aria-hidden="true" />}
          {done ? 'Reprendre' : 'Prendre'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => galleryRef.current?.click()}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-navyay-charcoal/25 px-3 py-2.5 text-sm font-semibold hover:bg-navyay-yellow/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-60"
        >
          <ImagePlus className="w-4 h-4" aria-hidden="true" />
          Galerie
        </button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-label={`${label} : prendre une photo`}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label={`${label} : choisir dans la galerie`}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
