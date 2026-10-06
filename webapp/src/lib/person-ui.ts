const AVATAR_BG: Record<string, string> = {
  "melisa fernandez": "#e6f7b0",
  "sofia mendez": "#ddd3ff",
  "lucas davison": "#cfdcff",
  "nicolas ruiz": "#ffdcc4",
};

const AVATAR_IMG: Record<string, string> = {
  "melisa fernandez": "/avatars/mf.svg",
  "sofia mendez": "/avatars/sm.svg",
  "lucas davison": "/avatars/ld.svg",
  "nicolas ruiz": "/avatars/nr.svg",
};

const PALETTE = ["e6f7b0", "ddd3ff", "cfdcff", "ffdcc4", "c8f4e0", "ffd6e8", "fff3b0", "d6f0ff"];

function normName(name: string): string {
  return (name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function avatarBg(name: string): string {
  return AVATAR_BG[normName(name)] || `#${hashColor(normName(name))}`;
}

// Everyone gets an illustrated avatar: the 4 real ones we have, or a
// deterministic generated one (same "Notionists" style/library) for the rest.
export function avatarImg(name: string): string {
  const known = AVATAR_IMG[normName(name)];
  if (known) return known;
  const seed = encodeURIComponent(normName(name));
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}&backgroundColor=${hashColor(normName(name))}`;
}

export function fmtNum(n: number, decimals = 1): string {
  const d = Math.pow(10, decimals);
  return (Math.round(n * d) / d).toFixed(decimals).replace(".", ",");
}

export function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export const BUCKET_META: Record<string, { label: string; tag: string; color: string }> = {
  core: { label: "Core", tag: "#Core", color: "#3448F0" },
  blandas: { label: "Habilidades blandas", tag: "#Blandas", color: "#7A3FF0" },
  desarrollar: { label: "A desarrollar", tag: "#ADesarrollar", color: "#FF8A3D" },
};

export const LEVELS = ["Sin autoevaluar", "Aprendiz", "Iniciado", "Competente", "Avanzado", "Maestro"];
export const LEVEL_DESCRIPTIONS = [
  "Todavía no evaluaste tu nivel en esta habilidad.",
  "Conocimientos básicos o teóricos; necesitás guía constante para aplicarlo.",
  "Podés aplicarlo en tareas simples, con supervisión.",
  "Lo aplicás de forma autónoma en tu trabajo diario.",
  "Dominás la habilidad y podés ayudar o guiar a otros.",
  "Sos referente: definís buenas prácticas y formás a otros.",
];
const STALE_DAYS = 90;

export function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr + "T00:00:00").getTime()) / 86400000);
}
export function isStale(dateStr: string | null): boolean {
  return daysSince(dateStr) > STALE_DAYS;
}
export function lastUpdateLabel(dateStr: string | null): string {
  if (!dateStr) return "nunca autoevaluada";
  const d = daysSince(dateStr);
  if (d === 0) return "hoy";
  if (d === 1) return "hace 1 día";
  return `hace ${d} días`;
}
