/**
 * GPS Permission Component for BazarKELY
 * Handles GPS permission request and location validation
 * Compares GPS coordinates with declared region for coherence validation
 */

import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Shield,
  Globe
} from 'lucide-react';
import { 
  requestGPSPermission, 
  getCurrentPosition, 
  validateLocationCoherence 
} from '../../services/geolocationService';
import type { GPSLocation, GeolocationValidation } from '../../types/certification';
import Card from '../UI/Card';
import Button from '../UI/Button';

interface GPSPermissionComponentProps {
  declaredRegion: string;
  onValidationComplete: (isValid: boolean) => void;
}

const GPSPermissionComponent: React.FC<GPSPermissionComponentProps> = ({
  declaredRegion,
  onValidationComplete
}) => {
  const [permissionStatus, setPermissionStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>('idle');
  const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null);
  const [validation, setValidation] = useState<GeolocationValidation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setPermissionStatus('error');
      setErrorMessage('La géolocalisation n\'est pas supportée par votre navigateur');
    }
  }, []);

  const handleRequestPermission = async () => {
    setPermissionStatus('requesting');
    setErrorMessage('');
    
    try {
      const granted = await requestGPSPermission();
      
      if (granted) {
        setPermissionStatus('granted');
        await getCurrentLocation();
      } else {
        setPermissionStatus('denied');
        setErrorMessage('Permission de géolocalisation refusée. Vous pouvez continuer sans validation GPS.');
      }
    } catch (error) {
      setPermissionStatus('error');
      setErrorMessage('Erreur lors de la demande de permission GPS');
      console.error('GPS permission error:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsValidating(true);
      const location = await getCurrentPosition();
      setGpsLocation(location);
      
      // Validate location coherence
      if (declaredRegion) {
        const validationResult = validateLocationCoherence(
          declaredRegion,
          '', // district not used in validation
          location
        );
        setValidation(validationResult);
        onValidationComplete(validationResult.isCoherent);
      }
    } catch (error) {
      console.error('GPS location error:', error);
      setErrorMessage('Erreur lors de l\'obtention de votre position GPS');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRetry = () => {
    setGpsLocation(null);
    setValidation(null);
    setErrorMessage('');
    handleRequestPermission();
  };

  const formatCoordinates = (lat: number, lng: number): string => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const formatAccuracy = (accuracy: number): string => {
    if (accuracy < 10) return 'Très précise (< 10m)';
    if (accuracy < 50) return 'Précise (< 50m)';
    if (accuracy < 100) return 'Bonne (< 100m)';
    if (accuracy < 500) return 'Moyenne (< 500m)';
    return 'Faible (> 500m)';
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 80) return 'Très fiable';
    if (confidence >= 60) return 'Fiable';
    if (confidence >= 40) return 'Moyennement fiable';
    return 'Peu fiable';
  };

  return (
    <div className="space-y-6">
      {/* Permission Request Section */}
      {permissionStatus === 'idle' && (
        <Card className="p-6 text-center">
          <Navigation className="w-16 h-16 text-purple-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Validation de votre position
          </h3>
          <p className="text-gray-600 mb-6">
            Pour vous offrir des conseils personnalisés selon votre région, 
            nous aimerions valider votre position GPS. Cette information reste 
            privée et n'est utilisée que pour améliorer votre expérience.
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-1" />
              Données sécurisées
            </div>
            <div className="flex items-center">
              <Globe className="w-4 h-4 mr-1" />
              Conseils localisés
            </div>
          </div>
          <Button onClick={handleRequestPermission} className="w-full">
            Autoriser la géolocalisation
          </Button>
        </Card>
      )}

      {/* Requesting Permission */}
      {permissionStatus === 'requesting' && (
        <Card className="p-6 text-center">
          <Loader2 className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Demande de permission en cours...
          </h3>
          <p className="text-gray-600">
            Veuillez autoriser la géolocalisation dans votre navigateur.
          </p>
        </Card>
      )}

      {/* Permission Denied */}
      {permissionStatus === 'denied' && (
        <Card className="p-6 border-yellow-200 bg-yellow-50">
          <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            Permission refusée
          </h3>
          <p className="text-gray-600 text-center mb-4">
            Vous pouvez continuer sans validation GPS. Vos conseils seront 
            basés sur la région que vous avez déclarée.
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="outline" onClick={handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
            <Button onClick={() => onValidationComplete(false)}>
              Continuer sans GPS
            </Button>
          </div>
        </Card>
      )}

      {/* Error State */}
      {permissionStatus === 'error' && (
        <Card className="p-6 border-red-200 bg-red-50">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            Erreur de géolocalisation
          </h3>
          <p className="text-gray-600 text-center mb-4">
            {errorMessage || 'Une erreur est survenue lors de l\'accès à votre position.'}
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="outline" onClick={handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
            <Button onClick={() => onValidationComplete(false)}>
              Continuer sans GPS
            </Button>
          </div>
        </Card>
      )}

      {/* GPS Location Display */}
      {gpsLocation && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 text-purple-600 mr-2" />
            Votre position GPS
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coordonnées
              </label>
              <p className="text-sm text-gray-600 font-mono">
                {formatCoordinates(gpsLocation.latitude, gpsLocation.longitude)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Précision
              </label>
              <p className="text-sm text-gray-600">
                {formatAccuracy(gpsLocation.accuracy)}
              </p>
            </div>
            {gpsLocation.altitude && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Altitude
                </label>
                <p className="text-sm text-gray-600">
                  {gpsLocation.altitude.toFixed(0)} m
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timestamp
              </label>
              <p className="text-sm text-gray-600">
                {new Date(gpsLocation.timestamp).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>

          {isValidating && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin mr-2" />
              <span className="text-gray-600">Validation en cours...</span>
            </div>
          )}
        </Card>
      )}

      {/* Validation Results */}
      {validation && (
        <Card className={`p-6 ${
          validation.isCoherent 
            ? 'border-green-200 bg-green-50' 
            : 'border-yellow-200 bg-yellow-50'
        }`}>
          <div className="flex items-start">
            {validation.isCoherent ? (
              <CheckCircle className="w-6 h-6 text-green-600 mr-3 mt-1 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-yellow-600 mr-3 mt-1 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className={`text-lg font-semibold mb-2 ${
                validation.isCoherent ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {validation.isCoherent ? 'Position validée' : 'Position à vérifier'}
              </h3>
              
              <div className="space-y-2">
                <p className={`text-sm ${
                  validation.isCoherent ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {validation.isCoherent 
                    ? 'Votre position GPS correspond à la région déclarée.'
                    : 'Votre position GPS ne correspond pas exactement à la région déclarée.'
                  }
                </p>
                
                <div className="flex items-center space-x-4 text-sm">
                  <div>
                    <span className="font-medium">Confiance :</span>
                    <span className={`ml-1 ${getConfidenceColor(validation.confidence)}`}>
                      {validation.confidence}% ({getConfidenceLabel(validation.confidence)})
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Région déclarée :</span>
                    <span className="ml-1">{declaredRegion}</span>
                  </div>
                </div>

                {validation.suggestedRegion && validation.suggestedRegion !== declaredRegion && (
                  <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Suggestion :</span> 
                      Votre position GPS suggère plutôt la région <strong>{validation.suggestedRegion}</strong>.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  className="flex items-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Revalider
                </Button>
                <Button
                  onClick={() => onValidationComplete(validation.isCoherent)}
                  className={validation.isCoherent ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {validation.isCoherent ? 'Continuer' : 'Continuer quand même'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Privacy Notice */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Respect de votre vie privée</p>
            <p>
              Vos coordonnées GPS ne sont jamais stockées ni transmises à des tiers. 
              Elles sont utilisées uniquement pour valider votre région déclarée 
              et vous offrir des conseils personnalisés.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GPSPermissionComponent;
