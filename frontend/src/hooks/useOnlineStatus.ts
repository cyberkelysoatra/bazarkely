import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

/**
 * Hook to monitor server connection status
 * Polls server every 30 seconds to check if online
 * @returns boolean - true if server is reachable
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await apiService.getServerStatus();
        setIsOnline(status.online);
      } catch (error) {
        console.error('Error checking server status:', error);
        setIsOnline(false);
      }
    };

    // Check immediately on mount
    checkConnection();

    // Set up polling interval (30 seconds)
    const interval = setInterval(checkConnection, 30000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  return isOnline;
}

export default useOnlineStatus;




