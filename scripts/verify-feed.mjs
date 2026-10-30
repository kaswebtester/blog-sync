import Parser from "rss-parser";
import { writeFile } from "node:fs/promises";
import { normalize, metadataPatch } from "../app/lib/content.js";
import { validateFeedUrl } from "../app/lib/settings-values.js";

const feedUrl=validateFeedUrl(process.env.JOURNAL_TEST_FEED || "https://roselandusa.substack.com/feed");
const response=await fetch(feedUrl,{redirect:"error",signal:AbortSignal.timeout(30000)});
if(!response.ok)throw new Error("RSS fetch failed: HTTP "+response.status);
const feed=await new Parser({customFields:{item:["subtitle"]}}).parseString(await response.text());
if(!feed.items.length)throw new Error("The feed has no public posts to validate.");
const ids=new Set();
const posts=feed.items.map(item=>{
 const post=normalize(item);
 if(ids.has(post.sourceId))throw new Error("Feed contains duplicate source IDs.");
 ids.add(post.sourceId);
 if(post.handle!==normalize({...item,title:"Changed source title"}).handle)throw new Error("Article identity changed with the title.");
 const baseline={title:post.title,summary:post.summary,tags:post.tags};
 const edited={...baseline,title:"Manually edited title",body:"Manually art-directed body"};
 const {patch,locked}=metadataPatch(edited,baseline,{...post,title:"Changed upstream title",body:"Changed upstream body"});
 if("body" in patch || "title" in patch || !locked.includes("title"))throw new Error("Edit protection failed.");
 return {sourceId:post.sourceId,publicationDate:post.publishDate,bodyCharacters:post.body.length,images:(post.body.match(/<img\b/g)||[]).length,captions:(post.body.match(/<figcaption\b/g)||[]).length,tags:post.tags,hasFeaturedImage:!!post.image,stableIdentity:true,editProtection:true};
});
const report={checkedAt:new Date().toISOString(),feedUrl,posts:posts.length,earliestPublication:posts.map(post=>post.publicationDate).sort()[0],items:posts,limitations:["This verifies RSS parsing and edit-protection rules, not live Shopify mutations.","Inline images retain source URLs; they are not copied to Shopify Files."]};
await writeFile(new URL("../docs/feed-validation.json",import.meta.url),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({posts:report.posts,earliestPublication:report.earliestPublication,images:posts.reduce((sum,post)=>sum+post.images,0),captions:posts.reduce((sum,post)=>sum+post.captions,0),stableIdentity:true,editProtection:true,report:"docs/feed-validation.json"},null,2));
