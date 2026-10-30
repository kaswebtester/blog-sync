import { randomUUID } from "node:crypto";
import { gql } from "./graphql.server.js";
import { parseEditorial } from "./editorial-values.js";

export async function loadEditorial(admin,articleId){
 const {article}=await gql(admin,"editorialRead",{id:articleId});
 if(!article)throw new Error("Article was deleted in Shopify.");
 const blocks=(article.blocks?.references?.nodes || []).map(node=>Object.fromEntries(node.fields.map(field=>[field.key,field.value || ""])));
 return {namespace:article.design?.namespace || null,design:article.design?.jsonValue || "standard",contentMode:article.contentMode?.jsonValue || "append",blocks,products:article.products?.jsonValue || [],stories:article.stories?.jsonValue || [],digests:{article_design:article.design?.compareDigest || null,content_mode:article.contentMode?.compareDigest || null,editorial_blocks:article.blocks?.compareDigest || null,related_products:article.products?.compareDigest || null,related_stories:article.stories?.compareDigest || null}};
}
export async function saveEditorial(admin,articleId,raw,digests){
 const data=parseEditorial(raw);
 // Stage new entries, then atomically replace the article references with CAS.
 // Existing entries are never mutated, preserving concurrent merchant edits.
 const revision=randomUUID();const ids=[];
 for(const [index,block] of data.blocks.entries()){
  const {metaobjectUpsert}=await gql(admin,"editorialBlockUpsert",{handle:{type:"$app:journal_block",handle:"article-"+articleId.split("/").pop()+"-"+revision+"-"+index},metaobject:{fields:Object.entries(block).filter(([,value])=>value!=="").map(([key,value])=>({key,value}))}});
  ids.push(metaobjectUpsert.metaobject.id);
 }
 await gql(admin,"editorialSet",{metafields:[
  {ownerId:articleId,key:"article_design",type:"single_line_text_field",value:data.design,compareDigest:digests.article_design ?? null},
  {ownerId:articleId,key:"content_mode",type:"single_line_text_field",value:data.contentMode,compareDigest:digests.content_mode ?? null},
  {ownerId:articleId,key:"editorial_blocks",type:"list.metaobject_reference",value:JSON.stringify(ids),compareDigest:digests.editorial_blocks ?? null},
  {ownerId:articleId,key:"related_products",type:"list.product_reference",value:JSON.stringify(data.products),compareDigest:digests.related_products ?? null},
  {ownerId:articleId,key:"related_stories",type:"list.article_reference",value:JSON.stringify(data.stories),compareDigest:digests.related_stories ?? null}
 ]});
}
