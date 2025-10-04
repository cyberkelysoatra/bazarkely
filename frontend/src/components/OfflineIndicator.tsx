import { useEffect, useState } from 'react';
import { useSyncStore } from '../stores/appStore';

const OfflineIndicator = () => {
  const { isOnline } = useSyncStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
    } else {
      // Délai avant de masquer pour éviter le clignotement
      const timer = setTimeout(() => setShow(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!show) return null;

  return (
    <div className={`offline-indicator ${!isOnline ? 'show' : ''}`}>
      <div className="flex items-center justify-center space-x-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
        </svg>
        <span>
          {isOnline ? 'Connexion rétablie' : 'Mode hors ligne - Vos données seront synchronisées automatiquement'}
        </span>
      </div>
    </div>
  );
};

export default OfflineIndicator;
