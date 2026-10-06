"use client";

import { useState } from "react";
import { avatarBg, avatarImg, initials } from "@/lib/person-ui";

export default function Avatar({
  name,
  size = 36,
  ring = false,
  radius,
  className,
  style,
}: {
  name: string;
  size?: number;
  ring?: boolean;
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [broken, setBroken] = useState(false);
  const img = avatarImg(name);
  const borderRadius = radius ?? "50%";
  return (
    <span
      className={"avatar inline-grid place-items-center" + (className ? ` ${className}` : "")}
      style={{
        width: size,
        height: size,
        borderRadius,
        background: broken ? avatarBg(name) : "transparent",
        boxShadow: ring ? "0 0 0 2px var(--glass-strong)" : undefined,
        ...style,
      }}
      title={name}
    >
      {broken ? (
        <span className="font-semibold" style={{ fontSize: size * 0.36, color: "var(--text)" }}>
          {initials(name)}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={name}
          width={size}
          height={size}
          style={{ borderRadius, objectFit: "cover" }}
          onError={() => setBroken(true)}
        />
      )}
    </span>
  );
}
