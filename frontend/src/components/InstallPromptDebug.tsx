import React, { useState, useEffect } from 'react';
import { Bug, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { getDebugInfo } from '../utils/browserDetection';

/**
 * Debug component for testing InstallPrompt on different browsers
 * This component shows browser detection information and allows testing
 */
const InstallPromptDebug: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    setDebugInfo(getDebugInfo());
  }, []);

  const refreshDebugInfo = () => {
    setDebugInfo(getDebugInfo());
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-40"
        title="Debug Install Prompt"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Install Prompt Debug Info
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={refreshDebugInfo}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <EyeOff className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {debugInfo && (
            <div className="space-y-6">
              {/* Browser Detection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Browser Detection</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Browser Info</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>Browser:</strong> {debugInfo.browserName}</div>
                      <div><strong>Device:</strong> {debugInfo.deviceType}</div>
                      <div><strong>Mobile:</strong> {debugInfo.isMobile ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">PWA Support</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>PWA Install:</strong> {debugInfo.supportsPWAInstall ? 'Yes' : 'No'}</div>
                      <div><strong>PWA Features:</strong> {debugInfo.supportsPWAFeatures ? 'Yes' : 'No'}</div>
                      <div><strong>Before Install:</strong> {debugInfo.supportsBeforeInstallPrompt ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Installation Method */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Installation Method</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-lg font-medium text-blue-900 mb-2">
                    {debugInfo.installationMethod.toUpperCase()}
                  </div>
                  <div className="text-sm text-blue-800">
                    {debugInfo.installationMethod === 'native' && 'Uses native beforeinstallprompt API'}
                    {debugInfo.installationMethod === 'safari' && 'Shows custom Safari instructions'}
                    {debugInfo.installationMethod === 'firefox' && 'Shows Firefox fallback message'}
                    {debugInfo.installationMethod === 'unsupported' && 'No installation support'}
                  </div>
                </div>
              </div>

              {/* Installation Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Installation Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Current State</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>Standalone:</strong> {debugInfo.isStandalone ? 'Yes' : 'No'}</div>
                      <div><strong>Should Show:</strong> {debugInfo.shouldShowPrompt ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Browser Specific</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>iOS:</strong> {debugInfo.isIOS ? 'Yes' : 'No'}</div>
                      <div><strong>Safari:</strong> {debugInfo.isSafari ? 'Yes' : 'No'}</div>
                      <div><strong>Chrome:</strong> {debugInfo.isChrome ? 'Yes' : 'No'}</div>
                      <div><strong>Edge:</strong> {debugInfo.isEdge ? 'Yes' : 'No'}</div>
                      <div><strong>Firefox:</strong> {debugInfo.isFirefox ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Agent */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">User Agent</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <code className="text-sm text-gray-800 break-all">
                    {debugInfo.userAgent}
                  </code>
                </div>
              </div>

              {/* Testing Instructions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Testing Instructions</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="space-y-2 text-sm text-yellow-800">
                    <div><strong>Chrome/Edge:</strong> Should show native install button</div>
                    <div><strong>Safari Mobile:</strong> Should show "Add to Home Screen" instructions</div>
                    <div><strong>Safari Desktop:</strong> Should show Safari menu instructions</div>
                    <div><strong>Firefox:</strong> Should show limited support message</div>
                    <div><strong>Already Installed:</strong> Should not show prompt</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPromptDebug;
