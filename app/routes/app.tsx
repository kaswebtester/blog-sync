import { Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import type { LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-remix/server";
export const loader=async({request}:LoaderFunctionArgs)=>{await authenticate.admin(request);return {apiKey:process.env.SHOPIFY_API_KEY!};};
export default function App(){const {apiKey}=useLoaderData<typeof loader>();return <AppProvider isEmbeddedApp apiKey={apiKey}><Outlet/></AppProvider>;}
export function ErrorBoundary(){return boundary.error(useRouteError());}
export const headers:HeadersFunction=args=>boundary.headers(args);
