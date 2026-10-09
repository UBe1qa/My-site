// 구글 애드센스 설정(루멘랩 pub-9496167591465154). 자동 광고 코드는 도구·글 페이지 <head>에 있고(_dev/build.py),
// 여기선 수동 광고 자리만 채운다. 단위 번호가 없으면 자리는 숨겨 둔다.
// 자리: mid = 도구 설명 글 다음(돌리기·뽑기 단추에서 150px 넘게 떨어진 곳) / bottom = 가이드 목록 다음.
// 내 컴퓨터(localhost)나 주소 끝에 ?adpreview 를 붙이면 자리를 빗금 상자로 보여 준다(자리 위 글자는 '광고' / 'Ad'만).
// 각 자리 바로 뒤의 인라인 스크립트가 mount(자리)를 부른다(첫 그림 전에 자리 크기가 정해져 화면이 안 밀린다).
window.PK_ADS = {
  client: "ca-pub-9496167591465154",
  slots: { "mid": "", "bottom": "" },
  preview: function () {
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /[?&]adpreview\b/.test(location.search);
  },
  mount: function (box) {
    if (!box) return;
    var wrap = box.parentNode;
    if (this.preview()) { wrap.hidden = false; box.className += " ad-preview"; return; }
    var id = this.slots[box.getAttribute("data-ad")];
    if (!id) return;
    wrap.hidden = false;
    box.innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="' + this.client + '" data-ad-slot="' + id + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }
};
