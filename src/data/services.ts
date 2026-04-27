// src/data/services.ts
export interface Service {
  slug: string;
  iconSvgPath: string;
  iconBg: string;
  fr: { title: string; subtitle: string };
  en: { title: string; subtitle: string };
}

export const services: Service[] = [
  {
    slug: 'bilan-ikigai',
    iconSvgPath: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 14.2a7.2 7.2 0 0 1-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 0 1-6 3.22z',
    iconBg: '#d1fae5',
    fr: { title: 'Bilan Ikigai', subtitle: "Trouve ta raison d'être profonde" },
    en: { title: 'Ikigai Assessment', subtitle: 'Find your deep reason for being' },
  },
  {
    slug: 'parcours-coaching',
    iconSvgPath: 'M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 3.21-1.81 6-4.72 7.72L13 18v5h5l-1.22-1.22C19.91 19.07 22 15.76 22 12c0-5.18-3.95-9.45-9-9.95zM11 2.05C5.95 2.55 2 6.82 2 12c0 3.76 2.09 7.07 5.22 8.78L6 22h5v-5l-2.28 1.72C6.81 17.01 5 14.21 5 12c0-4.08 3.05-7.44 7-7.93V2.05z',
    iconBg: '#fef3c7',
    fr: { title: 'Parcours coaching', subtitle: 'Accompagnement personnalisé en 3 phases' },
    en: { title: 'Coaching journey', subtitle: 'Personalised 3-phase accompaniment' },
  },
  {
    slug: 'bilan-famille',
    iconSvgPath: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    iconBg: '#ede9fe',
    fr: { title: 'Bilan famille', subtitle: 'Harmonie et liens familiaux renforcés' },
    en: { title: 'Family bond', subtitle: 'Harmony and stronger family ties' },
  },
  {
    slug: 'musique-bien-etre',
    iconSvgPath: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
    iconBg: '#fce7f3',
    fr: { title: 'Musique & bien-être', subtitle: "Sons et fréquences pour l'équilibre" },
    en: { title: 'Music & wellbeing', subtitle: 'Sounds and frequencies for balance' },
  },
  {
    slug: 'ateliers-groupe',
    iconSvgPath: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
    iconBg: '#ffedd5',
    fr: { title: 'Ateliers groupe', subtitle: 'Sessions collectives et dynamiques' },
    en: { title: 'Group workshops', subtitle: 'Collective and dynamic sessions' },
  },
  {
    slug: 'ressources-outils',
    iconSvgPath: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
    iconBg: '#dbeafe',
    fr: { title: 'Ressources & outils', subtitle: 'Guides, exercices et méditations' },
    en: { title: 'Resources & tools', subtitle: 'Guides, exercises and meditations' },
  },
];
