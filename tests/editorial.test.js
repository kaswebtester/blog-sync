import {test} from "node:test";
import assert from "node:assert/strict";
import {parseEditorial} from "../app/lib/editorial-values.js";
import {saveEditorial} from "../app/lib/editorial.server.js";
const content=()=>({blocks:[{layout:"two_images",image_url:"https://example.com/one.jpg",second_image_url:"https://example.com/two.jpg",caption:"First",second_caption:"Second"}],products:["gid://shopify/Product/12"],stories:["gid://shopify/Article/34"]});
test("editorial layouts retain image order, captions and native references",()=>{const value=parseEditorial(JSON.stringify(content()));assert.equal(value.blocks[0].caption,"First");assert.equal(value.blocks[0].second_caption,"Second");assert.deepEqual(value.products,["gid://shopify/Product/12"]);});
test("editorial content rejects unsafe URLs and unrelated reference types",()=>{const value=content();value.blocks[0].image_url="javascript:alert(1)";assert.throws(()=>parseEditorial(JSON.stringify(value)),/HTTPS/);value.blocks[0].image_url="https://example.com/a.jpg";value.products=["gid://shopify/Order/12"];assert.throws(()=>parseEditorial(JSON.stringify(value)),/reference/);});
test("empty structured content can clear all lists",()=>{assert.deepEqual(parseEditorial('{"blocks":[],"products":[],"stories":[]}'),{design:"standard",contentMode:"append",blocks:[],products:[],stories:[]});});
test("saving structured content stages new entries and atomically writes references with CAS",async()=>{
 const calls=[];const admin={graphql:async(query,{variables})=>{calls.push({query,variables});return {json:async()=>({data:query.includes("metaobjectUpsert")?{metaobjectUpsert:{metaobject:{id:"gid://shopify/Metaobject/1"},userErrors:[]}}:{metafieldsSet:{metafields:[],userErrors:[]}}})};}};
 await saveEditorial(admin,"gid://shopify/Article/34",JSON.stringify(content()),{editorial_blocks:"digest",related_products:null,related_stories:null});
 assert.equal(calls.length,2);assert.equal(calls[0].variables.handle.type,"$app:journal_block");assert.equal(calls[1].variables.metafields[2].compareDigest,"digest");assert.equal(calls[1].variables.metafields[2].value,'["gid://shopify/Metaobject/1"]');assert.ok(calls.every(call=>!call.query.includes('articleUpdate')));
});
test("Shopify field errors stop saves before linking invalid blocks",async()=>{
 let count=0;const admin={graphql:async()=>{count++;return {json:async()=>({data:{metaobjectUpsert:{metaobject:null,userErrors:[{message:"Definition is not installed"}]}}})};}};
 await assert.rejects(()=>saveEditorial(admin,"gid://shopify/Article/34",JSON.stringify(content()),{}),/not installed/);assert.equal(count,1);
});

test("article designs default safely and validate section content",()=>{
 const value=content();assert.equal(parseEditorial(JSON.stringify(value)).design,"standard");
 value.design="custom";value.contentMode="sections";value.blocks=[{layout:"two_columns",text:"Left",second_text:"Right"}];
 const parsed=parseEditorial(JSON.stringify(value));assert.equal(parsed.blocks[0].second_text,"Right");assert.equal(parsed.design,"custom");
 value.blocks=[];assert.throws(()=>parseEditorial(JSON.stringify(value)),/at least one section/);
 value.contentMode="append";value.design="invalid";assert.throws(()=>parseEditorial(JSON.stringify(value)),/valid article design/);
});

test("reverting to original mode keeps sections and related references saved",async()=>{
 const input={...content(),design:"custom",contentMode:"original"};
 const parsed=parseEditorial(JSON.stringify(input));
 assert.equal(parsed.contentMode,"original");
 assert.equal(parsed.blocks[0].second_image_url,input.blocks[0].second_image_url);
 const calls=[];
 const admin={graphql:async(query,{variables})=>{
  calls.push({query,variables});
  return {json:async()=>({data:query.includes("metaobjectUpsert")?{metaobjectUpsert:{metaobject:{id:"gid://shopify/Metaobject/9"},userErrors:[]}}:{metafieldsSet:{metafields:[],userErrors:[]}}})};
 }};
 await saveEditorial(admin,"gid://shopify/Article/34",JSON.stringify(input),{});
 const fields=calls.at(-1).variables.metafields;
 assert.equal(fields.find(field=>field.key==="content_mode").value,"original");
 assert.equal(fields.find(field=>field.key==="article_design").value,"custom");
 assert.equal(fields.find(field=>field.key==="editorial_blocks").value,'["gid://shopify/Metaobject/9"]');
 assert.equal(fields.find(field=>field.key==="related_products").value,JSON.stringify(input.products));
 assert.ok(calls.every(call=>!call.query.includes("articleUpdate")),"original body must never be overwritten");
});
