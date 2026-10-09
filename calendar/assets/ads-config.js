// 구글 애드센스 설정(루멘랩 pub-9496167591465154). 자동 광고 코드는 도구·글 페이지 <head>에 있고(_dev/build.py),
// 여기선 수동 광고 자리만 채운다. 단위 번호가 없으면 자리는 숨겨 둔다(높이 0, 화면이 밀리지 않는다).
// 자리: mid = 본문 가운데(받기·인쇄 단추에서 멀리) / bottom = 맨 아래. 인쇄 화면과 받는 파일에는 광고가 없다.
// 내 컴퓨터(localhost)나 주소 끝에 ?adpreview 를 붙이면 자리를 빗금 상자로 보여 준다.
window.CAL_ADS = {
  client: "ca-pub-9496167591465154",
  slots: { "mid": "", "bottom": "" },
  preview: function () {
    if (/[?&]noadpreview\b/.test(location.search)) return false;   // 화면 밀림을 잴 때(실제 주소와 같은 조건)
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /[?&]adpreview\b/.test(location.search);
  },
  mount: function () {
    var ko = /^ko\b/i.test(document.documentElement.lang);
    if (this.preview()) {
      document.querySelectorAll("[data-ad]").forEach(function (box) {
        box.hidden = false; box.className += " ad-preview";
        box.textContent = ko ? "광고 자리" : "Ad slot";
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
