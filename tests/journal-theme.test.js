import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Liquid} from 'liquidjs';
import {parseHTML} from 'linkedom';

const source=readFileSync(new URL('../theme/sections/journal-article.liquid',import.meta.url),'utf8');
const schema=JSON.parse(source.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
const script=source.match(/{% javascript %}([\s\S]*?){% endjavascript %}/)[1];
const markup=source.replace(/{% (schema|stylesheet|javascript) %}[\s\S]*?{% end\1 %}/g,'');
const defaults=Object.fromEntries(schema.settings.filter(setting=>setting.id).map(setting=>[setting.id,setting.default]));
const media=index=>`<div class="captioned-image-container"><figure><a href="https://example.com/product/${index}"><picture><img src="https://example.com/${index}.jpg" alt="Photo ${index}"></picture></a><figcaption>Caption ${index}</figcaption></figure></div>`;
const body=media(1)+'<p>Introduction <a href="https://example.com">link</a>.</p>'+media(2)+'<p>Design inspiration.</p><p>Construction details.</p>'+media(3)+'<p><em>“A simple, timeless design.”</em></p><p>Leg tapering.</p>'+media(4)+'<p>Headboard connection.</p>'+media(5)+media(6)+'<p>Natural finish.</p>'+media(7);
async function render({design='custom',namespace='app--440567988225',content=body,auto=true,mode='append',blocks=[]}={}){
 const html=await new Liquid().parseAndRender(markup,{
  article:{title:'A Journal story',published_at:'2024-03-21',content,image:{},metafields:{'app--440567988225':{article_design:design?{value:design}:undefined,content_mode:{value:mode},editorial_blocks:{value:blocks}}}},
  section:{id:'test',settings:{...defaults,editorial_namespace:namespace,auto_layout:auto}},blog:{title:'Journal',url:'/blogs/journal'},request:{design_mode:false}
 });
 const {document,window}=parseHTML('<html><body>'+html+'</body></html>');
 const images=()=>Array.from(document.querySelectorAll('img')).map(image=>image.getAttribute('src'));
 const original=images();
 vm.runInNewContext(script,{document,window});
 document.dispatchEvent(new window.Event('DOMContentLoaded'));
 assert.deepEqual(images(),original,'layout must preserve image sources and their reading order');
 return {document,window};
}
test('stale theme namespace falls back to the connected app and emits the custom class',async()=>{
 const {document}=await render({namespace:'app--437612380161'});
 assert(document.querySelector('.ro-article--custom[data-journal-design="custom"]'));
 assert.equal(document.querySelector('article').dataset.editorialNamespace,'app--440567988225');
});
test('native custom article gets its hero, image-text row, quote and photo pair without duplicated content',async()=>{
 const {document,window}=await render();
 assert.equal(document.querySelectorAll('.journal-native-hero').length,1);
 assert.equal(document.querySelectorAll('.journal-image-text').length,1);
 assert.equal(document.querySelector('.journal-image-text').querySelectorAll('p').length,2);
 assert.equal(document.querySelectorAll('blockquote').length,1);
 assert.equal(document.querySelectorAll('.journal-pair').length,1);
 assert.equal(document.querySelectorAll('img').length,7);
 assert.equal(document.querySelectorAll('figcaption').length,7);
 assert.equal(document.querySelectorAll('a').length,10);
 assert.equal(document.querySelectorAll('.ro-article__hero').length,0);
 document.dispatchEvent(new window.Event('DOMContentLoaded'));
 assert.equal(document.querySelectorAll('.journal-image-text').length,1,'initialization is idempotent');
});
test('standard has no custom hero, row or quote conversion and pairs the middle of a four-photo gallery',async()=>{
 const {document}=await render({design:'standard',content:'<p>Introduction</p>'+[1,2,3,4].map(media).join('')});
 assert(document.querySelector('.ro-article--standard'));
 assert.equal(document.querySelectorAll('.journal-native-hero,.journal-image-text,blockquote').length,0);
 assert.equal(document.querySelectorAll('.journal-pair').length,1);
 assert.equal(document.querySelector('.journal-pair img').getAttribute('src'),'https://example.com/2.jpg');
});
test('missing design defaults to standard; automatic native layouts can be disabled',async()=>{
 assert((await render({design:null})).document.querySelector('.ro-article--standard'));
 const {document}=await render({auto:false});
 assert.equal(document.querySelectorAll('.journal-native-hero,.journal-image-text,.journal-pair,blockquote').length,0);
});
test('manual sections retain their chosen layouts and suppress the native article only when available',async()=>{
 const {document}=await render({mode:'sections',blocks:[{layout:{value:'two_columns'},text:{value:'Left'},second_text:{value:'Right'}}]});
 assert.equal(document.querySelectorAll('[data-journal-native-body]').length,0);
 assert.equal(document.querySelectorAll('.ro-editorial__columns').length,1);
 assert.match(document.querySelector('.ro-editorial__columns').textContent,/LeftRight/);
 const fallback=await render({mode:'sections',blocks:[]});
 assert(fallback.document.querySelector('[data-journal-native-body]'),'unavailable sections must not hide the article');
});

test('original-only mode shows the native article and hides saved sections without deleting them',async()=>{
 const blocks=[{layout:{value:'text'},text:{value:'Section copy that must stay hidden'}}];
 const {document}=await render({mode:'original',blocks});
 assert(document.querySelector('[data-journal-native-body]'));
 assert.equal(document.querySelectorAll('.ro-editorial').length,0);
 assert.doesNotMatch(document.body.textContent,/Section copy that must stay hidden/);
 assert(document.querySelector('.ro-article--custom'),'revert preserves design choice');
 const resumed=await render({mode:'sections',blocks});
 assert.equal(resumed.document.querySelectorAll('[data-journal-native-body]').length,0);
 assert.match(resumed.document.querySelector('.ro-editorial').textContent,/Section copy that must stay hidden/);
});
