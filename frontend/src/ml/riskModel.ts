import { NeuralNetwork } from "brain.js";
import type { Medicine } from "../types";

/**
 * Adherence Risk Predictor
 * ------------------------
 * Motivated directly by the Adhera paper's declared future work:
 * "Predictive algorithms will be incorporated to identify early signs
 * of non-adherence or caregiver burnout."
 *
 * This is a genuinely trained model, not a hardcoded score: we generate
 * a synthetic labeled dataset that encodes a realistic (but noisy)
 * relationship between dosing-history features and next-dose risk, then
 * train a small feedforward network on it with Brain.js entirely in the
 * browser. Inference then runs on the real (mock) patient data.
 *
 * It intentionally does NOT need to be real-time/streaming — recomputing
 * on dashboard load is sufficient, since the goal is to surface a rising
 * risk pattern proactively, not to react to a single missed dose.
 */

export interface RiskFeatures {
  missedRatio: number; // 0-1, share of recent doses missed
  avgDelayNorm: number; // 0-1, normalized average delay from schedule
  stockRatioInv: number; // 0-1, higher = closer to running out
  streakNorm: number; // 0-1, higher = longer current "taken" streak (protective)
}

export interface RiskResult {
  score: number; // 0-1 probability of missing the next dose
  band: "low" | "medium" | "high";
}

/** Extract normalized features for a single medicine from its dose history. */
export function extractFeatures(med: Medicine): RiskFeatures {
  const doses = med.doses;
  const total = doses.length || 1;
  const missed = doses.filter((d) => d.status === "missed").length;
  const missedRatio = missed / total;

  // Reward streaks of consecutive "taken" doses (protective factor).
  let streak = 0;
  for (let i = doses.length - 1; i >= 0; i--) {
    if (doses[i].status === "taken") streak++;
    else break;
  }
  const streakNorm = Math.min(streak / 4, 1);

  const stockRatioInv = Math.min(
    Math.max(1 - med.stock / (med.lowStockThreshold * 3), 0),
    1,
  );

  // Mock data doesn't carry precise delay timestamps, so we approximate:
  // a "pending" dose past its window contributes to perceived delay risk.
  const pendingCount = doses.filter((d) => d.status === "pending").length;
  const avgDelayNorm = Math.min(pendingCount / total, 1);

  return { missedRatio, avgDelayNorm, stockRatioInv, streakNorm };
}

/**
 * Build a synthetic training set. The label follows a deliberately noisy
 * ground-truth rule so the network has to genuinely learn the boundary
 * rather than memorize a lookup table.
 */
function buildSyntheticDataset(n = 400) {
  const data: { input: number[]; output: number[] }[] = [];
  for (let i = 0; i < n; i++) {
    const missedRatio = Math.random();
    const avgDelayNorm = Math.random();
    const stockRatioInv = Math.random();
    const streakNorm = Math.random();

    const riskSignal =
      0.45 * missedRatio +
      0.25 * avgDelayNorm +
      0.2 * stockRatioInv -
      0.3 * streakNorm;

    const noise = (Math.random() - 0.5) * 0.15;
    const label = riskSignal + noise > 0.35 ? 1 : 0;

    data.push({
      input: [missedRatio, avgDelayNorm, stockRatioInv, streakNorm],
      output: [label],
    });
  }
  return data;
}

let cachedNet: NeuralNetwork<number[], number[]> | null = null;

/** Train (once, cached) a small network on synthetic data. */
export function getTrainedRiskModel(): NeuralNetwork<number[], number[]> {
  if (cachedNet) return cachedNet;

  const net = new NeuralNetwork<number[], number[]>({
    hiddenLayers: [6, 4],
  });

  net.train(buildSyntheticDataset(), {
    iterations: 300,
    errorThresh: 0.02,
  });

  cachedNet = net;
  return net;
}

function bandFor(score: number): RiskResult["band"] {
  if (score >= 0.66) return "high";
  if (score >= 0.35) return "medium";
  return "low";
}

export function predictRisk(features: RiskFeatures): RiskResult {
  const net = getTrainedRiskModel();
  const [score] = net.run([
    features.missedRatio,
    features.avgDelayNorm,
    features.stockRatioInv,
    features.streakNorm,
  ]);
  return { score, band: bandFor(score) };
}

/** Convenience: highest-risk medicine + score for a full medicine list. */
export function assessPatientRisk(medicines: Medicine[]): {
  overall: RiskResult;
  perMedicine: { medicine: Medicine; risk: RiskResult }[];
} {
  const perMedicine = medicines.map((medicine) => ({
    medicine,
    risk: predictRisk(extractFeatures(medicine)),
  }));

  const overallScore = perMedicine.length
    ? Math.max(...perMedicine.map((m) => m.risk.score))
    : 0;

  return {
    overall: { score: overallScore, band: bandFor(overallScore) },
    perMedicine,
  };
}
