// 구글 애드센스 설정. 비어 있으면 광고 코드를 아예 불러오지 않는다(기본값).
// 켜는 법: 애드센스 승인을 받은 뒤 client(ca-pub-…)와 slot 번호를 넣고, 같은 변경에서
//   1) 사이트 맨 위에 ads.txt 만들기 (google.com, pub-…, DIRECT, f08c47fec0942fa0)
//   2) privacy.html 의 '광고' 문단을 '광고를 보여 줘요'로 바꾸기  ← 안내문이 실제 동작과 같아야 한다
var DC_ADS = {
  client: "",                  // 예: "ca-pub-1234567890123456"
  slots: { "below-tool": "" },  // 수동 광고 단위 번호
  mount: function () {
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
