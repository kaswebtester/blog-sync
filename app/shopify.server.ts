import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, AppDistribution } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import db from "./db.server";
const appUrl = process.env.SHOPIFY_APP_URL || process.env.APP_URL || process.env.HOST;
if (!appUrl) throw new Error("App URL is missing. Start with npm run dev (Shopify CLI), or set SHOPIFY_APP_URL to your public HTTPS app URL.");
const shopify = shopifyApp({apiKey:process.env.SHOPIFY_API_KEY!,apiSecretKey:process.env.SHOPIFY_API_SECRET!,apiVersion:"2026-10" as any,scopes:(process.env.SCOPES || "read_content,write_content,read_metaobjects,write_metaobjects,read_products").split(","),appUrl,authPathPrefix:"/auth",sessionStorage:new PrismaSessionStorage(db),distribution:AppDistribution.SingleMerchant});
export default shopify;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export { boundary } from "@shopify/shopify-app-remix/server";

