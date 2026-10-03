import { BrainCircuit } from "lucide-react";
import { Badge } from "./Badge";
import type { RiskResult } from "../../ml/riskModel";

const bandLabel: Record<RiskResult["band"], string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

const bandTone: Record<RiskResult["band"], "sage" | "gold" | "brick"> = {
  low: "sage",
  medium: "gold",
  high: "brick",
};

export function RiskBadge({
  risk,
  showModel = false,
}: {
  risk: RiskResult;
  showModel?: boolean;
}) {
  return (
    <Badge
      tone={bandTone[risk.band]}
      icon={showModel ? <BrainCircuit className="h-3 w-3" /> : undefined}
    >
      {bandLabel[risk.band]}
      {showModel ? ` · ${Math.round(risk.score * 100)}%` : ""}
    </Badge>
  );
}
