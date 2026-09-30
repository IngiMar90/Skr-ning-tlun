const CACHE='namskraning-v4-ipad-touch';
const APP_SHELL=['./','./index.html','./force24.js','./sticky-header.js','./ipad-touch-fix.js','./app-qr.svg','./app-icon.svg','./icon-192.svg','./icon-512.svg','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

async function enhanceHtml(response){
  if(!response || !response.ok) return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html')) return response;
  let html=await response.text();
  if(!html.includes('sticky-header.js')){
    html=html.replace('</body>','<script src="sticky-header.js?v=4"></script></body>');
  }
  if(!html.includes('ipad-touch-fix.js')){
    html=html.replace('</body>','<script src="ipad-touch-fix.js?v=1"></script></body>');
  }
  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const request=event.request;

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const network=await fetch(request,{cache:'no-store'});
        const enhanced=await enhanceHtml(network);
        const copy=enhanced.clone();
        caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
        return enhanced;
      }catch{
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  event.respondWith(
    fetch(request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(request,copy));
      return response;
    }).catch(()=>caches.match(request))
  );
});
