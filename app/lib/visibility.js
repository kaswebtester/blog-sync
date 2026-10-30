import { gql } from "./graphql.server.js";
export async function setArticleVisibility(admin,imports,shop,recordId,value){
 if(value!=="true" && value!=="false")throw new Error("Choose a valid enable or disable action.");
 const row=await imports.findFirst({where:{id:recordId,shop}});
 if(!row?.articleId)throw new Error("Imported article not found for this store.");
 const {nodes}=await gql(admin,"liveArticles",{ids:[row.articleId]});
 const current=nodes[0];
 if(!current)throw new Error("This article was deleted in Shopify. Refresh the list.");
 if(value==="true" && current.publishedAt && new Date(current.publishedAt).getTime()>Date.now())throw new Error("This post has a future publication date. Update its schedule in Shopify before enabling it now.");
 await gql(admin,"articleUpdate",{id:row.articleId,article:{isPublished:value==="true"}});
}
