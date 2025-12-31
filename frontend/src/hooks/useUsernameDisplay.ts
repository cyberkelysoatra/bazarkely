import { useState, useEffect } from 'react';

/**
 * Hook to manage username visibility with daily session tracking
 * Shows username for 60 seconds on first visit of the day (resets at 6AM)
 * @returns boolean - true if username should be displayed
 */
export function useUsernameDisplay(): boolean {
  const [showUsername, setShowUsername] = useState<boolean>(false);

  useEffect(() => {
    // Check if this is a new daily session
    const checkDailySession = (): boolean => {
      try {
        const now = new Date();
        const currentHour = now.getHours();
        
        // Calculate daily period: 6 AM to 6 AM next day
        // If current hour < 6, consider it previous day period
        const isPreviousDay = currentHour < 6;
        const sessionDate = isPreviousDay
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
          : new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const sessionKey = `bazarkely-username-display-session-${sessionDate.toDateString()}`;
        const stored = localStorage.getItem(sessionKey);
        
        if (!stored) {
          // New daily session - show username and store session
          localStorage.setItem(sessionKey, 'true');
          return true; // New session
        }
        
        // Session already exists for this day period - hide username
        return false; // Already shown today
      } catch (error) {
        console.error('Error checking daily session:', error);
        // Fallback: show username if localStorage fails
        return true; // Show on error to be safe
      }
    };

    const shouldShow = checkDailySession();
    setShowUsername(shouldShow);

    if (shouldShow) {
      // 60 SECOND VISIBILITY TIMER - Hide username after 60 seconds
      const timer = setTimeout(() => {
        setShowUsername(false);
        
        // Mark as shown for current day period
        try {
          const now = new Date();
          const currentHour = now.getHours();
          const isPreviousDay = currentHour < 6;
          const sessionDate = isPreviousDay
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
            : new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          const sessionKey = `bazarkely-username-display-session-${sessionDate.toDateString()}`;
          localStorage.setItem(sessionKey, 'shown');
        } catch (error) {
          console.error('Error updating session status:', error);
        }
      }, 60000); // 60 seconds

      return () => clearTimeout(timer);
    }
  }, []);

  return showUsername;
}

export default useUsernameDisplay;







