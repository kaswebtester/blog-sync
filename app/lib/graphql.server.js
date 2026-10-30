export const operations={

 editorialRead:`query JournalEditorial($id:ID!){article(id:$id){design:metafield(namespace:"$app",key:"article_design"){namespace jsonValue compareDigest} contentMode:metafield(namespace:"$app",key:"content_mode"){jsonValue compareDigest} blocks:metafield(namespace:"$app",key:"editorial_blocks"){compareDigest references(first:50){nodes{... on Metaobject{fields{key value}}}}} products:metafield(namespace:"$app",key:"related_products"){jsonValue compareDigest} stories:metafield(namespace:"$app",key:"related_stories"){jsonValue compareDigest}}}`,
 editorialSet:`mutation JournalEditorialSet($metafields:[MetafieldsSetInput!]!){metafieldsSet(metafields:$metafields){metafields{id} userErrors{field message}}}`,
 editorialBlockUpsert:`mutation JournalEditorialBlock($handle:MetaobjectHandleInput!,$metaobject:MetaobjectUpsertInput!){metaobjectUpsert(handle:$handle,metaobject:$metaobject){metaobject{id} userErrors{field message}}}`,
 editorialChoices:`query JournalEditorialChoices{products(first:50){nodes{id title}} articles(first:100){nodes{id title}}}`,

 liveArticles:`query JournalLiveArticles($ids:[ID!]!){nodes(ids:$ids){... on Article{id title isPublished publishedAt}}}`,
 blogUpdate:`mutation JournalBlogUpdate($id:ID!,$blog:BlogUpdateInput!){blogUpdate(id:$id,blog:$blog){blog{id title} userErrors{field message}}}`,
 articleEditor:`query JournalArticleEditor($id:ID!){article(id:$id){id title body tags updatedAt}}`,
 blogs:`query JournalBlogs($after:String){blogs(first:100,after:$after){nodes{id handle} pageInfo{hasNextPage endCursor}}}`,
 blogCreate:`mutation JournalBlogCreate($blog:BlogCreateInput!){blogCreate(blog:$blog){blog{id handle} userErrors{field message}}}`,
 articleCreate:`mutation JournalArticleCreate($article:ArticleCreateInput!){articleCreate(article:$article){article{id title summary tags} userErrors{field message}}}`,
 article:`query JournalArticle($id:ID!){article(id:$id){id title summary tags}}`,
 recover:`query JournalRecover($query:String!){articles(first:10,query:$query){nodes{id handle blog{id}}}}`,
 articleUpdate:`mutation JournalArticleUpdate($id:ID!,$article:ArticleUpdateInput!){articleUpdate(id:$id,article:$article){article{id title summary tags} userErrors{field message}}}`
};
export async function gql(admin,operation,variables={}){const response=await admin.graphql(operations[operation],{variables});const result=await response.json();if(result.errors?.length)throw new Error(result.errors.map(e=>e.message).join("; "));const data=result.data;const payload=data[operation] || (operation==="editorialSet"?data.metafieldsSet:operation==="editorialBlockUpsert"?data.metaobjectUpsert:null);if(payload?.userErrors?.length)throw new Error(payload.userErrors.map(e=>e.message).join("; "));return data;}
