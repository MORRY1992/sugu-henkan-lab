import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import * as core from '../src/core.mjs';
import {all} from '../src/ui.mjs';
const guide='https://sugu-henkan-lab.pages.dev';
const processor='https://sugu-henkan-tools.pages.dev';
const list=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?list(path.join(dir,d.name)):[path.join(dir,d.name)]);

test('9つの処理URLと必須操作IDを維持し、現在地を明示する',()=>{
 assert.deepEqual(all.map(t=>t.slug),['text-counter','width-converter','whitespace-cleaner','duplicate-remover','csv-tsv','json-formatter','url-codec','qr-generator','pipeline']);
 for(const t of all){const s=fs.readFileSync(`dist/tools/${t.slug}/index.html`,'utf8');
  const ids=[...s.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,t.slug+' duplicate id');
  for(const id of ['input','output','options','run','sample','reset','copy','stats','status','table','tool-switch','result-empty','result-tag','input-size'])assert.ok(ids.includes(id),t.slug+' '+id);
  assert.match(s,new RegExp(`href="/${t.slug}/" aria-current="page"`));
  assert.match(s,/role="status" aria-live="polite"/);
 }
});

test('両生成物の内部URL・スクリプト・CSS・画像参照先が存在する',()=>{
 for(const side of ['guide','tools'])for(const file of list('dist/'+side).filter(p=>p.endsWith('.html'))){const s=fs.readFileSync(file,'utf8');
  for(const [,raw]of s.matchAll(/(?:href|src)="([^"#]+)"/g)){
   const url=new URL(raw,side==='guide'?guide:processor);if(![guide,processor].includes(url.origin))continue;
   const dir=url.origin===guide?'guide':'tools';const p=url.pathname;const local=`dist/${dir}${p}${p.endsWith('/')?'index.html':''}`;
   assert.ok(fs.existsSync(local),file+' -> '+raw);
  }
 }
});

test('処理側404も案内コードを読み込まずnoindexと厳格CSPを維持',()=>{
 const html=fs.readFileSync('dist/tools/404.html','utf8');assert.match(html,/name="robots" content="noindex,follow"/);assert.match(html,/src="\/menu.mjs"/);assert.doesNotMatch(html,/src="\/guide.mjs"/);
 const h=fs.readFileSync('dist/tools/_headers','utf8');for(const d of ["worker-src 'none'","frame-src 'none'","base-uri 'none'","object-src 'none'"])assert.ok(h.includes(d));
 for(const f of list('dist/tools').filter(p=>p.endsWith('.html'))){const s=fs.readFileSync(f,'utf8');assert.doesNotMatch(s,/<script[^>]+src="https?:|<link[^>]+rel="(?:stylesheet|preload|modulepreload)"[^>]+href="https?:/i);assert.doesNotMatch(s,/<(?:iframe|form)\b/i);}
});

test('広告フラグ・専用オリジン・本文を保存しない設定契約を維持',()=>{
 const ads=JSON.parse(fs.readFileSync('src/ads.json','utf8'));assert.equal(ads.enabled,false);assert.equal(ads.code,null);assert.equal(ads.status,'pending');assert.equal(ads.permittedOrigin,guide);assert.equal(ads.forbiddenOrigin,processor);
 const s=fs.readFileSync('src/app.mjs','utf8');assert.equal((s.match(/localStorage\.setItem/g)||[]).length,1);assert.doesNotMatch(s,/sessionStorage|document\.cookie|indexedDB|fetch\s*\(|sendBeacon|postMessage/);
});

test('同一オリジン・HTTPSでないURL・パス付きURLでビルドを拒否',()=>{
 for(const [g,p]of [[guide,guide],['http://example.com',processor],[guide+'/path',processor]]){const r=spawnSync(process.execPath,['scripts/build.mjs'],{encoding:'utf8',env:{...process.env,GUIDE_ORIGIN:g,TOOLS_ORIGIN:p}});assert.notEqual(r.status,0);assert.match(r.stderr,/オリジン/);}
});

test('広告の誤有効化は個別レビューなしに生成しない',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sugu-guard-'));
 try{for(const sub of ['scripts','src'])fs.mkdirSync(path.join(dir,sub));for(const f of ['scripts/build.mjs','src/catalog.mjs','src/controls.mjs','src/ui.mjs'])fs.copyFileSync(f,path.join(dir,f));fs.writeFileSync(path.join(dir,'src/ads.json'),JSON.stringify({enabled:true,code:null}));
  const r=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:dir,encoding:'utf8',env:{...process.env,GUIDE_ORIGIN:guide,TOOLS_ORIGIN:processor}});assert.notEqual(r.status,0);assert.match(r.stderr,/広告導入には案内側限定/);assert.equal(fs.existsSync(path.join(dir,'dist')),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

// Small event-driven DOM harness: exercises real app + core behavior without new dependencies.
function app(tool,optionValues={}){
 const elements=new Map();
 function el(){return {value:'',textContent:'',hidden:false,disabled:false,dataset:{},children:[],listeners:{},classList:{toggle(){}},replaceChildren(...x){this.children=x;},append(...x){this.children.push(...x);},addEventListener(name,fn){this.listeners[name]=fn;},focus(){},select(){},setAttribute(){},matches(selector){return selector==='input[type="number"][name]'&&this.type==='number'&&Boolean(this.name);}};}
 for(const id of ['input','output','status','qr-canvas','stats','table','result-empty','result-tag','empty-title','empty-copy','input-size','options','run','sample','reset','copy','tool-switch','save-settings','delete-settings','sample-data'])elements.set('#'+id,el());
 elements.get('#sample-data').textContent=JSON.stringify(' Ａ \nA\nＢ\nB');
 const opts=Object.entries(optionValues).map(([name,value])=>({...el(),name,type:typeof value==='boolean'?'checkbox':typeof value==='number'?'number':'select',checked:value,value:typeof value==='boolean'?value:String(value)}));
 const buttons=[elements.get('#copy')];let copied=null;const saved=new Map();const windowEvents={};
 const document={body:{dataset:{tool}},querySelector:s=>elements.get(s)||null,querySelectorAll:s=>s==='[data-result]'?buttons:s==='#options [name]'?opts:s==='#options input[type=checkbox]'?opts.filter(x=>x.type==='checkbox'):[],createDocumentFragment:el,createElement:el};
 const source=fs.readFileSync('src/app.mjs','utf8').replace(/^import .*;\n/gm,'');
 vm.runInNewContext(source,{...core,document,navigator:{clipboard:{writeText:async s=>{copied=s;}}},window:{addEventListener:(k,v)=>{windowEvents[k]=v;}},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},TextEncoder,Intl,console,qrcode(){},URL,Blob,setTimeout});
 return {elements,opts,buttons,document,saved,windowEvents,get copied(){return copied;},event(id,event='click',e={}){return elements.get('#'+id).listeners[event]?.(e);}};
}

test('実行→入力変更で古い結果とコピーを無効化し、消去で本文を残さない',async()=>{
 const a=app('width-converter',{direction:'half',alpha:true,symbol:true,kana:true,space:true});a.elements.get('#input').value='ＡＢＣ　ガイド';a.event('run');assert.equal(a.elements.get('#output').value,'ABC ｶﾞｲﾄﾞ');assert.equal(a.document.body.dataset.state,'success');assert.equal(a.elements.get('#result-empty').hidden,true);assert.equal(a.buttons[0].disabled,false);await a.event('copy');assert.equal(a.copied,'ABC ｶﾞｲﾄﾞ');
 a.elements.get('#input').value+='！';a.event('input','input');assert.equal(a.elements.get('#output').value,'');assert.equal(a.buttons[0].disabled,true);assert.equal(a.document.body.dataset.state,'empty');a.event('reset');assert.equal(a.elements.get('#input').value,'');assert.equal(a.elements.get('#input-size').textContent,'0 B');
});

test('JSONエラーは入力を維持し、訂正後のショートカット実行で復旧',()=>{
 const a=app('json-formatter',{indent:'2'});a.elements.get('#input').value='{"a":1,}';a.event('run');assert.equal(a.document.body.dataset.state,'error');assert.equal(a.elements.get('#input').value,'{"a":1,}');assert.equal(a.buttons[0].disabled,true);assert.match(a.elements.get('#status').textContent,/JSON構文エラー/);
 a.elements.get('#input').value='{"a":1}';let prevented=false;a.event('input','keydown',{ctrlKey:true,key:'Enter',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(a.document.body.dataset.state,'success');assert.equal(a.elements.get('#output').value,'{\n  "a": 1\n}');
});

test('連続変換はチェック項目だけ任意保存し、pagehideで本文と結果を破棄',()=>{
 const a=app('pipeline',{width:true,trim:true,dedupe:true,ignoreCase:false});a.event('sample');a.event('run');assert.equal(a.elements.get('#output').value,'A\nB');a.event('save-settings');assert.deepEqual(JSON.parse(a.saved.get('sugu-pipeline-v1')),{width:true,trim:true,dedupe:true,ignoreCase:false});assert.equal(a.saved.size,1);a.windowEvents.pagehide();assert.equal(a.elements.get('#input').value,'');assert.equal(a.elements.get('#output').value,'');assert.equal(a.buttons[0].disabled,true);a.event('delete-settings');assert.equal(a.saved.size,0);
});


test('数値条件はblur前のinputで旧結果とコピーを無効にし、selectとcheckboxのchangeも維持',async()=>{
 const a=app('text-counter',{limit:10});a.elements.get('#input').value='こんにちは';a.event('run');assert.match(a.elements.get('#output').value,/remaining: 5/);assert.equal(a.buttons[0].disabled,false);
 const limit=a.opts.find(x=>x.name==='limit');limit.value='3';a.event('options','input',{target:limit});
 assert.equal(a.document.body.dataset.state,'empty');assert.equal(a.elements.get('#output').value,'');assert.equal(a.elements.get('#stats').children.length,0);assert.equal(a.buttons[0].disabled,true);assert.equal(a.elements.get('#input').value,'こんにちは');await a.event('copy');assert.equal(a.copied,null);
 a.event('run');assert.match(a.elements.get('#output').value,/remaining: -2/);assert.equal(a.document.body.dataset.state,'success');
 const b=app('width-converter',{direction:'half',alpha:true,symbol:true,kana:true,space:true});b.elements.get('#input').value='Ａ';b.event('run');b.opts.find(x=>x.name==='direction').value='full';b.event('options','change');assert.equal(b.buttons[0].disabled,true);assert.equal(b.document.body.dataset.state,'empty');
 b.event('run');assert.equal(b.buttons[0].disabled,false);b.opts.find(x=>x.name==='alpha').checked=false;b.event('options','change');assert.equal(b.buttons[0].disabled,true);assert.equal(b.elements.get('#output').value,'');
});
