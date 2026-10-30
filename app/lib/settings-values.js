export const defaults={feedUrl:"https://roselandusa.substack.com/feed",feedName:"Roseland on Substack",syncMetadata:true,publishArticles:true,publishedOnly:true,defaultCategory:"",journalName:"Journal",blogHandle:"journal",categories:"New Products, Making, Materials, Design History, People & Places",syncEnabled:true,syncInterval:15,lastSyncAt:null};
export function validateFeedUrl(value){
 let url;try{url=new URL(value);}catch{throw new Error("Enter a valid Substack RSS URL.");}
 if(url.protocol!=="https:" || !/^[a-z0-9-]+\.substack\.com$/i.test(url.hostname) || url.port || url.username || url.password || url.pathname!=="/feed" || url.search || url.hash)throw new Error("Use a Substack feed URL such as https://your-publication.substack.com/feed.");
 return url.href;
}
export function parseSettings(form){
 const feedUrl=validateFeedUrl(String(form.get("feedUrl") || "").trim());
 const feedName=String(form.get("feedName") || "").trim();
 if(!feedName || feedName.length>100)throw new Error("Enter a feed name of 1 to 100 characters.");
 const defaultCategory=String(form.get("defaultCategory") || "");
 const categories=[...new Set(String(form.get("categories")||"").split(",").map(s=>s.trim()).filter(Boolean))];
 if(categories.length>30 || categories.some(c=>c.length>60))throw new Error("Use up to 30 categories, each up to 60 characters.");
 if(defaultCategory && !categories.includes(defaultCategory))throw new Error("Default category must be in your category list.");
 const journalName=String(form.get("journalName")||"").trim(),blogHandle=String(form.get("blogHandle")||"").trim();
 if(!journalName || journalName.length>100)throw new Error("Journal name must have 1 to 100 characters.");
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(blogHandle) || blogHandle.length>100)throw new Error("Blog handle must use lowercase letters, numbers and hyphens.");
 const syncInterval=Number(form.get("syncInterval"));
 if(![5,15,30,60,360,1440].includes(syncInterval))throw new Error("Choose a valid sync interval.");
 return {feedUrl,feedName,defaultCategory,journalName,blogHandle,categories:categories.join(", "),syncInterval,syncEnabled:form.get("syncEnabled")==="on",syncMetadata:form.get("syncMetadata")==="on",publishArticles:form.get("publishArticles")==="on",publishedOnly:form.get("publishedOnly")==="on"};
}

export function categoryList(value){return [...new Set(value.split(",").map(s=>s.trim()).filter(Boolean))];}
export function isSyncDue(settings,now=Date.now()){return settings.syncEnabled && (!settings.lastSyncAt || now-new Date(settings.lastSyncAt).getTime()>=settings.syncInterval*60000);}
