import type { ReactNode } from "react";

type BadgeTone = "sage" | "gold" | "brick" | "ink" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  sage: "bg-sage-100 text-sage-700 border-sage-600/20",
  gold: "bg-gold-100 text-gold-700 border-gold-600/20",
  brick: "bg-brick-100 text-brick-700 border-brick-600/20",
  ink: "bg-ink-100 text-ink-800 border-ink-700/20",
  neutral: "bg-paper-100 text-charcoal-700 border-paper-300",
};

export function Badge({
  tone = "neutral",
  children,
  icon,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
