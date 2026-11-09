import Link from "next/link";

import type { PublicProjectSummary } from "../types";
import { projectPhoto } from "./photos";
import { completionTone } from "./ui";

/** Project card: the project's own cover photo when it has one, otherwise a dusk photograph; status, title, place and delivery method. */
export function ProjectCard({ project, headingLevel = 3, wide = false }: { project: PublicProjectSummary; headingLevel?: 2 | 3; wide?: boolean }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const tone = project.completionLabel ? completionTone(project.completionLabel) : "idle";
  return (
    <Link href={`/projects/${project.slug}`} className={`sf-pcard${wide ? " sf-pcard--wide" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="sf-pcard__img" src={project.photos?.[0] || projectPhoto(project.title)} alt="" width={768} height={512} loading="lazy" decoding="async" />
      {project.completionLabel && <span className="sf-pcard__status"><span aria-hidden="true" className={`sf-dot sf-dot--${tone}`} style={{ display: "inline-block", marginRight: "0.5rem" }} />{project.completionLabel}</span>}
      <Heading className="sf-pcard__title">{project.title}</Heading>
      <span className="sf-pcard__meta">{[project.locationLabel, project.deliveryMethod].filter(Boolean).join(" · ")}</span>
      <span className="sf-pcard__text">{project.summary}</span>
    </Link>
  );
}
