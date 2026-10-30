import { useState } from "react";
import { Form, useNavigation } from "@remix-run/react";
import { importArticleSections } from "../lib/article-sections";
import { LAYOUTS } from "../lib/editorial-values.js";
type Block=Record<string,string>;
export type Choice={id:string;title:string};
export type EditorialData= {namespace?:string|null;design:string;contentMode:string;blocks:Block[];products:string[];stories:string[];digests:Record<string,string|null>};
export default function EditorialFields({editorial,choices,articleBody=""}: {articleBody?:string;editorial:EditorialData;choices:{products:Choice[];stories:Choice[]}}){
 const [design,setDesign]=useState(editorial.design);
 const [contentMode,setContentMode]=useState(editorial.contentMode);
 const [blocks,setBlocks]=useState(editorial.blocks);
 const [products,setProducts]=useState(editorial.products);
 const [stories,setStories]=useState(editorial.stories);
 const [importError,setImportError]=useState("");
 const busy=useNavigation().state!=="idle";
 const change=(index:number,key:string,value:string)=>setBlocks(blocks.map((block,i)=>i===index?{...block,[key]:value}:block));
 const hasSectionContent=blocks.some(block=>Object.entries(block).some(([key,value])=>!["layout","label"].includes(key) && Boolean(value.trim())));
 function importBody(){
  try{
   const imported=importArticleSections(articleBody);
   if(design==="custom" && imported[0]?.layout==="image")imported[0].layout="wide_image";
   setBlocks(imported);setContentMode("sections");setImportError("");
  }catch(error){setImportError(error instanceof Error?error.message:"Could not import article");}
 }
 function combine(index:number){
  const first=blocks[index],second=blocks[index+1];if(!second)return;
  const combined=first.layout==="image" && second.layout==="image"
   ? {...first,layout:"two_images",second_image_url:second.image_url,second_alt:second.alt,second_caption:second.caption}
   : first.layout==="text" && second.layout==="image" ? {...second,layout:"image_text",text:first.text,label:first.label} : null;
  if(combined)setBlocks([...blocks.slice(0,index),combined,...blocks.slice(index+2)]);
 }
 function move(index:number,offset:number){const next=[...blocks];[next[index],next[index+offset]]=[next[index+offset],next[index]];setBlocks(next);}
 return <details className="feed-settings" open><summary>Article design and sections</summary><Form method="post" className="settings-form" style={{maxWidth:"100%"}}>
 <input type="hidden" name="intent" value="editorial"/><input type="hidden" name="editorial" value={JSON.stringify({design,contentMode,blocks,products,stories})}/><input type="hidden" name="digests" value={JSON.stringify(editorial.digests)}/>
 <fieldset><legend>Article design</legend>
 <label>Design<select value={design} onChange={e=>setDesign(e.target.value)}><option value="standard">Design 1 — Journal Article (default)</option><option value="custom">Design 2 — Journal Article Custom</option></select></label>
 <p className="settings-help">Design 1 uses a narrow introduction and paired photo galleries. Design 2 expands the opening image, styles quotes, and places text beside the image preceding a quote. Imported content is arranged by the theme; sections give you manual control. Save editorial content to apply your choice.</p>
 {editorial.namespace && <p className="settings-help">Storefront namespace: <code>{editorial.namespace}</code>. This must match Journal article → Editorial metafield namespace in the theme editor.</p>}
 <label>Content source<select value={contentMode} onChange={e=>{const mode=e.target.value;setContentMode(mode);if(mode==="sections" && blocks.length===0)setBlocks([{layout:"text",label:"Section 1",text:""}]);}}><option value="original">Original article only — keep sections saved</option><option value="append">Article body, then sections</option><option value="sections">Sections only — build the complete article</option></select></label>
 <p className="settings-help">Sections only hides the original body on the storefront without deleting it. Add your text, images and quotes in reading order. RSS sync preserves these settings.</p></fieldset>
 <div className="treatment-toolbar">
 {articleBody && !hasSectionContent && <button type="button" className="secondary-button" disabled={busy} onClick={importBody}>Use existing article as sections</button>}
 {contentMode!=="original" && <button type="button" className="secondary-button" disabled={busy} onClick={()=>{setContentMode("original");setImportError("");}}>Revert to original article</button>}
 {contentMode==="original" && hasSectionContent && <button type="button" className="secondary-button" disabled={busy} onClick={()=>setContentMode("sections")}>Use saved sections again</button>}
 </div>
 {importError && <p role="alert">{importError}</p>}
 {contentMode==="original" && <p role="status" className="settings-help">The original article will be displayed. Your sections are kept but hidden. Click Save editorial content to apply this change.</p>}
 {articleBody && !hasSectionContent && <p className="settings-help">Import existing text, photos, captions and quotes to start editing sections. Text becomes plain text; review links and emphasis. You can revert to the original article at any time.</p>}
 <h2>Article sections ({blocks.length})</h2>
 <p className="settings-help">To match the reference: combine a text section with the image immediately below it, or combine two consecutive images. Add a Pull quote section for the centered quote.</p>
 {blocks.length===0 && <p role="status" className="settings-help">No sections added. Click Add editorial block to add text, two columns, images or a quote. Selecting Sections only starts your first text section.</p>}
 {contentMode==="sections" && <p role="status" className="settings-help">Build your article below, then save editorial content. The original body is kept separately. Click Revert to original article to display it again without appending your sections. Save editorial content to apply.</p>}
 {blocks.map((block,index)=><fieldset key={index}><legend>Section {index+1}</legend>
 <label>Layout<select value={block.layout} onChange={e=>change(index,"layout",e.target.value)}>{LAYOUTS.map(layout=><option key={layout} value={layout}>{layout.replaceAll("_"," ")}</option>)}</select></label>
 <label>Label<input value={block.label || ""} maxLength={100} onChange={e=>change(index,"label",e.target.value)}/></label>
 {["text","two_columns","image_text","pull_quote"].includes(block.layout) && <label>Text or quote<textarea rows={4} value={block.text || ""} onChange={e=>change(index,"text",e.target.value)}/></label>}
 {["image","wide_image","two_images","image_text"].includes(block.layout) && <><label>Image URL<input type="url" value={block.image_url || ""} onChange={e=>change(index,"image_url",e.target.value)} placeholder="https://..."/></label><label>Image description<input value={block.alt || ""} maxLength={255} onChange={e=>change(index,"alt",e.target.value)}/></label><label>Caption<textarea rows={2} value={block.caption || ""} onChange={e=>change(index,"caption",e.target.value)}/></label></>}
 {block.layout==="two_columns" && <label>Second column text<textarea rows={6} value={block.second_text || ""} onChange={e=>change(index,"second_text",e.target.value)}/></label>}
 {block.layout==="two_images" && <><label>Second image URL<input type="url" value={block.second_image_url || ""} onChange={e=>change(index,"second_image_url",e.target.value)}/></label><label>Second image description<input value={block.second_alt || ""} maxLength={255} onChange={e=>change(index,"second_alt",e.target.value)}/></label><label>Second caption<textarea rows={2} value={block.second_caption || ""} onChange={e=>change(index,"second_caption",e.target.value)}/></label></>}
 <div className="treatment-toolbar">{((block.layout==="text" && blocks[index+1]?.layout==="image") || (block.layout==="image" && blocks[index+1]?.layout==="image")) && <button type="button" className="secondary-button" onClick={()=>combine(index)}>{block.layout==="text"?"Combine with next image — text beside image":"Pair with next image"}</button>}<button type="button" className="secondary-button" disabled={index===0} onClick={()=>move(index,-1)}>Move up</button><button type="button" className="secondary-button" disabled={index===blocks.length-1} onClick={()=>move(index,1)}>Move down</button><button type="button" className="secondary-button" onClick={()=>setBlocks(blocks.filter((_,i)=>i!==index))}>Remove</button></div></fieldset>)}
 <button type="button" className="secondary-button" disabled={blocks.length>=50} onClick={()=>setBlocks([...blocks,{layout:"text",label:"Block "+(blocks.length+1)}])}>Add editorial block</button>
 <label>Related products<select multiple value={products} size={5} onChange={e=>setProducts(Array.from(e.target.selectedOptions,option=>option.value))}>{products.filter(id=>!choices.products.some(choice=>choice.id===id)).map(id=><option key={id} value={id}>{id}</option>)}{choices.products.map(product=><option key={product.id} value={product.id}>{product.title}</option>)}</select></label>
 <label>Related Journal stories<select multiple value={stories} size={5} onChange={e=>setStories(Array.from(e.target.selectedOptions,option=>option.value))}>{stories.filter(id=>!choices.stories.some(choice=>choice.id===id)).map(id=><option key={id} value={id}>{id}</option>)}{choices.stories.map(story=><option key={story.id} value={story.id}>{story.title}</option>)}</select></label>
 <p className="settings-help">Hold Ctrl (Windows) or Command (Mac) to select multiple items. Choices show the first 50 products and 100 articles; saved references outside that list are retained.</p>
 {contentMode==="sections" && blocks.length===0 && <p role="alert">Add a section before saving Sections only.</p>}
 <button className="primary-button" disabled={busy || (contentMode==="sections" && blocks.length===0)}>{busy?"Saving...":"Save editorial content"}</button></Form></details>;
}
