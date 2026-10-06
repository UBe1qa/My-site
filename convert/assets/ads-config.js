// 구글 애드센스 설정(루멘랩 pub-9496167591465154). 자동 광고 코드는 도구·첫 페이지·글 <head>에 있고(_dev/build.py),
// 여기선 수동 광고 자리만 채운다. 단위 번호가 없으면 자리는 숨겨 둔다.
// 자리: mid = 설명 글과 자주 묻는 질문 사이(파일 고르기·받기 버튼에서 멀리) / bottom = 맨 아래 관련 도구 뒤.
// 내 컴퓨터(localhost)나 주소 끝에 ?adpreview 를 붙이면 자리를 점선 상자로 보여 준다.
window.IP_ADS = {
  client: "ca-pub-9496167591465154",
  slots: { "mid": "", "bottom": "" },
  preview: function () {
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /[?&]adpreview\b/.test(location.search);
  },
  mount: function () {
    var ko = /^ko\b/i.test(document.documentElement.lang);
    if (this.preview()) {
      document.querySelectorAll("[data-ad]").forEach(function (box) {
        box.hidden = false; box.className += " ad-preview";
        box.textContent = (ko ? "광고 자리 · " : "Ad slot · ") + box.getAttribute("data-ad");
      });
      return;
    }
    var slots = this.slots, client = this.client;
    document.querySelectorAll("[data-ad]").forEach(function (box) {
      var id = slots[box.getAttribute("data-ad")];
      if (!id) return;
      box.hidden = false;
      box.innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="' + client + '" data-ad-slot="' + id + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  }
};
