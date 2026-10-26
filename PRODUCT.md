# Product

<!-- impeccable:product-schema 1 -->

Inferred on 2026-10-26 from the repository (storefront and platform source, public site data) and the owner's redesign brief (`~/Code/Euler/state/briefs/batches-2-6-full-redesign-2026-10-25.md`). The owner ordered the work without an approval stage, so no interview took place. Every line below is inferred, not confirmed.

## Platform

web

## Users
- **Owner or facilities client (storefront):** a school district facilities director, library board member, municipal project manager or private owner deciding whether this general contractor can build or renovate their building, usually while the building stays occupied. They check what the firm builds, finished and current projects, the service area, and how to request an estimate or invite the firm to bid. Existing clients sign in to the client portal.
- **Trade partner (storefront):** a subcontractor or supplier looking to prequalify or bid.
- **Contractor staff (platform):** project managers, estimators and field staff running pursuits, preconstruction, contracts, procurement, RFIs and submittals, schedule, field reports, quality and safety, billing and closeout. The platform shell is shared with Openfront E-commerce.

## Product Purpose
The public website and client portal of one general contractor, and the operations platform behind it. Success on the storefront is a qualified estimate request, a bid invitation, or a trade-partner application; success in the platform is projects run on time with the paperwork current.

## Positioning
The storefront shows only the firm's published services and projects, its service area and its inquiry channels. Project facts (market, location, delivery method, completion) come from the published project records.

## Operating Context
Storefront routes: `/`, `/services`, `/services/[slug]`, `/projects`, `/projects/[slug]`, `/contact`, `/start-a-project`, `/estimate`, `/rfp`, `/bid`, `/trade-partners`, `/client-intake`, `/requests/[publicReference]/confirmation`, `/account` (reset, requests, payment), `/portal` and project tools, `/accept-invitation`, `/privacy`. Platform routes live under `/dashboard/platform`.

## Capabilities and Constraints
- The demo company is a fictional sample company; that provenance stays visible where the seed states it.
- Inquiries can be closed ("Not taking new projects").
- Project records have no photographs; plates are built from real fields only.

## Brand Commitments
- The company's name, logo SVG and logo colour (the accent hue) are the brand.
- Owner direction (2026-10-25): the storefront must feel like a real, specific business in its industry, with real hierarchy and photography direction; platform pages are serious operator software with no pill or rounded tabs (radii 6px or less); UI copy is labels, states and errors only; phone width must work.

## Evidence on Hand
Published services, projects (market, location, delivery method, completion label), service area, phone and email. No testimonials, awards, safety statistics or client logos, and none may be invented.

## Product Principles
1. Proof before pitch: published projects and their facts carry the page.
2. One clear way in: estimate, invite to bid, or trade-partner application, each findable within seconds.
3. Every route, state and workflow stays. Presentation changes; behaviour doesn't.
