type IconProps = { size?: number; sw?: number; className?: string; style?: React.CSSProperties };

function I({ size = 20, sw = 1.75, className, style, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
      {children}
    </svg>
  );
}

export const Ic = {
  map: (p: IconProps) => <I {...p}><polygon points="12 2.5 20.5 7.25 20.5 16.75 12 21.5 3.5 16.75 3.5 7.25"/><polygon points="12 8 15.5 10 15.5 14 12 16 8.5 14 8.5 10"/></I>,
  team: (p: IconProps) => <I {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></I>,
  admin: (p: IconProps) => <I {...p}><line x1="21" y1="4" x2="14" y2="4"/><line x1="10" y1="4" x2="3" y2="4"/><line x1="21" y1="12" x2="12" y2="12"/><line x1="8" y1="12" x2="3" y2="12"/><line x1="21" y1="20" x2="16" y2="20"/><line x1="12" y1="20" x2="3" y2="20"/><line x1="14" y1="2" x2="14" y2="6"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="16" y1="18" x2="16" y2="22"/></I>,
  partners: (p: IconProps) => <I {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></I>,
  ai: (p: IconProps) => <I {...p}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/></I>,
  arrow: (p: IconProps) => <I {...p}><path d="M7 17 17 7"/><path d="M8 7h9v9"/></I>,
  right: (p: IconProps) => <I {...p}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></I>,
  logout: (p: IconProps) => <I {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></I>,
  check: (p: IconProps) => <I {...p}><path d="M20 6 9 17l-5-5"/></I>,
  clock: (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>,
  pencil: (p: IconProps) => <I {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></I>,
  chevron: (p: IconProps) => <I {...p}><path d="m6 9 6 6 6-6"/></I>,
  help: (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="9.5"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></I>,
  target: (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></I>,
  x: (p: IconProps) => <I {...p}><path d="M18 6 6 18M6 6l12 12"/></I>,
  plus: (p: IconProps) => <I {...p}><path d="M12 5v14M5 12h14"/></I>,
  search: (p: IconProps) => <I {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></I>,
  trash: (p: IconProps) => <I {...p}><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></I>,
  file: (p: IconProps) => <I {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></I>,
  upload: (p: IconProps) => <I {...p}><path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/></I>,
  layers: (p: IconProps) => <I {...p}><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/></I>,
  user: (p: IconProps) => <I {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></I>,
  shield: (p: IconProps) => <I {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></I>,
  alert: (p: IconProps) => <I {...p}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></I>,
  sun: (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></I>,
  moon: (p: IconProps) => <I {...p}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></I>,
};
