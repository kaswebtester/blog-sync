import { Form } from "@remix-run/react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { login } from "../shopify.server";
export const action=async({request}:ActionFunctionArgs)=>login(request);
export default function Login(){return <main><h1>Roseland Journal</h1><Form method="post"><label>Shop domain <input name="shop" placeholder="your-store.myshopify.com" required/></label><button>Connect Shopify</button></Form></main>;}
