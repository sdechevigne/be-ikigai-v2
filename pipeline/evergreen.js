// pipeline/evergreen.js
// Backlog éditoriale permanente — sujets ikigai/reconversion indépendants du trending RSS
// Ces sujets alimentent toujours le pipeline, même sans signal RSS ni Trends

export const EVERGREEN_TOPICS = [

  // ── Sens & Ikigai ──
  {
    title: "Qu'est-ce que l'ikigai ? La méthode japonaise pour trouver sa raison d'être",
    abstract: "ikigai method japanese philosophy purpose vocation mission passion raison d'être sens professionnel épanouissement meaning fulfillment",
    cluster: 'sens_ikigai',
    contentType: 'conseil-ikigai',
    angle: 'fondation',
  },
  {
    title: "Ikigai vs Vision Board : pourquoi le venn diagram simplifie mal la philosophie japonaise",
    abstract: "ikigai framework venn diagram instagram purpose misconception authentic meaning fulfillment career anti-bullshit",
    cluster: 'sens_ikigai',
    contentType: 'analyse-tendance',
    angle: 'déconstruction',
  },
  {
    title: "Comment l'ikigai peut transformer votre rapport au travail au quotidien",
    abstract: "ikigai daily work purpose sens au travail motivation épanouissement professionnel meaningful work engagement",
    cluster: 'sens_ikigai',
    contentType: 'guide-pratique',
    angle: 'application',
  },
  {
    title: "Ikigai et longévité : ce que les Japonais d'Okinawa nous apprennent sur le sens de la vie",
    abstract: "ikigai okinawa longevity blue zone purpose health cortisol wellbeing lifestyle raison d'être santé",
    cluster: 'sens_ikigai',
    contentType: 'analyse-tendance',
    angle: 'science',
  },
  {
    title: "Trouver sa vocation à 40 ans : l'ikigai comme boussole de mi-carrière",
    abstract: "ikigai mid-career purpose vocation 40 ans reconversion mission épanouissement career change meaning",
    cluster: 'sens_ikigai',
    contentType: 'temoignage',
    angle: 'mi-carrière',
  },

  // ── Reconversion ──
  {
    title: "5 étapes concrètes pour réussir sa reconversion professionnelle avec l'ikigai",
    abstract: "reconversion professionnelle ikigai étapes changer de métier nouvelle carrière career change pivot guide pratique",
    cluster: 'reconversion',
    contentType: 'guide-pratique',
    angle: 'méthode',
  },
  {
    title: "Comment identifier ses talents cachés avant une reconversion",
    abstract: "talents compétences reconversion changer de voie bilan carrière ikigai strengths hidden skills career change",
    cluster: 'reconversion',
    contentType: 'guide-pratique',
    angle: 'auto-diagnostic',
  },
  {
    title: "Reconversion à 35, 45, 55 ans : les spécificités de chaque étape de vie",
    abstract: "reconversion âge 35 45 55 ans carrière changer de métier ikigai trouver sa voie bilan compétences",
    cluster: 'reconversion',
    contentType: 'guide-pratique',
    angle: 'par-âge',
  },
  {
    title: "Quitter un CDI pour se reconvertir : les vraies questions à se poser",
    abstract: "quitter cdi reconversion risque sécurité ikigai purpose trouver sa voie démissionner pivot carrière",
    cluster: 'reconversion',
    contentType: 'guide-pratique',
    angle: 'décision',
  },
  {
    title: "De cadre à indépendant : témoignages de reconversions réussies par l'ikigai",
    abstract: "cadre indépendant reconversion témoignage ikigai freelance entrepreneur purpose carrière épanouissante",
    cluster: 'reconversion',
    contentType: 'temoignage',
    angle: 'témoignage',
  },

  // ── Burnout ──
  {
    title: "Burnout et perte de sens : comment l'ikigai aide à reconstruire après l'épuisement",
    abstract: "burnout épuisement professionnel ikigai sens travail reconstruction reconversion purpose bien-être mental health",
    cluster: 'burnout',
    contentType: 'guide-pratique',
    angle: 'reconstruction',
  },
  {
    title: "Les 3 signaux d'alerte avant le burnout que personne ne vous dit",
    abstract: "burnout prévention signaux alerte épuisement stress travail cortisol bore-out quiet quitting souffrance",
    cluster: 'burnout',
    contentType: 'guide-pratique',
    angle: 'prévention',
  },
  {
    title: "Quiet quitting, bore-out, brown-out : décoder les nouvelles formes de mal-être au travail",
    abstract: "quiet quitting bore-out brown-out démission silencieuse épuisement désengagement travail sens motivation",
    cluster: 'burnout',
    contentType: 'analyse-tendance',
    angle: 'tendances',
  },
  {
    title: "Work-life balance ou ikigai : deux philosophies opposées du rapport au travail",
    abstract: "work life balance ikigai philosophie travail sens épanouissement burnout prévention bien-être équilibre",
    cluster: 'burnout',
    contentType: 'analyse-tendance',
    angle: 'comparatif',
  },

  // ── Coaching & Bilan ──
  {
    title: "Bilan de compétences ou coaching ikigai : comment choisir ?",
    abstract: "bilan compétences coaching ikigai CPF accompagnement reconversion diagnostic carrière différence choisir",
    cluster: 'coaching_bilan',
    contentType: 'comparatif',
    angle: 'comparatif',
  },
  {
    title: "Comment un coach ikigai vous aide à clarifier votre projet professionnel",
    abstract: "coach ikigai coaching accompagnement projet professionnel carrière sens vocation mission clarifier bilan",
    cluster: 'coaching_bilan',
    contentType: 'guide-pratique',
    angle: 'rôle-coach',
  },
  {
    title: "Les 7 questions du bilan ikigai pour trouver ce qui vous anime vraiment",
    abstract: "bilan ikigai questions auto-diagnostic passion mission vocation profession sens carrière coaching",
    cluster: 'coaching_bilan',
    contentType: 'conseil-ikigai',
    angle: 'exercice',
  },
  {
    title: "CPF et reconversion : financer son bilan de compétences en 2025",
    abstract: "CPF financement bilan compétences reconversion coaching 2025 droits formation carrière accompagnement",
    cluster: 'coaching_bilan',
    contentType: 'guide-pratique',
    angle: 'financement',
  },

  // ── Management & Leadership ──
  {
    title: "L'ikigai au service du management : comment donner du sens à votre équipe",
    abstract: "ikigai management leadership équipe sens travail motivation engagement culture entreprise purpose driven",
    cluster: 'management',
    contentType: 'guide-pratique',
    angle: 'management',
  },
  {
    title: "Télétravail et perte de sens : comment les managers peuvent recréer du lien",
    abstract: "télétravail travail hybride perte de sens management équipe lien engagement motivation culture entreprise",
    cluster: 'management',
    contentType: 'analyse-tendance',
    angle: 'télétravail',
  },
  {
    title: "Comment détecter un manager toxique et en sortir par le haut",
    abstract: "manager toxique leadership toxique culture entreprise bien-être reconversion sortir souffrance travail",
    cluster: 'management',
    contentType: 'guide-pratique',
    angle: 'toxicité',
  },
];

// Score fixe pour les evergreen — assez haut pour passer le threshold, assez bas pour ne pas écraser les sujets trending
export const EVERGREEN_BASE_SCORE = 6;

export function collectEvergreen() {
  return EVERGREEN_TOPICS.map(topic => ({
    title: topic.title,
    url: `evergreen://${topic.cluster}/${encodeURIComponent(topic.angle)}`,
    source: 'Backlog Evergreen',
    sourceType: 'presse_specialisee',
    date: new Date().toISOString(),
    abstract: topic.abstract,
    _cluster: topic.cluster,
    _contentType: topic.contentType,
    _evergreen: true,
    _evergreenScore: EVERGREEN_BASE_SCORE,
  }));
}
