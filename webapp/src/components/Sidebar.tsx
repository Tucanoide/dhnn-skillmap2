"use client";

import { usePathname, useRouter } from "next/navigation";
import { Ic } from "./icons";
import Avatar from "./Avatar";
import { clearSession } from "@/lib/client-api";

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: (p: { size?: number }) => React.ReactElement;
  ai?: boolean;
}

const NAV: NavItem[] = [
  { id: "dashboard", href: "/dashboard", label: "Mi mapa de habilidades", icon: Ic.map },
  { id: "team", href: "/team", label: "Mi equipo", icon: Ic.team },
  { id: "admin", href: "/admin", label: "Administración", icon: Ic.admin },
  { id: "ecosistema", href: "/ecosistema", label: "Ecosistema de partners", icon: Ic.partners },
  { id: "teambuilder", href: "/teambuilder", label: "Armado de equipos", icon: Ic.ai, ai: true },
];

export default function Sidebar({
  nombre,
  esLider,
  esAdmin,
}: {
  nombre: string;
  esLider: boolean;
  esAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const items = NAV.filter((n) => {
    if (n.id === "dashboard") return true;
    if (n.id === "team") return esLider || esAdmin;
    return esAdmin;
  });

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <nav className="rail" aria-label="Navegación principal">
      <div className="flex items-center gap-[11px] h-11 px-1.5 mb-2 flex-none">
        <span className="w-8 h-8 rounded-[11px] grid place-items-center flex-none font-bold text-[11px]" style={{ background: "var(--text)", color: "#fff" }}>
          DH
        </span>
        <span className="lbl leading-tight text-[12px]" style={{ color: "var(--muted)" }}>
          <b className="block text-[13px] tracking-[.16em]" style={{ color: "var(--text)" }}>DHNN</b>
          SKILL MAP
        </span>
      </div>
      <div className="flex flex-col gap-[3px]">
        {items.map((n) => (
          <a key={n.id} href={n.href} className={"navi" + (pathname?.startsWith(n.href) ? " on" : "")}>
            <n.icon size={20} />
            <span className="lbl flex items-center gap-2">
              {n.label}
              {n.ai && <span className="ai-badge">IA</span>}
            </span>
          </a>
        ))}
      </div>
      <div className="mt-auto pt-2.5 flex flex-col gap-[3px]" style={{ borderTop: "1px solid var(--hair)" }}>
        <div className="navi" style={{ cursor: "default" }}>
          <Avatar name={nombre} size={26} />
          <span className="lbl text-[13px]">{nombre}</span>
        </div>
        <button onClick={logout} className="navi">
          <Ic.logout size={20} />
          <span className="lbl">Cerrar sesión</span>
        </button>
      </div>
    </nav>
  );
}
