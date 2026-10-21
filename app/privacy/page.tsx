import { PrivacyPage } from "@/features/storefront/screens/PrivacyPage";
import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata();

export const dynamic = "force-dynamic";
export default PrivacyPage;
