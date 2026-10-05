// 예전 주소(owlight.mysitebox.workers.dev)로 들어오면 대표 주소 owlight.lumenlab.page 의 같은 페이지로 영구 이동(301).
// 같은 내용이 두 주소에 있으면 검색에서 중복으로 볼 수 있어서 한 주소로 모은다(date-calc 와 같은 방식).
// 대표 주소로 온 요청은 이 폴더의 파일을 그대로 보여 준다. 서버 코드라 .assetsignore 로 공개하지 않는다.
const HOME = "https://owlight.lumenlab.page";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.endsWith(".workers.dev")) {
      return Response.redirect(HOME + url.pathname + url.search, 301);
    }
    return env.ASSETS.fetch(request);
  },
};
