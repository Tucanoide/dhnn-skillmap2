"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const token = window.localStorage.getItem("skillmap_token");
    window.location.href = token ? "/dashboard.html" : "/login.html";
  }, []);
  return null;
}
