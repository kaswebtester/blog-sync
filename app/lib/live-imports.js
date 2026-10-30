import { gql } from "./graphql.server.js";

export async function liveImports(admin, records, {publishedOnly=false,now=Date.now()}={}) {
  const live = new Map();
  const ids = [...new Set(records.map(row => row.articleId).filter(Boolean))];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const { nodes } = await gql(admin, "liveArticles", { ids: ids.slice(offset, offset + 100) });
    for (const article of nodes) {
      if (article?.id) live.set(article.id, article);
    }
  }
  // Keep local import history intact so deleted stories are not recreated by RSS.
  const published=article=>article.isPublished===true && !!article.publishedAt && new Date(article.publishedAt).getTime()<=now;
  return records.filter(row => {
    if(!row.articleId)return !publishedOnly;
    const article=live.get(row.articleId);
    return !!article && (!publishedOnly || published(article));
  }).map(row => row.articleId ? { ...row, title: live.get(row.articleId).title, isPublished:published(live.get(row.articleId)) } : row);
}
