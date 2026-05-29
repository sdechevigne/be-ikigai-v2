// Source unique du quiz « Dans quel brouillard es-tu ? »
// Contenu bilingue (fr/en). Convention de mapping interne : A,B,C,D fixe.
// A = Cage Dorée · B = Idéaliste Épuisé · C = Page Blanche · D = Fragmenté
//
// Le scoring (src/components/quiz/scoring.ts) ne lit que le `code` de la réponse.
// L'ordre d'affichage des réponses est randomisé côté client ; le mapping reste ici.

export type ProfilCode = "A" | "B" | "C" | "D";

export type ProfilSlug =
  | "cage-doree"
  | "idealiste-epuise"
  | "page-blanche"
  | "fragmente";

/** Mappe le code interne A/B/C/D vers la clé profil stockée en base. */
export const CODE_TO_DB: Record<ProfilCode, string> = {
  A: "cage_doree",
  B: "idealiste_epuise",
  C: "page_blanche",
  D: "fragmente",
};

export const CODE_TO_SLUG: Record<ProfilCode, ProfilSlug> = {
  A: "cage-doree",
  B: "idealiste-epuise",
  C: "page-blanche",
  D: "fragmente",
};

export const SLUG_TO_CODE: Record<ProfilSlug, ProfilCode> = {
  "cage-doree": "A",
  "idealiste-epuise": "B",
  "page-blanche": "C",
  fragmente: "D",
};

export type Lang = "fr" | "en";

export interface Answer {
  code: ProfilCode;
  /** Texte affiché (ordre randomisé côté client). */
  label: string;
}

export interface Question {
  /** Numéro 1..8, sert d'identifiant stable dans `reponses`. */
  n: number;
  stem: string;
  answers: Answer[];
}

export interface Profil {
  code: ProfilCode;
  slug: ProfilSlug;
  /** Cercle Ikigai : Aimer / Doué / Besoin / Payé. */
  forts: CercleKey[];
  faibles: CercleKey[];
  accentColor: string;
  /** Emoji utilisé dans le copy de partage. */
  emoji: string;
  nom: string;
  tagline: string;
  /** 2-3 phrases « ça tombe juste ». */
  miniPortrait: string;
  /** Ce qu'on révèle dans les 30 %. */
  reveal: string;
  /** Copy pré-rempli de partage (sans l'URL, ajoutée à la volée). */
  shareCopy: string;
}

export type CercleKey = "aimer" | "doue" | "besoin" | "paye";

export interface QuizContent {
  cercles: Record<CercleKey, string>;
  questions: Question[];
  profils: Record<ProfilCode, Profil>;
  ui: {
    metaTitle: string;
    metaDescription: string;
    landingTitle: string;
    landingSubtitle: string;
    landingDuration: string;
    start: string;
    next: string;
    back: string;
    progress: (cur: number, total: number) => string;
    resultIntro: string;
    transitionIntro: (a: string, b: string) => string;
    mixedIntro: string;
    strongCircles: string;
    weakCircles: string;
    shareTitle: string;
    shareWhatsApp: string;
    shareLinkedIn: string;
    shareCopyLink: string;
    shareCopied: string;
    shareNative: string;
    moai: string;
    secretTitle: string;
    secretBody: string;
    emailLabel: string;
    prenomLabel: string;
    prenomPlaceholder: string;
    emailPlaceholder: string;
    consent: string;
    privacyLink: string;
    privacyHref: string;
    submit: string;
    sending: string;
    success: string;
    error: string;
    restart: string;
  };
}

