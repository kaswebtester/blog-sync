import { test } from "node:test";
import assert from "node:assert/strict";
import { liveImports } from "../app/lib/live-imports.js";
const mock = nodes => ({graphql:async()=>({json:async()=>({data:{nodes}})})});
test("published-only hides drafts, future scheduled posts and pending imports",async()=>{
 const nodes=[{id:"published",title:"Published",isPublished:true,publishedAt:"2024-01-01T00:00:00Z"},{id:"draft",title:"Draft",isPublished:false,publishedAt:null},{id:"future",title:"Scheduled",isPublished:true,publishedAt:"2030-01-01T00:00:00Z"}];
 const rows=nodes.map(node=>({articleId:node.id})).concat([{articleId:null}]);
 const posts=await liveImports(mock(nodes),rows,{publishedOnly:true,now:Date.parse("2026-10-20T00:00:00Z")});
 assert.deepEqual(posts.map(post=>post.articleId),["published"]);
});
test("disabling published-only shows published and draft articles",async()=>{
 const nodes=[{id:"a",title:"Published",isPublished:true,publishedAt:"2024-01-01T00:00:00Z"},{id:"b",title:"Draft",isPublished:false,publishedAt:null}];
 const posts=await liveImports(mock(nodes),nodes.map(node=>({articleId:node.id})),{publishedOnly:false});
 assert.equal(posts.length,2);assert.equal(posts[0].isPublished,true);assert.equal(posts[1].isPublished,false);
});
test("deleted Shopify articles disappear while pending imports remain",async()=>{
 const rows=[{id:"1",articleId:"a",title:"Old title"},{id:"2",articleId:"b",title:"Deleted"},{id:"3",articleId:null,title:"Pending"}];
 const result=await liveImports(mock([{id:"a",title:"Edited in Shopify"},null]),rows);
 assert.deepEqual(result.map(row=>row.id),["1","3"]);
 assert.equal(result[0].title,"Edited in Shopify");
 assert.equal(rows.length,3);
});
test("all deleted articles return an empty list",async()=>{
 assert.deepEqual(await liveImports(mock([null,null]),[{articleId:"a"},{articleId:"b"}]),[]);
});
test("API failures are not treated as deleted articles",async()=>{
 const admin={graphql:async()=>({json:async()=>({errors:[{message:"Access denied"}]})})};
 await assert.rejects(()=>liveImports(admin,[{articleId:"a"}]),/Access denied/);
});
test("article lookup batches at 100 IDs",async()=>{
 const calls=[];const admin={graphql:async(_query,{variables})=>{calls.push(variables.ids.length);return {json:async()=>({data:{nodes:variables.ids.map(id=>({id,title:id}))}})};}};
 const result=await liveImports(admin,Array.from({length:205},(_,i)=>({articleId:String(i)})));
 assert.deepEqual(calls,[100,100,5]);assert.equal(result.length,205);
});
