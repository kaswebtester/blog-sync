import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {DOMParser,Element} from 'linkedom';

class BrowserDOMParser extends DOMParser {
 parseFromString(html,type){return super.parseFromString('<html><body>'+html+'</body></html>',type);}
}
const source=readFileSync(new URL('../app/lib/article-sections.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
vm.runInNewContext(compiled,{exports,DOMParser:BrowserDOMParser,Element});
const {importArticleSections}=exports;

test('import keeps paragraphs, images, captions and quotes in reading order',()=>{
 const html='<p>First paragraph.</p><p>Second paragraph.</p><figure><img src="https://example.com/photo.jpg" alt="Workshop"><figcaption>Making the bed</figcaption></figure><blockquote>A lasting design.</blockquote>';
 const sections=importArticleSections(html);
 assert.equal(sections.length,3);
 assert.equal(sections[0].text,'First paragraph.\n\nSecond paragraph.');
 assert.equal(sections[1].image_url,'https://example.com/photo.jpg');
 assert.equal(sections[1].caption,'Making the bed');
 assert.equal(sections[1].alt,'Workshop');
 assert.equal(sections[2].layout,'pull_quote');
 assert.equal(sections[2].text,'A lasting design.');
});
test('import rejects unsupported media and unsafe images before replacing editor state',()=>{
 assert.throws(()=>importArticleSections('<table><tr><td>Table</td></tr></table>'),/tables or embedded media/);
 assert.throws(()=>importArticleSections('<img src="http://example.com/image.jpg">'),/HTTPS/);
 assert.throws(()=>importArticleSections(''),/No supported article content/);
});
