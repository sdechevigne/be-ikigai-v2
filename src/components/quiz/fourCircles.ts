// Mini-diagramme des 4 cercles Ikigai en SVG.
// Met en évidence les cercles forts (couleur d'accent du profil) vs faibles (gris).
// Fonction pure → utilisable côté serveur (pages résultat statiques) et côté client.

import type { CercleKey, Lang, ProfilCode } from "../../data/quiz";
import { quizContent } from "../../data/quiz";

interface CircleGeo {
  key: CercleKey;
  cx: number;
  cy: number;
  labelX: number;
  labelY: number;
  anchor: "start" | "middle" | "end";
}

// Disposition en losange : Aimer (haut), Doué (droite), Payé (bas), Besoin (gauche).
const GEO: CircleGeo[] = [
  { key: "aimer", cx: 150, cy: 95, labelX: 150, labelY: 18, anchor: "middle" },
  { key: "doue", cx: 205, cy: 150, labelX: 292, labelY: 154, anchor: "end" },
  { key: "paye", cx: 150, cy: 205, labelX: 150, labelY: 292, anchor: "middle" },
  { key: "besoin", cx: 95, cy: 150, labelX: 8, labelY: 154, anchor: "start" },
];

const R = 78;
const DIM = "#cbd5e1"; // gris doux pour cercles faibles

/**
 * Renvoie le markup SVG du diagramme pour un profil donné.
 * `forts` reçoit la couleur d'accent ; les autres sont grisés.
 */
export function fourCirclesSvg(code: ProfilCode, lang: Lang = "fr"): string {
  const profil = quizContent[lang].profils[code];
  const labels = quizContent[lang].cercles;
  const accent = profil.accentColor;
  const fortsSet = new Set<CercleKey>(profil.forts);

  const circles = GEO.map((g) => {
    const isFort = fortsSet.has(g.key);
    const stroke = isFort ? accent : DIM;
    const fill = isFort ? accent : DIM;
    const fillOpacity = isFort ? 0.22 : 0.08;
    return `<circle cx="${g.cx}" cy="${g.cy}" r="${R}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${isFort ? 2.5 : 1.5}" />`;
  }).join("");

  const texts = GEO.map((g) => {
    const isFort = fortsSet.has(g.key);
    const color = isFort ? accent : "#94a3b8";
    const weight = isFort ? 700 : 400;
    return `<text x="${g.labelX}" y="${g.labelY}" text-anchor="${g.anchor}" font-family="Lato, sans-serif" font-size="13" font-weight="${weight}" fill="${color}">${escapeXml(labels[g.key])}</text>`;
  }).join("");

  return `<svg viewBox="0 0 300 300" role="img" aria-label="Diagramme Ikigai du profil ${escapeXml(profil.nom)}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-width:340px">${circles}${texts}</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
