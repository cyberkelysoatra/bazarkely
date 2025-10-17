/**
 * Certificate Generation Service for BazarKELY
 * Generates traditional diploma-style PDF certificates for completed certification levels
 */

import jsPDF from 'jspdf';
import type { Certification } from '../types/certification';
import type { UserDetailedProfile } from '../types/certification';

/**
 * Interface for certificate generation parameters
 */
export interface CertificateGenerationParams {
  certification: Certification;
  userProfile: UserDetailedProfile;
}

/**
 * Interface for certificate verification data
 */
export interface CertificateVerificationData {
  certificateId: string;
  userId: string;
  levelId: string;
  levelName: string;
  earnedAt: string;
  verificationUrl: string;
}

/**
 * Certificate Generation Service
 * Handles creation of PDF certificates with traditional diploma design
 */
class CertificateService {
  private readonly PAGE_WIDTH = 297; // A4 landscape width in mm
  private readonly PAGE_HEIGHT = 210; // A4 landscape height in mm
  private readonly MARGIN = 10; // 10mm margin from edges
  private readonly BORDER_WIDTH = 2; // Border thickness in mm

  /**
   * Generates a PDF certificate for the given certification and user profile
   * @param certification - The certification object containing level and completion data
   * @param userProfile - The user's detailed profile containing name information
   * @returns Promise that resolves when PDF generation is complete
   */
  async generateCertificatePDF(
    certification: Certification,
    userProfile: UserDetailedProfile
  ): Promise<jsPDF> {
    return new Promise((resolve, reject) => {
      try {
        // Create new PDF document in landscape A4 format
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        // Set up the certificate
        this.setupCertificate(doc);
        this.drawDecorativeBorder(doc);
        this.addLogoAndTitle(doc);
        this.addRecipientText(doc, userProfile);
        this.addAchievementText(doc, certification);
        this.addCompletionDate(doc, certification.earnedAt);
        this.addCertificateId(doc, certification);
        this.addQRCode(doc, certification);
        this.addIssuerText(doc);

        resolve(doc);
      } catch (error) {
        reject(new Error(`Failed to generate certificate: ${error}`));
      }
    });
  }

  /**
   * Downloads the generated certificate PDF
   * @param doc - The jsPDF document to download
   * @param certification - The certification object for filename generation
   */
  downloadCertificate(doc: jsPDF, certification: Certification): void {
    const filename = this.generateFilename(certification);
    doc.save(filename);
  }

  /**
   * Generates and downloads a certificate in one operation
   * @param certification - The certification object
   * @param userProfile - The user's detailed profile
   */
  async generateAndDownloadCertificate(
    certification: Certification,
    userProfile: UserDetailedProfile
  ): Promise<void> {
    try {
      const doc = await this.generateCertificatePDF(certification, userProfile);
      this.downloadCertificate(doc, certification);
    } catch (error) {
      throw new Error(`Failed to generate and download certificate: ${error}`);
    }
  }

  /**
   * Sets up the certificate document with basic properties
   * @param doc - The jsPDF document instance
   */
  private setupCertificate(doc: jsPDF): void {
    // Set document properties
    doc.setProperties({
      title: 'Certificat BazarKELY de Réussite',
      subject: 'Certificat de Réussite',
      author: 'BazarKELY',
      creator: 'BazarKELY Certification System',
      keywords: 'certificat, formation, finance, madagascar'
    });

    // Set default font
    doc.setFont('helvetica', 'normal');
  }

  /**
   * Draws a decorative border around the certificate
   * @param doc - The jsPDF document instance
   */
  private drawDecorativeBorder(doc: jsPDF): void {
    const { MARGIN, BORDER_WIDTH, PAGE_WIDTH, PAGE_HEIGHT } = this;
    
    // Outer border
    doc.setLineWidth(BORDER_WIDTH);
    doc.setDrawColor(0, 0, 0);
    doc.rect(MARGIN, MARGIN, PAGE_WIDTH - 2 * MARGIN, PAGE_HEIGHT - 2 * MARGIN);

    // Inner decorative border
    doc.setLineWidth(1);
    doc.setDrawColor(100, 100, 100);
    doc.rect(MARGIN + 5, MARGIN + 5, PAGE_WIDTH - 2 * MARGIN - 10, PAGE_HEIGHT - 2 * MARGIN - 10);

    // Corner decorations
    const cornerSize = 15;
    const corners = [
      [MARGIN + 5, MARGIN + 5],
      [PAGE_WIDTH - MARGIN - 5 - cornerSize, MARGIN + 5],
      [MARGIN + 5, PAGE_HEIGHT - MARGIN - 5 - cornerSize],
      [PAGE_WIDTH - MARGIN - 5 - cornerSize, PAGE_HEIGHT - MARGIN - 5 - cornerSize]
    ];

    corners.forEach(([x, y]) => {
      doc.setLineWidth(2);
      doc.setDrawColor(150, 150, 150);
      doc.rect(x, y, cornerSize, cornerSize);
    });
  }

  /**
   * Adds the BazarKELY logo placeholder and certificate title
   * @param doc - The jsPDF document instance
   */
  private addLogoAndTitle(doc: jsPDF): void {
    const centerX = this.PAGE_WIDTH / 2;
    const logoY = this.MARGIN + 20;

    // Logo placeholder (centered)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 100, 200);
    doc.text('BAZARKELY', centerX, logoY, { align: 'center' });

    // Certificate title
    const titleY = logoY + 15;
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Certificat de Réussite', centerX, titleY, { align: 'center' });
  }