const fr: QuizContent = {
  cercles: {
    aimer: "ce que tu aimes",
    doue: "ce pour quoi tu es doué",
    besoin: "ce dont le monde a besoin",
    paye: "ce pour quoi tu peux être payé",
  },
  questions: [
    {
      n: 1,
      stem: "Dimanche soir, à l'idée de lundi, tu ressens :",
      answers: [
        { code: "A", label: "Une boule au ventre… alors que « tout va bien » sur le papier." },
        { code: "B", label: "L'envie de continuer mon projet, doublée de la peur de craquer." },
        { code: "C", label: "Rien de précis. Une sorte de vide, même pas de l'angoisse." },
        { code: "D", label: "Des envies contradictoires : y retourner et tout plaquer." },
      ],
    },
    {
      n: 2,
      stem: "« Qu'est-ce qui te fait vibrer en ce moment ? » Ton réflexe :",
      answers: [
        { code: "A", label: "Je réponds par mon métier… puis je réalise que ce n'est plus vrai." },
        { code: "B", label: "Je parle de ma cause avec passion, mais épuisé." },
        { code: "C", label: "Je sèche. Je ne sais pas. Vraiment pas." },
        { code: "D", label: "Je cite 4 ou 5 choses, sans pouvoir en choisir une." },
      ],
    },
    {
      n: 3,
      stem: "Ton rapport au travail, en une phrase :",
      answers: [
        { code: "A", label: "Je suis bon dans ce que je fais, mais ça ne veut plus rien dire." },
        { code: "B", label: "J'adore ce que je fais, mais je n'en vis pas (ou plus pour longtemps)." },
        { code: "C", label: "Je fais les gestes, sans vraiment être là." },
        { code: "D", label: "Je fais dix choses bien, mais aucune ne me définit." },
      ],
    },
    {
      n: 4,
      stem: "On t'offre 6 mois sabbatiques, payés. Première réaction :",
      answers: [
        { code: "A", label: "Soulagement… puis panique : « et après, je reviens à quoi ? »" },
        { code: "B", label: "« Impossible, mon projet a besoin de moi. » Puis le doute." },
        { code: "C", label: "Un haussement d'épaules. Je ne saurais pas quoi en faire." },
        { code: "D", label: "Excitation immédiate, puis paralysie : trop d'options." },
      ],
    },
    {
      n: 5,
      stem: "Quand tu penses à l'argent :",
      answers: [
        { code: "A", label: "« Je gagne bien, mais ça ne donne pas de sens. »" },
        { code: "B", label: "« Je bosse beaucoup pour gagner peu, combien de temps je tiens ? »" },
        { code: "C", label: "J'évite d'y penser. Ni angoissé, ni concerné." },
        { code: "D", label: "« Ça va, mais pourquoi cette voie alors que j'en aime quatre autres ? »" },
      ],
    },
    {
      n: 6,
      stem: "Le matin, devant le miroir :",
      answers: [
        { code: "A", label: "J'ai l'air accompli… mais l'œil est éteint, et je le sais." },
        { code: "B", label: "Plus marqué qu'avant, cernes et tension, mais fier de tenir." },
        { code: "C", label: "Je ne me regarde plus vraiment. À quoi bon." },
        { code: "D", label: "Je me trouve intéressant… mais incapable de me résumer." },
      ],
    },
    {
      n: 7,
      stem: "La phrase qui te ressemble le plus :",
      answers: [
        { code: "A", label: "« J'ai tout pour être heureux, et pourtant… »" },
        { code: "B", label: "« Je donne tout pour une cause, et je m'épuise. »" },
        { code: "C", label: "« Je lis ça avec un mélange d'espoir et de fatigue. »" },
        { code: "D", label: "« Je vis plusieurs vies en parallèle, sans fil rouge. »" },
      ],
    },
    {
      n: 8,
      stem: "Si tu devais nommer ton blocage, ce serait plutôt :",
      answers: [
        { code: "A", label: "Une cage confortable dont je ne sors pas." },
        { code: "B", label: "Un feu qui me consume autant qu'il m'anime." },
        { code: "C", label: "Un brouillard où plus rien n'a de relief." },
        { code: "D", label: "Un puzzle dont les pièces ne s'emboîtent pas." },
      ],
    },
  ],
  profils: {
    A: {
      code: "A",
      slug: "cage-doree",
      forts: ["doue", "paye"],
      faibles: ["aimer", "besoin"],
      accentColor: "#b8860b",
      emoji: "🪙",
      nom: "La Cage Dorée",
      tagline: "J'ai tout réussi, sauf l'essentiel.",
      miniPortrait:
        "Sur le papier, tout va bien : tu es doué, tu es bien payé. Mais quelque chose s'est éteint en route. Tu réussis selon les critères des autres, et l'élan, lui, a disparu.",
      reveal:
        "Tes cercles « doué » et « payé » sont pleins. Ceux de « ce que tu aimes » et « ce dont le monde a besoin » se sont vidés sans bruit.",
      shareCopy: "Je suis une Cage Dorée 🪙 — et toi, dans quel brouillard es-tu ?",
    },
    B: {
      code: "B",
      slug: "idealiste-epuise",
      forts: ["aimer", "besoin"],
      faibles: ["paye"],
      accentColor: "#c0392b",
      emoji: "🔥",
      nom: "L'Idéaliste Épuisé",
      tagline: "J'ai le pourquoi. Il me manque le comment.",
      miniPortrait:
        "Tu portes une cause qui te tient debout, et qui t'use en même temps. La passion est là, intacte. Mais elle ne suffit pas à payer le loyer, et tu le sens.",
      reveal:
        "Tes cercles « ce que tu aimes » et « ce dont le monde a besoin » débordent. C'est la viabilité, le cercle « payé », qui menace de tout faire tomber.",
      shareCopy: "Je suis un Idéaliste Épuisé 🔥 — et toi, dans quel brouillard es-tu ?",
    },
    C: {
      code: "C",
      slug: "page-blanche",
      forts: [],
      faibles: ["aimer", "doue", "besoin", "paye"],
      accentColor: "#5d6d7e",
      emoji: "🌫️",
      nom: "La Page Blanche",
      tagline: "Avant un cap, réapprendre à ressentir.",
      miniPortrait:
        "Ce n'est pas une crise bruyante. C'est plutôt une anesthésie : la lumière est faible, plus rien n'a vraiment de relief. Et ce n'est ni ta faute, ni un échec.",
      reveal:
        "Tes quatre cercles sont à voix basse en ce moment. Le travail n'est pas de tracer un plan, mais de réapprendre, doucement, à ressentir.",
      shareCopy: "Je suis une Page Blanche 🌫️ — et toi, dans quel brouillard es-tu ?",
    },
    D: {
      code: "D",
      slug: "fragmente",
      forts: ["aimer", "doue", "besoin", "paye"],
      faibles: [],
      accentColor: "#6c3483",
      emoji: "🧩",
      nom: "Le Fragmenté",
      tagline: "Plusieurs vies, aucun fil rouge.",
      miniPortrait:
        "Tu mènes plusieurs vies en parallèle, et tu les mènes bien. Le problème n'est pas le vide, c'est l'absence de convergence : tout est rempli, mais rien ne se relie.",
      reveal:
        "Tes quatre cercles sont remplis, chacun de son côté. Ce qui manque, c'est le point où ils se recoupent, le centre qui ferait tenir l'ensemble.",
      shareCopy: "Je suis un Fragmenté 🧩 — et toi, dans quel brouillard es-tu ?",
    },
  },
  ui: {
    metaTitle: "Dans quel brouillard es-tu ? — Le quiz Be-ikigai",
    metaDescription:
      "En 2 minutes, découvre lequel des 4 brouillards te ralentit, et le premier pas pour en sortir. Quiz gratuit Be-ikigai.",
    landingTitle: "Dans quel brouillard es-tu ?",
    landingSubtitle:
      "On n'est pas tous bloqués au même endroit. Réponds à 8 questions et découvre lequel des 4 brouillards te ralentit, et par où commencer pour en sortir.",
    landingDuration: "2 minutes, 8 questions, aucune bonne réponse.",
    start: "Commencer",
    next: "Suivant",
    back: "Précédent",
    progress: (cur, total) => `Question ${cur} sur ${total}`,
    resultIntro: "Ton brouillard, c'est plutôt :",
    transitionIntro: (a, b) => `Tu es à la frontière entre ${a} et ${b}.`,
    mixedIntro: "Plusieurs brouillards se mélangent chez toi. On part du plus présent :",
    strongCircles: "Tes cercles bien éclairés",
    weakCircles: "Les cercles à réveiller",
    shareTitle: "Et tes proches, dans quel brouillard sont-ils ?",
    shareWhatsApp: "Partager sur WhatsApp",
    shareLinkedIn: "Partager sur LinkedIn",
    shareCopyLink: "Copier le lien",
    shareCopied: "Lien copié !",
    shareNative: "Partager",
    moai: "Partage-le à ton Moai, ton cercle de soutien.",
    secretTitle: "Ceci n'est que le début de ton diagnostic.",
    secretBody:
      "Reçois gratuitement par email ton portrait complet, les 2 cercles que tu as enterrés, et ton premier petit pas.",
    emailLabel: "Ton email",
    prenomLabel: "Ton prénom (optionnel)",
    prenomPlaceholder: "Prénom",
    emailPlaceholder: "toi@exemple.com",
    consent:
      "J'accepte de recevoir mon diagnostic et la suite par email. Je peux me désinscrire à tout moment.",
    privacyLink: "politique de confidentialité",
    privacyHref: "/confidentialite",
    submit: "Recevoir la suite",
    sending: "Envoi…",
    success: "C'est noté ! Surveille ta boîte mail, la suite arrive.",
    error: "Une erreur s'est produite. Réessaie dans un instant.",
    restart: "Refaire le test",
  },
};

