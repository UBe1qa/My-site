// 구글 애드센스 설정(루멘랩 pub-9496167591465154). 자동 광고 코드는 도구·해설 페이지 <head>에 있고(_dev/build.py),
// 여기서는 수동 광고 자리만 다룬다. 단위 번호(slots)가 비어 있으면 그 자리는 화면에 없다.
// 자리: mid = 판·표 칸 아래 / bottom = 본문 끝. 판과 단추에서 150px 넘게 떨어져 있다.
// 내 컴퓨터(localhost)나 주소 끝에 ?adpreview 를 붙이면 자리를 빗금 상자로 보여 준다.
window.FM_ADS = {
  client: "ca-pub-9496167591465154",
  slots: { "mid": "", "bottom": "" },
  preview: function () {
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /[?&]adpreview\b/.test(location.search);
  },
  mount: function () {
    var ko = /^ko\b/i.test(document.documentElement.lang), slots = this.slots, client = this.client, pre = this.preview();
    document.querySelectorAll("[data-ad]").forEach(function (box) {
      var name = box.getAttribute("data-ad"), id = slots[name];
      if (pre) { box.hidden = false; box.textContent = ko ? "광고 자리" : "Ad slot"; return; }
      if (!id) return;
      box.hidden = false;
      box.innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="' + client + '" data-ad-slot="' + id + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  }
};
(function (a) {
  if (a.preview()) document.documentElement.classList.add("ad-preview");
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { a.mount(); });
  else a.mount();
})(window.FM_ADS);
