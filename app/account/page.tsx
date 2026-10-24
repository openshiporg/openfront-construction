import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata("Account");
export { AccountPage as default } from "@/features/storefront/account/AccountPage";
