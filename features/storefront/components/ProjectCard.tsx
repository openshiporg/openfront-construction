import Link from "next/link";

import type { PublicProjectSummary } from "../types";
import { Status, completionTone, monogram } from "./ui";

/** Project card: the cover photo when the project has one, otherwise the drawing-plate header. */
export function ProjectCard({ project, headingLevel = 3 }: { project: PublicProjectSummary; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <Link href={`/projects/${project.slug}`} className="sf-card">
      {project.photos?.[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="sf-card__photo" src={project.photos[0]} alt="" loading="lazy" decoding="async" />
      ) : (
        <div className="sf-plate" aria-hidden="true">
          <div className="sf-plate__meta"><span>{project.market || "Project"}</span><span>{project.locationLabel}</span></div>
          <span className="sf-plate__mono">{monogram(project.title)}</span>
        </div>
      )}
      <div className="sf-card__body">
        <div className="sf-card__title-row">
          <Heading className="sf-h3">{project.title}</Heading>
          {project.completionLabel && <Status tone={completionTone(project.completionLabel)}>{project.completionLabel}</Status>}
        </div>
        <p className="sf-card__text">{project.summary}</p>
        {(project.deliveryMethod || project.locationLabel) && (
          <div className="sf-card__chips">
            {project.locationLabel && <span className="sf-chip">{project.locationLabel}</span>}
            {project.deliveryMethod && <span className="sf-chip">{project.deliveryMethod}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
