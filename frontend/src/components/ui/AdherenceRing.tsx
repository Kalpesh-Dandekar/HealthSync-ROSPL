export function AdherenceRing({
  percent,
  size = 128,
  label = "7-day adherence",
  mode = "adherence",
}: {
  percent: number;
  size?: number;
  label?: string;
  mode?: "adherence" | "risk";
}) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  const tone = mode === "risk"
    ? (percent >= 66 ? "#df6759" : percent >= 35 ? "#d6a955" : "#69b783")
    : (percent >= 80 ? "#69b783" : percent >= 60 ? "#d6a955" : "#df6759");

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#20272c"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tone}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-semibold text-charcoal-900">
            {percent}%
          </span>
          <span
            className="mt-1 h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: tone,
              boxShadow: `0 0 0 4px ${tone}22`,
            }}
          />
        </div>
      </div>
      <p className="text-center text-xs font-medium uppercase tracking-wide text-charcoal-500">
        {label}
      </p>
    </div>
  );
}
