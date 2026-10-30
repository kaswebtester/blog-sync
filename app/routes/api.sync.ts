import { getSettings } from "../lib/settings.server";
import { isSyncDue } from "../lib/settings-values.js";
import { timingSafeEqual } from "node:crypto";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import db from "../db.server";
import { syncJournal } from "../lib/sync.server";
export const action=async({request}:ActionFunctionArgs)=>{const expected=process.env.CRON_SECRET;const actual=request.headers.get("authorization") || "";const target="Bearer "+expected;if(!expected || Buffer.byteLength(actual)!==Buffer.byteLength(target) || !timingSafeEqual(Buffer.from(actual),Buffer.from(target)))throw new Response("Unauthorized",{status:401});const sessions=await db.session.findMany({where:{isOnline:false},distinct:["shop"]});const reports=[];for(const {shop} of sessions){try{const settings=await getSettings(shop);if(!isSyncDue(settings)){reports.push({shop,skipped:true});continue;}const {admin}=await unauthenticated.admin(shop);reports.push({shop,...await syncJournal(admin,shop)});}catch(e){reports.push({shop,error:e instanceof Error?e.message:"Sync failed"});}}return json({reports});};
