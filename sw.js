const CACHE='almoxarifado-v6';
const ASSETS=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./scripts/supplier-document-reader.js','./scripts/supplier-document-reader-fix.js','./scripts/supplier-document-reader-autosave.js'];
const READER='scripts/supplier-document-reader.js';
const FIX='scripts/supplier-document-reader-fix.js';
const AUTOSAVE='scripts/supplier-document-reader-autosave.js';

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});

async function injectReader(response){
  const type=response.headers.get('content-type')||'';if(!type.includes('text/html'))return response;
  const html=await response.text();if(html.includes(AUTOSAVE))return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
  const injected=html.replace('</body>',`<script src="./${READER}" defer></script><script src="./${FIX}" defer></script><script src="./${AUTOSAVE}" defer></script></body>`);
  const headers=new Headers(response.headers);headers.delete('content-length');
  return new Response(injected,{status:response.status,statusText:response.statusText,headers});
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;const url=new URL(event.request.url);
  if(event.request.mode==='navigate'||url.pathname.endsWith('/index.html')){event.respondWith(fetch(event.request).then(injectReader).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return resp}).catch(()=>caches.match(event.request)));return}
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return resp}).catch(()=>cached)));
});
