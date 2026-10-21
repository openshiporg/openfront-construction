import type { Metric } from "../data";

function metricValue(metric: Metric) {
  if (/^[A-Z]{3}$/.test(metric.unit)) {
    try {
      const minor = BigInt(metric.value);
      const absolute = minor < 0 ? -minor : minor;
      return `${minor < 0 ? "-" : ""}${metric.unit} ${(absolute / BigInt(100)).toLocaleString()}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
    } catch {
      return metric.value || "—";
    }
  }
  return metric.value || "—";
}

/** Plain figures for the current scope; no meters or decorative cards. */
export function MetricList({ metrics, label }: { metrics: Metric[]; label: string }) {
  if (!metrics.length) return null;
  return (
    <dl aria-label={label} className="flex flex-wrap gap-x-8 gap-y-3 border-b px-4 py-4 text-sm md:px-6">
      {metrics.map(metric => (
        <div key={metric.key} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{metric.label}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{metricValue(metric)}</dd>
        </div>
      ))}
    </dl>
  );
}
