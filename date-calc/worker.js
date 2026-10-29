// 예전 주소(date-calc.mysitebox.workers.dev)로 들어오면 새 주소 date.lumenlab.page 의 같은 페이지로 영구 이동(301).
// 같은 내용이 두 주소에 있으면 검색(특히 네이버)에서 중복으로 볼 수 있어서 한 주소로 모은다 (2026-10-05).
// 가이드 글은 2026-10-29 lumenlab.page/guides/date/ 로 옮겼다: /guide/…·/en/guide/…·/rss.xml 은 어느 주소로 오든 그리로 바로 301.
// (run_worker_first 라 모든 페이지 조회가 여기를 먼저 지나서 _redirects 대신 여기서 넘긴다. guide/ 폴더는 그쪽 빌드가 읽는 원본이라 .assetsignore 로 올리지 않는다)
// 새 주소로 온 요청은 이 폴더의 파일을 그대로 보여 준다. 서버 코드라 .assetsignore 로 공개하지 않는다.
const HOME = "https://date.lumenlab.page";
const GUIDES = "https://lumenlab.page";

// 가이드 주소면 옮긴 주소, 아니면 null. 목록(/guide, /guide/, /guide/index.html) → /guides/#date,
// 글(/guide/<slug>, /guide/<slug>/, /guide/<slug>/index.html) → /guides/date/<slug>/. 영어는 /en/ 아래 같은 꼴 → /en/guides/…
function guideTarget(path) {
  if (path === "/rss.xml") return GUIDES + "/guides/rss.xml";
  const m = path.match(/^(\/en)?\/guide(\/.*)?$/);
  if (!m) return null;
  const en = m[1] || "";
  const slug = (m[2] || "").replace(/(^|\/)index\.html$/, "").replace(/^\/+|\/+$/g, "");
  return slug ? `${GUIDES}${en}/guides/date/${slug}/` : `${GUIDES}${en}/guides/#date`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const guide = guideTarget(url.pathname);
    if (guide) {
      const to = new URL(guide);
      to.search = url.search;
      return Response.redirect(to.href, 301);
    }
    if (url.hostname.endsWith(".workers.dev")) {
      return Response.redirect(HOME + url.pathname + url.search, 301);
    }
    return env.ASSETS.fetch(request);
  },
};
