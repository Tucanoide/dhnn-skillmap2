"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { Ic } from "@/components/icons";
import { api } from "@/lib/client-api";

interface Pooler {
  id: number;
  nombre: string;
  tipo: string;
}
interface TeamMember {
  person_id: number;
  nombre: string;
  tipo: string;
  rol_en_equipo: string;
  justificacion: string;
}
interface TeamResult {
  resumen: string;
  equipo: TeamMember[];
  gaps: string;
}

const EXAMPLES = [
  "Necesitamos armar un equipo para una app móvil en React Native, 3 meses, con foco en UX y performance.",
  "Campaña de lanzamiento de marca con motion y dirección de arte, 6 semanas.",
  "Estrategia de IA generativa para el negocio, con liderazgo y comunicación con clientes.",
];

export default function TeambuilderPage() {
  const [pool, setPool] = useState<Pooler[]>([]);
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TeamResult | null>(null);

  useEffect(() => {
    api<Pooler[]>("/team").then(setPool).catch(() => {});
  }, []);

  async function generate() {
    if (!brief.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await api<TeamResult>("/admin/team-builder", { method: "POST", body: JSON.stringify({ brief }) });
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const internos = pool.filter((p) => p.tipo !== "freelance");
  const partners = pool.filter((p) => p.tipo === "freelance");

  function stack(list: Pooler[]) {
    return (
      <div className="flex">
        {list.map((p) => (
          <Avatar key={p.id} name={p.nombre} size={34} ring style={{ marginRight: -8 }} />
        ))}
      </div>
    );
  }

  return (
    <AppShell title="Armado de equipos (IA)" subtitle="Le contás el proyecto y la IA arma una propuesta de equipo con todo el pool — interno + ecosistema de partners">
      <div className="glass p-6 sm:p-7">
        <div className="flex gap-6 flex-wrap items-start">
          <div className="flex-1" style={{ minWidth: 280 }}>
            <div className="flex items-center gap-2">
              <span className="tag chip" style={{ background: "var(--core)", color: "#fff", fontWeight: 700 }}>IA</span>
              <h2 className="text-[19px] font-semibold m-0">Brief del proyecto</h2>
            </div>
            <p className="text-[13px] mt-1.5 mb-3.5" style={{ color: "var(--muted)" }}>Contá objetivo, tecnologías/skills necesarias, duración y tamaño de equipo si lo sabés.</p>
            <textarea className="field" rows={6} placeholder="Ej: Necesitamos armar un equipo para una app móvil en React Native, 3 meses, con foco en UX y performance..." value={brief} onChange={(e) => setBrief(e.target.value)} />
            <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
              <span className="text-[11.5px]" style={{ color: "var(--faint)" }}>Probá con:</span>
              {EXAMPLES.map((ex) => (
                <span key={ex} className="chip fchip" onClick={() => setBrief(ex)}>{ex.split(",")[0]}</span>
              ))}
            </div>
            <div className="mt-3.5">
              <button className="btn btn-ai" disabled={!brief.trim() || loading} onClick={generate}>
                <Ic.ai size={17} />{loading ? "Pensando…" : "Generar propuesta"}
              </button>
            </div>
            {error && <div className="error-banner mt-3">{error}</div>}
          </div>
          <aside className="glass p-5 flex flex-col gap-3.5" style={{ width: 260, flex: "none" }}>
            <div className="card-title">Pool disponible</div>
            <div>
              <div className="flex items-center justify-between text-[13px] font-semibold mb-2"><span>Interno</span><span style={{ color: "var(--muted)" }}>{internos.length}</span></div>
              {internos.length ? stack(internos) : <span className="text-[12px]" style={{ color: "var(--muted)" }}>Nadie cargado.</span>}
            </div>
            <div>
              <div className="flex items-center justify-between text-[13px] font-semibold mb-2"><span>Ecosistema de partners</span><span style={{ color: "var(--muted)" }}>{partners.length}</span></div>
              {partners.length ? stack(partners) : <span className="text-[12px]" style={{ color: "var(--muted)" }}>Nadie cargado.</span>}
            </div>
            <p className="text-[11.5px] leading-snug" style={{ color: "var(--muted)" }}>La propuesta usa el nivel autoevaluado de cada persona. Quien no tiene perfil de skills entra por su especialidad.</p>
          </aside>
        </div>
      </div>

      {result && (
        <>
          <div className="stat-row grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="stat-tile flex items-start justify-between">
              <div><div className="tile-val">{result.equipo.length}</div><div className="tile-lbl">Personas sugeridas</div></div>
              <span className="w-9 h-9 rounded-full grid place-items-center" style={{ background: "rgba(255,255,255,.24)" }}><Ic.team size={18} /></span>
            </div>
            <div className="stat-tile flex items-start justify-between">
              <div><div className="tile-val">{result.equipo.filter((m) => m.tipo === "freelance").length}</div><div className="tile-lbl">Del ecosistema de partners</div></div>
              <span className="w-9 h-9 rounded-full grid place-items-center" style={{ background: "rgba(255,255,255,.24)" }}><Ic.partners size={18} /></span>
            </div>
          </div>
          {result.resumen && <div className="note-banner">{result.resumen}</div>}
          {result.equipo.map((m) => (
            <div key={m.person_id} className="glass p-4">
              <div className="flex items-center gap-3">
                <Avatar name={m.nombre} size={40} />
                <div className="flex-1">
                  <div className="font-semibold text-[13.5px] flex items-center gap-2">
                    {m.nombre}
                    <span className="chip tag" style={m.tipo === "freelance" ? { background: "var(--dev)", color: "#fff" } : {}}>{m.tipo === "freelance" ? "Freelance" : "Interno"}</span>
                  </div>
                  <div className="text-[11.5px]" style={{ color: "var(--faint)" }}>{m.rol_en_equipo}</div>
                </div>
              </div>
              <p className="text-[12px] mt-2 leading-snug" style={{ color: "var(--muted)" }}>{m.justificacion}</p>
            </div>
          ))}
          {result.gaps && (
            <div className="rounded-2xl px-5 py-3 text-[12.5px]" style={{ background: "rgba(255,224,51,.16)", border: "1px solid rgba(200,168,10,.28)", color: "#6b5200" }}>
              ⚠ Gaps: {result.gaps}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
