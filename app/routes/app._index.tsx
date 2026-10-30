import { setArticleVisibility } from "../lib/visibility.js";
import { useState } from "react";
import journalStyles from "../styles/journal.css?url";
export const links = () => [{ rel: "stylesheet", href: journalStyles }];
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { gql } from "../lib/graphql.server.js";
import { syncJournal, journalBlog } from "../lib/sync.server";
import { getSettings, parseSettings } from "../lib/settings.server";
import { categoryList } from "../lib/settings-values.js";
import { liveImports } from "../lib/live-imports.js";
export const loader=async({request}:LoaderFunctionArgs)=>{
 const {admin,session}=await authenticate.admin(request);
 const records=await db.import.findMany({where:{shop:session.shop},orderBy:{importedAt:"desc"}});
 const settings=await getSettings(session.shop);
 const posts:(typeof records[number] & {isPublished?:boolean})[]=await liveImports(admin,records,{publishedOnly:false});
 return json({shop:session.shop,settings,posts});
};
export const action=async({request}:ActionFunctionArgs)=>{
 const {admin,session}=await authenticate.admin(request);
 const form=await request.formData();
 if(form.get("intent")==="visibility"){
  try{await setArticleVisibility(admin,db.import,session.shop,String(form.get("recordId")||""),String(form.get("enabled")||""));return json({report:null,error:null,saved:false,visibilitySaved:true});}
  catch(e){return json({report:null,error:e instanceof Error?e.message:"Could not update publication status",saved:false},{status:400});}
 }
 if(form.get("intent")==="settings"){
  try{const data=parseSettings(form);const blogId=await journalBlog(admin,data);await gql(admin,"blogUpdate",{id:blogId,blog:{title:data.journalName}});await db.journalSettings.upsert({where:{shop:session.shop},create:{shop:session.shop,...data},update:data});return json({report:null,error:null,saved:true});}
  catch(e){return json({report:null,error:e instanceof Error?e.message:"Could not save settings",saved:false},{status:400});}
 }
 try{return json({report:await syncJournal(admin,session.shop,{restoreDeleted:form.get("intent")==="restore"}),error:null,saved:false});}
 catch(e){return json({report:null,error:e instanceof Error?e.message:"Sync failed",saved:false},{status:502});}
};

