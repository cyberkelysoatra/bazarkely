/**
 * Certificate Display Component for BazarKELY
 * Shows all earned certificates with preview and download functionality
 * Integrates with CertificateTemplate and certificateService
 */

import React, { useState } from 'react';
import { Download, Calendar, Award, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCertificationStore } from '../../store/certificationStore';
import CertificateTemplate from './CertificateTemplate';
import certificateService from '../../services/certificateService';
import type { Certification } from '../../types/certification';

/**
 * Local state interface for component
 */
interface CertificateDisplayState {
  downloadingCertificates: Set<string>; // Track which certificates are being downloaded
}

/**
 * Certificate Display Component
 * Renders list of earned certificates with preview and download capabilities
 */
const CertificateDisplay: React.FC = () => {
  // Access certification store
  const { certifications, detailedProfile } = useCertificationStore();
  
  // Local state for download tracking
  const [state, setState] = useState<CertificateDisplayState>({
    downloadingCertificates: new Set()
  });

  /**
   * Handles certificate download with loading state and error handling
   * @param certification - The certification to download
   */
  const handleDownloadCertificate = async (certification: Certification): Promise<void> => {
    // Prevent multiple downloads of the same certificate
    if (state.downloadingCertificates.has(certification.id)) {
      return;
    }

    try {
      // Add to downloading set
      setState(prev => ({
        ...prev,
        downloadingCertificates: new Set([...prev.downloadingCertificates, certification.id])
      }));

      // Generate and download PDF
      await certificateService.generateAndDownloadCertificate(certification, detailedProfile);
      
      // Success notification
      toast.success(`Certificat ${certification.levelName} téléchargé avec succès !`, {
        duration: 4000,
        icon: '✅'
      });

    } catch (error) {
      console.error('❌ Erreur lors du téléchargement du certificat:', error);
      
      // Error notification
      toast.error('Erreur lors de la génération du certificat. Veuillez réessayer.', {
        duration: 5000,
        icon: '❌'
      });
    } finally {
      // Remove from downloading set
      setState(prev => {
        const newSet = new Set(prev.downloadingCertificates);
        newSet.delete(certification.id);
        return {
          ...prev,
          downloadingCertificates: newSet
        };
      });
    }
  };

  /**
   * Formats date in French locale
   * @param date - The date to format
   * @returns Formatted date string
   */
  const formatDateFrench = (date: Date): string => {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  /**
   * Sorts certifications by earnedAt date (newest first)
   * @param certs - Array of certifications to sort
   * @returns Sorted array of certifications
   */
  const sortCertificationsByDate = (certs: Certification[]): Certification[] => {
    return [...certs].sort((a, b) => {
      const dateA = new Date(a.earnedAt).getTime();
      const dateB = new Date(b.earnedAt).getTime();
      return dateB - dateA; // Newest first
    });
  };

  // Sort certifications by date
  const sortedCertifications = sortCertificationsByDate(certifications);

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Section Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Award className="w-8 h-8 text-blue-600 mr-3" />
          Mes Certificats
        </h2>
        <p className="text-gray-600">
          Consultez et téléchargez vos certificats de réussite
        </p>
      </div>

      {/* Certificates List */}
      {sortedCertifications.length === 0 ? (
        // No certificates message
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Aucun certificat obtenu
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Complétez des niveaux de formation pour obtenir vos premiers certificats.
          </p>
        </div>
      ) : (
        // Certificates grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCertifications.map((certification) => {
            const isDownloading = state.downloadingCertificates.has(certification.id);
            const earnedDate = new Date(certification.earnedAt);
            
            return (
              <div
                key={certification.id}
                className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 hover:scale-105 group"
              >
                {/* Certificate Preview */}
                <div className="p-4 bg-gray-50 rounded-t-xl">
                  <div className="relative overflow-hidden rounded-lg">
                    {/* Scaled down certificate preview */}
                    <div 
                      className="transform scale-30 origin-top-left"
                      style={{
                        width: '297px',
                        height: '210px',
                        transform: 'scale(0.3)',
                        transformOrigin: 'top left'
                      }}
                    >
                      <CertificateTemplate
                        certification={certification}
                        userProfile={detailedProfile}
                        className="w-full h-full"
                      />
                    </div>
                    
                    {/* Overlay for better visibility */}
                    <div className="absolute inset-0 bg-black bg-opacity-10 group-hover:bg-opacity-20 transition-all duration-300"></div>
                  </div>
                </div>

                {/* Certificate Info */}
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {certification.levelName}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Obtenu le {formatDateFrench(earnedDate)}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Score: {certification.score}% ({certification.correctAnswers}/{certification.totalQuestions})
                    </div>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={() => handleDownloadCertificate(certification)}
                    disabled={isDownloading}
                    className={`
                      w-full flex items-center justify-center px-4 py-3 rounded-lg font-semibold transition-all duration-200
                      ${isDownloading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-95'
                      }
                    `}
                  >
                    {isDownloading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                        Génération...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Additional Info */}
      {sortedCertifications.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">À propos de vos certificats</p>
              <p>
                Vos certificats sont générés localement et ne sont pas stockés sur nos serveurs. 
                Chaque certificat contient un identifiant unique pour la vérification.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateDisplay;
