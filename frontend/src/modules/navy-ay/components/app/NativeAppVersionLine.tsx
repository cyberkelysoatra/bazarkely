/**
 * Version of the installed NAVY ay Android app, for the "Version" screen.
 * Renders nothing on the web.
 */
import { useEffect, useState } from 'react';
import { getNativeAppVersion, isNativeApp } from '../../services/nativeApp';

export default function NativeAppVersionLine({ className = '' }: { className?: string }) {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    getNativeAppVersion().then((v) => {
      if (!cancelled) setVersion(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!version) return null;
  return <p className={className}>Appli Android NAVY ay : version {version}</p>;
}
