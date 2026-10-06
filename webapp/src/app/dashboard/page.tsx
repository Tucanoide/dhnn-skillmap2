"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Ring from "@/components/Ring";
import { Ic } from "@/components/icons";
import { api, currentUser } from "@/lib/client-api";
import { BUCKET_META, LEVELS, LEVEL_DESCRIPTIONS, isStale, lastUpdateLabel, fmtNum } from "@/lib/person-ui";

interface Persona {
  id: number;
  nombre: string;
  rol_puesto: string;
  area: string;
  banda: string;
  seniority: string | null;
  lider_nombre: string | null;
}
interface Skill {
  id: number;
  skill_id: number;
  nombre: string;
  categoria: string;
  bucket: "core" | "blandas" | "desarrollar";
  nivel_actual: number;
  nivel_objetivo: number;
  autoeval_fecha: string | null;
  lider_validacion_fecha: string | null;
  lider_ajusto: boolean | null;
}
interface MeData {
  persona: Persona;
  skills: Skill[];
}

function ValidationChip({ s }: { s: Skill }) {
  if (!s.nivel_actual) return <span className="vchip v-none"><Ic.clock size={13} />Sin autoevaluar</span>;
  if (s.lider_ajusto) return <span className="vchip v-adj"><Ic.pencil size={12} sw={2} />Ajustada · líder {s.nivel_actual}</span>;
  if (s.lider_validacion_fecha) return <span className="vchip v-ok"><Ic.check size={13} sw={2.4} />Validada</span>;
  return <span className="vchip v-pend"><Ic.clock size={13} />Pendiente</span>;
}

