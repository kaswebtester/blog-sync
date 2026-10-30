export const LAYOUTS=["text","two_columns","image","wide_image","two_images","image_text","pull_quote"];
export function parseEditorial(value){
 let data;try{data=JSON.parse(value);}catch{throw new Error("Editorial content must be valid JSON.");}
 if(!data || !Array.isArray(data.blocks) || data.blocks.length>50)throw new Error("Use no more than 50 editorial blocks.");
 const design=data.design ?? "standard"; const contentMode=data.contentMode ?? "append";
 if(!["standard","custom"].includes(design))throw new Error("Choose a valid article design.");
 if(!["append","sections","original"].includes(contentMode))throw new Error("Choose a valid content source.");
 if(contentMode==="sections" && !data.blocks.length)throw new Error("Add at least one section before replacing the article body.");
 const blocks=data.blocks.map((block,index)=>{
  if(!block || !LAYOUTS.includes(block.layout))throw new Error("Choose a valid layout for block "+(index+1));
  const result={layout:block.layout};
  for(const key of ["label","text","second_text","image_url","second_image_url","caption","second_caption","alt","second_alt"]){
   const text=String(block[key]||"").trim();
   if(text.length>(["text","second_text","caption","second_caption"].includes(key)?20000:2000))throw new Error("Block "+(index+1)+" has a field that is too long.");
   if(key.endsWith("url") && text){let url;try{url=new URL(text);}catch{throw new Error("Enter a valid image URL.");}if(url.protocol!=="https:" || url.username || url.password)throw new Error("Image URLs must use HTTPS without credentials.");}
   result[key]=text;
  }
  result.label=result.label || "Block "+(index+1);
  if(result.label.length>100 || result.alt.length>255 || result.second_alt.length>255)throw new Error("Use shorter block labels or image descriptions.");
  return result;
 });
 const refs=(key,type)=>{if(!Array.isArray(data[key]) || data[key].length>50)throw new Error("Use up to 50 related references.");const result=[...new Set(data[key])];if(result.some(id=>typeof id!=="string" || !new RegExp("^gid://shopify/"+type+"/[0-9]+$").test(id)))throw new Error("Invalid related "+type+" reference.");return result;};
 return {design,contentMode,blocks,products:refs("products","Product"),stories:refs("stories","Article")};
}
