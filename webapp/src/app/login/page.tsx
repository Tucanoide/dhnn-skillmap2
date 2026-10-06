"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { setSession } from "@/lib/client-api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (opts: { client_id: string; callback: (r: { credential: string }) => void; hd?: string }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [gsiReady, setGsiReady] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => setClientId(cfg.google_client_id))
      .catch(() => setError("No se pudo conectar con el servidor. ¿Está corriendo el backend?"));
  }, []);

  useEffect(() => {
    if (!clientId || !gsiReady || !window.google || !buttonRef.current) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      hd: "dhnn.com",
      callback: async (response) => {
        setError("");
        try {
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
          setSession(data);
          router.push("/dashboard");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error desconocido");
        }
      },
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 280,
      text: "signin_with",
    });
  }, [clientId, gsiReady, router]);

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="wall" aria-hidden="true" />
      <div className="glass-strong relative z-[1] rounded-[28px] px-9 py-[42px] w-[360px]">
        <h1 className="text-[17px] font-bold tracking-[.02em] mb-[5px]">DHNN Skill Map</h1>
        <p className="text-[12px] mb-[22px]" style={{ color: "var(--faint)" }}>
          Ingresá con tu cuenta de Google de DHNN (@dhnn.com).
        </p>
        {error && (
          <div className="mb-3 rounded-2xl px-4 py-3 text-[12px]" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
            {error}
          </div>
        )}
        <div ref={buttonRef} className="flex justify-center mt-2" />
      </div>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setGsiReady(true)} />
    </div>
  );
}
