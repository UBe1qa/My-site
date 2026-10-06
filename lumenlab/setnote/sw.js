/* 세트노트는 2026-10-06 setnote.lumenlab.page/app/ 으로 옮겼다. 이 주소에 예전에 설치된 서비스 워커가 새 판을 확인하러 오면
   이 파일을 받는다: 남은 캐시를 지우고 스스로 등록을 풀고, 열려 있는 창을 새 주소로 보낸다(그다음부턴 _redirects 의 301). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('setnote-')) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate('https://setnote.lumenlab.page/app/');
  })());
});