export default function Journal() {
  const {posts,shop,settings}=useLoaderData<typeof loader>();
  const result=useActionData<typeof action>();
  const [categoryInput,setCategoryInput]=useState(settings.categories);
  const navigation=useNavigation();
  const saving=navigation.state!=="idle" && navigation.formData?.get("intent")==="settings";
  const pending=navigation.state!=="idle";
  const busy=pending && ["sync","restore"].includes(String(navigation.formData?.get("intent")));
  const imported=posts.filter(post=>post.articleId).length;
  return <main className="journal-app" aria-busy={pending}>
    <div className="journal-shell">
      <header className="journal-heading">
        <div><div className="journal-brand"><span className="brand-mark" aria-hidden="true">R</span> ROSELAND <span className="brand-divider">/</span> EDITORIAL</div><h1>{settings.journalName}</h1><p>Your stories, from Substack to Roseland.</p></div>
        <a className="secondary-button" href={"https://"+shop+"/blogs/"+settings.blogHandle} target="_blank" rel="noreferrer">View Journal <span aria-hidden="true">&#8599;</span></a>
      </header>

      <section className="sync-card" aria-labelledby="source-heading">
        <div className="source-row"><div className="source-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 4h14M5 8h14M5 12h14v9l-7-4-7 4z"/></svg></div><div className="source-detail"><div className="eyebrow">CONTENT SOURCE</div><h2 id="source-heading">{settings.feedName}</h2><a href={settings.feedUrl} target="_blank" rel="noreferrer">{new URL(settings.feedUrl).hostname} <span aria-hidden="true">&#8599;</span></a></div><span className="source-badge"><span/>RSS Feed</span></div>
        <div className="sync-footer"><div><strong>{busy?"Bringing your stories over...":"Ready when you are"}</strong><p>{busy?"Keep this page open while we check the feed and import your posts.":"Import new posts and refresh eligible story details."}</p></div><Form method="post"><input type="hidden" name="intent" value="sync"/><button className="primary-button" disabled={pending}>{busy?<span className="sync-spinner" aria-hidden="true"/>:<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 7a7 7 0 0 1 11.5-1L20 9M4 15l2.4 3A7 7 0 0 0 18 17"/></svg>}{busy?"Syncing Journal...":"Sync Journal"}</button></Form></div>
        {busy && <div className="sync-progress" aria-hidden="true"><span/></div>}
      </section>

      <Form method="post" className="restore-imports"><input type="hidden" name="intent" value="restore"/><button className="secondary-button" disabled={pending}>Re-import deleted posts</button><p>Restore posts from the saved feed that were deleted in Shopify. Existing articles and edits are preserved.</p></Form>
      <details className="feed-settings"><summary>Journal Settings</summary>
        <Form method="post" key={JSON.stringify(settings)} className="settings-form">
          <input type="hidden" name="intent" value="settings"/>
          <label>Journal name<input name="journalName" defaultValue={settings.journalName} maxLength={100} required/></label>
          <label>Destination blog handle<input name="blogHandle" defaultValue={settings.blogHandle} pattern="[a-z0-9]+(-[a-z0-9]+)*" required/><span>New imports go here. Existing articles stay in their original blog.</span></label>
          <label>Categories<input name="categories" value={categoryInput} onChange={event=>setCategoryInput(event.target.value)}/><span>Comma-separated. Removing a category does not remove tags from existing articles.</span></label>
          <label>Feed name<input name="feedName" defaultValue={settings.feedName} maxLength={100} required/></label>
          <label>Substack RSS URL<input name="feedUrl" type="url" defaultValue={settings.feedUrl} required/><span>Use https://your-publication.substack.com/feed</span></label>
          <label>Default category<select name="defaultCategory" defaultValue={settings.defaultCategory}><option value="">No default category</option>{categoryList(categoryInput).map(category=><option key={category}>{category}</option>)}</select><span>Used when a post has no RSS categories.</span></label>
          <label className="settings-checkbox"><input name="syncEnabled" type="checkbox" defaultChecked={settings.syncEnabled}/>Enable scheduled sync</label>
          <label>Sync interval<select name="syncInterval" defaultValue={settings.syncInterval}>{[[5,"5 minutes"],[15,"15 minutes"],[30,"30 minutes"],[60,"Hourly"],[360,"Every 6 hours"],[1440,"Daily"]].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><span>Requires your host scheduler to call /api/sync every 5 minutes. Manual sync is always available.</span></label>
          <label className="settings-checkbox"><input name="publishArticles" type="checkbox" defaultChecked={settings.publishArticles}/>Publish new imports immediately</label>
          <label className="settings-checkbox"><input name="syncMetadata" type="checkbox" defaultChecked={settings.syncMetadata}/>Sync titles, excerpts and tags until manually edited</label>
          <p className="settings-help">Changes apply to future syncs. Existing articles and body edits are preserved. Uncheck publishing to import new stories as drafts.</p>
          <button className="primary-button" disabled={pending}>{saving?"Saving...":"Save settings"}</button>
        </Form>
      </details>
      {result && "visibilitySaved" in result && result.visibilitySaved === true && <p className="sync-message message-success" role="status">Storefront visibility updated. All imported posts remain visible in this admin list.</p>}
      {result?.saved && <p className="sync-message message-success" role="status">Feed settings saved.</p>}

      <aside className="editing-note"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></svg><div><strong>Your edits stay yours.</strong> Imported stories are native Shopify articles. Body copy, images and captions stay untouched by future syncs.<p>{settings.syncMetadata?"Titles, excerpts and tags sync only until you edit them in Shopify.":"Metadata syncing is turned off."}</p></div></aside>

      {result?.error && <div className="sync-message message-error" role="alert"><strong>Unable to complete the request.</strong><p>{result.error}</p></div>}
      {!busy && result?.report && <div className={"sync-message "+(result.report.errors.length?"message-warning":"message-success")} role="status"><strong>{result.report.errors.length?"Sync finished with some issues":result.report.deleted?"Sync complete - deleted posts were left out":"Journal is up to date"}</strong><p>{result.report.created} imported / {result.report.updated} metadata updated / {result.report.skipped} unchanged{result.report.deleted>0 && <> / {result.report.deleted} deleted in Shopify</>}</p>{result.report.deleted>0 && <p>Use Re-import deleted posts to restore these stories from the feed.</p>}{result.report.errors.map((e:any,i:number)=><p key={i}>{e.title}: {e.message}</p>)}</div>}

      <section className="stories-card" aria-labelledby="stories-heading"><div className="stories-heading"><h2 id="stories-heading">Imported Stories <span className="story-count">{imported}</span></h2><span>All posts shown here</span></div>
        {!posts.length?<div className="stories-empty"><div className="empty-icon" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 5h13l5 5v17H7z"/><path d="M20 5v6h5M11 15h10M11 19h10M11 23h6"/></svg></div><h3>A new chapter starts here</h3><p>Sync your Substack feed to bring your first stories into the Journal.</p><span className="empty-caption">Original publication dates are preserved.</span></div>:<div className="stories-table-wrap"><table className="stories-table"><thead><tr><th>Story</th><th>Imported on</th><th>Show on storefront</th><th><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{posts.map(post=><tr key={post.id}><td><strong>{post.title}</strong><span className={"article-status "+(!post.articleId?"pending-status":"")}>{post.articleId?(post.isPublished?"Published":"Draft / scheduled"):"Pending import"}</span></td><td>{new Date(post.importedAt).toLocaleDateString("en-GB",{timeZone:"UTC",day:"numeric",month:"short",year:"numeric"})}</td><td>{post.articleId && <Form method="post" className="visibility-form"><input type="hidden" name="intent" value="visibility"/><input type="hidden" name="recordId" value={post.id}/><input type="hidden" name="enabled" value={post.isPublished?"false":"true"}/><button type="submit" role="switch" aria-checked={!!post.isPublished} aria-label={(post.isPublished?"Disable ":"Enable ")+post.title} className={"visibility-switch "+(post.isPublished?"is-enabled":"")} disabled={pending}><span className="switch-track" aria-hidden="true"><span/></span><span>{pending && navigation.formData?.get("recordId")===post.id?"Saving...":post.isPublished?"Enabled":"Disabled"}</span></button></Form>}</td><td>{post.articleId && <Link className="edit-link" to={"/app/articles/"+post.id}>Art direction</Link>} {post.articleId && <a className="edit-link" target="_top" href={"https://"+shop+"/admin/articles/"+post.articleId.split("/").pop()}>Edit in Shopify <span aria-hidden="true">&#8599;</span></a>}</td></tr>)}</tbody></table></div>}
      </section>
      <footer className="journal-footnote">Published on Substack. Made your own on Roseland.</footer>
    </div>
  </main>;
}