function LevelPicker({ skill, onPick }: { skill: Skill; onPick: (v: number) => void }) {
  const color = BUCKET_META[skill.bucket].color;
  return (
    <div className="picker">
      <span className="picker-ind" style={{ transform: `translateX(${skill.nivel_actual * 38}px)`, background: color }} />
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          className={"pk mono" + (skill.nivel_actual === n ? " on" : "")}
          title={`${LEVELS[n]}: ${LEVEL_DESCRIPTIONS[n]}`}
          onClick={() => onPick(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function SkillRow({ s, onLevel }: { s: Skill; onLevel: (skillId: number, n: number) => void }) {
  const color = BUCKET_META[s.bucket].color;
  const showArea = s.categoria && s.categoria !== "Habilidades blandas";
  return (
    <div className="srow" style={{ padding: "18px 22px", borderTop: "1px solid var(--hair)" }}>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="dot" style={{ width: 10, height: 10, background: color }} />
        <span className="text-[14.5px] font-semibold">{s.nombre}</span>
        <span className="chip tag" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color, fontWeight: 650 }}>
          {BUCKET_META[s.bucket].tag}
        </span>
        {showArea && <span className="chip tag">{s.categoria}</span>}
        <span className="ml-auto"><ValidationChip s={s} /></span>
      </div>
      <div className="mt-3.5 flex items-center gap-4 flex-wrap">
        <div className="bar flex-1" style={{ maxWidth: 360, minWidth: 160 }}>
          <div className="bar-fill" style={{ width: `${(s.nivel_actual / 5) * 100}%`, background: color }} />
          {s.lider_ajusto && <span className="bar-leader" style={{ left: `${(s.nivel_actual / 5) * 100}%` }} />}
          <div className="bar-target" style={{ left: `${(s.nivel_objetivo / 5) * 100}%` }} />
        </div>
        <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>
          {s.nivel_actual ? <strong style={{ color: "var(--text)" }}>{LEVELS[s.nivel_actual]}</strong> : null}
          {s.nivel_actual ? " · " : ""}
          {s.nivel_actual >= s.nivel_objetivo ? <span style={{ color: "var(--ok)" }}>en objetivo</span> : `obj. ${s.nivel_objetivo}`} · {lastUpdateLabel(s.autoeval_fecha)}
        </div>
        <LevelPicker skill={s} onPick={(n) => onLevel(s.skill_id, n)} />
      </div>
    </div>
  );
}

function GapChart({ skills }: { skills: Skill[] }) {
  const list = skills.filter((s) => s.nivel_actual != null);
  const W = 460, x0 = 14, x1 = W - 14, top = 34, rowH = 62;
  const H = top + list.length * rowH + 6;
  const X = (v: number) => x0 + (v / 5) * (x1 - x0);
  const below = list.filter((s) => s.nivel_actual < s.nivel_objetivo);
  const totalGap = below.reduce((a, s) => a + (s.nivel_objetivo - s.nivel_actual), 0);

  if (!list.length) {
    return (
      <div className="card" style={{ height: "100%" }}>
        <div className="card-header"><div className="card-title">Brecha vs. objetivo</div></div>
        <div className="card-body"><div className="empty-state">Autoevaluate para ver tu brecha.</div></div>
      </div>
    );
  }

  return (
    <div className="glass" style={{ height: "100%", padding: "20px 22px" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold">Brecha vs. objetivo</h2>
          <p className="text-[12.5px] mt-0.5" style={{ color: "var(--muted)" }}>Dónde estás y a dónde querés llegar</p>
        </div>
        <span className="iconbtn" aria-hidden="true"><Ic.target size={17} /></span>
      </div>
      <div className="mt-4 flex items-end gap-3">
        <span className="text-[34px] font-semibold leading-none">{below.length}</span>
        <p className="text-[12.5px] leading-snug pb-0.5" style={{ color: "var(--muted)" }}>
          {below.length === 1 ? "skill por debajo" : "skills por debajo"} del objetivo
          <br />
          <strong style={{ color: "var(--text)" }}>{totalGap} {totalGap === 1 ? "nivel" : "niveles"} para cerrar la brecha</strong>
        </p>
      </div>
      <svg className="gchart w-full h-auto mt-4" viewBox={`0 0 ${W} ${H}`}>
        {[0, 1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={X(v)} x2={X(v)} y1={top - 8} y2={H - 4} stroke="var(--hair)" strokeWidth="1" />
            <text x={X(v)} y={top - 16} textAnchor="middle" fontSize="10.5" fill="var(--faint)">{v}</text>
          </g>
        ))}
        {list.map((s, i) => {
          const color = BUCKET_META[s.bucket].color;
          const y = top + i * rowH + 38;
          const a = Math.min(s.nivel_actual, s.nivel_objetivo);
          const b = Math.max(s.nivel_actual, s.nivel_objetivo);
          const gap = s.nivel_actual - s.nivel_objetivo;
          const gapLabel = gap >= 0 ? (gap === 0 ? "✓ en objetivo" : `+${gap} sobre obj.`) : `${gap} nivel${gap === -1 ? "" : "es"}`;
          return (
            <g key={s.id}>
              <text x={x0} y={y - 16} fontSize="12" fontWeight="650" fill="var(--text)">{s.nombre}</text>
              <text x={x1} y={y - 16} fontSize="11" fontWeight="650" textAnchor="end" fill={gap >= 0 ? "var(--ok)" : "var(--muted)"}>{gapLabel}</text>
              <line x1={x0} x2={x1} y1={y} y2={y} stroke="var(--track)" strokeWidth="6" strokeLinecap="round" />
              <rect x={X(a)} y={y - 3} height="6" rx="3" width={Math.max(0.01, X(b) - X(a))} fill={color} opacity=".35" />
              {s.lider_ajusto && (
                <rect x={X(s.nivel_actual) - 5} y={y - 5} width="10" height="10" transform={`rotate(45 ${X(s.nivel_actual)} ${y})`} fill="var(--glass-strong)" stroke="var(--text)" strokeWidth="1.8" rx="1.5" />
              )}
              <circle cx={X(s.nivel_objetivo)} cy={y} r="8" fill="var(--glass-strong)" stroke="var(--text)" strokeWidth="2" />
              <circle cx={X(s.nivel_actual)} cy={y} r="6.5" fill={color} stroke="var(--glass-strong)" strokeWidth="2" />
            </g>
          );
        })}
      </svg>
      <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2 text-[11.5px]" style={{ color: "var(--muted)" }}>
        <span>● Tu nivel</span>
        <span>○ Objetivo</span>
        <span>◇ Ajustado por líder</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<MeData | null>(null);
  const [error, setError] = useState("");
  const [bucket, setBucket] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  async function load() {
    try {
      const d = await api<MeData>("/me");
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onLevel(skillId: number, nivel: number) {
    await api(`/me/skills/${skillId}/autoeval`, { method: "POST", body: JSON.stringify({ nivel_actual: nivel }) });
    await load();
  }

  if (error) return <AppShell title="Mi mapa de habilidades" subtitle="Autoevaluate: elegí tu nivel actual en cada skill"><div className="error-banner">{error}</div></AppShell>;
  if (!data) return null;

  const { persona, skills } = data;
  const user = currentUser();
  const done = skills.filter((s) => s.nivel_actual > 0);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const avgTarget = avg(skills.map((s) => s.nivel_objetivo));
  const pending = skills.filter((s) => isStale(s.autoeval_fecha));
  const filtered = bucket ? skills.filter((s) => s.bucket === bucket) : skills;
  const counts = { validada: 0, ajustada: 0, pendiente: 0 };
  for (const s of done) {
    if (s.lider_ajusto) counts.ajustada++;
    else if (s.lider_validacion_fecha) counts.validada++;
    else counts.pendiente++;
  }
  const segs = [
    { k: "validada" as const, label: "validadas", color: "var(--ok)" },
    { k: "ajustada" as const, label: "ajustadas", color: "var(--text)" },
    { k: "pendiente" as const, label: "pendientes", color: "var(--faint)" },
  ];

  return (
    <AppShell title="Mi mapa de habilidades" subtitle="Autoevaluate: elegí tu nivel actual en cada skill">
      <section className="glass p-5 sm:p-7 rise" aria-label="Perfil">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
            <div className="relative flex-none" style={{ width: 84, height: 84 }}>
              <div className="avatar-ring absolute inset-0 rounded-full" aria-hidden="true" />
              <div className="absolute rounded-full overflow-hidden" style={{ inset: 3, background: "var(--glass-strong)" }}>
                <Avatar name={persona.nombre} size={78} className="text-[22px] font-semibold" />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] leading-tight">{persona.nombre}</h2>
              <p className="mt-0.5" style={{ color: "var(--muted)" }}>{persona.rol_puesto} · {persona.area}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span className="chip tag">{persona.banda}{persona.seniority ? ` · ${persona.seniority}` : ""}</span>
                {user?.esLider && <span className="chip tag" style={{ background: "var(--lime)", color: "var(--lime-ink)" }}>Líder</span>}
              </div>
            </div>
          </div>
          {persona.lider_nombre && (
            <div className="lg:w-[270px] flex-none">
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow">Validación del líder</span>
                <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--muted)" }}>
                  <Avatar name={persona.lider_nombre} size={22} />
                  {persona.lider_nombre}
                </span>
              </div>
              <div className="mt-3 flex h-2.5 rounded-full overflow-hidden gap-[3px]" role="img" aria-label={`${counts.validada} validadas, ${counts.ajustada} ajustadas, ${counts.pendiente} pendientes`}>
                {segs.map((s) => counts[s.k] > 0 && <div key={s.k} style={{ flex: counts[s.k], background: s.color }} className="rounded-full" />)}
                {done.length === 0 && <div style={{ flex: 1, background: "var(--track)" }} className="rounded-full" />}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ color: "var(--muted)" }}>
                {segs.map((s) => (
                  <span key={s.k} className="flex items-center gap-1.5">
                    <span className="dot" style={{ background: s.color }} />
                    <b className="num font-semibold" style={{ color: "var(--text)" }}>{counts[s.k]}</b> {s.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:w-[400px] flex-none">
            <div className="rounded-[20px] p-3.5 sm:p-4" style={{ background: "var(--chip)" }}>
              <div className="text-[28px] sm:text-[34px] font-semibold leading-none num">{done.length}<span style={{ color: "var(--faint)" }}>/{skills.length}</span></div>
              <div className="eyebrow mt-2">Autoevaluadas</div>
            </div>
            <div className="rounded-[20px] p-3.5 sm:p-4" style={{ background: "var(--lime)", color: "var(--lime-ink)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)" }}>
              <div className="text-[28px] sm:text-[34px] font-semibold leading-none num">{fmtNum(avg(done.map((s) => s.nivel_actual)), 1)}</div>
              <div className="eyebrow mt-2" style={{ color: "var(--lime-ink)", opacity: 0.72 }}>Nivel promedio</div>
            </div>
            <div className="rounded-[20px] p-3.5 sm:p-4" style={{ background: "var(--chip)" }}>
              <div className="text-[28px] sm:text-[34px] font-semibold leading-none num">{Number.isInteger(avgTarget) ? avgTarget : fmtNum(avgTarget, 1)}</div>
              <div className="eyebrow mt-2">Objetivo prom.</div>
            </div>
          </div>
        </div>
      </section>

      {pending.length > 0 && (
        <div className="rounded-2xl px-5 py-3 text-[12.5px]" style={{ background: "rgba(255,224,51,.16)", border: "1px solid rgba(200,168,10,.28)", color: "#6b5200" }}>
          ⏰ Tenés {pending.length} habilidad{pending.length === 1 ? "" : "es"} sin autoevaluar o desactualizada{pending.length === 1 ? "" : "s"}. Dale una vuelta a tu mapa para mantenerlo al día.
        </div>
      )}

      <section className="glass rise" style={{ borderRadius: 22 }}>
        <button className="open-btn w-full flex items-center gap-3 px-6 h-[56px] text-left" aria-expanded={guideOpen} onClick={() => setGuideOpen((o) => !o)}>
          <Ic.help size={18} style={{ color: "var(--muted)" }} />
          <span className="font-medium text-[14px]">¿Qué significa cada nivel?</span>
          <span className="ml-auto iconbtn" style={{ width: 30, height: 30 }}>
            <span className="chev" style={{ transform: guideOpen ? "rotate(180deg)" : undefined }}><Ic.chevron size={15} /></span>
          </span>
        </button>
        <div className={"collapse" + (guideOpen ? " open" : "")}>
          <div>
            <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 px-6 pb-6">
              {LEVELS.map((label, n) => (
                <li key={n} className="rounded-[16px] p-3.5" style={{ background: "var(--chip)" }}>
                  <div className="text-[13px] font-semibold"><span className="mono mr-1" style={{ color: "var(--faint)" }}>{n}</span>{label}</div>
                  <p className="text-[12px] leading-snug mt-1" style={{ color: "var(--muted)" }}>{LEVEL_DESCRIPTIONS[n]}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <div className="stat-row grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {(["core", "blandas", "desarrollar"] as const).map((b, i) => {
          const items = skills.filter((s) => s.bucket === b);
          const rated = items.filter((s) => s.nivel_actual > 0);
          const avgLevel = rated.length ? avg(rated.map((s) => s.nivel_actual)) : 0;
          const avgT = items.length ? avg(items.map((s) => s.nivel_objetivo)) : 0;
          const meta = BUCKET_META[b];
          const dark = i === 2;
          const gradients = [
            "linear-gradient(150deg,#3448F0,#2536C9)",
            "linear-gradient(150deg,#7A3FF0,#5D25CF)",
            "linear-gradient(150deg,#C8F23A,#91da1e)",
          ];
          return (
            <button
              key={b}
              className="cat text-left"
              style={{ background: gradients[i], color: dark ? "#1A1206" : "#fff", ["--glow" as string]: "rgba(0,0,0,.3)" }}
              onClick={() => setBucket(bucket === b ? null : b)}
            >
              <div className="relative z-[1]">
                <div className="text-[11px] font-semibold opacity-80">{meta.tag}</div>
                <div className="text-[16px] font-semibold mt-0.5">{meta.label}</div>
              </div>
              <div className="relative z-[1] flex items-end justify-between gap-3 mt-4">
                <div>
                  <div className="text-[13px] font-semibold"><span className="text-[32px]">{items.length}</span> {items.length === 1 ? "skill" : "skills"}</div>
                  <div className="text-[12px] mt-1 opacity-85">{items.length ? `Objetivo prom. ${avgT.toFixed(1)}` : "Sin skills cargadas"}</div>
                </div>
                <Ring value={avgLevel} max={5} size={52} stroke={5} color={dark ? "rgba(26,18,6,.85)" : "rgba(255,255,255,.95)"} track={dark ? "rgba(26,18,6,.14)" : "rgba(255,255,255,.24)"}>
                  <span className="text-[13px] font-semibold">{rated.length ? avgLevel.toFixed(1) : "—"}</span>
                </Ring>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8">
          <div className="glass overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 flex-wrap">
              <div>
                <h2 className="text-[16px] font-semibold">Inventario de skills</h2>
                <p className="text-[12.5px] mt-0.5" style={{ color: "var(--muted)" }}>{done.length} de {skills.length} skills · elegí tu nivel actual en cada una</p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <span className={"chip fchip" + (!bucket ? " on" : "")} onClick={() => setBucket(null)}>Todas {skills.length}</span>
                {(["core", "blandas", "desarrollar"] as const).map((b) => (
                  <span key={b} className={"chip fchip" + (bucket === b ? " on" : "")} onClick={() => setBucket(b)}>
                    <span className="dot" style={{ background: BUCKET_META[b].color }} />
                    {BUCKET_META[b].label} {skills.filter((s) => s.bucket === b).length}
                  </span>
                ))}
              </div>
            </div>
            <div>
              {filtered.length === 0 ? (
                <div className="px-6 pb-6 text-[13px]" style={{ color: "var(--muted)" }}>No hay skills en esta categoría.</div>
              ) : (
                filtered.map((s) => <SkillRow key={s.id} s={s} onLevel={onLevel} />)
              )}
            </div>
          </div>
        </div>
        <div className="xl:col-span-4"><GapChart skills={skills} /></div>
      </div>
    </AppShell>
  );
}
