import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { PublicServiceSummary } from "../types";

export function ServiceTile({ service, index }: { service: PublicServiceSummary; index: number }) {
  return (
    <Link href={`/services/${service.slug}`} className="sf-tile">
      <div className="sf-tile__top">
        <span className="sf-tile__code">SVC-{String(index + 1).padStart(2, "0")}</span>
        {service.market && <span className="sf-tile__market">{service.market}</span>}
      </div>
      <h3 className="sf-h3">{service.title}</h3>
      <p className="sf-tile__text">{service.summary}</p>
      <span className="sf-tile__go">Details<ArrowRight aria-hidden="true" /></span>
    </Link>
  );
}
