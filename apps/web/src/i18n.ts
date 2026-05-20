import { getRequestConfig } from "next-intl/server";

export const locales = ["es", "en", "ca", "eu", "gl"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../messages/${locale}/common.json`)).default,
}));
