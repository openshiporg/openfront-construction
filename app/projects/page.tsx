import { ProjectsPage } from "@/features/storefront/screens/ProjectsPage";
import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata("Projects");

export const dynamic = "force-dynamic";
export default ProjectsPage;
