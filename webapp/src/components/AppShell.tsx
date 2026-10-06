"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";
import { getToken, currentUser, type CurrentUser } from "@/lib/client-api";

export default function AppShell({
  title,
  subtitle,
  headerExtra,
  children,
}: {
  title: string;
  subtitle: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setUser(currentUser());
  }, [router]);

  if (!user) return null;

  return (
    <>
      <div className="wall" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Sidebar nombre={user.nombre} esLider={user.esLider} esAdmin={user.esAdmin} />
      <main className="relative z-[1] md:pl-[104px] px-4 md:pr-6 lg:pr-8 pt-5 md:pt-7 pb-28 md:pb-10">
        <div className="max-w-[1320px] mx-auto flex flex-col gap-4 sm:gap-5">
          <header className="flex items-start justify-between gap-4 rise">
            <div className="min-w-0">
              <h1 className="text-[30px] sm:text-[40px] font-semibold tracking-[-0.035em] leading-[1.02]">{title}</h1>
              <p className="mt-1.5 text-[14px] max-w-[760px]" style={{ color: "var(--muted)" }}>
                {subtitle}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-none">
              {headerExtra}
              <ThemeToggle />
            </div>
          </header>
          <div className="page flex flex-col gap-4 sm:gap-5">{children}</div>
        </div>
      </main>
    </>
  );
}
