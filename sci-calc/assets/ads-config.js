// 구글 애드센스 설정. client 는 루멘랩 애드센스(며칠 계산기와 같은 계정). <head> 의 adsbygoogle.js = 자동 광고.
// 수동 광고 단위를 만들면 아래 slots 에 번호를 넣는다(비어 있으면 자리를 숨긴 채 둔다).
//   below-tool: 계산기(또는 모드 화면) 아래, 40px 넘게 띄움 / bottom: 자주 묻는 질문·다른 계산 목록 끝
// 광고를 끄려면 client 를 비우고, tools/build.py 의 ads=True(<head> 광고 코드)와 개인정보 처리방침 광고 문단도 같이 고친다.
var SC_ADS = {
  client: "ca-pub-9496167591465154",
  slots: { "below-tool": "", "bottom": "" },
  // 내 컴퓨터(localhost)나 주소 끝에 ?adpreview 를 붙이면 광고 자리를 점선 상자로 보여 준다(배치 확인용)
  preview: function () {
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /[?&]adpreview\b/.test(location.search);
  },
  mount: function () {
    var en = /^en\b/i.test(document.documentElement.lang);
    if (this.preview()) {
      document.querySelectorAll("[data-ad-wrap]").forEach(function (wrap) {
        wrap.hidden = false;
        var box = wrap.querySelector("[data-ad]");
        box.className = "ad-preview";
        box.textContent = en ? "Ad slot (preview)" : "광고 자리 (미리보기)";
      });
      return;
    }
    if (!this.client || !/^ca-pub-\d{10,20}$/.test(this.client)) return;
    var slots = this.slots, client = this.client;
    document.querySelectorAll("[data-ad-wrap]").forEach(function (wrap) {
      var box = wrap.querySelector("[data-ad]"), id = slots[box.getAttribute("data-ad")];
      if (!id) return;
      wrap.hidden = false;
      box.innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="' + client + '" data-ad-slot="' + id + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  }
};
document.addEventListener("DOMContentLoaded", function () { SC_ADS.mount(); });
