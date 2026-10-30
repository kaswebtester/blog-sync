import { renderToString } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import type { EntryContext } from "@remix-run/node";
import { addDocumentResponseHeaders } from "./shopify.server";
export default function handleRequest(request:Request,status:number,headers:Headers,context:EntryContext){addDocumentResponseHeaders(request,headers); headers.set("Content-Type","text/html");return new Response("<!DOCTYPE html>"+renderToString(<RemixServer context={context} url={request.url}/>),{status,headers});}
