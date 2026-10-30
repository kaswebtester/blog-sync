import Parser from "rss-parser";
import { randomUUID } from "node:crypto";
import db from "../db.server";
import { normalize,metadataPatch } from "./content.js";
import { gql } from "./graphql.server.js";
import { getSettings, validateFeedUrl } from "./settings.server.js";
export const FEED="https://roselandusa.substack.com/feed";
export async function readFeed(feedUrl=FEED){const response=await fetch(validateFeedUrl(feedUrl),{redirect:"error",signal:AbortSignal.timeout(20000),headers:{"User-Agent":"RoselandJournal/1.0"}});if(!response.ok)throw new Error("RSS returned "+response.status);const xml=await response.text();if(Buffer.byteLength(xml)>10000000)throw new Error("RSS feed exceeds 10 MB");return new Parser({customFields:{item:["subtitle"]}}).parseString(xml);}
export async function journalBlog(admin,settings){let after=null;do{const {blogs}=await gql(admin,"blogs",{after});const blog=blogs.nodes.find(b=>b.handle===settings.blogHandle);if(blog)return blog.id;after=blogs.pageInfo.hasNextPage?blogs.pageInfo.endCursor:null;}while(after);return (await gql(admin,"blogCreate",{blog:{title:settings.journalName,handle:settings.blogHandle,templateSuffix:"journal"}})).blogCreate.blog.id;}
export async function syncJournal(admin,shop,{restoreDeleted=false}={}){
 const token=randomUUID();const now=new Date();
 try{await db.syncLock.create({data:{shop,token,expiresAt:new Date(Date.now()+30*60*1000)}});}catch(error){const claim=await db.syncLock.updateMany({where:{shop,expiresAt:{lt:now}},data:{token,expiresAt:new Date(Date.now()+30*60*1000)}});if(!claim.count)throw new Error("A Journal sync is already running");}
 const report={created:0,updated:0,skipped:0,deleted:0,errors:[]};
 try{const settings=await getSettings(shop);const feed=await readFeed(settings.feedUrl);const blogId=await journalBlog(admin,settings);
 for(const item of feed.items){try{
 await db.syncLock.updateMany({where:{shop,token},data:{expiresAt:new Date(Date.now()+30*60*1000)}});
 const post=normalize(item);if(!post.tags.length && settings.defaultCategory)post.tags=[settings.defaultCategory];const key={shop_sourceId:{shop,sourceId:post.sourceId}};
 const row=await db.import.upsert({where:key,create:{shop,sourceId:post.sourceId,title:post.title},update:{}});
 const deleted=restoreDeleted && row.articleId && !(await gql(admin,"article",{id:row.articleId})).article;
 if(!row.articleId || deleted){
 // Recover a successful Shopify write after a failed local database write.
 const recovered=(await gql(admin,"recover",{query:"handle:"+post.handle})).articles.nodes.find(a=>a.handle===post.handle && a.blog.id===blogId);
 let article=recovered;
 if(!article){const {sourceId,...input}=post;article=(await gql(admin,"articleCreate",{article:{...input,blogId,isPublished:settings.publishArticles,templateSuffix:"journal"}})).articleCreate.article;}
 const baseline={title:article.title,summary:article.summary,tags:article.tags};
 await db.import.update({where:key,data:{articleId:article.id,baseline:JSON.stringify(baseline),lockedFields:JSON.stringify(recovered?["title","summary","tags"]:[])}});report.created++;continue;
 }
 const current=(await gql(admin,"article",{id:row.articleId})).article;
 if(!current){report.deleted++;continue;} // Respect articles deleted in Shopify.
 if(!settings.syncMetadata){report.skipped++;continue;}
 const {patch,locked}=metadataPatch(current,JSON.parse(row.baseline),post,JSON.parse(row.lockedFields));
 let baseline=JSON.parse(row.baseline);
 if(Object.keys(patch).length){const updated=(await gql(admin,"articleUpdate",{id:row.articleId,article:patch})).articleUpdate.article;baseline={title:updated.title,summary:updated.summary,tags:updated.tags};report.updated++;}else report.skipped++;
 await db.import.update({where:key,data:{baseline:JSON.stringify(baseline),lockedFields:JSON.stringify(locked)}});
 }catch(error){report.errors.push({title:item.title || "Untitled",message:error.message});}}
 await db.journalSettings.upsert({where:{shop},create:{shop,lastSyncAt:new Date()},update:{lastSyncAt:new Date()}});
 return report;
 }finally{await db.syncLock.deleteMany({where:{shop,token}});}
}
