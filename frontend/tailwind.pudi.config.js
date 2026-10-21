/** @type {import('tailwindcss').Config} */
// Tailwind config of the PUDi light entry only (src/modules/pudi/pudi.css, @config).
// PIC presentation charter: colours and fonts below; sector colours come from the data file.
export default {
  content: ['./pudi/index.html', './src/modules/pudi/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        creme: '#FBFAF7',
        sable: '#F5EEDB',
        marine: '#0B2A8C',
        profond: '#08206E',
        texte: '#2F3547',
        gris: '#5D6475',
        filet: '#E4E0D8',
        vide: '#EFEBE4'
      },
      fontFamily: {
        titre: ['"Archivo Black"', 'Arial Black', 'Arial', 'sans-serif'],
        corps: ['Lato', 'Arial', 'Helvetica', 'sans-serif']
      }
    }
  },
  plugins: []
};
