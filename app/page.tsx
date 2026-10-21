import { HomePage } from "@/features/storefront/screens/HomePage";
import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata();

export const dynamic = "force-dynamic";
export default HomePage;
