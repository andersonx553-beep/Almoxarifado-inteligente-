const CACHE='almoxarifado-v30';
const ASSETS=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./scripts/pdfjs-worker-version-fix.js','./scripts/supplier-document-reader.js','./scripts/supplier-document-reader-fix.js','./scripts/supplier-document-reader-autosave.js','./scripts/supplier-document-reader-ie.js','./scripts/supplier-manual-fix.js','./scripts/supplier-reader-final-correction.js','./scripts/nf-entry-intelligent.js'];

const SCRIPT_TAGS=['pdfjs-worker-version-fix.js','supplier-document-reader.js','supplier-document-reader-fix.js','supplier-document-reader-autosave.js','supplier-document-reader-ie.js','supplier-manual-fix.js','supplier-reader-final-correction.js','nf-entry-intelligent.js'];

async function inject(htmlResponse){
  if(!htmlResponse||!htmlResponse.ok)return htmlResponse;
  try{
    const ct=htmlResponse.headers.get('content-type')||'';
    if(!ct.includes('text/html'))return htmlResponse;
    let html=await htmlResponse.text();
    if(!html.includes('nf-entry-intelligent.js')){
      const tags=SCRIPT_TAGS.map(x=>`<script src="./scripts/${x}"></script>`).join('');
      html=html.replace('</body>',tags+'</body>');
    }
    return new Response(html,{status:htmlResponse.status,statusText:htmlResponse.statusText,headers:{'Content-Type':'text/html; charset=UTF-8'}});
  }catch(e){return htmlResponse;}
}

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE)
    .then(cache=>cache.addAll(ASSETS))
    .then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  event.respondWith((async()=>{
    try{
      const network=await fetch(req);
      return await inject(network);
    }catch(err){
      const cached=await caches.match(req);
      return cached||Response.error();
    }
  })());
});
