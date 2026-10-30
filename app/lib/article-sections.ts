export type ArticleSection = Record<string, string>;

export function importArticleSections(html: string): ArticleSection[] {
  const document = new DOMParser().parseFromString(html, "text/html");
  if (document.querySelector("table,iframe,video,audio")) {
    throw new Error("This article contains tables or embedded media. Keep the original article or create sections manually.");
  }
  const blocks: ArticleSection[] = [];
  function text(node: Node): string {
    if (node.nodeType === 3) return node.textContent || "";
    if (!(node instanceof Element)) return "";
    if (node.tagName === "BR") return "\n";
    const value = Array.from(node.childNodes).map(text).join("");
    return /^(P|DIV|H[1-6]|LI)$/.test(node.tagName) ? value + "\n\n" : value;
  }
  function visit(node: Node) {
    if (node.nodeType === 3) {
      const value = node.textContent?.trim();
      if (value) blocks.push({layout:"text",text:value});
      return;
    }
    if (!(node instanceof Element) || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(node.tagName)) return;
    if (node.tagName === "FIGURE" || node.tagName === "IMG") {
      const images = node.tagName === "IMG" ? [node] : Array.from(node.querySelectorAll("img"));
      if (images.length) {
        images.forEach(image => {
          const src = image.getAttribute("src") || "";
          if (!src.startsWith("https://")) throw new Error("An image has no HTTPS URL. Fix its source before importing sections.");
          blocks.push({layout:"image",image_url:src,alt:image.getAttribute("alt") || "",caption:node.querySelector("figcaption")?.textContent?.trim() || ""});
        });
        return;
      }
    }
    if (node.tagName === "BLOCKQUOTE") {
      blocks.push({layout:"pull_quote",text:text(node).trim()});
      return;
    }
    if (!node.querySelector("img,figure,blockquote") && /^(P|H[1-6]|UL|OL)$/.test(node.tagName)) {
      const value = text(node).trim();
      if (value) blocks.push({layout:"text",text:value});
      return;
    }
    Array.from(node.childNodes).forEach(visit);
  }
  Array.from(document.body.childNodes).forEach(visit);
  const merged: ArticleSection[] = [];
  blocks.forEach(block => {
    const previous = merged[merged.length - 1];
    if (block.layout === "text" && previous?.layout === "text" && previous.text.length + block.text.length < 19000) previous.text += "\n\n" + block.text;
    else merged.push({...block});
  });
  if (!merged.length) throw new Error("No supported article content found.");
  if (merged.length > 50) throw new Error("This article needs more than 50 sections. Arrange it manually instead.");
  return merged.map((block,index)=>({...block,label:`Section ${index+1}`}));
}
