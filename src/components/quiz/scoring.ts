// Scoring du quiz — logique pure, sans dépendance DOM (testable / réutilisable).
// Règles : cahier des charges §6.

import type { ProfilCode } from "../../data/quiz";

export interface Scores {
  A: number;
  B: number;
  C: number;
  D: number;
}

export interface ScoringResult {
  /** Profil dominant présenté. */
  dominant: ProfilCode;
  /** Second profil si résultat « en transition » (égalité stricte à 2). */
  secondary: ProfilCode | null;
  /** true si égalité à 3 ou 4 profils → fallback C avec mention « mélange ». */
  mixed: boolean;
  /** Ton doux imposé : C domine et score C >= 5/8. */
  tonDoux: boolean;
  scores: Scores;
  /** Clé stockée en base : cage_doree | idealiste_epuise | page_blanche | fragmente | transition_XY. */
  profilKey: string;
}

const CODES: ProfilCode[] = ["A", "B", "C", "D"];

const CODE_TO_DB: Record<ProfilCode, string> = {
  A: "cage_doree",
  B: "idealiste_epuise",
  C: "page_blanche",
  D: "fragmente",
};

export function computeScores(choices: ProfilCode[]): Scores {
  const s: Scores = { A: 0, B: 0, C: 0, D: 0 };
  for (const c of choices) s[c] += 1;
  return s;
}

export function scoreQuiz(choices: ProfilCode[]): ScoringResult {
  const scores = computeScores(choices);
  const max = Math.max(scores.A, scores.B, scores.C, scores.D);
  const top = CODES.filter((c) => scores[c] === max);

  // Égalité 3 ou 4 profils → fallback C (Page Blanche), état diffus.
  if (top.length >= 3) {
    return {
      dominant: "C",
      secondary: null,
      mixed: true,
      tonDoux: scores.C >= 5,
      scores,
      profilKey: CODE_TO_DB.C,
    };
  }

  // Égalité stricte 2 profils → « en transition ».
  if (top.length === 2) {
    // Ordre déterministe : on présente l'ordre canonique A,B,C,D comme dominant.
    const a = top[0]!;
    const b = top[1]!;
    return {
      dominant: a,
      secondary: b,
      mixed: false,
      tonDoux: a === "C" && scores.C >= 5,
      scores,
      profilKey: `transition_${a}${b}`,
    };
  }

  // Profil unique dominant.
  const dominant = top[0]!;
  return {
    dominant,
    secondary: null,
    mixed: false,
    tonDoux: dominant === "C" && scores.C >= 5,
    scores,
    profilKey: CODE_TO_DB[dominant],
  };
}
