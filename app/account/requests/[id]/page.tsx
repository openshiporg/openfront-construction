import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata("Request");
export { CustomerRequestPage as default } from "@/features/storefront/account/AccountPage";
