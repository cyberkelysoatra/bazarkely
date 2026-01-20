/**
 * PDF Loader Service
 * Provides lazy loading for PDF generation libraries (jsPDF and html2canvas)
 * to reduce initial bundle size (~450KB saved)
 */

import type jsPDF from 'jspdf';
import type html2canvas from 'html2canvas';

/**
 * Loads jsPDF library dynamically
 * @returns Promise resolving to jsPDF default export
 */
export async function loadJsPDF(): Promise<typeof jsPDF> {
  const module = await import('jspdf');
  return module.default;
}

/**
 * Loads html2canvas library dynamically
 * @returns Promise resolving to html2canvas default export
 */
export async function loadHtml2Canvas(): Promise<typeof html2canvas> {
  const module = await import('html2canvas');
  return module.default;
}

/**
 * Loads both jsPDF and html2canvas libraries dynamically
 * Useful when both libraries are needed together
 * @returns Promise resolving to an object containing both libraries
 */
export async function loadPDFLibraries(): Promise<{
  jsPDF: typeof jsPDF;
  html2canvas: typeof html2canvas;
}> {
  const [jsPDFModule, html2canvasModule] = await Promise.all([
    import('jspdf'),
    import('html2canvas')
  ]);

  return {
    jsPDF: jsPDFModule.default,
    html2canvas: html2canvasModule.default
  };
}







