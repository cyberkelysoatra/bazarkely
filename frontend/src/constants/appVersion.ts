export const APP_VERSION = '2.4.4';
export const APP_BUILD_DATE = '2026-01-07';
export const VERSION_HISTORY = [
  {
    version: '2.4.4',
    date: '2026-01-07',
    changes: [
      'Phase B1: Add requiredMonthlyContribution field to Goal schema (TypeScript + IndexedDB v12 + Supabase)',
      'Non-breaking: Field is optional for backward compatibility'
    ]
  },
  {
    version: '2.4.3',
    date: '2026-01-02',
    changes: [
      'Fix: Projection graphique Goals recalculée selon contribution mensuelle',
      'Fix: Jours restants affiche durée réaliste (360j au lieu de 1825j)',
      'Fix: Suggestion mensualité conservative (15% au lieu de 30%)',
      'Amélioration: calculateRealisticContribution avec min 5% / max 25%'
    ]
  },
  { version: '2.4.2', date: '2025-01-02', changes: 'Flux épargne intelligent, bouton suggérer objectifs, fix PGRST116/PGRST204, conversion camelCase→snake_case' },
  { version: '2.4.1', date: '2025-01-02', changes: 'Graphique évolution épargne, système célébrations jalons' },
  { version: '2.4.0', date: '2025-01-01', changes: 'Widget Dashboard objectifs, suggestions automatiques' }
];
