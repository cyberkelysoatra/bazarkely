import { useLoadingStore } from '../stores/appStore';

const LoadingSpinner = () => {
  const { isLoading, loadingMessage } = useLoadingStore();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
        
        {loadingMessage && (
          <p className="text-gray-700">{loadingMessage}</p>
        )}
        
        {!loadingMessage && (
          <p className="text-gray-700">Chargement...</p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
