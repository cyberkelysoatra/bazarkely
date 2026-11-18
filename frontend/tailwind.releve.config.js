/** @type {import('tailwindcss').Config} */
// Tailwind config of the "Relevé terrain" light entry only (src/modules/releve-terrain/releve.css, @config).
// MODELE B "Instrument" tokens (DESIGN-RELEVE-MODELE-B.md); Barlow and Barlow Condensed bundled with the page.
export default {
  content: ['./releve/index.html', './src/modules/releve-terrain/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fond: '#F4F4F1',
        surface: '#FFFFFF',
        encre: '#000000',
        encre2: '#3F3F3A',
        trait: '#BDBDB4',
        jaune: '#FFD100',
        cible: '#FACC15',
        champActif: '#FFF9DB',
        alerte: '#B91C1C',
        danger: '#991B1B',
        vertFond: '#DCFCE7',
        vertTexte: '#14532D',
        orangeFond: '#FFEDD5',
        orangeTexte: '#7C2D12',
        rougeFond: '#FEE2E2',
        rougeTexte: '#7F1D1D',
        bleuFond: '#DBEAFE',
        bleuTexte: '#1E3A8A',
        grisFond: '#E9EAE6',
        grisTexte: '#2F302C'
      },
      fontFamily: {
        barlow: ['Barlow', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        etroite: ['"Barlow Condensed"', 'Barlow', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        rt: '4px',
        pastille: '3px',
        lettre: '6px'
      }
    }
  },
  plugins: []
};