  /**
   * Adds the recipient text with user's full name
   * @param doc - The jsPDF document instance
   * @param userProfile - The user's detailed profile
   */
  private addRecipientText(doc: jsPDF, userProfile: UserDetailedProfile): void {
    const centerX = this.PAGE_WIDTH / 2;
    const recipientY = this.MARGIN + 60;

    // "Ceci certifie que" text
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Ceci certifie que', centerX, recipientY, { align: 'center' });

    // User's full name
    const fullName = this.getFullName(userProfile);
    const nameY = recipientY + 15;
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(fullName, centerX, nameY, { align: 'center' });
  }

  /**
   * Adds the achievement text describing level completion
   * @param doc - The jsPDF document instance
   * @param certification - The certification object
   */
  private addAchievementText(doc: jsPDF, certification: Certification): void {
    const centerX = this.PAGE_WIDTH / 2;
    const achievementY = this.MARGIN + 90;

    // Achievement description
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    const achievementText = `a réussi avec succès le niveau ${certification.levelName} ` +
                          `de la formation BazarKELY avec un score de ${certification.score}% ` +
                          `(${certification.correctAnswers}/${certification.totalQuestions} questions correctes).`;
    
    // Split long text into multiple lines if needed
    const lines = doc.splitTextToSize(achievementText, this.PAGE_WIDTH - 2 * this.MARGIN - 20);
    doc.text(lines, centerX, achievementY, { align: 'center' });
  }

  /**
   * Adds the completion date in French format
   * @param doc - The jsPDF document instance
   * @param earnedAt - The completion date
   */
  private addCompletionDate(doc: jsPDF, earnedAt: Date): void {
    const centerX = this.PAGE_WIDTH / 2;
    const dateY = this.MARGIN + 120;

    // Date label
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Date de réussite:', centerX, dateY, { align: 'center' });

    // Formatted date
    const formattedDate = this.formatDateFrench(earnedAt);
    const formattedDateY = dateY + 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(formattedDate, centerX, formattedDateY, { align: 'center' });
  }

  /**
   * Adds the unique certificate ID
   * @param doc - The jsPDF document instance
   * @param certification - The certification object
   */
  private addCertificateId(doc: jsPDF, certification: Certification): void {
    const centerX = this.PAGE_WIDTH / 2;
    const idY = this.MARGIN + 150;

    // Certificate ID label
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Identifiant du certificat:', centerX, idY, { align: 'center' });

    // Certificate ID
    const certificateId = this.generateCertificateId(certification);
    const idValueY = idY + 8;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(certificateId, centerX, idValueY, { align: 'center' });
  }

  /**
   * Adds QR code for certificate verification
   * @param doc - The jsPDF document instance
   * @param certification - The certification object
   */
  private addQRCode(doc: jsPDF, certification: Certification): void {
    const qrX = this.PAGE_WIDTH - this.MARGIN - 30;
    const qrY = this.PAGE_HEIGHT - this.MARGIN - 30;
    const qrSize = 25;

    // QR code placeholder (since jsPDF doesn't have built-in QR code)
    doc.setLineWidth(1);
    doc.setDrawColor(0, 0, 0);
    doc.rect(qrX, qrY, qrSize, qrSize);

    // QR code text
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('QR Code', qrX + qrSize/2, qrY + qrSize/2, { align: 'center' });

    // Verification text
    const verificationY = qrY + qrSize + 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Vérification', qrX + qrSize/2, verificationY, { align: 'center' });
  }

  /**
   * Adds the issuer text at the bottom
   * @param doc - The jsPDF document instance
   */
  private addIssuerText(doc: jsPDF): void {
    const centerX = this.PAGE_WIDTH / 2;
    const issuerY = this.PAGE_HEIGHT - this.MARGIN - 15;

    // Issuer text
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Délivré par BazarKELY', centerX, issuerY, { align: 'center' });

    // Organization info
    const orgY = issuerY + 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Système de Formation Financière pour Madagascar', centerX, orgY, { align: 'center' });
  }

  /**
   * Generates a unique certificate ID
   * @param certification - The certification object
   * @returns Unique certificate ID string
   */
  private generateCertificateId(certification: Certification): string {
    const timestamp = Date.now().toString(36);
    const levelId = certification.levelId.substring(0, 4).toUpperCase();
    return `BZ-${levelId}-${timestamp}`;
  }

  /**
   * Generates the filename for the certificate PDF
   * @param certification - The certification object
   * @returns Formatted filename string
   */
  private generateFilename(certification: Certification): string {
    const date = new Date(certification.earnedAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const levelName = certification.levelName.replace(/\s+/g, '-');
    
    return `Certificat-BazarKELY-${levelName}-${year}-${month}-${day}.pdf`;
  }

  /**
   * Gets the full name from user profile
   * @param userProfile - The user's detailed profile
   * @returns Full name string
   */
  private getFullName(userProfile: UserDetailedProfile): string {
    const firstName = userProfile.firstName || '';
    const lastName = userProfile.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Utilisateur BazarKELY';
  }

  /**
   * Gets the level name from certification
   * @param certification - The certification object
   * @returns Level name string
   */
  private getLevelName(certification: Certification): string {
    return certification.levelName || 'Niveau Inconnu';
  }

  /**
   * Formats date in French locale
   * @param date - The date to format
   * @returns Formatted date string in French
   */
  private formatDateFrench(date: Date): string {
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  }
}

// Export singleton instance
export const certificateService = new CertificateService();
export default certificateService;
