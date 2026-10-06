"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Ring from "@/components/Ring";
import { Ic } from "@/components/icons";
import { api, currentUser } from "@/lib/client-api";
import { BUCKET_META, LEVELS, LEVEL_DESCRIPTIONS, lastUpdateLabel } from "@/lib/person-ui";

interface PersonSummary {
  id: number;
  nombre: string;
  rol_puesto: string;
  area: string;
  banda: string;
  seniority: string | null;
  autoevaluados: number;
  total: number;
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
}
interface PersonDetail {
  persona: PersonSummary;
  skills: Skill[];
}

export default function TeamPage() {
  const [team, setTeam] = useState<PersonSummary[] | null>(null);
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [error, setError] = useState("");
  const user = typeof window !== "undefined" ? currentUser() : null;

  async function load() {
    try {
      const t = await api<PersonSummary[]>("/team");
      setTeam(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  useEffect(() => {
    if (user && !user.esLider && !user.esAdmin) {
      setError("No tenés equipo a cargo.");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openPerson(id: number) {
    const d = await api<PersonDetail>(`/team/${id}`);
    setDetail(d);
  }

  async function validar(skillId: number, nivel: number) {
    if (!detail) return;
    await api(`/team/${detail.persona.id}/skills/${skillId}/validar`, {
      method: "POST",
      body: JSON.stringify({ nivel_actual: nivel, ajustar: true }),
    });
    await openPerson(detail.persona.id);
    await load();
  }

  const title = user?.esAdmin ? "Todo el equipo" : "Mi equipo";

  if (error) return <AppShell title={title} subtitle="Validá o ajustá la autoevaluación de cada persona"><div className="error-banner">{error}</div></AppShell>;
  if (!team) return null;

  const pctAvg = team.length
    ? (team.reduce((a, p) => a + (p.total ? p.autoevaluados / p.total : 0), 0) / team.length) * 100
    : 0;

  return (
    <AppShell title={title} subtitle="Validá o ajustá la autoevaluación de cada persona">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="stat-tile flex items-start justify-between">
          <div><div className="tile-val">{team.length}</div><div className="tile-lbl">Personas</div></div>
          <span className="w-9 h-9 rounded-full grid place-items-center" style={{ background: "rgba(255,255,255,.24)" }}><Ic.team size={18} /></span>
        </div>
        <div className="stat-tile flex items-start justify-between">
          <div><div className="tile-val">{pctAvg.toFixed(0)}<span className="text-[20px] opacity-85">%</span></div><div className="tile-lbl">Skills autoevaluadas (prom.)</div></div>
          <span className="w-9 h-9 rounded-full grid place-items-center" style={{ background: "rgba(255,255,255,.24)" }}><Ic.ai size={18} /></span>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Personas ({team.length})</div></div>
        <table className="data-table w-full">
          <thead><tr><th>Nombre</th><th>Puesto</th><th>Área</th><th>Autoevaluación</th><th /></tr></thead>
          <tbody>
            {team.map((p) => {
              const pct = p.total ? p.autoevaluados / p.total : 0;
              return (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.nombre} size={32} />
                      {p.nombre}
                    </div>
                  </td>
                  <td>{p.rol_puesto}</td>
                  <td>{p.area}</td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Ring value={pct} max={1} size={32} stroke={3.5} color={p.total && p.autoevaluados === p.total ? "var(--ok)" : "var(--core)"}>
                        <span className="text-[9px] font-semibold num">{Math.round(pct * 100)}%</span>
                      </Ring>
                      <span className="num font-semibold">{p.autoevaluados}/{p.total}</span>
                    </div>
                  </td>
                  <td><a onClick={() => openPerson(p.id)} style={{ cursor: "pointer" }}>Ver / validar →</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && (
        <>
          <div className="scrim" onClick={() => setDetail(null)} />
          <aside className="drawer glass-strong p-6 overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <Avatar name={detail.persona.nombre} size={52} />
                <div>
                  <h2 className="text-[18px] font-semibold">{detail.persona.nombre}</h2>
                  <p className="text-[13px]" style={{ color: "var(--muted)" }}>{detail.persona.rol_puesto} · {detail.persona.area}</p>
                </div>
              </div>
              <button className="iconbtn" onClick={() => setDetail(null)}><Ic.x size={16} /></button>
            </div>
            <div className="flex flex-col gap-2.5">
              {detail.skills.map((s) => (
                <div key={s.id} className="rounded-2xl p-4" style={{ background: "var(--chip)" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="dot" style={{ background: BUCKET_META[s.bucket].color }} />
                    <span className="font-semibold">{s.nombre}</span>
                    <span className="chip tag" style={{ background: `color-mix(in srgb, ${BUCKET_META[s.bucket].color} 14%, transparent)`, color: BUCKET_META[s.bucket].color, fontWeight: 650 }}>
                      {BUCKET_META[s.bucket].tag}
                    </span>
                  </div>
                  <div className="text-[12px] mt-1.5" style={{ color: "var(--muted)" }}>
                    {s.nivel_actual ? <>Autoeval: <b style={{ color: "var(--text)" }}>{s.nivel_actual} · {LEVELS[s.nivel_actual]}</b></> : "Sin autoevaluar"} · obj. {s.nivel_objetivo} · {lastUpdateLabel(s.autoeval_fecha)}
                  </div>
                  <div className="flex gap-1 mt-3">
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        className={"eval-btn" + (s.nivel_actual === n ? " active" : "")}
                        title={`${LEVELS[n]}: ${LEVEL_DESCRIPTIONS[n]}`}
                        onClick={() => validar(s.skill_id, n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {s.lider_validacion_fecha && <div className="validated-tag mt-2">✓ validado</div>}
                </div>
              ))}
            </div>
          </aside>
        </>
      )}
    </AppShell>
  );
}
