/** @type {import('tailwindcss').Config} */
// Tailwind config of the "Mon business plan" light entry only (src/modules/business-plan/plan.css, @config).
// Charter of the NEC 2026 workbook (Cahier du participant v4); Lato bundled with the page.
export default {
  content: ['./plan/index.html', './src/modules/business-plan/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        violet: '#60005A',
        violetClair: '#F2E5F0',
        turquoise: '#0F98A3',
        turquoiseTexte: '#0B7680',
        turquoiseClair: '#E2F3F4',
        encre: '#333333',
        doux: '#666666',
        alerte: '#D90015',
        filet: '#E3D6E1'
      },
      fontFamily: {
        lato: ['Lato', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
};
