import { Moon } from "lucide-react";

// Decorative moon-phase strip — a small nod to this being a lunar
// (Hijri) calendar, echoing the open/taken crescent status icons below.
export function MoonStrip() {
  const opacities = [0.15, 0.25, 0.4, 0.6, 0.85, 0.6, 0.4, 0.25, 0.15];
  return (
    <div className="flex items-center gap-3" aria-hidden>
      {opacities.map((o, i) => (
        <Moon key={i} className="h-3 w-3 text-amber-400" style={{ opacity: o }} />
      ))}
    </div>
  );
}
