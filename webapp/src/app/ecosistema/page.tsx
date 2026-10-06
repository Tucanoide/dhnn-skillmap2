"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { Ic } from "@/components/icons";
import { api } from "@/lib/client-api";
import { BUCKET_META, LEVELS, lastUpdateLabel } from "@/lib/person-ui";

interface Partner {
  id: number;
  nombre: string;
  email: string;
  rol_puesto: string;
  area: string;
  seniority: string | null;
  tipo: string;
  autoevaluados: number;
  total: number;
}
interface PartnerSkill {
  id: number;
  nombre: string;
  bucket: "core" | "blandas" | "desarrollar";
  nivel_actual: number;
  autoeval_fecha: string | null;
}
interface PartnerDetail {
  persona: Partner;
  skills: PartnerSkill[];
}

function statusFor(p: Partner) {
  if (!p.total) return { label: "Sin perfil", cls: "new" };
  if (!p.autoevaluados) return { label: "Para revisar", cls: "review" };
  return { label: "Activo", cls: "active" };
}

function statIcon(icon: React.ReactNode) {
  return (
    <span className="w-9 h-9 rounded-full grid place-items-center flex-none" style={{ background: "rgba(255,255,255,.24)" }}>
      {icon}
    </span>
  );
}

export default function EcosistemaPage() {
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [skillsByPerson, setSkillsByPerson] = useState<Record<number, PartnerSkill[]>>({});
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", rol_puesto: "", seniority: "Ssr", area: "Diseño" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");
  const [detail, setDetail] = useState<PartnerDetail | null>(null);

  function say(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function openProfile(id: number) {
    const d = await api<PartnerDetail>(`/team/${id}`);
    setDetail(d);
  }

  async function openCv(p: Partner) {
    const token = localStorage.getItem("skillmap_token");
    const res = await fetch(`/api/admin/people/${p.id}/cv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (res.status === 404) {
      say(`${p.nombre} todavía no tiene un CV subido.`);
      return;
    }
    if (!res.ok) {
      say("No se pudo abrir el CV.");
      return;
    }
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), "_blank");
  }

  async function load() {
    const team = await api<Partner[]>("/team");
    const onlyPartners = team.filter((p) => p.tipo === "freelance");
    setPartners(onlyPartners);
    for (const p of onlyPartners) {
      api<PartnerSkill[]>(`/admin/people/${p.id}/skills`)
        .then((s) => setSkillsByPerson((m) => ({ ...m, [p.id]: s })))
        .catch(() => {});
    }
  }
  useEffect(() => {
    load();
  }, []);

  const areas = useMemo(() => [...new Set((partners || []).map((p) => p.area))].sort(), [partners]);
  const list = useMemo(() => {
    const search = q.trim().toLowerCase();
    return (partners || []).filter((p) => {
      const haystack = [p.nombre, p.email, p.rol_puesto, p.area].filter(Boolean).join(" ").toLowerCase();
      const st = statusFor(p);
      return (!search || haystack.includes(search)) && (!area || p.area === area) && (!status || st.cls === status);
    });
  }, [partners, q, area, status]);

  async function createPartner() {
    setFormError("");
    if (!form.nombre || !form.email || !form.rol_puesto) {
      setFormError("Completá nombre, email y especialidad.");
      return;
    }
    if (!file) {
      setFormError("Subí el CV en PDF para que la IA detecte sus skills.");
      return;
    }
    setBusy(true);
    try {
      const created = await api<{ id: number }>("/admin/people", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.nombre,
          email: form.email,
          rol_puesto: form.rol_puesto,
          area: form.area,
          banda: "Freelance",
          seniority: form.seniority,
          tipo: "freelance",
        }),
      });
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("skillmap_token");
      const res = await fetch(`/api/admin/people/${created.id}/cv`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || `Error ${res.status}`);
      await load();
      setShowForm(false);
      setForm({ nombre: "", email: "", rol_puesto: "", seniority: "Ssr", area: "Diseño" });
      setFile(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!partners) return null;
  const withSkills = partners.filter((p) => p.autoevaluados > 0 || p.total > 0).length;

  return (
    <AppShell title="Ecosistema de partners" subtitle="Freelancers y partners externos — subí su CV y la IA arma su perfil de skills">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="stat-tile flex items-start justify-between">
          <div><div className="tile-val">{partners.length}</div><div className="tile-lbl">Partners en el ecosistema</div></div>
          {statIcon(<Ic.partners size={18} />)}
        </div>
        <div className="stat-tile flex items-start justify-between">
          <div><div className="tile-val">{areas.length}</div><div className="tile-lbl">Áreas representadas</div></div>
          {statIcon(<Ic.layers size={18} />)}
        </div>
        <div className="stat-tile flex items-start justify-between">
          <div><div className="tile-val">{withSkills}</div><div className="tile-lbl">Con skills cargadas</div></div>
          {statIcon(<Ic.check size={18} />)}
        </div>
      </div>

      <div className="glass p-4 sm:p-5" style={{ borderRadius: 24 }}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_190px_190px_auto] gap-3 items-end">
          <div>
            <label className="label">Buscar partner</label>
            <input className="field" placeholder="Nombre, email, rol o área" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <label className="label">Área</label>
            <div className="selwrap">
              <select className="field" value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="">Todas las áreas</option>
                {areas.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <Ic.chevron size={16} />
            </div>
          </div>
          <div>
            <label className="label">Estado</label>
            <div className="selwrap">
              <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="review">Para revisar</option>
                <option value="new">Sin perfil</option>
              </select>
              <Ic.chevron size={16} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ height: 44 }} onClick={() => setShowForm(true)}>
            <Ic.upload size={16} />Nuevo partner (subir CV)
          </button>
        </div>
      </div>

      <p className="text-[13px] px-1" style={{ color: "var(--muted)" }}>{list.length} de {partners.length} partners</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {list.map((p) => {
          const st = statusFor(p);
          const skills = skillsByPerson[p.id] || [];
          const rated = skills.filter((s) => s.nivel_actual > 0);
          const vchipStyle = st.cls === "active" ? { background: "var(--ok-bg)", color: "var(--ok)" } : { background: "var(--info-bg)", color: "var(--info)" };
          return (
            <article key={p.id} className="glass lift p-5 sm:p-6 flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <Avatar name={p.nombre} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[17px] font-semibold tracking-[-0.01em] truncate">{p.nombre}</h3>
                      <p className="text-[13px] truncate select-all" style={{ color: "var(--muted)" }}>{p.email}</p>
                    </div>
                    <span className="vchip flex-none" style={vchipStyle}>
                      <span className="dot" style={{ background: "currentColor" }} />{st.label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="chip tag" style={{ color: "var(--text)" }}>{p.rol_puesto}</span>
                    {p.seniority && <span className="chip tag">{p.seniority}</span>}
                    <span className="chip tag">{p.area}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-[18px] p-4" style={{ background: "var(--chip)" }}>
                {skills.length ? (
                  <>
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span style={{ color: "var(--muted)" }}>Skills</span>
                      <span className="font-semibold num">{rated.length}/{skills.length} skills</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {skills.map((s) => {
                        const color = BUCKET_META[s.bucket]?.color;
                        return (
                          <span
                            key={s.id}
                            className="chip tag"
                            style={s.nivel_actual > 0 ? { background: `color-mix(in srgb, ${color} 14%, transparent)`, color, fontWeight: 600 } : {}}
                          >
                            {s.nombre}
                            {s.nivel_actual > 0 && <span className="mono opacity-80">{s.nivel_actual}</span>}
                          </span>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-[13px]" style={{ color: "var(--muted)" }}>
                    <span className="spin inline-flex" style={{ color: "var(--soft)", animationDuration: "3s" }}><Ic.ai size={17} /></span>
                    Sin skills: la IA arma el perfil cuando esté el CV.
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => openProfile(p.id)}><Ic.user size={14} />Ver perfil</button>
                <button className="btn btn-ghost btn-sm" onClick={() => say("Para editar los datos de un partner, andá a Administración → Personas.")}><Ic.pencil size={13} />Editar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => openCv(p)}><Ic.file size={14} />CV</button>
              </div>
            </article>
          );
        })}
        {list.length === 0 && (
          <div className="glass lg:col-span-2 flex flex-col items-center text-center px-6 py-10 gap-2">
            <span className="iconbtn" style={{ width: 48, height: 48 }}><Ic.search size={20} /></span>
            <div className="font-semibold mt-1">No encontramos partners</div>
            <p className="text-[13px] max-w-[320px]" style={{ color: "var(--muted)" }}>Probá con otro nombre o limpiá los filtros.</p>
          </div>
        )}
      </div>

      <div className={"toast" + (toast ? " show" : "")}>{toast && <span>{toast}</span>}</div>

      {showForm && (
        <>
          <div className="scrim" onClick={() => !busy && setShowForm(false)} />
          <div className="modal glass-strong p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-[18px] font-semibold">Nuevo partner</h2>
                <p className="text-[12.5px] mt-0.5" style={{ color: "var(--muted)" }}>Subí su CV y la IA arma su perfil de skills.</p>
              </div>
              {!busy && <button className="iconbtn" onClick={() => setShowForm(false)}><Ic.x size={16} /></button>}
            </div>
            {busy ? (
              <div className="py-6 flex flex-col items-center text-center gap-3">
                <span className="spin inline-flex" style={{ color: "var(--soft)" }}><Ic.ai size={24} /></span>
                <div className="font-semibold">Leyendo el CV de {form.nombre.split(" ")[0]}…</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="label">Nombre y apellido</label>
                  <input className="field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Email</label>
                  <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Especialidad</label>
                  <input className="field" value={form.rol_puesto} onChange={(e) => setForm({ ...form, rol_puesto: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="label">Seniority</label>
                    <div className="selwrap">
                      <select className="field" value={form.seniority} onChange={(e) => setForm({ ...form, seniority: e.target.value })}>
                        <option>Jr</option><option>Ssr</option><option>Senior</option>
                      </select>
                      <Ic.chevron size={16} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Área</label>
                    <div className="selwrap">
                      <select className="field" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                        <option>Diseño</option><option>Tech</option><option>Management</option>
                      </select>
                      <Ic.chevron size={16} />
                    </div>
                  </div>
                </div>
                <label className={"drop sm:col-span-2 flex flex-col items-center justify-center text-center gap-2 py-7 px-4 cursor-pointer"}>
                  <span className="iconbtn" style={{ width: 44, height: 44 }}>{file ? <Ic.file size={19} /> : <Ic.upload size={19} />}</span>
                  {file ? <span className="font-medium">{file.name}</span> : <span className="font-medium">Hacé clic para elegir el CV (PDF)</span>}
                  <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
                </label>
                {formError && <div className="sm:col-span-2 error-banner">{formError}</div>}
                <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                  <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                  <button className="btn btn-ai" onClick={createPartner}><Ic.ai size={16} />Subir CV y crear perfil</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

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
                    {s.nivel_actual ? <>Nivel: <b style={{ color: "var(--text)" }}>{s.nivel_actual} · {LEVELS[s.nivel_actual]}</b></> : "Sin autoevaluar"} · {lastUpdateLabel(s.autoeval_fecha)}
                  </div>
                </div>
              ))}
              {detail.skills.length === 0 && (
                <p className="text-[13px] text-center py-6" style={{ color: "var(--muted)" }}>Todavía no tiene skills cargadas.</p>
              )}
            </div>
          </aside>
        </>
      )}
    </AppShell>
  );
}
