/**
 * Minimal inline SVG icon components.
 * Avoids lucide-react dependency since it is not in package.json.
 * All icons accept className and size props.
 */

type IconProps = { className?: string; size?: number };

const props = (size = 16, cls?: string) => ({
  xmlns: "http://www.w3.org/2000/svg",
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: cls,
});

export function BarChart2({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

export function TrendingUp({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

export function PieChart({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

export function ScatterChart({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <circle cx="7.5" cy="7.5" r="1.5" />
      <circle cx="17" cy="14" r="1.5" />
      <circle cx="12" cy="10" r="1.5" />
      <line x1="2" y1="20" x2="22" y2="20" />
      <line x1="2" y1="4" x2="2" y2="20" />
    </svg>
  );
}

export function AreaChart({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <path d="M3 3v18h18" />
      <path d="M3 15l5-5 4 4 5-7 4 4" />
      <path d="M3 15l5-5 4 4 5-7 4 4V18H3z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

export function Grid3X3({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

export function Hash({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

export function Sigma({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <path d="M18 7V5H7l6 7-6 7h11v-2" />
    </svg>
  );
}

export function Table2({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
    </svg>
  );
}

export function LayoutGrid({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

export function Save({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

export function RefreshCw({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

export function Plus({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function Search({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function Edit2({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export function Share2({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function ArrowLeft({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function Eye({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function ChevronDown({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function Database({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

export function Table({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
    </svg>
  );
}

export function Trash2({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function CheckCircle({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function XCircle({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export function Link({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function Loader({ size = 16, className }: IconProps) {
  return (
    <svg {...props(size, className)}>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}
