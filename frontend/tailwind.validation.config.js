/** @type {import('tailwindcss').Config} */
// Tailwind config of the Validation client light entry only (src/modules/validation/validation.css, @config).
// Charter of the validated mockup (v3.3, 02/11/2026); system fonts only.
export default {
  content: ['./validation/index.html', './src/modules/validation/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ciel: '#0369a1',
        clair: '#e0f2fe',
        fond: '#f0f9ff',
        filet: '#d6e4ef',
        nuit: '#0c4a6e',
        danger: '#b91c1c',
        discussion: '#0f766e',
        encre: '#0f172a',
        doux: '#475569'
      },
      fontFamily: {
        sys: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
};
