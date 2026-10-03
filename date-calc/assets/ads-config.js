// 구글 애드센스 설정. 비어 있으면 광고 코드를 아예 불러오지 않는다(기본값).
// 켜는 법: 애드센스 승인을 받은 뒤 client(ca-pub-…)와 slot 번호를 넣고, 같은 변경에서
//   1) 사이트 맨 위에 ads.txt 만들기 (google.com, pub-…, DIRECT, f08c47fec0942fa0)
//   2) privacy.html 의 '광고' 문단을 '광고를 보여 줘요'로 바꾸기  ← 안내문이 실제 동작과 같아야 한다
var DC_ADS = {
  client: "",                  // 예: "ca-pub-1234567890123456"
  // 수동 광고 단위 번호(반응형 디스플레이 광고 하나를 세 자리에 같이 써도 된다)
  //   top: 계산기 고르기 아래 / below-tool: 계산 결과 아래 / bottom: 자주 묻는 질문 끝
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
        box.textContent = "광고 자리 · " + box.getAttribute("data-ad");
      });
      return;
    }
    if (!this.client || !/^ca-pub-\d{10,20}$/.test(this.client)) return;
    var s = document.createElement("script");
    s.async = true; s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + this.client;
    document.head.appendChild(s);
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
