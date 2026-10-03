import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useAppData } from "../../data/AppDataContext";

export function PatientVitals() {
  const { vitals } = useAppData();
  const latest = vitals[vitals.length - 1];
  const telemetry = [
    { label: "Heart rate", value: latest?.heartRate ? String(latest.heartRate) : "—", unit: "BPM", status: latest?.heartRate ? "Latest reading" : "No reading yet" },
    { label: "Blood pressure", value: latest?.bpSys && latest?.bpDia ? `${latest.bpSys}/${latest.bpDia}` : "—", unit: "mmHg", status: latest?.bpSys ? "Latest reading" : "No reading yet" },
    { label: "Glucose", value: latest?.glucose ? String(latest.glucose) : "—", unit: "mg/dL", status: latest?.glucose ? "Latest reading" : "No reading yet" },
  ];

  return (
    <div className="screen-page space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
        <h1 className="font-display text-xl font-semibold text-charcoal-900 sm:text-2xl">
          Vitals &amp; remote monitoring
        </h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Continuous telemetry streamed from connected devices — this is what
          lets your care team catch problems before they become emergencies.
        </p>
        </div>
        <div className="hidden rounded-full border border-ink-700/20 bg-ink-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 sm:flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-ink-600"></span>Live monitoring</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {telemetry.map((t) => (
          <Card key={t.label} className="p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-charcoal-500">
              {t.label}
            </p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-semibold text-charcoal-900">
                {t.value}
              </span>
              <span className="text-xs text-charcoal-500">{t.unit}</span>
            </div>
            <div className="mt-2">
              <Badge tone="sage">{t.status}</Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid min-h-0 gap-4 lg:grid-cols-2">
      <Card className="min-h-0 p-4 sm:p-5">
        <CardHeader
          title="Heart rate trend"
          subtitle="Today, sampled every 4 hours"
        />
        <div className="h-[190px] w-full sm:h-[205px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={vitals} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeece5" />
              <XAxis
                dataKey="time"
                stroke="#6b6e77"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="#6b6e77"
                fontSize={11}
                domain={[50, 100]}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fbfaf7",
                  borderColor: "#dedbd0",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="heartRate"
                stroke="#2d3a6b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#2d3a6b" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="min-h-0 p-4 sm:p-5">
        <CardHeader
          title="Blood glucose trend"
          subtitle="Continuous glucose monitor readings"
        />
        <div className="h-[190px] w-full sm:h-[205px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={vitals} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eeece5" />
              <XAxis
                dataKey="time"
                stroke="#6b6e77"
                fontSize={11}
                tickLine={false}
              />
              <YAxis stroke="#6b6e77" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fbfaf7",
                  borderColor: "#dedbd0",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="glucose"
                stroke="#b8863b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#b8863b" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      </div>
    </div>
  );
}
