/**
 * Profile Completion Page for BazarKELY
 * Multi-step wizard for collecting detailed user profile information
 * Includes personal details, family situation, profession, geolocation, and GPS validation
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Users, 
  Briefcase, 
  MapPin, 
  Navigation, 
  Award, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Calendar,
  Heart,
  GraduationCap,
  Home,
  Loader2,
  RefreshCw,
  Shield,
  Globe
} from 'lucide-react';
import { useCertificationStore } from '../store/certificationStore';
import { calculateProfileScore } from '../services/certificationService';
import { requestGPSPermission, getCurrentPosition, getCommuneFromCoordinates } from '../services/geolocationService';
import { MADAGASCAR_REGIONS } from '../types/certification';
import type { UserDetailedProfile, UserGeolocation } from '../types/certification';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Card from '../components/UI/Card';
import GeolocationSetupComponent from '../components/Certification/GeolocationSetupComponent';
import GPSPermissionComponent from '../components/Certification/GPSPermissionComponent';

const ProfileCompletionPage: React.FC = () => {
  const navigate = useNavigate();
  const { detailedProfile, geolocation, updateProfile, updateGeolocation } = useCertificationStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<UserDetailedProfile>(detailedProfile || {});
  const [geolocationData, setGeolocationData] = useState<UserGeolocation>(geolocation || {
    region: '',
    habitatType: 'urban'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [profileScore, setProfileScore] = useState(0);
  
  // GPS detection state
  const [gpsDetectionStatus, setGpsDetectionStatus] = useState<'idle' | 'detecting' | 'success' | 'error' | 'manual'>('idle');
  const [detectedLocation, setDetectedLocation] = useState<{
    region: string;
    district: string;
    commune: string;
    confidence: number;
    accuracy: number;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string>('');

  // Calculate profile score whenever form data changes
  useEffect(() => {
    const score = calculateProfileScore({
      ...formData,
      region: geolocationData.region,
      habitatType: geolocationData.habitatType
    });
    setProfileScore(score);
  }, [formData, geolocationData]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [formData, geolocationData]);

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const steps = [
    {
      id: 1,
      title: 'Informations Personnelles',
      icon: User,
      description: 'Vos données de base'
    },
    {
      id: 2,
      title: 'Situation Familiale',
      icon: Users,
      description: 'Votre famille et dépendants'
    },
    {
      id: 3,
      title: 'Profession',
      icon: Briefcase,
      description: 'Votre activité professionnelle'
    },
    {
      id: 4,
      title: 'Localisation',
      icon: MapPin,
      description: 'Votre région et habitat'
    },
    {
      id: 5,
      title: 'Validation GPS',
      icon: Navigation,
      description: 'Confirmation de votre position'
    }
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.firstName?.trim()) newErrors.firstName = 'Le prénom est requis';
        if (!formData.lastName?.trim()) newErrors.lastName = 'Le nom est requis';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'La date de naissance est requise';
        if (!formData.gender) newErrors.gender = 'Le genre est requis';
        break;
      
      case 2:
        if (!formData.maritalStatus) newErrors.maritalStatus = 'Le statut marital est requis';
        if (formData.maritalStatus === 'married') {
          if (!formData.spouse?.name?.trim()) newErrors.spouseName = 'Le nom du conjoint est requis';
          if (!formData.spouse?.age) newErrors.spouseAge = 'L\'âge du conjoint est requis';
        }
        if (formData.numberOfChildren && formData.numberOfChildren > 0) {
          if (!formData.children || formData.children.length === 0) {
            newErrors.children = 'Veuillez ajouter les informations des enfants';
          }
        }
        break;
      
      case 3:
        if (!formData.occupation?.trim()) newErrors.occupation = 'L\'occupation est requise';
        if (!formData.employmentStatus) newErrors.employmentStatus = 'Le statut d\'emploi est requis';
        break;
      
      case 4:
        if (!geolocationData.region) newErrors.region = 'La région est requise';
        if (!geolocationData.habitatType) newErrors.habitatType = 'Le type d\'habitat est requis';
        break;
      
      case 5:
        // GPS validation is handled in GPSPermissionComponent
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSave();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    updateProfile(formData);
    updateGeolocation(geolocationData);
    setHasUnsavedChanges(false);
    navigate('/dashboard');
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSpouseChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      spouse: {
        ...prev.spouse,
        [field]: value
      }
    }));
  };

  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [
        ...(prev.children || []),
        { name: '', age: 0, gender: 'male' }
      ]
    }));
  };

  const removeChild = (index: number) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children?.filter((_, i) => i !== index) || []
    }));
  };

  const updateChild = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children?.map((child, i) => 
        i === index ? { ...child, [field]: value } : child
      ) || []
    }));
  };

  const calculateAge = (dateOfBirth: string): number => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleGPSDetection = async () => {
    setGpsDetectionStatus('detecting');
    setGpsError('');
    
    try {
      // Request GPS permission
      const permissionGranted = await requestGPSPermission();
      
      if (!permissionGranted) {
        setGpsDetectionStatus('error');
        setGpsError('Permission de géolocalisation refusée');
        return;
      }

      // Get current position
      const gpsLocation = await getCurrentPosition();
      
      // Get location data from coordinates
      const locationData = await getCommuneFromCoordinates(
        gpsLocation.latitude, 
        gpsLocation.longitude
      );

      if (locationData.region) {
        setDetectedLocation(locationData);
        setGeolocationData(prev => ({
          ...prev,
          region: locationData.region,
          district: locationData.district,
          commune: locationData.commune
        }));
        setGpsDetectionStatus('success');
      } else {
        setGpsDetectionStatus('error');
        setGpsError('Impossible de déterminer votre localisation');
      }
    } catch (error) {
      console.error('GPS detection error:', error);
      setGpsDetectionStatus('error');
      setGpsError('Erreur lors de la détection GPS');
    }
  };

  const handleConfirmDetectedLocation = () => {
    if (detectedLocation) {
      setGeolocationData(prev => ({
        ...prev,
        region: detectedLocation.region,
        district: detectedLocation.district,
        commune: detectedLocation.commune
      }));
      setGpsDetectionStatus('idle');
    }
  };

  const handleSwitchToManual = () => {
    setGpsDetectionStatus('manual');
    setDetectedLocation(null);
  };

  const handleRetryGPS = () => {
    setGpsDetectionStatus('idle');
    setDetectedLocation(null);
    setGpsError('');
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <User className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Informations Personnelles</h2>
        <p className="text-gray-600">Renseignez vos données de base pour personnaliser votre expérience</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prénom *
          </label>
          <Input
            type="text"
            value={formData.firstName || ''}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="Votre prénom"
            className={errors.firstName ? 'border-red-500' : ''}
          />
          {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom *
          </label>
          <Input
            type="text"
            value={formData.lastName || ''}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Votre nom"
            className={errors.lastName ? 'border-red-500' : ''}
          />
          {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date de naissance *
          </label>
          <Input
            type="date"
            value={formData.dateOfBirth || ''}
            onChange={(e) => {
              handleInputChange('dateOfBirth', e.target.value);
              if (e.target.value) {
                handleInputChange('age', calculateAge(e.target.value));
              }
            }}
            className={errors.dateOfBirth ? 'border-red-500' : ''}
          />
          {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>}
          {formData.age && (
            <p className="text-sm text-gray-500 mt-1">Âge calculé : {formData.age} ans</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Genre *
          </label>
          <div className="space-y-2">
            {[
              { value: 'male', label: 'Homme' },
              { value: 'female', label: 'Femme' },
              { value: 'other', label: 'Autre' },
              { value: 'prefer_not_to_say', label: 'Préfère ne pas dire' }
            ].map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value={option.value}
                  checked={formData.gender === option.value}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="mr-3"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Users className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Situation Familiale</h2>
        <p className="text-gray-600">Informations sur votre famille et vos dépendants</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Statut marital *
          </label>
          <select
            value={formData.maritalStatus || ''}
            onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
              errors.maritalStatus ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Sélectionnez votre statut</option>
            <option value="single">Célibataire</option>
            <option value="married">Marié(e)</option>
            <option value="divorced">Divorcé(e)</option>
            <option value="widowed">Veuf/Veuve</option>
            <option value="other">Autre</option>
          </select>
          {errors.maritalStatus && <p className="text-red-500 text-sm mt-1">{errors.maritalStatus}</p>}
        </div>

        {formData.maritalStatus === 'married' && (
          <Card className="p-6 bg-purple-50 border-purple-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Heart className="w-5 h-5 text-purple-600 mr-2" />
              Informations sur le conjoint
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du conjoint *
                </label>
                <Input
                  type="text"
                  value={formData.spouse?.name || ''}
                  onChange={(e) => handleSpouseChange('name', e.target.value)}
                  placeholder="Nom du conjoint"
                  className={errors.spouseName ? 'border-red-500' : ''}
                />
                {errors.spouseName && <p className="text-red-500 text-sm mt-1">{errors.spouseName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Âge du conjoint *
                </label>
                <Input
                  type="number"
                  value={formData.spouse?.age || ''}
                  onChange={(e) => handleSpouseChange('age', parseInt(e.target.value) || 0)}
                  placeholder="Âge"
                  className={errors.spouseAge ? 'border-red-500' : ''}
                />
                {errors.spouseAge && <p className="text-red-500 text-sm mt-1">{errors.spouseAge}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profession du conjoint
                </label>
                <Input
                  type="text"
                  value={formData.spouse?.occupation || ''}
                  onChange={(e) => handleSpouseChange('occupation', e.target.value)}
                  placeholder="Profession (optionnel)"
                />
              </div>
            </div>
          </Card>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre d'enfants
          </label>
          <Input
            type="number"
            min="0"
            value={formData.numberOfChildren || 0}
            onChange={(e) => handleInputChange('numberOfChildren', parseInt(e.target.value) || 0)}
            placeholder="Nombre d'enfants"
          />
        </div>

        {formData.numberOfChildren && formData.numberOfChildren > 0 && (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <GraduationCap className="w-5 h-5 text-blue-600 mr-2" />
              Informations sur les enfants
            </h3>
            <div className="space-y-4">
              {(formData.children || []).map((child, index) => (
                <div key={index} className="p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-900">Enfant {index + 1}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeChild(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Supprimer
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom
                      </label>
                      <Input
                        type="text"
                        value={child.name || ''}
                        onChange={(e) => updateChild(index, 'name', e.target.value)}
                        placeholder="Nom de l'enfant"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Âge
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={child.age || ''}
                        onChange={(e) => updateChild(index, 'age', parseInt(e.target.value) || 0)}
                        placeholder="Âge"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Genre
                      </label>
                      <select
                        value={child.gender || 'male'}
                        onChange={(e) => updateChild(index, 'gender', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="male">Garçon</option>
                        <option value="female">Fille</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Niveau scolaire
                      </label>
                      <select
                        value={child.schoolLevel || ''}
                        onChange={(e) => updateChild(index, 'schoolLevel', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Sélectionnez</option>
                        <option value="preschool">Maternelle</option>
                        <option value="primary">Primaire</option>
                        <option value="secondary">Secondaire</option>
                        <option value="university">Université</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addChild}
                className="w-full"
              >
                + Ajouter un enfant
              </Button>
            </div>
            {errors.children && <p className="text-red-500 text-sm mt-2">{errors.children}</p>}
          </Card>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Briefcase className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profession</h2>
        <p className="text-gray-600">Votre activité professionnelle et situation d'emploi</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Occupation *
          </label>
          <Input
            type="text"
            value={formData.occupation || ''}
            onChange={(e) => handleInputChange('occupation', e.target.value)}
            placeholder="Votre profession ou métier"
            className={errors.occupation ? 'border-red-500' : ''}
          />
          {errors.occupation && <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employeur
          </label>
          <Input
            type="text"
            value={formData.employer || ''}
            onChange={(e) => handleInputChange('employer', e.target.value)}
            placeholder="Nom de votre employeur (optionnel)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Statut d'emploi *
          </label>
          <select
            value={formData.employmentStatus || ''}
            onChange={(e) => handleInputChange('employmentStatus', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
              errors.employmentStatus ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Sélectionnez votre statut</option>
            <option value="employed">Salarié</option>
            <option value="self-employed">Travailleur indépendant</option>
            <option value="unemployed">Sans emploi</option>
            <option value="student">Étudiant</option>
            <option value="retired">Retraité</option>
          </select>
          {errors.employmentStatus && <p className="text-red-500 text-sm mt-1">{errors.employmentStatus}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <MapPin className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Localisation</h2>
        <p className="text-gray-600">Détection automatique ou saisie manuelle de votre position</p>
      </div>

      {/* GPS Detection Button */}
      {gpsDetectionStatus === 'idle' && (
        <Card className="p-6 text-center">
          <Navigation className="w-16 h-16 text-purple-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Détection automatique de votre position
          </h3>
          <p className="text-gray-600 mb-6">
            Nous pouvons détecter automatiquement votre région, district et commune 
            grâce à votre position GPS pour une expérience plus rapide.
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
          <Button onClick={handleGPSDetection} className="w-full">
            Détecter ma position automatiquement
          </Button>
        </Card>
      )}

      {/* GPS Detection Loading */}
      {gpsDetectionStatus === 'detecting' && (
        <Card className="p-6 text-center">
          <Loader2 className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Détection en cours...
          </h3>
          <p className="text-gray-600">
            Veuillez autoriser la géolocalisation dans votre navigateur.
          </p>
        </Card>
      )}

      {/* GPS Detection Success */}
      {gpsDetectionStatus === 'success' && detectedLocation && (
        <div className="space-y-6">
          <GeolocationSetupComponent
            geolocation={geolocationData}
            onGeolocationChange={setGeolocationData}
            errors={errors}
            displayMode={true}
            detectedData={detectedLocation}
          />
          
          <div className="flex justify-center space-x-4">
            <Button
              variant="outline"
              onClick={handleSwitchToManual}
              className="flex items-center"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Corriger manuellement
            </Button>
            <Button
              onClick={handleConfirmDetectedLocation}
              className="flex items-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmer
            </Button>
          </div>
        </div>
      )}

      {/* GPS Detection Error */}
      {gpsDetectionStatus === 'error' && (
        <Card className="p-6 border-red-200 bg-red-50">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            Détection GPS échouée
          </h3>
          <p className="text-gray-600 text-center mb-4">
            {gpsError || 'Impossible de détecter votre position automatiquement.'}
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="outline" onClick={handleRetryGPS}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
            <Button onClick={handleSwitchToManual}>
              Saisir manuellement
            </Button>
          </div>
        </Card>
      )}

      {/* Manual Entry Mode */}
      {(gpsDetectionStatus === 'manual' || gpsDetectionStatus === 'error') && (
        <div className="space-y-6">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Saisie manuelle</p>
                <p>
                  Veuillez sélectionner votre région, district et commune manuellement. 
                  Vous pouvez également utiliser le bouton "Détecter automatiquement" ci-dessus.
                </p>
              </div>
            </div>
          </Card>

          <GeolocationSetupComponent
            geolocation={geolocationData}
            onGeolocationChange={setGeolocationData}
            errors={errors}
            displayMode={false}
          />
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Navigation className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Validation GPS</h2>
        <p className="text-gray-600">Confirmez votre position pour des conseils géolocalisés</p>
      </div>

      <GPSPermissionComponent
        declaredRegion={geolocationData.region}
        onValidationComplete={(isValid) => {
          if (isValid) {
            setErrors(prev => ({ ...prev, gps: '' }));
          }
        }}
      />
    </div>
  );

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-700">
          Étape {currentStep} sur {steps.length}
        </span>
        <span className="text-sm font-medium text-purple-600">
          {profileScore}/15 points
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / steps.length) * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex flex-col items-center ${
              step.id <= currentStep ? 'text-purple-600' : 'text-gray-400'
            }`}
          >
            <step.icon className="w-6 h-6 mb-1" />
            <span className="text-xs text-center">{step.title}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complétez votre profil
          </h1>
          <p className="text-gray-600">
            Plus votre profil est complet, plus vous gagnez de points bonus !
          </p>
        </div>

        <Card className="p-8">
          {renderProgressBar()}
          {renderCurrentStep()}

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <Award className="w-4 h-4 inline mr-1" />
                {profileScore} points gagnés
              </div>
              <Button
                type="button"
                onClick={handleNext}
                className="flex items-center"
              >
                {currentStep === 5 ? 'Terminer' : 'Suivant'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfileCompletionPage;
