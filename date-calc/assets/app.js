// 화면 연결. 계산은 dates.js(DC), 문구는 i18n.js(L, F)에 있다.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var P = DC.parse;

  // ---------- 설정(이 기기에만 저장) ----------
  function load(key) { try { return localStorage.getItem("dc." + key); } catch (e) { return null; } }
  function save(key, v) { try { localStorage.setItem("dc." + key, v); } catch (e) { /* 사생활 보호 모드 */ } }

  var navKo = /^ko\b/i.test(navigator.language || "");
  var lang = load("lang") || (navKo ? "ko" : "en");
  var country = load("country") || (lang === "ko" ? "KR" : "US");
  if (lang !== "ko" && lang !== "en") lang = "ko";
  if (country !== "KR" && country !== "US") country = "KR";

  // ---------- 오늘 ----------
  function todayN() { var t = new Date(); return DC.fromYMD(t.getFullYear(), t.getMonth() + 1, t.getDate()); }
  function nowLocal(offsetMin) {
    var t = new Date(Date.now() + (offsetMin || 0) * 60000);
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate()) + "T" + p(t.getHours()) + ":" + p(t.getMinutes());
  }

  // ---------- 표시 ----------
  var WD_KO = ["일", "월", "화", "수", "목", "금", "토"];
  var WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var WD_EN_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function num(n) { return Number(n).toLocaleString(lang === "ko" ? "ko-KR" : "en-US"); }
  function fmtDate(n) {
    var t = DC.toYMD(n), w = DC.weekday(n);
    return lang === "ko" ? t.y + "년 " + t.m + "월 " + t.d + "일 (" + WD_KO[w] + ")"
                         : WD_EN[w] + ", " + MON_EN[t.m - 1] + " " + t.d + ", " + t.y;
  }
  function fmtShort(n) {
    var t = DC.toYMD(n), w = DC.weekday(n);
    return lang === "ko" ? t.y + ". " + t.m + ". " + t.d + ". (" + WD_KO[w] + ")" : WD_EN[w] + " " + MON_EN[t.m - 1] + " " + t.d + ", " + t.y;
  }
  function weekdayName(n) { return lang === "ko" ? WD_KO[DC.weekday(n)] + "요일" : WD_EN_LONG[DC.weekday(n)]; }
  function holName(n) { return DC.holidayName(n, country, lang === "ko" ? 0 : 1); }
  function dLabel(diff) { return diff === 0 ? "D-Day" : diff > 0 ? "D-" + num(diff) : "D+" + num(-diff); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function big(text, sub) { return '<p class="big">' + esc(text) + "</p>" + (sub ? '<p class="sub">' + sub + "</p>" : ""); }
  function rows(list) {
    return '<dl class="rows">' + list.map(function (r) { return "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") + "</dl>";
  }
  function warn(text) { return '<p class="warn">' + esc(text) + "</p>"; }
  function empty(text) { return '<p class="empty">' + esc(text || L("날짜를 넣어 주세요.")) + "</p>"; }
  function intVal(id) {
    var v = $(id).value.trim();
    if (v === "" || v === "-") return 0;
    var n = Number(v);
    return isFinite(n) && Math.floor(n) === n ? n : NaN;
  }
  function coverageWarn() {
    var r = DC.holidayYears();
    return warn(F("공휴일 표는 %d~%d년만 있어요. 그 밖의 해는 주말만 뺐어요.", r[0], r[1]));
  }
  // 한국어 첫째·둘째…, 영어 1st·2nd…
  function ordinal(n) {
    if (lang === "ko") return ["첫째", "둘째", "셋째", "넷째", "다섯째", "여섯째"][n - 1] || n + "째";
    var s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th";
    return n + s;
  }
  function countryName() { return country === "KR" ? L("한국") : L("미국"); }

  // ---------- 계산기 ----------
  var tools = {
    period: function () {
      var a = P($("period-a").value), b = P($("period-b").value);
      if (a === null || b === null) return empty();
      var r = DC.between(a, b, $("period-inc").checked);
      var ago = r.sign < 0 ? " " + L("(종료일이 시작일보다 앞이에요)") : "";
      return big(F("%s일", num(r.days)), esc(ago)) + rows([
        [L("주로"), F("%s주 %s일", num(r.weeks), num(r.weekRest))],
        [L("개월로"), F("%s년 %s개월 %s일", num(r.years), num(r.months), num(r.restDays))],
        [L("총 개월"), F("%s개월", num(r.totalMonths))],
        [L("시간으로"), F("%s시간", num(r.hours))]
      ]);
    },
    dday: function () {
      var t = P($("dday-t").value), b = P($("dday-b").value);
      if (t === null || b === null) return empty();
      var diff = t - b;
      var sub = diff === 0 ? L("바로 그날이에요.") : diff > 0 ? F("%s까지 %s일 남았어요.", fmtDate(t), num(diff)) : F("%s부터 %s일 지났어요.", fmtDate(t), num(-diff));
      var p = DC.ymd(b, t);
      return big(dLabel(diff), esc(sub)) + rows([[L("개월로"), F("%s년 %s개월 %s일", num(p.years), num(p.months), num(p.days))], [L("주로"), F("%s주 %s일", num(Math.floor(Math.abs(diff) / 7)), num(Math.abs(diff) % 7))]]);
    },
    add: function () {
      var a = P($("add-a").value);
      if (a === null) return empty();
      var y = intVal("add-y"), m = intVal("add-m"), w = intVal("add-w"), d = intVal("add-d");
      if ([y, m, w, d].some(isNaN)) return empty(L("숫자는 정수로 넣어 주세요."));
      var dir = Number((document.querySelector('input[name="add-dir"]:checked') || {}).value || 1);
      var n = DC.addMonths(a, dir * (y * 12 + m)) + dir * (w * 7 + d);
      var t = DC.toYMD(n);
      if (t.y < 1 || t.y > 9999) return empty(L("계산할 수 있는 범위를 벗어났어요."));
      var h = holName(n);
      return big(fmtDate(n), h ? esc(F("공휴일이에요: %s", h)) : "") + rows([[L("기준일에서"), F("%s일 차이", num(Math.abs(n - a)))]]);
    },
    workdays: function () {
      var a = P($("wd-a").value), b = P($("wd-b").value);
      if (a === null || b === null) return empty();
      var c = $("wd-nohol").checked ? "none" : country;
      var r = DC.businessDays(a, b, c, $("wd-inc").checked);
      var out = big(F("%s영업일", num(r.business)), esc(c === "none" ? L("주말만 뺐어요.") : F("주말과 %s 공휴일을 뺐어요.", countryName()))) + rows([
        [L("달력상 날짜"), F("%s일", num(r.calendar))],
        [L("주말"), F("%s일", num(r.weekend))],
        [L("평일 공휴일"), F("%s일", num(r.holidays.length))]
      ]);
      if (r.holidays.length) {
        out += '<ul class="hols">' + r.holidays.slice(0, 40).map(function (h) {
          return "<li><span>" + esc(fmtShort(h.day)) + "</span> " + esc(h.name[lang === "ko" ? 0 : 1]) + "</li>";
        }).join("") + (r.holidays.length > 40 ? "<li>…</li>" : "") + "</ul>";
      }
      if (!r.covered) out += coverageWarn();
      return out;
    },
    workadd: function () {
      var a = P($("wa-a").value), k = intVal("wa-n");
      if (a === null) return empty();
      if (isNaN(k)) return empty(L("숫자는 정수로 넣어 주세요."));
      if (Math.abs(k) > 20000) return empty(L("계산할 수 있는 범위를 벗어났어요."));
      var r = DC.addBusinessDays(a, k, country);
      var out = big(fmtDate(r.day), esc(k >= 0 ? F("%s영업일 뒤 (%s 공휴일 기준)", num(k), countryName()) : F("%s영업일 앞 (%s 공휴일 기준)", num(-k), countryName())))
        + rows([[L("달력상"), F("%s일 차이", num(Math.abs(r.day - a)))]]);
      if (!r.covered) out += coverageWarn();
      return out;
    },
    age: function () {
      var b = P($("age-b").value), t = P($("age-t").value);
      if (b === null || t === null) return empty();
      var r = DC.age(b, t);
      if (!r) return empty(L("기준일이 생년월일보다 앞이에요."));
      var sub = r.birthdayToday ? L("오늘이 생일이에요. 축하해요!") : F("다음 생일까지 %s일 (%s)", num(r.toNext), fmtShort(r.nextBirthday));
      return big(F("만 %s세", num(r.full)), esc(sub)) + rows([
        [L("정확히"), F("%s년 %s개월 %s일", num(r.full), num(r.months), num(r.days))],
        [L("연 나이 (올해 − 태어난 해)"), F("%s세", num(r.yearAge))],
        [L("세는 나이 (옛 방식)"), F("%s세", num(r.counting))],
        [L("살아온 날"), F("%s일", num(r.lived))]
      ]);
    },
    anniv: function () {
      var a = P($("an-a").value);
      if (a === null) return empty();
      var today = todayN(), list = DC.anniversaries(a, $("an-one").checked);
      var nth = today - a + ($("an-one").checked ? 1 : 0);
      var head = today >= a ? big(F("오늘은 %s일째", num(nth))) : big(F("시작까지 %s일", num(a - today)));
      var nextMarked = false;
      return head + '<ul class="anniv">' + list.map(function (x) {
        var diff = x.day - today, cls = diff < 0 ? "past" : "";
        if (diff >= 0 && !nextMarked) { cls = "next"; nextMarked = true; }
        var label = x.kind === "days" ? F("%s일", num(x.n)) : F("%s주년", num(x.n));
        return '<li class="' + cls + '"><b>' + esc(label) + "</b><span>" + esc(fmtShort(x.day)) + "</span><em>" + esc(dLabel(diff)) + "</em></li>";
      }).join("") + "</ul>";
    },
    weekday: function () {
      var a = P($("wk-a").value);
      if (a === null) return empty();
      var h = holName(a), w = DC.weekday(a);
      var kind = h ? F("%s 공휴일: %s", countryName(), h) : (w === 0 || w === 6) ? L("주말이에요.") : L("평일이에요.");
      return big(weekdayName(a), esc(fmtDate(a) + " · " + kind));
    },
    week: function () {
      var a = P($("wn-a").value);
      if (a === null) return empty();
      var t = DC.toYMD(a), iw = DC.isoWeek(a), doy = DC.dayOfYear(a), total = DC.daysInYear(t.y);
      return big(F("%s년 %s주차", iw.year, num(iw.week)), esc(L("ISO 기준 (월요일 시작, 첫 목요일이 든 주가 1주차)"))) + rows([
        [L("그 달의"), F("%s월 %s 주", t.m, ordinal(DC.weekOfMonth(a)))],
        [L("올해"), F("%s일째 / %s일", num(doy), num(total))],
        [L("올해 남은 날"), F("%s일", num(total - doy))],
        [L("분기"), F("%s분기", Math.floor((t.m - 1) / 3) + 1)],
        [L("윤년"), DC.isLeap(t.y) ? L("예") : L("아니요")]
      ]);
    },
    time: function () {
      var a = DC.parseLocal($("tm-a").value), b = DC.parseLocal($("tm-b").value);
      if (a === null || b === null) return empty(L("시각을 넣어 주세요."));
      var r = DC.timeDiff(a, b);
      return big(F("%s일 %s시간 %s분", num(r.days), num(r.hours), num(r.minutes)), r.sign < 0 ? esc(L("(끝 시각이 시작 시각보다 앞이에요)")) : "") + rows([
        [L("총 시간"), F("%s시간", num(Math.round(r.totalHours * 100) / 100))],
        [L("총 분"), F("%s분", num(r.totalMinutes))]
      ]);
    },
    holidays: function () {
      var y = intVal("hol-y"), r = DC.holidayYears();
      if (isNaN(y) || y < r[0] || y > r[1]) return empty(F("%d~%d년 중에서 골라 주세요.", r[0], r[1]));
      var list = DC.holidaysOfYear(y, country), today = todayN();
      var weekdayCount = list.filter(function (h) { var w = DC.weekday(h.day); return w !== 0 && w !== 6; }).length;
      return big(F("%s년 %s 공휴일 %s일", y, countryName(), num(list.length)), esc(F("그중 평일은 %s일이에요.", num(weekdayCount)))) +
        '<ul class="hols">' + list.map(function (h) {
          var w = DC.weekday(h.day), cls = (h.day < today ? "past" : "") + (w === 0 || w === 6 ? " wkend" : "");
          return '<li class="' + cls + '"><span>' + esc(fmtShort(h.day)) + "</span> " + esc(h.names[lang === "ko" ? 0 : 1]) + "</li>";
        }).join("") + "</ul>";
    }
  };

  function render(name) {
    var box = $("r-" + name);
    try { box.innerHTML = tools[name](); }
    catch (e) { box.innerHTML = warn(L("계산하지 못했어요. 입력을 확인해 주세요.")); }
  }
  function renderAll() { for (var k in tools) render(k); }

  // ---------- 고르기(해시) ----------
  var names = Object.keys(tools);
  function show(name) {
    if (names.indexOf(name) < 0) name = "period";
    names.forEach(function (n) { $(n).hidden = n !== name; });
    document.querySelectorAll(".picker a").forEach(function (a) {
      var on = a.getAttribute("data-tool") === name;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    render(name);
  }
  function fromHash() { return (location.hash || "").replace("#", ""); }
  window.addEventListener("hashchange", function () {
    if (names.indexOf(fromHash()) >= 0) { show(fromHash()); }
  });
  document.querySelector(".picker").addEventListener("click", function (e) {
    var a = e.target.closest("a[data-tool]");
    if (!a) return;
    e.preventDefault();
    history.replaceState(null, "", "#" + a.getAttribute("data-tool"));
    show(a.getAttribute("data-tool"));
    // 휴대폰에서는 고른 계산기로 내려 준다
    if (window.matchMedia("(max-width: 720px)").matches) $(a.getAttribute("data-tool")).scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---------- 언어·나라 ----------
  function applyLang() {
    document.documentElement.lang = lang;
    I18N.apply(document, lang);
    $("lang").textContent = lang === "ko" ? "EN" : "한국어";
    $("lang").setAttribute("aria-label", lang === "ko" ? "English" : "한국어로 보기");
    document.title = lang === "ko" ? "며칠 계산기 — 날짜 사이 기간, 디데이, 영업일, 만 나이" : "Daycount — days between dates, countdowns, business days, age";
  }
  $("lang").addEventListener("click", function () {
    lang = lang === "ko" ? "en" : "ko"; save("lang", lang);
    applyLang(); renderAll();
  });
  $("country").value = country;
  $("country").addEventListener("change", function () {
    country = this.value; save("country", country); renderAll();
  });

  // ---------- 처음 값 ----------
  var today = todayN(), iso = DC.iso;
  $("period-a").value = iso(today); $("period-b").value = iso(DC.addMonths(today, 3));
  $("dday-t").value = iso(DC.fromYMD(DC.toYMD(today).y, 12, 25) >= today ? DC.fromYMD(DC.toYMD(today).y, 12, 25) : DC.fromYMD(DC.toYMD(today).y + 1, 12, 25));
  $("dday-b").value = iso(today);
  $("add-a").value = iso(today);
  $("wd-a").value = iso(today); $("wd-b").value = iso(today + 30);
  $("wa-a").value = iso(today);
  $("age-b").value = "1995-05-15"; $("age-t").value = iso(today);
  $("an-a").value = iso(today - 50);
  $("wk-a").value = iso(today); $("wn-a").value = iso(today);
  $("tm-a").value = nowLocal(); $("tm-b").value = nowLocal(90);
  $("hol-y").value = Math.min(Math.max(DC.toYMD(today).y, DC.holidayYears()[0]), DC.holidayYears()[1]);

  document.querySelectorAll(".tool input, .tool select").forEach(function (el) {
    el.addEventListener("input", function () { render(el.closest(".tool").id); });
    el.addEventListener("change", function () { render(el.closest(".tool").id); });
  });

  applyLang();
  show(fromHash());
  renderAll();
  if (window.DC_ADS) window.DC_ADS.mount();
})();
