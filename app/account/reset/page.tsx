import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata("Reset password");
export { AccountResetPage as default } from "@/features/storefront/account/AccountPage";
