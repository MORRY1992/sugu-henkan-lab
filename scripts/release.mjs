import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const guide=(process.env.GUIDE_ORIGIN||'https://sugu-henkan-lab.pages.dev').replace(/\/$/,'');
const processor=(process.env.TOOLS_ORIGIN||'https://sugu-henkan-tools.pages.dev').replace(/\/$/,'');
assert.notEqual(new URL(guide).origin,new URL(processor).origin,'Guide and processing origins must remain separate');
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]);
const htmls=side=>files('dist/'+side).filter(f=>f.endsWith('.html'));
const sitemap=fs.readFileSync('dist/guide/sitemap.xml','utf8');
const routes=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1]);
assert.equal(new Set(routes).size,routes.length,'Duplicate sitemap URLs');
for(const url of routes){assert.equal(new URL(url).origin,guide,'Sitemap must use guide origin');const file='dist/guide'+new URL(url).pathname+'index.html';const s=fs.readFileSync(file,'utf8');
 assert.equal([...s.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/g)].length,1,file+' canonical count');assert.ok(s.includes(`rel="canonical" href="${url}"`),file+' canonical mismatch');
 assert.match(s,/<title>[^<]+<\/title>/);assert.match(s,/<meta name="description" content="[^"]+"/);assert.ok(!/name="robots" content="noindex/.test(s),file+' indexed guide page noindex');
 assert.ok(s.includes(`property="og:url" content="${url}"`),file+' og:url mismatch');
 const verification=[...s.matchAll(/name="google-site-verification" content="([^"]*)"/g)];assert.ok(verification.length<=1,file+' duplicate GSC tag');if(verification.length)assert.ok(verification[0][1].trim(),file+' empty GSC tag');
}
for(const file of htmls('tools')){const s=fs.readFileSync(file,'utf8');assert.match(s,/name="robots" content="noindex,follow"/);assert.doesNotMatch(s,/google-site-verification|<iframe\b|<form\b/i);assert.doesNotMatch(s,/<script[^>]+src="(?:https?:)?\/\//i);
 for(const [,tag]of s.matchAll(/(<script\b[^>]*>)/g))assert.ok(/src="\/[\w.-]+"|type="application\/(?:ld\+json|json)"/.test(tag),file+' executable inline script');
 for(const [,href]of s.matchAll(/<link\b[^>]*(?:href)="([^"]+)"/g))assert.ok(href.startsWith('/')||href.startsWith(processor+'/'),file+' remote resource');
 assert.doesNotMatch(s,/<input[^>]+name="(?:email|password)"/i);
}
for(const side of ['guide','tools'])for(const file of htmls(side)){const s=fs.readFileSync(file,'utf8');for(const [,raw]of s.matchAll(/(?:href|src)="([^"#]+)"/g)){const u=new URL(raw,side==='guide'?guide:processor);if(![guide,processor].includes(u.origin))continue;const root=u.origin===guide?'guide':'tools';assert.ok(fs.existsSync('dist/'+root+u.pathname+(u.pathname.endsWith('/')?'index.html':'')),file+' broken '+raw);}}
const h=fs.readFileSync('dist/tools/_headers','utf8');for(const rule of ["script-src 'self'","connect-src 'none'","form-action 'none'","frame-src 'none'","frame-ancestors 'none'",'Referrer-Policy: no-referrer','X-Robots-Tag: noindex'])assert.ok(h.includes(rule),rule);
const ads=JSON.parse(fs.readFileSync('src/ads.json','utf8'));assert.equal(ads.enabled,false);assert.equal(ads.code,null);
console.log(`Release guard passed: ${routes.length} guide routes; ${htmls('tools').length} processing pages; canonical/GSC/resource/privacy boundary intact.`);
