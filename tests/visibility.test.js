import {test} from "node:test";
import assert from "node:assert/strict";
import {setArticleVisibility} from "../app/lib/visibility.js";
test("row switch updates only publication status for an article in the current shop",async()=>{
 const calls=[];const imports={findFirst:async({where})=>{assert.deepEqual(where,{id:"row",shop:"test.myshopify.com"});return {articleId:"gid://shopify/Article/1"};}};
 const admin={graphql:async(query,{variables})=>{calls.push(variables);return {json:async()=>({data:query.includes("JournalLiveArticles")?{nodes:[{id:"gid://shopify/Article/1",publishedAt:"2024-01-01T00:00:00Z"}]}:{articleUpdate:{article:{id:"gid://shopify/Article/1"},userErrors:[]}}})};}};
 await setArticleVisibility(admin,imports,"test.myshopify.com","row","false");
 assert.deepEqual(calls[1],{id:"gid://shopify/Article/1",article:{isPublished:false}});
 await setArticleVisibility(admin,imports,"test.myshopify.com","row","true");
 assert.deepEqual(calls[3].article,{isPublished:true});
});
test("unknown shop records and invalid actions cannot change visibility",async()=>{
 const admin={graphql:async()=>{throw new Error("Must not call Shopify");}};
 await assert.rejects(()=>setArticleVisibility(admin,{findFirst:async()=>null},"shop","missing","true"),/not found/);
 await assert.rejects(()=>setArticleVisibility(admin,{},"shop","missing","yes"),/valid/);
});
