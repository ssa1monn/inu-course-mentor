// SVG 차트 (값은 항상 최종 상태로 렌더 → 인쇄/캡처에도 정확).
function cssVar(name) {
  if (name && name.startsWith("--")) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#0072CE";
  }
  return name;
}

export function ProgressRing({ percent = 0, size = 132, stroke = 12, color = "--inu-sky", label, sub, hideCenter }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const shown = Math.min(100, percent);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={cssVar(color)} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * shown) / 100} />
      </svg>
      {!hideCenter && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div className="num" style={{ fontFamily: "Sora, Pretendard, sans-serif", fontSize: size * .26, fontWeight: 800, lineHeight: 1, color: "var(--text)" }}>{Math.round(percent)}<span style={{ fontSize: size * .13 }}>%</span></div>
          {label && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginTop: 4 }}>{label}</div>}
          {sub && <div style={{ fontSize: 11, color: "var(--text-3)" }}>{sub}</div>}
        </div>
      )}
    </div>
  );
}

export function Donut({ data = [], size = 150, stroke = 18, centerTop, centerBottom }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const seg = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={cssVar(d.color)} strokeWidth={stroke}
            strokeDasharray={`${c * frac} ${c}`} strokeDashoffset={-c * acc} strokeLinecap="butt" />;
          acc += frac; return seg;
        })}
      </svg>
      {(centerTop || centerBottom) && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {centerTop && <div className="num" style={{ fontFamily: "Sora, Pretendard, sans-serif", fontSize: size * .2, fontWeight: 800, lineHeight: 1, color: "var(--text)" }}>{centerTop}</div>}
          {centerBottom && <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 3, fontWeight: 600 }}>{centerBottom}</div>}
        </div>
      )}
    </div>
  );
}

export function BarChart({ data = [], max, height = 150, color = "--inu-sky", highlightLast }) {
  const mx = max || Math.max(...data.map((d) => d.value), 1);
  const col = cssVar(color);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: height + 26 }}>
      {data.map((d, i) => {
        const h = (d.value / mx) * height;
        const hot = highlightLast && i === data.length - 1;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, minWidth: 0 }}>
            <div className="num" style={{ fontSize: 11.5, fontWeight: 700, color: hot ? col : "var(--text-2)" }}>{d.value.toFixed ? d.value.toFixed(2) : d.value}</div>
            <div style={{ width: "100%", maxWidth: 30, height, display: "flex", alignItems: "flex-end" }}>
              <div style={{ width: "100%", height: Math.max(3, h), borderRadius: "7px 7px 4px 4px", background: hot ? col : `color-mix(in srgb, ${col} 28%, var(--surface-3))` }} />
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", whiteSpace: "nowrap" }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export function LineChart({ data = [], width = 460, height = 150, color = "--inu-sky", yMin, yMax }) {
  const col = cssVar(color);
  const pad = { l: 8, r: 8, t: 12, b: 22 };
  const vals = data.map((d) => d.value);
  const mn = yMin != null ? yMin : Math.min(...vals) - .1;
  const mx = yMax != null ? yMax : Math.max(...vals) + .1;
  const iw = width - pad.l - pad.r, ih = height - pad.t - pad.b;
  const pts = data.map((d, i) => {
    const x = pad.l + (i / (data.length - 1)) * iw;
    const y = pad.t + ih - ((d.value - mn) / (mx - mn)) * ih;
    return [x, y];
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${pad.t + ih} L${pts[0][0]},${pad.t + ih} Z`;
  const gid = "lg" + Math.round(width);
  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: "block" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={col} stopOpacity=".22" />
            <stop offset="1" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, .5, 1].map((g) => <line key={g} x1={pad.l} x2={width - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />)}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4.5 : 3} fill="var(--surface)" stroke={col} strokeWidth="2.2" />
            <text x={p[0]} y={height - 6} textAnchor={i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"} fontSize="10.5" fill="var(--text-3)">{data[i].label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
