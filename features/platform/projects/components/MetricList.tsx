import { MetricStrip, formatMinor } from "@/features/platform/components/kit";
import type { Metric } from "../data";

export function metricValue(metric: Metric) {
  if (/^[A-Z]{3}$/.test(metric.unit)) return formatMinor(metric.value, metric.unit, { whole: true });
  return metric.value || "—";
}

/** Project and portfolio figures; attention metrics carry an amber dot. */
export function MetricList({ metrics, label }: { metrics: Metric[]; label: string }) {
  return (
    <MetricStrip
      label={label}
      items={metrics.map(metric => ({
        key: metric.key,
        label: metric.label,
        value: metricValue(metric),
        tone: metric.tone === "attention" && metric.value !== "0" ? "amber" : undefined,
      }))}
    />
  );
}
