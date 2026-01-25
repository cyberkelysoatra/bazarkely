import { useEffect } from 'react';

/**
 * Custom React hook to prevent automatic translation at runtime.
 * 
 * This hook:
 * - Sets document language to French ('fr')
 * - Disables automatic translation via translate attribute
 * - Adds 'notranslate' class to body element
 * - Monitors for translation attempts via MutationObserver
 * - Automatically restores French language if changed
 * - Cleans up observer on component unmount
 * 
 * @example
 * ```tsx
 * function App() {
 *   usePreventTranslation();
 *   return <div>Mon application</div>;
 * }
 * ```
 */
export const usePreventTranslation = (): void => {
  useEffect(() => {
    // Set initial language and translation settings
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    // Store original values for potential restoration (if needed)
    const originalLang = htmlElement.lang || '';
    const originalTranslate = htmlElement.getAttribute('translate');

    // Set French language
    htmlElement.lang = 'fr';
    
    // Disable automatic translation
    htmlElement.setAttribute('translate', 'no');
    
    // Add notranslate class to body for additional protection
    bodyElement.classList.add('notranslate');

    // Create MutationObserver to monitor lang and translate attributes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          
          // Check if lang attribute was changed
          if (mutation.attributeName === 'lang' && target === htmlElement) {
            const currentLang = htmlElement.lang;
            if (currentLang !== 'fr') {
              console.warn(
                `⚠️ [usePreventTranslation] Translation detected: lang changed from 'fr' to '${currentLang}'. Restoring to 'fr'.`
              );
              // Restore French language
              htmlElement.lang = 'fr';
            }
          }
          
          // Check if translate attribute was changed
          if (mutation.attributeName === 'translate' && target === htmlElement) {
            const currentTranslate = htmlElement.getAttribute('translate');
            if (currentTranslate !== 'no') {
              console.warn(
                `⚠️ [usePreventTranslation] Translation detected: translate attribute changed to '${currentTranslate}'. Restoring to 'no'.`
              );
              // Restore translate='no'
              htmlElement.setAttribute('translate', 'no');
            }
          }
        }
      });
    });

    // Start observing changes to lang and translate attributes on html element
    observer.observe(htmlElement, {
      attributes: true,
      attributeFilter: ['lang', 'translate'],
      subtree: false, // Only monitor html element, not children
    });

    // Cleanup function: disconnect observer and restore original state (optional)
    return () => {
      observer.disconnect();
      
      // Restore original lang if it was set (optional - may not be needed)
      // Only restore if we want to preserve user's original language preference
      // For now, we keep French as it's the app's language
      
      // Remove notranslate class from body
      bodyElement.classList.remove('notranslate');
      
      // Note: We intentionally do NOT restore original lang/translate
      // because the app should remain in French. If you need to restore
      // original values, uncomment the following:
      // if (originalLang) {
      //   htmlElement.lang = originalLang;
      // } else {
      //   htmlElement.removeAttribute('lang');
      // }
      // if (originalTranslate !== null) {
      //   htmlElement.setAttribute('translate', originalTranslate);
      // } else {
      //   htmlElement.removeAttribute('translate');
      // }
    };
  }, []); // Empty dependency array: run only on mount/unmount
};

export default usePreventTranslation;
