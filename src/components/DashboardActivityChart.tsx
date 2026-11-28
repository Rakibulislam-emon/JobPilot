import type { ActivityPoint } from "@/lib/dashboard";

export function DashboardActivityChart({ series }: { series: ActivityPoint[] }) {
  const width = 720;
  const baseline = 166;
  const max = Math.max(4, ...series.map((point) => point.count));
  const coords = series.map((point, index) => ({
    ...point,
    x: 34 + (index * 652) / Math.max(1, series.length - 1),
    y: 18 + ((max - point.count) / max) * 138,
  }));
  const points = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${coords[0]?.x ?? 34},${baseline} ${points} ${coords.at(-1)?.x ?? 686},${baseline}`;
  const ticks = [max, Math.ceil(max * 0.75), Math.ceil(max * 0.5), Math.ceil(max * 0.25), 0];
  const labels = [0, 7, 14, 21, 29].map((index) => coords[index]).filter(Boolean);

  if (!series.some((point) => point.count > 0)) {
    return (
      <div className="grid h-52 place-items-center text-[12px] text-muted">
        Your saved jobs will appear here over time.
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} 212`}
      className="h-48 w-full overflow-visible sm:h-56"
      role="img"
      aria-label={`Applications added in the last 30 days; peak daily count ${max}`}
    >
      <defs>
        <linearGradient id="activity-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ededed" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ededed" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {ticks.map((tick, index) => {
        const y = 18 + index * 34.5;
        return (
          <g key={`${tick}-${index}`}>
            <line x1="34" x2="686" y1={y} y2={y} stroke="#262626" strokeDasharray="3 5" />
            <text x="25" y={y + 3} textAnchor="end" fill="#737373" fontSize="9">
              {tick}
            </text>
          </g>
        );
      })}
      <polygon points={area} fill="url(#activity-fill)" />
      <polyline
        points={points}
        fill="none"
        stroke="#ededed"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map((point) =>
        point.count > 0 ? (
          <circle key={point.key} cx={point.x} cy={point.y} r="2.5" fill="#ededed">
            {/* Keep this as one text node to avoid SVG title hydration mismatches. */}
            <title>{`${point.label}: ${point.count} added`}</title>
          </circle>
        ) : null
      )}
      {labels.map((point) => (
        <text
          key={point.key}
          x={point.x}
          y="196"
          textAnchor="middle"
          fill="#737373"
          fontSize="9"
        >
          {point.label}
        </text>
      ))}
    </svg>
  );
}
