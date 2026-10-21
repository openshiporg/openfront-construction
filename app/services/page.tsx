import { ServicesPage } from "@/features/storefront/screens/ServicesPage";
import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata();

export const dynamic = "force-dynamic";
export default ServicesPage;
