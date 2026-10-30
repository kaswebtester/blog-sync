import {redirect, type LoaderFunctionArgs} from "@remix-run/node";
export const loader=({request}:LoaderFunctionArgs)=>redirect("/app"+new URL(request.url).search);
