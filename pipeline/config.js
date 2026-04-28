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
  // ── Presse nationale FR ──
  { url: 'https://www.lemonde.fr/emploi/rss_full.xml',           type: 'presse_nationale',   label: 'Le Monde Emploi',          lang: 'fr', weight: 6.72 },
  { url: 'https://www.lefigaro.fr/rss/figaro_emploi.xml',        type: 'presse_nationale',   label: 'Figaro Emploi',            lang: 'fr', weight: 6.48 },
  { url: 'https://www.lefigaro.fr/rss/figaro_sante.xml',         type: 'presse_nationale',   label: 'Figaro Santé',             lang: 'fr', weight: 6.24 },
  { url: 'https://www.lesechos.fr/rss/rss_emploi.xml',           type: 'presse_nationale',   label: 'Les Échos Emploi',         lang: 'fr', weight: 6.72 },
  { url: 'https://www.francetvinfo.fr/economie/emploi.rss',      type: 'presse_nationale',   label: 'France TV Info Emploi',    lang: 'fr', weight: 6.24 },
  { url: 'https://www.liberation.fr/arc/outboundfeeds/rss/?outputType=xml', type: 'presse_nationale', label: 'Libération',     lang: 'fr', weight: 6.00 },

  // ── Presse spécialisée FR ──
  { url: 'https://www.journaldunet.com/rss/',                    type: 'presse_specialisee', label: 'Journal du Net',           lang: 'fr', weight: 4.32 },
  { url: 'https://www.parlonsrh.com/feed/',                      type: 'presse_specialisee', label: 'Parlons RH',               lang: 'fr', weight: 4.32 },
  { url: 'https://www.rh-info.fr/feed/',                         type: 'presse_specialisee', label: 'RH Info',                  lang: 'fr', weight: 4.32 },
  { url: 'https://www.focusrh.com/feed/',                        type: 'presse_specialisee', label: 'Focus RH',                 lang: 'fr', weight: 4.08 },
  { url: 'https://www.cadremploi.fr/editorial/feed',             type: 'presse_specialisee', label: 'Cadremploi',               lang: 'fr', weight: 4.08 },
  { url: 'https://www.chefdentreprise.com/feed/',                type: 'presse_specialisee', label: "Chef d'Entreprise",        lang: 'fr', weight: 3.84 },
  { url: 'https://www.usinenouvelle.com/rss/',                   type: 'presse_specialisee', label: 'Usine Nouvelle',           lang: 'fr', weight: 4.32 },

  // ── Blogs autorité FR ──
  { url: 'https://www.psychologies.com/feed',                    type: 'blogs_autorite',     label: 'Psychologies',             lang: 'fr', weight: 2.88 },
  { url: 'https://www.welcometothejungle.com/fr/articles/rss',   type: 'blogs_autorite',     label: 'Welcome to the Jungle',    lang: 'fr', weight: 2.88 },
  { url: 'https://www.maddyness.com/feed/',                      type: 'blogs_autorite',     label: 'Maddyness',                lang: 'fr', weight: 2.40 },
  { url: 'https://www.hbrfrance.fr/feed/',                       type: 'blogs_autorite',     label: 'HBR France',               lang: 'fr', weight: 3.36 },
  { url: 'https://lesnouveauxtravailleurs.fr/feed/',             type: 'blogs_autorite',     label: 'Les Nouveaux Travailleurs', lang: 'fr', weight: 2.64 },
  { url: 'https://www.rebondir.fr/feed/',                        type: 'blogs_autorite',     label: 'Rebondir',                 lang: 'fr', weight: 2.64 },
  { url: 'https://marevolutionpro.com/feed/',                    type: 'blogs_autorite',     label: 'Ma Révolution Pro',        lang: 'fr', weight: 2.40 },

  // ── Institutionnel FR ──
  { url: 'https://dares.travail-emploi.gouv.fr/rss.xml',        type: 'institutionnel',     label: 'DARES',                    lang: 'fr', weight: 4.80 },
  { url: 'https://www.inrs.fr/rss/actualites.xml',              type: 'institutionnel',     label: 'INRS',                     lang: 'fr', weight: 4.32 },

  // ── Presse spécialisée US ──
  { url: 'https://hbr.org/feed',                                 type: 'presse_specialisee', label: 'Harvard Business Review',  lang: 'en', weight: 6.84 },
  { url: 'https://www.shrm.org/rss/pages/rss.aspx',             type: 'presse_specialisee', label: 'SHRM',                     lang: 'en', weight: 6.48 },
  { url: 'https://hrexecutive.com/feed/',                        type: 'presse_specialisee', label: 'HR Executive',             lang: 'en', weight: 5.76 },
  { url: 'https://www.fastcompany.com/work-life/rss',            type: 'presse_specialisee', label: 'Fast Company Work Life',   lang: 'en', weight: 5.04 },
  { url: 'https://www.inc.com/rss/',                             type: 'presse_specialisee', label: 'Inc. Magazine',            lang: 'en', weight: 5.04 },
  { url: 'https://www.forbes.com/careers/feed/',                 type: 'presse_specialisee', label: 'Forbes Careers',           lang: 'en', weight: 5.76 },
  { url: 'https://www.psychologytoday.com/rss/articles',        type: 'blogs_autorite',     label: 'Psychology Today',         lang: 'en', weight: 3.36 },
  { url: 'https://www.mindbodygreen.com/rss',                   type: 'blogs_autorite',     label: 'MindBodyGreen',            lang: 'en', weight: 2.88 },

  // ── Blogs Ikigai EN ──
  { url: 'https://ikigai.report/blog/rss.xml',                   type: 'blogs_autorite',     label: 'Ikigai Report',            lang: 'en', weight: 3.12 },
  { url: 'https://ikigaitribe.com/feed/',                        type: 'blogs_autorite',     label: 'Ikigai Tribe',             lang: 'en', weight: 3.12 },
  { url: 'https://ikigain.org/feed/',                            type: 'blogs_autorite',     label: 'Ikigain Blog',             lang: 'en', weight: 3.12 },
  { url: 'https://ikigai.blog/feed/',                            type: 'blogs_autorite',     label: 'The Ikigai Project',       lang: 'en', weight: 2.88 },
];

export const REDDIT_SOURCES = [
  { url: 'https://www.reddit.com/r/conseilboulot/hot.json?limit=25',  type: 'forum', label: 'Reddit ConseilBoulot',  lang: 'fr', weight: 1.21 },
  { url: 'https://www.reddit.com/r/AskFrance/hot.json?limit=25',      type: 'forum', label: 'Reddit AskFrance',      lang: 'fr', weight: 1.10 },
  { url: 'https://www.reddit.com/r/AntiTaff/hot.json?limit=25',       type: 'forum', label: 'Reddit AntiTaff',       lang: 'fr', weight: 1.32 },
  { url: 'https://www.reddit.com/r/findapath/hot.json?limit=25',      type: 'forum', label: 'Reddit FindAPath',      lang: 'en', weight: 1.44 },
  { url: 'https://www.reddit.com/r/careerchange/hot.json?limit=25',   type: 'forum', label: 'Reddit CareerChange',   lang: 'en', weight: 1.32 },
  { url: 'https://www.reddit.com/r/burnout/hot.json?limit=25',        type: 'forum', label: 'Reddit Burnout',        lang: 'en', weight: 1.32 },
  { url: 'https://www.reddit.com/r/antiwork/hot.json?limit=25',       type: 'forum', label: 'Reddit Antiwork',       lang: 'en', weight: 1.54 },
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