const en: QuizContent = {
  cercles: {
    aimer: "what you love",
    doue: "what you're good at",
    besoin: "what the world needs",
    paye: "what you can be paid for",
  },
  questions: [
    {
      n: 1,
      stem: "Sunday evening, thinking about Monday, you feel:",
      answers: [
        { code: "A", label: "A knot in my stomach… even though everything looks fine on paper." },
        { code: "B", label: "The urge to keep going on my project, mixed with the fear of burning out." },
        { code: "C", label: "Nothing specific. A kind of emptiness, not even anxiety." },
        { code: "D", label: "Contradictory urges: go back and drop it all." },
      ],
    },
    {
      n: 2,
      stem: "\"What's lighting you up these days?\" Your reflex:",
      answers: [
        { code: "A", label: "I answer with my job… then realize it's no longer true." },
        { code: "B", label: "I talk about my cause with passion, but exhausted." },
        { code: "C", label: "I draw a blank. I don't know. Really don't." },
        { code: "D", label: "I list 4 or 5 things, unable to pick one." },
      ],
    },
    {
      n: 3,
      stem: "Your relationship to work, in one sentence:",
      answers: [
        { code: "A", label: "I'm good at what I do, but it no longer means anything." },
        { code: "B", label: "I love what I do, but I can't make a living from it (or not for long)." },
        { code: "C", label: "I go through the motions, without really being there." },
        { code: "D", label: "I do ten things well, but none of them defines me." },
      ],
    },
    {
      n: 4,
      stem: "You're offered a 6-month paid sabbatical. First reaction:",
      answers: [
        { code: "A", label: "Relief… then panic: \"and after, what do I come back to?\"" },
        { code: "B", label: "\"Impossible, my project needs me.\" Then the doubt." },
        { code: "C", label: "A shrug. I wouldn't know what to do with it." },
        { code: "D", label: "Instant excitement, then paralysis: too many options." },
      ],
    },
    {
      n: 5,
      stem: "When you think about money:",
      answers: [
        { code: "A", label: "\"I earn well, but it doesn't give meaning.\"" },
        { code: "B", label: "\"I work a lot for little, how long can I hold on?\"" },
        { code: "C", label: "I avoid thinking about it. Neither anxious nor concerned." },
        { code: "D", label: "\"It's fine, but why this path when I love four others?\"" },
      ],
    },
    {
      n: 6,
      stem: "In the morning, in front of the mirror:",
      answers: [
        { code: "A", label: "I look accomplished… but the eyes are dull, and I know it." },
        { code: "B", label: "More worn than before, dark circles and tension, but proud to hold on." },
        { code: "C", label: "I don't really look at myself anymore. What's the point." },
        { code: "D", label: "I find myself interesting… but unable to sum myself up." },
      ],
    },
    {
      n: 7,
      stem: "The sentence that fits you most:",
      answers: [
        { code: "A", label: "\"I have everything to be happy, and yet…\"" },
        { code: "B", label: "\"I give everything for a cause, and I'm wearing out.\"" },
        { code: "C", label: "\"I read this with a mix of hope and fatigue.\"" },
        { code: "D", label: "\"I live several lives in parallel, with no through-line.\"" },
      ],
    },
    {
      n: 8,
      stem: "If you had to name your block, it would rather be:",
      answers: [
        { code: "A", label: "A comfortable cage I can't get out of." },
        { code: "B", label: "A fire that consumes me as much as it drives me." },
        { code: "C", label: "A fog where nothing stands out anymore." },
        { code: "D", label: "A puzzle whose pieces don't fit together." },
      ],
    },
  ],
  profils: {
    A: {
      code: "A",
      slug: "cage-doree",
      forts: ["doue", "paye"],
      faibles: ["aimer", "besoin"],
      accentColor: "#b8860b",
      emoji: "🪙",
      nom: "The Golden Cage",
      tagline: "I succeeded at everything, except what matters.",
      miniPortrait:
        "On paper, everything's fine: you're talented, you're well paid. But something went out along the way. You succeed by other people's standards, and the drive is gone.",
      reveal:
        "Your \"good at\" and \"paid for\" circles are full. The ones for \"what you love\" and \"what the world needs\" quietly emptied out.",
      shareCopy: "I'm a Golden Cage 🪙 — and you, which fog are you in?",
    },
    B: {
      code: "B",
      slug: "idealiste-epuise",
      forts: ["aimer", "besoin"],
      faibles: ["paye"],
      accentColor: "#c0392b",
      emoji: "🔥",
      nom: "The Exhausted Idealist",
      tagline: "I have the why. I'm missing the how.",
      miniPortrait:
        "You carry a cause that keeps you standing, and wears you down at the same time. The passion is intact. But it isn't enough to pay the rent, and you feel it.",
      reveal:
        "Your \"what you love\" and \"what the world needs\" circles overflow. It's viability, the \"paid for\" circle, that threatens to bring it all down.",
      shareCopy: "I'm an Exhausted Idealist 🔥 — and you, which fog are you in?",
    },
    C: {
      code: "C",
      slug: "page-blanche",
      forts: [],
      faibles: ["aimer", "doue", "besoin", "paye"],
      accentColor: "#5d6d7e",
      emoji: "🌫️",
      nom: "The Blank Page",
      tagline: "Before a direction, relearning to feel.",
      miniPortrait:
        "It's not a loud crisis. It's more like an anesthesia: the light is dim, nothing really stands out. And it's neither your fault nor a failure.",
      reveal:
        "Your four circles are speaking softly right now. The work isn't to draw a plan, but to relearn, gently, how to feel.",
      shareCopy: "I'm a Blank Page 🌫️ — and you, which fog are you in?",
    },
    D: {
      code: "D",
      slug: "fragmente",
      forts: ["aimer", "doue", "besoin", "paye"],
      faibles: [],
      accentColor: "#6c3483",
      emoji: "🧩",
      nom: "The Fragmented One",
      tagline: "Several lives, no through-line.",
      miniPortrait:
        "You lead several lives in parallel, and you lead them well. The problem isn't emptiness, it's the lack of convergence: everything's full, but nothing connects.",
      reveal:
        "Your four circles are full, each on its own. What's missing is the point where they overlap, the center that would hold it all together.",
      shareCopy: "I'm a Fragmented One 🧩 — and you, which fog are you in?",
    },
  },
  ui: {
    metaTitle: "Which fog are you in? — The Be-ikigai quiz",
    metaDescription:
      "In 2 minutes, find out which of the 4 fogs is slowing you down, and the first step out. Free Be-ikigai quiz.",
    landingTitle: "Which fog are you in?",
    landingSubtitle:
      "We're not all stuck in the same place. Answer 8 questions and discover which of the 4 fogs is slowing you down, and where to start to get out.",
    landingDuration: "2 minutes, 8 questions, no right answer.",
    start: "Start",
    next: "Next",
    back: "Back",
    progress: (cur, total) => `Question ${cur} of ${total}`,
    resultIntro: "Your fog is rather:",
    transitionIntro: (a, b) => `You're on the border between ${a} and ${b}.`,
    mixedIntro: "Several fogs are mixing in you. We start with the most present one:",
    strongCircles: "Your well-lit circles",
    weakCircles: "The circles to wake up",
    shareTitle: "And the people around you, which fog are they in?",
    shareWhatsApp: "Share on WhatsApp",
    shareLinkedIn: "Share on LinkedIn",
    shareCopyLink: "Copy link",
    shareCopied: "Link copied!",
    shareNative: "Share",
    moai: "Share it with your Moai, your circle of support.",
    secretTitle: "This is only the beginning of your diagnosis.",
    secretBody:
      "Get your full portrait by email, for free: the 2 circles you buried, and your first small step.",
    emailLabel: "Your email",
    prenomLabel: "Your first name (optional)",
    prenomPlaceholder: "First name",
    emailPlaceholder: "you@example.com",
    consent:
      "I agree to receive my diagnosis and what follows by email. I can unsubscribe at any time.",
    privacyLink: "privacy policy",
    privacyHref: "/en/privacy",
    submit: "Get what follows",
    sending: "Sending…",
    success: "Got it! Keep an eye on your inbox, the rest is on its way.",
    error: "Something went wrong. Try again in a moment.",
    restart: "Retake the test",
  },
};

export const quizContent: Record<Lang, QuizContent> = { fr, en };

export const PROFIL_SLUGS: ProfilSlug[] = [
  "cage-doree",
  "idealiste-epuise",
  "page-blanche",
  "fragmente",
];
