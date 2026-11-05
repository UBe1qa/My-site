// workers.dev 주소(setnote.mysitebox.workers.dev)로 들어오면 대표 주소 setnote.lumenlab.page 의 같은 페이지로 영구 이동(301).
// 대표 주소로 온 요청은 이 폴더의 파일을 그대로 보여 준다. 서버 코드라 .assetsignore 로 공개하지 않는다 (owlight 와 같은 방식).
const HOME = "https://setnote.lumenlab.page";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.endsWith(".workers.dev")) {
      return Response.redirect(HOME + url.pathname + url.search, 301);
    }
    const res = await env.ASSETS.fetch(request);
    // 한국어가 섞인 글 파일(llms.txt·robots.txt)은 글자 인코딩을 밝힌다(AI 도구가 한글을 깨뜨리지 않게, 2026-11-05).
    // Worker 가 먼저 받는 사이트라 _headers 가 안 붙을 때를 대비해 여기서도 한다(이미 붙었으면 그대로).
    if (url.pathname.endsWith(".txt") && res.headers.get("content-type") === "text/plain") {
      const out = new Response(res.body, res);
      out.headers.set("content-type", "text/plain; charset=utf-8");
      return out;
    }
    return res;
  },
};
