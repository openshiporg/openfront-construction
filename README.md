# Openfront Construction

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fopenshiporg%2Fopenfront-construction&env=DATABASE_URL%2CSESSION_SECRET)

Openfront Construction is a self-hostable construction project and company-operations application. Prospective clients can explore services and request work, while project participants use scoped portal access. Teams manage preconstruction, contracts, budgets, procurement, execution, field records, documents, safety, billing, and approvals.

## Demo

Explore the application locally using the setup instructions below.

| | |
|---|---|
| **Public application** | `/` on your development URL |
| **Dashboard** | `/dashboard` on your development URL |

[Learn more →](https://openship.org/products/openfront-construction)

[Documentation →](https://docs.openship.org/docs/openfront/construction/)

## The Openfront Ecosystem

Openfront is part of an ecosystem of open-source commerce tools:

- **[Openfront E-commerce](https://github.com/openshiporg/openfront)**: Headless e-commerce for retail.
- **[Openfront Restaurant](https://github.com/openshiporg/openfront-restaurant)**: Restaurant ordering, point of sale, and kitchen operations.
- **[Openship](https://github.com/openshiporg/openship)**: Order routing for multi-channel fulfillment.
- **Openfront Construction**: (This repository) a self-hostable construction project and company-operations application.

## Core Features

### Admin Dashboard
Manage pipeline, projects, store settings, setup, service requests, portfolio through dedicated dashboard workspaces and permission-controlled data screens.

### Storefront
Public routes cover services, project portfolios, `/start-a-project`, estimates, bids, RFPs, and customer request accounts. The `/portal` surface provides project-specific collaboration rather than unrestricted dashboard access.

### Project Workspaces
Organize project teams, schedules, preconstruction, contracts, financials, procurement, execution, field activity, and reporting.

### Documents & Controlled Approvals
Manage documents, invitations, approval policies and decisions, project records, and participant portal workflows.

### Client Requests & Delivery
Capture public intake and service requests, expose customer request status, and route workflow events through an outbox. Payment or webhook configuration must be supplied separately from the project record itself.

## Architecture

### Technology Stack
- **Frontend**: Next.js 16 with App Router and React 19.
- **Backend**: KeystoneJS 6 with a GraphQL API.
- **Database**: PostgreSQL with Prisma ORM.
- **Styling**: Tailwind CSS 4 and shared shadcn/ui components.
- **Authentication**: Password-based user accounts and session-based access with role capabilities.

### Application Structure
```text
openfront-construction/
├── app/                    # Public pages, dashboard routes, and HTTP endpoints
├── features/
│   ├── keystone/           # Backend models, access rules, and GraphQL workflows
│   ├── platform/           # Operator workspaces and onboarding
│   ├── storefront/         # Public application components and screens
│   └── dashboard/          # Authentication and shared dashboard shell
└── components/             # Shared UI components
```

### Data Models
The [model registry](features/keystone/models/index.ts) and [Prisma schema](schema.prisma) cover:

- Companies, memberships, projects, contacts, leads, and public service requests.
- Preconstruction, contracts, financials, procurement, resources, and execution records.
- Documents, field operations, quality and safety records, billing, and approvals.
- Portal invitations, API credentials, agent actions, governance, and outbox records.

## Getting Started

### Prerequisites
- Node.js 22, compatible with the [package requirements](package.json) and Next.js 16.
- A PostgreSQL database you can migrate.
- npm.

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/openshiporg/openfront-construction.git
   cd openfront-construction
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Review the [example configuration](.env.example) and replace its placeholders. Keep only the local settings you need; do not copy production-mode or infrastructure examples unchanged.

   ```env
   DATABASE_URL=postgresql://user:password@host/database
   SESSION_SECRET=replace-with-a-new-private-random-secret
   ```

   Generate the session secret with `openssl rand -hex 32`; use the generated value, not the placeholder. Never commit `.env`.

   Review [runtime configuration](features/keystone/index.ts) for additional application settings before building or deploying. Configure enabled integrations separately; the two values above are not a complete production configuration.

3. **Start development server:**
   ```bash
   npm run dev
   ```

   The development script prepares the backend schema, applies checked-in migrations, and starts Next.js.

4. **Access the application:**
   Open the URL `npm run dev` prints, then use these paths:

   - **Public application**: `/`
   - **Admin dashboard**: `/dashboard`
   - **Customer account**: `/account`
   - **GraphQL API**: `/api/graphql`

5. **Create your first admin user:**
   Visit `/dashboard/init` on an empty database to create the initial administrator, then sign in to the dashboard.

6. **Run application onboarding:**
   Run workspace onboarding, establish company and project memberships, and configure public services, project templates, portal invitations, and approval policies.

## Development Commands

- `npm run dev` - Prepare the backend schema, apply migrations, and start Next.js development.
- `npm run build` - Build the backend and Next.js for production; does not apply migrations.
- `npm start` - Start the production Next.js server.
- `npm run migrate:gen` - Prepare the schema and generate/apply development migrations.
- `npm run migrate` - Apply checked-in Prisma migrations.
- `npm run lint` - Run the repository's ESLint script.
- `npm run typecheck` - Run the configured TypeScript check.
- `npm run test` - Run the repository's configured test suite.
- `npm run outbox:work` - Drain a bounded batch of configured webhook deliveries.

Use a disposable development database for migration generation. Review the script before running it against any existing data.

### Project Workflow Integration
The [command registry](features/keystone/mutations/index.ts) exposes project lifecycle, documents, approvals, portal access, and credentials. Use `npm run outbox:work` for the repository's outbox entry point when delivery is configured.

## Documentation

See the [Openfront Construction documentation](https://docs.openship.org/docs/openfront/construction/) for the application guide. The [backend models](features/keystone/models), [registered business workflows](features/keystone/mutations/index.ts), [access rules](features/keystone/access.ts), and [application routes](app) document the implementation in this repository.

## Security & Permissions

### Role-Based Access Control
- `canAccessDashboard` - Access dashboard.
- `canManageProjects` - Manage projects.
- `canManagePreconstruction` - Manage preconstruction.
- `canManageContracts` - Manage contracts.
- `canManageDocuments` - Manage documents.
- `canManageBilling` - Manage billing.

### Security Features
- Session-based authentication for signed-in users.
- Backend list access and workflow authorization, rather than dashboard visibility alone.
- Company and project membership filters combine with area-specific read/manage permissions. API credentials are further restricted to their company, optional project, and scopes; portal access follows separate participant grants.

Review the [access implementation](features/keystone/access.ts) and individual workflow checks before extending permissions.

## Platform Components

### Admin Platform (`/dashboard`)
- **Pipeline**: `/dashboard/platform/pipeline`.
- **Projects**: `/dashboard/platform/projects`.
- **Store Settings**: `/dashboard/platform/store-settings`.
- **Setup**: `/dashboard/platform/setup`.
- **Service Requests**: `/dashboard/platform/service-requests`.
- **Portfolio**: `/dashboard/platform/portfolio`.

### Storefront Experience
Public routes cover services, project portfolios, `/start-a-project`, estimates, bids, RFPs, and customer request accounts. The `/portal` surface provides project-specific collaboration rather than unrestricted dashboard access.

Organize project teams, schedules, preconstruction, contracts, financials, procurement, execution, field activity, and reporting.

## Deployment

### Production Deployment
The Vercel button imports this application's own repository. Provision PostgreSQL and configure the application's complete runtime requirements, storage, mail, and enabled providers before building. Importing the source does not configure these services.

Build the application and apply checked-in migrations as a release step before starting the server. Back up existing data before migration.

```bash
npm run build
npm run migrate
npm start
```

The included [Railway configuration](railway.toml) defines this app's build and startup lifecycle. Provision services and secrets separately.

### Scaling Considerations
Schedule `npm run outbox:work` to drain configured webhook delivery batches. Retain company/project scope and shared document storage across processes.

## Contributing

Use the development commands above when preparing changes. Keep model changes and their migrations together, and describe workflow and permission changes in pull requests.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Support

- **Documentation**: [Openfront Construction guide](https://docs.openship.org/docs/openfront/construction/).
- **Issues**: [Report bugs and feature requests](https://github.com/openshiporg/openfront-construction/issues).
- **Product**: [Learn more about Openfront Construction](https://openship.org/products/openfront-construction).

---

Built with [Next.js](https://nextjs.org) and [KeystoneJS](https://keystonejs.com).
