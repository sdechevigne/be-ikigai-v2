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
  { url: 'https://www.lemonde.fr/work-in-progress/rss_full.xml',  type: 'presse_nationale',   label: 'Chronique de la vie de bureau, par Nicolas Santolaria',          lang: 'fr', weight: 6.72 },
  { url: 'https://www.lemonde.fr/emploi/rss_full.xml',            type: 'presse_nationale',   label: 'Le Monde Emploi',          lang: 'fr', weight: 6.72 },
  { url: 'https://emploi.lefigaro.fr/rss/',        type: 'presse_nationale',   label: 'Figaro Emploi',            lang: 'fr', weight: 6.48 },

  // ── Presse spécialisée FR ──
  { url: 'https://www.parlonsrh.com/feed/',                      type: 'presse_specialisee', label: 'Parlons RH',               lang: 'fr', weight: 4.32 },
  { url: 'https://www.cadremploi.fr/rss/',                    type: 'presse_specialisee', label: 'Cadremploi',               lang: 'fr', weight: 4.08 },

  // ── Blogs autorité FR ──
  { url: 'https://www.psychologies.com/feed',                    type: 'blogs_autorite',     label: 'Psychologies',             lang: 'fr', weight: 2.88 },

  // ── Institutionnel FR ──
  { url: 'https://dares.travail-emploi.gouv.fr/rss.xml',         type: 'institutionnel',     label: 'DARES',                    lang: 'fr', weight: 4.80 },
  { url: 'https://travail-emploi.gouv.fr/rss.xml',               type: 'institutionnel',     label: 'Ministère Travail',        lang: 'fr', weight: 4.32 },

  // ── Presse spécialisée US & International ──
  { url: 'https://hbr.org/',                                     type: 'presse_specialisee', label: 'Harvard Business Review',  lang: 'en', weight: 6.84 },
  { url: 'https://www.shrm.org',             type: 'presse_specialisee', label: 'SHRM',                     lang: 'en', weight: 6.48 },
  { url: 'https://www.fastcompany.com/leadership/rss',     type: 'presse_specialisee', label: 'Fast Company Worklife',    lang: 'en', weight: 5.04 },
  { url: 'https://www.inc.com/rss',                          type: 'presse_specialisee', label: 'Inc Magazine',             lang: 'en', weight: 5.04 },

  // ── Blogs Ikigai & bien-être EN ──
  { url: 'https://ikigaitribe.com/feed/',                        type: 'blogs_autorite',     label: 'Ikigai Tribe',             lang: 'en', weight: 3.12 },
  { url: 'https://www.mindbodygreen.com/rss.xml',               type: 'blogs_autorite',     label: 'MindBodyGreen',            lang: 'en', weight: 2.88 },
  { url: 'https://www.ikigain.org/blog-feed.xml',               type: 'blogs_autorite',     label: 'Ikigain',                  lang: 'en', weight: 3.12 },
  { url: 'https://ikigai.blog/feed/',                           type: 'blogs_autorite',     label: 'The Ikigai Project',       lang: 'en', weight: 2.88 },

  // ── Ikigai spécialisés & carrière EN ──
  { url: 'https://unionsquarepractice.com/feed/',               type: 'blogs_autorite',     label: 'Union Square Practice',    lang: 'en', weight: 4.80 },
  { url: 'https://www.careershapeslab.com/blog-feed.xml',       type: 'blogs_autorite',     label: 'Career Shapes Lab',        lang: 'en', weight: 4.80 },
  { url: 'https://hyperisland.com/en/blog/rss.xml',             type: 'blogs_autorite',     label: 'Hyper Island',             lang: 'en', weight: 4.56 },
  { url: 'https://www.michelleporterfit.com/blog?format=rss',   type: 'blogs_autorite',     label: 'Michelle Porter Fit',      lang: 'en', weight: 4.32 },
  { url: 'https://officedynamics.com/feed/',                    type: 'blogs_autorite',     label: 'Office Dynamics',          lang: 'en', weight: 4.32 },
  { url: 'https://www.wholegraindigital.com/feed/',             type: 'blogs_autorite',     label: 'Wholegrain Digital',       lang: 'en', weight: 4.08 },
  { url: 'https://janinerixlearningsolutions.com/feed/',        type: 'blogs_autorite',     label: 'Janine Rix Learning',      lang: 'en', weight: 3.84 },
  { url: 'https://blog.learnlife.com/rss.xml',                  type: 'blogs_autorite',     label: 'Learnlife',                lang: 'en', weight: 4.08 },
  { url: 'https://feeds.feedburner.com/drisiomaokolo/D7mKnCUdKya', type: 'blogs_autorite', label: 'Dr Isioma Okolo',          lang: 'en', weight: 4.32 },
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
