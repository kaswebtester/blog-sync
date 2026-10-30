import { PrismaClient } from "@prisma/client";
import { createAdminApiClient } from "@shopify/admin-api-client";
const shop=process.argv[2];
if(!shop || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop))throw new Error("Pass your exact store.myshopify.com domain as the argument.");
const db=new PrismaClient();
try{
 const session=await db.session.findFirst({where:{shop,isOnline:false},orderBy:{id:"asc"}});
 if(!session?.accessToken)throw new Error("No offline app session for this shop. Open the app in Shopify first.");
 const client=createAdminApiClient({storeDomain:shop,apiVersion:"2026-10",accessToken:session.accessToken});
 const query=await client.request(`query JournalLandingPage($query:String!){pages(first:10,query:$query){nodes{id title handle templateSuffix}}}`,{variables:{query:"handle:journal-landing-page"}});
 if(query.errors)throw new Error(JSON.stringify(query.errors));
 const existing=query.data.pages.nodes.find(page=>page.handle==="journal-landing-page");
 if(existing){console.log(JSON.stringify({created:false,page:existing,message:"Page already exists; it was not modified."},null,2));}
 else{
  const result=await client.request(`mutation CreateJournalLandingPage($page:PageCreateInput!){pageCreate(page:$page){page{id title handle templateSuffix} userErrors{field message}}}`,{variables:{page:{title:"Journal Landing Page",handle:"journal-landing-page",body:"",templateSuffix:"journal-landing",isPublished:false}}});
  if(result.errors)throw new Error(JSON.stringify(result.errors));
  if(result.data.pageCreate.userErrors.length)throw new Error(result.data.pageCreate.userErrors.map(error=>error.message).join("; "));
  console.log(JSON.stringify({created:true,page:result.data.pageCreate.page,message:"Draft created. Upload the page template and section, select the blog, preview, then publish."},null,2));
 }
}finally{await db.$disconnect();}
