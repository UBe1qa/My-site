// 구글 애드센스 설정. 지금 켜져 있다(client 있음, 자동 광고). client를 비우면 수동 광고 자리만 안 채우고, <head>의 광고 코드는 따로 지워야 한다.
// 켜져 있음: ads.txt(이 폴더와 lumenlab 폴더 = 메인 도메인), index.html·en/index.html·가이드 글 <head> 광고 코드(자동 광고), privacy.html 광고 문단.
// 수동 광고 단위를 만들면 아래 slots에 번호를 넣는다. 끄려면 client를 비우고 <head> 코드와 방침 문단도 같이 고친다.
var DC_ADS = {
  client: "ca-pub-9496167591465154",  // 루멘랩 애드센스 (2026-10-03)
  // 수동 광고 단위 번호(반응형 디스플레이 광고 하나를 세 자리에 같이 써도 된다)
  //   top: 가이드 목록과 자주 묻는 질문 사이(2026-10-05 계산기 위에서 옮김: 고르기 버튼 옆이라 잘못 누르기 쉬움)
//   below-tool: 계산 결과 아래 / bottom: 자주 묻는 질문 끝
  slots: { "top": "", "below-tool": "", "bottom": "" },
  // 내 컴퓨터(localhost)나 주소 끝에 ?adpreview 를 붙이면 광고 자리를 점선 상자로 보여 준다(배치 확인용)
  preview: function () {
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /[?&]adpreview\b/.test(location.search);
  },
  mount: function () {
    if (this.preview()) {
      document.querySelectorAll("[data-ad]").forEach(function (box) {
        box.hidden = false;
        box.className += " ad-preview";
        box.textContent = (/^en\b/i.test(document.documentElement.lang) ? "Ad slot · " : "광고 자리 · ") + box.getAttribute("data-ad");
      });
      return;
    }
    if (!this.client || !/^ca-pub-\d{10,20}$/.test(this.client)) return;
    // 광고 코드(adsbygoogle.js)는 index.html·en/index.html <head>에 직접 있다(자동 광고·심사용). 여기선 수동 광고 자리만 채운다
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
