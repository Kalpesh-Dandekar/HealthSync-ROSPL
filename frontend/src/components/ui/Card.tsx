import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-paper-200 bg-paper-0 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-lg font-semibold text-charcoal-900">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-sm text-charcoal-500">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
