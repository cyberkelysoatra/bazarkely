/**
 * Certificate Template Component for BazarKELY
 * Displays visual preview of certificate matching PDF design
 * Used in certificate display section of CertificationPage
 */

import React from 'react';
import type { Certification } from '../../types/certification';
import type { UserDetailedProfile } from '../../types/certification';

/**
 * Props interface for CertificateTemplate component
 */
export interface CertificateTemplateProps {
  /** The certification object containing level and completion data */
  certification: Certification;
  /** The user's detailed profile containing name information */
  userProfile: UserDetailedProfile;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Certificate Template Component
 * Renders a visual preview of the certificate with traditional diploma styling
 * Matches the PDF design for consistency between preview and download
 */
const CertificateTemplate: React.FC<CertificateTemplateProps> = ({
  certification,
  userProfile,
  className = ''
}) => {
  // Generate certificate ID (same logic as PDF service)
  const generateCertificateId = (cert: Certification): string => {
    const timestamp = Date.now().toString(36);
    const levelId = cert.levelId.substring(0, 4).toUpperCase();
    return `BZ-${levelId}-${timestamp}`;
  };

  // Format date in French locale
  const formatDateFrench = (date: Date): string => {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // Get full name from user profile
  const getFullName = (profile: UserDetailedProfile): string => {
    const firstName = profile.firstName || '';
    const lastName = profile.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Utilisateur BazarKELY';
  };

  // Generate achievement text
  const getAchievementText = (cert: Certification): string => {
    return `a réussi avec succès le niveau ${cert.levelName} ` +
           `de la formation BazarKELY avec un score de ${cert.score}% ` +
           `(${cert.correctAnswers}/${cert.totalQuestions} questions correctes).`;
  };

  const certificateId = generateCertificateId(certification);
  const fullName = getFullName(userProfile);
  const formattedDate = formatDateFrench(certification.earnedAt);
  const achievementText = getAchievementText(certification);

  return (
    <div 
      className={`
        relative w-full max-w-4xl mx-auto bg-white shadow-2xl
        border-4 border-gray-800 border-double
        font-serif print:shadow-none print:border-2
        ${className}
      `}
      style={{
        aspectRatio: '297/210', // A4 landscape ratio
        minHeight: '400px'
      }}
    >
      {/* Decorative Border */}
      <div className="absolute inset-4 border-2 border-gray-400 border-dashed"></div>
      
      {/* Corner Decorations */}
      <div className="absolute top-4 left-4 w-8 h-8 border-2 border-gray-600"></div>
      <div className="absolute top-4 right-4 w-8 h-8 border-2 border-gray-600"></div>
      <div className="absolute bottom-4 left-4 w-8 h-8 border-2 border-gray-600"></div>
      <div className="absolute bottom-4 right-4 w-8 h-8 border-2 border-gray-600"></div>

      {/* Main Content Container */}
      <div className="relative z-10 h-full flex flex-col justify-between p-8">
        
        {/* Header Section */}
        <div className="text-center">
          {/* BazarKELY Logo */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-blue-600 tracking-wider">
              BAZARKELY
            </h1>
          </div>

          {/* Certificate Title */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 tracking-wide">
              Certificat de Réussite
            </h2>
          </div>
        </div>

        {/* Main Content Section */}
        <div className="flex-1 flex flex-col justify-center text-center">
          {/* Recipient Text */}
          <div className="mb-8">
            <p className="text-base text-gray-700 mb-4">
              Ceci certifie que
            </p>
            <h3 className="text-2xl font-bold text-gray-900 mb-8">
              {fullName}
            </h3>
          </div>

          {/* Achievement Text */}
          <div className="mb-8">
            <p className="text-base text-gray-700 leading-relaxed max-w-3xl mx-auto">
              {achievementText}
            </p>
          </div>

          {/* Completion Date */}
          <div className="mb-8">
            <p className="text-base text-gray-700 mb-2">
              Date de réussite:
            </p>
            <p className="text-lg font-bold text-gray-900">
              {formattedDate}
            </p>
          </div>
        </div>

        {/* Footer Section */}
        <div className="flex justify-between items-end">
          {/* Certificate ID (Bottom Left) */}
          <div className="text-left">
            <p className="text-xs text-gray-500 mb-1">
              Identifiant du certificat:
            </p>
            <p className="text-sm font-mono font-bold text-gray-700">
              {certificateId}
            </p>
          </div>

          {/* QR Code Placeholder (Bottom Right) */}
          <div className="text-center">
            <div className="w-16 h-16 border-2 border-gray-400 flex items-center justify-center mb-2">
              <div className="text-xs text-gray-500 text-center">
                QR<br />Code
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Vérification
            </p>
          </div>
        </div>

        {/* Issuer Text (Bottom Center) */}
        <div className="text-center mt-4">
          <p className="text-sm font-semibold text-gray-900">
            Délivré par BazarKELY
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Système de Formation Financière pour Madagascar
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-2 {
            border-width: 2px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CertificateTemplate;
