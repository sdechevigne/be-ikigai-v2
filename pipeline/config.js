// pipeline/config.js
export const WEIGHTS = {
  presse_nationale: 4,
  presse_specialisee: 3,
  blogs_autorite: 2,
  google_trends: 2,
  rising_queries: 3,
  forum: 1,
  commentaires: 0.5,
};

export const SCORE_THRESHOLD = 5;
export const LOOKBACK_DAYS = 14;

export const CLUSTERS = {
  reconversion: {
    label: 'Reconversion',
    keywords: ['reconversion', 'changer de métier', 'démissionner', 'pivot', 'changer de voie', 'changer de carrière', 'nouvelle carrière'],
    contentTypes: ['guide-pratique', 'temoignage'],
  },
  sens_ikigai: {
    label: 'Sens & Ikigai',
    keywords: ['ikigai', 'sens au travail', 'mission', 'vocation', 'purpose', "raison d'être", 'sens professionnel', 'épanouissement'],
    contentTypes: ['conseil-ikigai', 'analyse-tendance'],
  },
  burnout: {
    label: 'Burn-out & Épuisement',
    keywords: ['burn-out', 'burnout', 'épuisement', 'fatigue', 'démission silencieuse', 'quiet quitting', 'bore-out', 'brown-out', 'souffrance au travail'],
    contentTypes: ['actualite', 'guide-pratique'],
  },
  coaching_bilan: {
    label: 'Coaching & Bilan',
    keywords: ['bilan de compétences', 'cpf', 'coaching', 'accompagnement', 'diagnostic de carrière', 'coach professionnel'],
    contentTypes: ['comparatif', 'guide-pratique'],
  },
  management: {
    label: 'Management & Leadership',
    keywords: ['management', 'leadership', "culture d'entreprise", 'manager toxique', 'équipe', 'télétravail', 'travail hybride'],
    contentTypes: ['analyse-tendance', 'guide-pratique'],
  },
};

export const CONTENT_TYPES = [
  'guide-pratique',
  'conseil-ikigai',
  'analyse-tendance',
  'comparatif',
  'temoignage',
  'actualite',
];

export const RSS_SOURCES = [
  { url: 'https://www.lemonde.fr/emploi/rss_full.xml', type: 'presse_nationale', label: 'Le Monde Emploi' },
  { url: 'https://www.lefigaro.fr/emploi/rss.xml', type: 'presse_nationale', label: 'Figaro Emploi' },
  { url: 'https://www.capital.fr/rss.xml', type: 'presse_specialisee', label: 'Capital' },
  { url: 'https://www.management.fr/rss.xml', type: 'presse_specialisee', label: 'Management' },
  { url: 'https://www.hbrfrance.fr/rss.xml', type: 'presse_specialisee', label: 'HBR France' },
  { url: 'https://www.courriercadres.com/feed/', type: 'presse_specialisee', label: 'Courrier Cadres' },
  { url: 'https://www.parlonsrh.com/feed/', type: 'presse_specialisee', label: 'Parlons RH' },
  { url: 'https://www.psychologies.com/rss.xml', type: 'blogs_autorite', label: 'Psychologies' },
  { url: 'https://www.welcometothejungle.com/fr/articles/rss', type: 'blogs_autorite', label: 'Welcome to the Jungle' },
  { url: 'https://www.maddyness.com/rss.xml', type: 'blogs_autorite', label: 'Maddyness' },
  { url: 'https://www.cadremploi.fr/editorial/rss', type: 'blogs_autorite', label: 'Cadremploi Mag' },
  { url: 'https://www.e-rh.org/rss', type: 'blogs_autorite', label: 'e-rh.org' },
  { url: 'https://www.hellowork.com/fr-fr/medias/rss', type: 'blogs_autorite', label: 'Hellowork Mag' },
];

export const COACHING_KEYWORDS = [
  'emploi', 'travail', 'carrière', 'reconversion', 'ikigai', 'burn-out', 'burnout',
  'management', 'leadership', 'coaching', 'bilan de compétences', 'cpf',
  'sens au travail', 'télétravail', 'démission', 'recrutement', 'salaire',
];

export const TRENDS_KEYWORDS = [
  ['ikigai', 'sens au travail', 'reconversion professionnelle', 'burn-out', 'malaise au travail'],
  ['bilan de compétences', 'cpf reconversion', 'coaching de carrière', 'ikigai exercice', 'quête de sens'],
  ['travail hybride', 'fatigue managériale', 'démission silencieuse', 'quiet quitting', 'souffrance au travail'],
  ['changer de métier', 'carrière épanouissante', 'trouver sa voie', 'ikigai au travail', 'méthode ikigai'],
];

export const PROJECT_CONFIG = {
  projectId: process.env.PROJECT_ID || '',
  fields: {
    status: {
      id: process.env.PROJECT_FIELD_STATUS_ID || '',
      options: {
        detected: process.env.PROJECT_STATUS_DETECTED || '',
        researched: process.env.PROJECT_STATUS_RESEARCHED || '',
        drafting: process.env.PROJECT_STATUS_DRAFTING || '',
        published: process.env.PROJECT_STATUS_PUBLISHED || '',
      },
    },
    trendScore: { id: process.env.PROJECT_FIELD_SCORE_ID || '' },
    cluster: { id: process.env.PROJECT_FIELD_CLUSTER_ID || '' },
    contentType: { id: process.env.PROJECT_FIELD_CONTENT_TYPE_ID || '' },
    articlePath: { id: process.env.PROJECT_FIELD_ARTICLE_PATH_ID || '' },
  },
};
