import EditorialFields, { type EditorialData, type Choice } from "../components/editorial-fields";
import { loadEditorial, saveEditorial } from "../lib/editorial.server.js";
import { useState } from "react";
import { Form, Link, useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { gql } from "../lib/graphql.server.js";
import { clean } from "../lib/content.js";
import { getSettings } from "../lib/settings.server.js";
import { categoryList } from "../lib/settings-values.js";
import styles from "../styles/journal.css?url";
export const links=()=>[{rel:"stylesheet",href:styles}];
async function importedStory(shop:string,id:string|undefined){const row=await db.import.findFirst({where:{id:id || "",shop}});if(!row?.articleId)throw new Response("Story not found",{status:404});return row;}
export const loader=async({request,params}:LoaderFunctionArgs)=>{
 const {admin,session}=await authenticate.admin(request);const row=await importedStory(session.shop,params.id);
 const {article}=await gql(admin,"articleEditor",{id:row.articleId});if(!article)throw new Response("Article deleted in Shopify",{status:404});
 let editorial:EditorialData|null=null;
 let choices:{products:Choice[];stories:Choice[]}={products:[],stories:[]};
 let editorialError:string|null=null;
 try{editorial=await loadEditorial(admin,row.articleId);const data=await gql(admin,"editorialChoices");choices={products:data.products.nodes,stories:data.articles.nodes.filter((story:{id:string})=>story.id!==row.articleId)};}
 catch(e){editorialError=e instanceof Error?e.message:"Editorial fields unavailable";}
 return json({article,settings:await getSettings(session.shop),editorial,choices,editorialError});
};
export const action=async({request,params}:ActionFunctionArgs)=>{
 const {admin,session}=await authenticate.admin(request);const row=await importedStory(session.shop,params.id);const form=await request.formData();
 try{
 if(form.get("intent")==="editorial"){
  const raw=String(form.get("editorial")||"");if(raw.length>1000000)throw new Error("Editorial content is too large.");
  const digests=JSON.parse(String(form.get("digests")||"{}"));
  await saveEditorial(admin,row.articleId,raw,digests);
  return json({saved:true,error:null});
 }
 const current=(await gql(admin,"articleEditor",{id:row.articleId})).article;
 if(!current || current.updatedAt!==form.get("version"))return json({error:"This article changed since you opened it. Reload before saving to preserve the latest edits.",saved:false},{status:409});
 const title=String(form.get("title")||"").trim();if(!title || title.length>255)throw new Error("Enter a title of 1 to 255 characters.");
 const body=String(form.get("body")||"");if(body.length>1000000)throw new Error("Article body is too large.");
 const tags=[...new Set(form.getAll("category").map(String))];
 const settings=await getSettings(session.shop);const known=categoryList(settings.categories);
 const retained=current.tags.filter((tag:string)=>!known.includes(tag));
 await gql(admin,"articleUpdate",{id:row.articleId,article:{title,body:clean(body),tags:[...new Set([...retained,...tags])]}});
 await db.import.update({where:{id:row.id},data:{title,lockedFields:JSON.stringify([...new Set([...JSON.parse(row.lockedFields),"title","tags"])])}});
 return json({saved:true,error:null});
 }catch(e){return json({saved:false,error:e instanceof Error?e.message:"Could not save article"},{status:502});}
};
function Editor({article,settings,editorial,choices,editorialError}:ReturnType<typeof useLoaderData<typeof loader>>){
 const [body,setBody]=useState(article.body || "");
 const result=useActionData<typeof action>();const busy=useNavigation().state!=="idle";
 return <main className="journal-app"><div className="journal-shell"><Link to="/app">Back to Journal</Link><h1>Art direction</h1><p>Edit the title, categories and body below. Use editorial blocks for additional layouts and related products or stories.</p>
 {result?.error && <p role="alert" className="sync-message message-error">{result.error}</p>}{result?.saved && <p role="status" className="sync-message message-success">Changes saved in Shopify.</p>}
 <Form method="post" className="settings-form" style={{maxWidth:"100%",padding:0}}><input type="hidden" name="version" value={article.updatedAt}/><label>Title<input name="title" defaultValue={article.title} required maxLength={255}/></label>
 <fieldset><legend>Categories</legend>{categoryList(settings.categories).map(category=><label className="settings-checkbox" key={category}><input type="checkbox" name="category" value={category} defaultChecked={article.tags.includes(category)}/>{category}</label>)}</fieldset>
 <label>Body HTML<textarea name="body" value={body} onChange={e=>setBody(e.target.value)} rows={24} spellCheck={false}/></label>
 <button className="primary-button" disabled={busy}>{busy?"Saving...":"Save article"}</button><p>RSS sync will preserve these body, title and category edits. Layout styling requires the supplied Journal theme template.</p></Form>{editorialError && <p role="alert" className="sync-message message-warning">Structured content is unavailable: {editorialError}. Restart Shopify CLI and approve the new metaobject/product permissions, then reload.</p>}{editorial && <EditorialFields key={JSON.stringify(editorial.digests)} editorial={editorial} choices={choices} articleBody={body}/>}</div></main>;
}
export default function ArticleEditor(){const data=useLoaderData<typeof loader>();return <Editor key={data.article.updatedAt} {...data}/>;}
