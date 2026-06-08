import { useEffect } from "react";
import Icon from "./Icon.jsx";

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[26px] font-extrabold tracking-tight text-fg">{title}</h1>
        {sub && <p className="mt-2 text-[14.5px] text-fg-muted">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2.5">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="m-0 whitespace-nowrap text-[16.5px] font-extrabold tracking-tight text-fg">{children}</h2>
      {right}
    </div>
  );
}

export function StatCard({ icon, label, value, unit, sub, accent = "--inu-sky", trend }) {
  return (
    <div className="card flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[11px]"
          style={{ background: `color-mix(in srgb, var(${accent}) 13%, transparent)`, color: `var(${accent})` }}>
          <Icon name={icon} size={20} />
        </span>
        {trend && <span className="badge badge-ok">▲ {trend}</span>}
      </div>
      <div>
        <div className="text-[13px] font-semibold text-fg-muted">{label}</div>
        <div className="mt-1.5 flex items-baseline gap-1 whitespace-nowrap">
          <span className="num text-fg" style={{ fontFamily: "Sora, Pretendard, sans-serif", fontSize: "calc(30px * var(--num-scale))", fontWeight: 800, lineHeight: 1 }}>{value}</span>
          {unit && <span className="num text-[15px] font-bold text-fg-muted">{unit}</span>}
        </div>
        {sub && <div className="mt-1.5 text-xs text-fg-faint">{sub}</div>}
      </div>
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => {
        const val = o.value ?? o, label = o.label ?? o;
        return <button key={val} type="button" data-on={value === val} onClick={() => onChange(val)}>{label}</button>;
      })}
    </div>
  );
}

export function Empty({ icon = "search", title, desc, action }) {
  return (
    <div className="card flex flex-col items-center gap-1.5 border-dashed py-13 text-center" style={{ paddingTop: 52, paddingBottom: 52 }}>
      <span className="mb-1.5 text-fg-faint"><Icon name={icon} size={34} /></span>
      <div className="text-base font-extrabold text-fg">{title}</div>
      {desc && <div className="max-w-[340px] text-[13.5px] text-fg-muted">{desc}</div>}
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  );
}

export function Avatar({ name, size = 36 }) {
  return (
    <span className="num inline-flex items-center justify-center font-extrabold text-white"
      style={{ width: size, height: size, borderRadius: "32%", flex: "none", background: "var(--inu-blue)", fontSize: size * .4 }}>
      {(name || "U").slice(0, 1)}
    </span>
  );
}

export function Toast({ msg, onDone }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 1900);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  if (!msg) return null;
  return (
    <div className="fixed bottom-7 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2.5 rounded-[13px] px-5 py-3 text-sm font-bold text-white"
      style={{ background: "var(--inu-blue)", boxShadow: "var(--shadow-lg)" }}>
      <Icon name="check" size={18} /> {msg}
    </div>
  );
}
