import sanitizeHtml from "sanitize-html";
import { createHash } from "node:crypto";
export { CATEGORIES } from "./categories.js";
export function clean(html=""){return sanitizeHtml(html,{allowedTags:[...sanitizeHtml.defaults.allowedTags,"img","figure","figcaption","picture","source"],allowedAttributes:{...sanitizeHtml.defaults.allowedAttributes,"*":["class"],a:["href","title"],img:["src","alt","width","height","loading"],source:["srcset","type"],figure:["class"],div:["class"]},allowedSchemes:["https","http","mailto"]});}
export function normalize(item){
 const date=new Date(item.isoDate || item.pubDate); if(!Number.isFinite(date.getTime())) throw new Error("Missing or invalid publication date: "+item.title);
 const sourceId=item.guid || item.link; if(!sourceId) throw new Error("Post has no stable RSS identifier");
 const body=clean(item["content:encoded"] || item.content || ""); if(!body.trim()) throw new Error("Post has no public RSS body");
 const tags=[...new Set(item.categories || [])];
 const firstImage=body.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1];
 const image=firstImage?{url:firstImage.replace(/&amp;/g,"&"),altText:item.title || "Roseland Journal"}:undefined;
 return {sourceId,title:item.title || "Untitled",summary:clean(item.subtitle || item.content || item.contentSnippet || ""),publishDate:date.toISOString(),body,tags,...(image?{image}:{}),author:{name:item.creator || "Roseland"},handle:"journal-"+createHash("sha256").update(sourceId).digest("hex").slice(0,20)};
}
const same=(a,b)=>JSON.stringify(Array.isArray(a)?[...a].sort():a)===JSON.stringify(Array.isArray(b)?[...b].sort():b);
export function metadataPatch(current,baseline,incoming,locked=[]){
 const patch={}, locks=new Set(locked);
 for(const key of ["title","summary","tags"]){if(locks.has(key))continue;if(!same(current[key],baseline[key])){locks.add(key);continue;} if(!same(current[key],incoming[key]))patch[key]=incoming[key];}
 return {patch,locked:[...locks]};
}
