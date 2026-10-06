"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { Ic } from "@/components/icons";
import { api } from "@/lib/client-api";
import { BUCKET_META } from "@/lib/person-ui";

interface Person {
  id: number;
  nombre: string;
  email: string;
  rol_puesto: string;
  area: string;
  banda: string;
  seniority: string | null;
  lider_id: number | null;
  lider_nombre: string | null;
  es_admin: boolean;
  tipo: string;
}
interface Skill {
  id: number;
  nombre: string;
  categoria: string;
  tipo: string;
  activo: boolean;
}
interface PersonSkill {
  id: number;
  skill_id: number;
  nombre: string;
  categoria: string;
  bucket: string;
  nivel_actual: number;
}

type Tab = "personas" | "matriz" | "skills";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("personas");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [skillsAll, setSkillsAll] = useState<Skill[] | null>(null);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [matrix, setMatrix] = useState<Record<number, PersonSkill[]>>({});
  const [personForm, setPersonForm] = useState<Partial<Person> | null | "new">(null);
  const [skillForm, setSkillForm] = useState<Partial<Skill> | null | "new">(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  async function loadPeople() {
    setPeople(await api<Person[]>("/admin/people"));
  }
  async function loadSkills() {
    setSkills(await api<Skill[]>("/admin/skills"));
  }
  useEffect(() => {
    loadPeople();
    loadSkills();
  }, []);

  useEffect(() => {
    if (tab === "matriz" && people) {
      people.forEach(async (p) => {
        if (!matrix[p.id]) {
          const s = await api<PersonSkill[]>(`/admin/people/${p.id}/skills`);
          setMatrix((m) => ({ ...m, [p.id]: s }));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, people]);

  function say(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function savePerson(body: Partial<Person>) {
    const payload = {
      nombre: body.nombre,
      email: body.email,
      rol_puesto: body.rol_puesto,
      area: body.area,
      banda: body.banda,
      seniority: body.seniority || null,
      lider_id: body.lider_id || null,
      es_admin: body.es_admin || false,
      tipo: body.tipo || "interno",
    };
    if (personForm !== "new" && body.id) {
      await api(`/admin/people/${body.id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await api("/admin/people", { method: "POST", body: JSON.stringify(payload) });
    }
    setPersonForm(null);
    await loadPeople();
    say("Cambios guardados.");
  }

  async function deletePerson(id: number) {
    await api(`/admin/people/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    await loadPeople();
    say("Persona borrada.");
  }

  async function toggleSkillActivo(s: Skill) {
    await api(`/admin/skills/${s.id}`, { method: "PUT", body: JSON.stringify({ nombre: s.nombre, categoria: s.categoria, tipo: s.tipo, activo: !s.activo }) });
    await loadSkills();
    if (showAllSkills) setSkillsAll(await api<Skill[]>("/admin/skills?incluir_inactivas=true"));
  }

  async function toggleShowAll() {
    const next = !showAllSkills;
    setShowAllSkills(next);
    if (next) setSkillsAll(await api<Skill[]>("/admin/skills?incluir_inactivas=true"));
  }

  async function saveSkill(body: Partial<Skill>) {
    const payload = { nombre: body.nombre, categoria: body.categoria, tipo: body.tipo, activo: body.activo ?? true };
    if (skillForm !== "new" && body.id) {
      await api(`/admin/skills/${body.id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await api("/admin/skills", { method: "POST", body: JSON.stringify(payload) });
    }
    setSkillForm(null);
    await loadSkills();
    if (showAllSkills) setSkillsAll(await api<Skill[]>("/admin/skills?incluir_inactivas=true"));
    say("Skill guardado.");
  }

  if (!people || !skills) return null;
  const skillList = showAllSkills ? skillsAll || [] : skills;

  return (
    <AppShell title="Administración" subtitle="Personas, catálogo de skills y tareas asignadas">
      <div className="seg">
        {(["personas", "matriz", "skills"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)} style={tab === t ? { background: "var(--text)", color: "var(--bg)", borderRadius: 10 } : {}}>
            {t === "personas" ? "Personas" : t === "matriz" ? "Habilidades por persona" : "Catálogo de skills"}
          </button>
        ))}
      </div>

      {tab === "personas" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Personas ({people.length})</div>
            <button className="btn btn-primary" onClick={() => setPersonForm("new")}><Ic.plus size={16} />Nueva persona</button>
          </div>
          <table className="data-table w-full">
            <thead><tr><th>Nombre</th><th>Puesto</th><th>Área</th><th>Banda</th><th>Líder</th><th>Admin</th><th /></tr></thead>
            <tbody>
              {people.map((p) => (
                confirmDelete === p.id ? (
                  <tr key={p.id} style={{ background: "var(--danger-bg)" }}>
                    <td colSpan={7} className="py-3 px-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span>¿Borrar a <b>{p.nombre}</b>?</span>
                        <span className="flex gap-2">
                          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deletePerson(p.id)}><Ic.trash size={13} />Borrar</button>
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.nombre} size={32} />
                        {p.nombre}
                      </div>
                    </td>
                    <td>{p.rol_puesto}</td>
                    <td><span className="chip tag">{p.area}</span></td>
                    <td>{p.banda}</td>
                    <td>{p.lider_nombre || "—"}</td>
                    <td>{p.es_admin ? "✓" : ""}</td>
                    <td>
                      <a onClick={() => setPersonForm(p)} style={{ cursor: "pointer" }}>Editar</a> ·{" "}
                      <a onClick={() => say(`${p.nombre} no tiene tareas asignadas todavía.`)} style={{ cursor: "pointer" }}>Tareas</a> ·{" "}
                      <a onClick={() => setConfirmDelete(p.id)} style={{ cursor: "pointer", color: "var(--danger)" }}>Borrar</a>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "matriz" && (
        <div className="card overflow-x-auto">
          <div className="card-header"><div className="card-title">Habilidades por persona</div></div>
          <div className="px-5 pb-5">
            {people.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: "1px solid var(--hair)" }}>
                <Avatar name={p.nombre} size={30} className="flex-none" />
                <span className="font-medium text-[13px] flex-none" style={{ width: 160 }}>{p.nombre}</span>
                <div className="flex flex-wrap gap-1.5">
                  {(matrix[p.id] || []).filter((s) => s.nivel_actual > 0).map((s) => (
                    <span key={s.id} className="chip tag" style={{ background: `color-mix(in srgb, ${BUCKET_META[s.bucket]?.color || "#999"} 18%, transparent)` }}>
                      {s.nombre} <span className="mono opacity-70">{s.nivel_actual}</span>
                    </span>
                  ))}
                  {matrix[p.id] && matrix[p.id].filter((s) => s.nivel_actual > 0).length === 0 && (
                    <span className="text-[12px]" style={{ color: "var(--faint)" }}>Sin skills autoevaluadas.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "skills" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Catálogo de skills ({skillList.length}{showAllSkills ? ` de ${skillsAll?.length ?? 0}` : ""})</div>
            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-1.5 text-[12px] cursor-pointer" style={{ color: "var(--muted)" }}>
                <input type="checkbox" checked={showAllSkills} onChange={toggleShowAll} /> Mostrar también las inactivas
              </label>
              <button className="btn btn-primary" onClick={() => setSkillForm("new")}><Ic.plus size={16} />Nuevo skill</button>
            </div>
          </div>
          <table className="data-table w-full">
            <thead><tr><th>Nombre</th><th>Categoría</th><th>Tipo</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {skillList.map((s) => (
                <tr key={s.id} style={{ opacity: s.activo ? 1 : 0.55 }}>
                  <td>{s.nombre}</td>
                  <td>{s.categoria}</td>
                  <td>{s.tipo}</td>
                  <td>{s.activo ? <span className="validated-tag">Activa</span> : <span className="text-[11px]" style={{ color: "var(--muted)" }}>Inactiva</span>}</td>
                  <td>
                    <a onClick={() => setSkillForm(s)} style={{ cursor: "pointer" }}>Editar</a> ·{" "}
                    <a onClick={() => toggleSkillActivo(s)} style={{ cursor: "pointer" }}>{s.activo ? "Desactivar" : "Activar"}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {personForm && (
        <PersonFormModal
          initial={personForm === "new" ? null : personForm}
          people={people}
          onClose={() => setPersonForm(null)}
          onSave={savePerson}
        />
      )}
      {skillForm && (
        <SkillFormModal initial={skillForm === "new" ? null : skillForm} onClose={() => setSkillForm(null)} onSave={saveSkill} />
      )}

      <div className={"toast" + (toast ? " show" : "")}>{toast && <span>{toast}</span>}</div>
    </AppShell>
  );
}

function PersonFormModal({
  initial,
  people,
  onClose,
  onSave,
}: {
  initial: Partial<Person> | null;
  people: Person[];
  onClose: () => void;
  onSave: (body: Partial<Person>) => void;
}) {
  const [f, setF] = useState<Partial<Person>>(initial || { banda: "Management", tipo: "interno" });
  const valid = f.nombre?.trim() && f.email?.trim() && f.rol_puesto?.trim() && f.area?.trim();
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal glass-strong p-6">
        <h2 className="text-[18px] font-semibold mb-4">{initial ? `Editar a ${initial.nombre}` : "Nueva persona"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2"><label className="label">Nombre</label><input className="field" value={f.nombre || ""} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Email</label><input className="field" value={f.email || ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><label className="label">Puesto</label><input className="field" value={f.rol_puesto || ""} onChange={(e) => setF({ ...f, rol_puesto: e.target.value })} /></div>
          <div><label className="label">Área</label><input className="field" value={f.area || ""} onChange={(e) => setF({ ...f, area: e.target.value })} /></div>
          <div>
            <label className="label">Banda</label>
            <div className="selwrap">
              <select className="field" value={f.banda || "Management"} onChange={(e) => setF({ ...f, banda: e.target.value })}>
                <option>Management</option><option>Lead</option><option>Staff</option><option>PM</option><option>Diseñador</option><option>Desarrollador</option><option>Freelance</option>
              </select>
              <Ic.chevron size={16} />
            </div>
          </div>
          <div>
            <label className="label">Líder</label>
            <div className="selwrap">
              <select className="field" value={f.lider_id ?? ""} onChange={(e) => setF({ ...f, lider_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Sin líder</option>
                {people.filter((p) => p.id !== initial?.id).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <Ic.chevron size={16} />
            </div>
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: "var(--chip)" }}>
            <div className="font-medium text-[13px]">Admin (People)</div>
            <button type="button" className="switch" role="switch" aria-checked={!!f.es_admin} onClick={() => setF({ ...f, es_admin: !f.es_admin })} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(f)}>Guardar</button>
          </div>
        </div>
      </div>
    </>
  );
}

function SkillFormModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Partial<Skill> | null;
  onClose: () => void;
  onSave: (body: Partial<Skill>) => void;
}) {
  const [f, setF] = useState<Partial<Skill>>(initial || { tipo: "dura", activo: true });
  const valid = f.nombre?.trim() && f.categoria?.trim();
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal glass-strong p-6">
        <h2 className="text-[18px] font-semibold mb-4">{initial ? "Editar skill" : "Nuevo skill"}</h2>
        <div className="flex flex-col gap-3.5">
          <div><label className="label">Nombre</label><input className="field" value={f.nombre || ""} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
          <div><label className="label">Categoría</label><input className="field" value={f.categoria || ""} onChange={(e) => setF({ ...f, categoria: e.target.value })} /></div>
          <div>
            <label className="label">Tipo</label>
            <div className="selwrap">
              <select className="field" value={f.tipo || "dura"} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
                <option value="dura">dura</option><option value="blanda">blanda</option><option value="ia">ia</option>
              </select>
              <Ic.chevron size={16} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12.5px] cursor-pointer">
            <input type="checkbox" checked={f.activo ?? true} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Activa (se ofrece para asignar)
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(f)}>Guardar</button>
          </div>
        </div>
      </div>
    </>
  );
}
