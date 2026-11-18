// Stands for the optional modules of jsPDF (html2canvas, canvg, dompurify) in the /releve/ build only:
// the plan PDF is drawn with lines and text, never from HTML or SVG, so they would only weigh on the
// precache (alias in vite.releve.config.ts).
export default {}
