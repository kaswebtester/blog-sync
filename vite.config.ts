import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
const host = new URL(process.env.SHOPIFY_APP_URL || process.env.APP_URL || process.env.HOST || "http://localhost:3000").hostname;
export default defineConfig({plugins:[remix(),tsconfigPaths()],server:{host:"0.0.0.0",port:Number(process.env.PORT || 3000),allowedHosts:[host,".trycloudflare.com"]}});

