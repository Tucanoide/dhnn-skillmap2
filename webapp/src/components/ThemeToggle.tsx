"use client";

import { useEffect, useState } from "react";
import { Ic } from "./icons";

type Theme = "light" | "dark";

function getStoredTheme(): Theme {
  try {
    const t = localStorage.getItem("skillmap_theme");
    if (t === "dark" || t === "light") return t;
  } catch {}
  return "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const t = getStoredTheme();
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("skillmap_theme", next);
    } catch {}
  }

  const dark = theme === "dark";
  return (
    <button
      className={"toggle" + (dark ? " dark" : "")}
      onClick={toggle}
      aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <span className="knob" aria-hidden="true" />
      <span className="relative z-[1]" style={{ color: dark ? "var(--muted)" : "var(--bg)" }}>
        <Ic.sun size={15} />
      </span>
      <span className="relative z-[1]" style={{ color: dark ? "var(--bg)" : "var(--muted)" }}>
        <Ic.moon size={15} />
      </span>
    </button>
  );
}
