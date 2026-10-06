// 화면 연결. 계산은 dates.js(DC), 문구는 i18n.js(L, F)에 있다.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var P = DC.parse;

  // ---------- 설정(이 기기에만 저장) ----------
  function load(key) { try { return localStorage.getItem("dc." + key); } catch (e) { return null; } }
  function save(key, v) { try { localStorage.setItem("dc." + key, v); } catch (e) { /* 사생활 보호 모드 */ } }

  // 화면 언어는 페이지가 정한다(<html lang>): / = 한국어, /en/ = 영어. 저장값·브라우저 언어로 바꾸지 않는다(주소 하나에 언어 하나 → 검색에 둘 다 나옴).
  var lang = /^en\b/i.test(document.documentElement.lang) ? "en" : "ko";
  I18N.setLang(lang);
  // 나라는 고른 값을 기억한다. 처음엔 한국어 페이지 = 한국, 영어 페이지 = 미국
  var country = load("country");
  if (country !== "KR" && country !== "US") country = lang === "ko" ? "KR" : "US";

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
  var MONTH_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
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

  function big(text, sub, cls) { return '<p class="big' + (cls ? " " + cls : "") + '">' + esc(text) + "</p>" + (sub ? '<p class="sub">' + sub + "</p>" : ""); }
  function rows(list) {
    return '<dl class="rows">' + list.map(function (r) { return (r[2] ? '<div class="' + r[2] + '">' : "<div>") + "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") + "</dl>";
  }
  // 기간 막대(그림): 앞 날짜 → 뒤 날짜, 그 안에 오늘이 있으면 빨간 오늘 표시
  function spanBar(a, b) {
    var lo = Math.min(a, b), hi = Math.max(a, b), len = hi - lo;
    if (len < 2) return "";
    var pos = function (n) { return ((n - lo) / len * 100).toFixed(2) + "%"; };
    var today = todayN();
    var mark = today > lo && today < hi ? '<em style="left:' + pos(today) + '"></em>' : "";
    return '<div class="span" aria-hidden="true"><div class="span-bar"><b></b>' +
      mark +
      '</div><div class="span-ends"><span>' + esc(fmtShort(lo)) + "</span>" +
      (mark ? '<span class="span-today">' + esc(L("오늘")) + "</span>" : "") +
      "<span>" + esc(fmtShort(hi)) + "</span></div></div>";
  }
  // 요일 색: 일요일·공휴일은 빨강, 토요일은 파랑(달력 약속)
  function dayCls(n) { var w = DC.weekday(n); return holName(n) || w === 0 ? "is-sun" : w === 6 ? "is-sat" : ""; }
  function warn(text) { return '<p class="warn">' + esc(text) + "</p>"; }
  function empty(text) { return '<p class="empty' + (text ? " err" : "") + '">' + esc(text || L("날짜를 넣어 주세요.")) + "</p>"; }
  // 고른 날이 공휴일이면 큰 결과 옆에 '공휴일' 도장(뜻은 아래 줄 글에도 있어 화면 읽기에선 숨김)
  function stamp(html, key) { mark.stamp = key; return html.replace("</p>", '<span class="stamp" aria-hidden="true">' + esc(L("공휴일")) + "</span></p>"); }
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
      return big(F("%s일", num(r.days)), esc(ago)) + spanBar(a, b) + rows([
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
      if (diff === 0) mark.moment = "dday" + t;
      var sub = diff === 0 ? L("바로 그날이에요.") : diff > 0 ? F("%s까지 %s일 남았어요.", fmtDate(t), num(diff)) : F("%s부터 %s일 지났어요.", fmtDate(t), num(-diff));
      var p = DC.ymd(b, t);
      return big(dLabel(diff), esc(sub)) + spanBar(b, t) + rows([[L("개월로"), F("%s년 %s개월 %s일", num(p.years), num(p.months), num(p.days))], [L("주로"), F("%s주 %s일", num(Math.floor(Math.abs(diff) / 7)), num(Math.abs(diff) % 7))]]);
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
      var head = big(fmtDate(n), h ? esc(F("공휴일이에요: %s", h)) : "", dayCls(n));
      return (h ? stamp(head, n) : head) + rows([[L("기준일에서"), F("%s일 차이", num(Math.abs(n - a)))]]);
    },
    workdays: function () {
      var a = P($("wd-a").value), b = P($("wd-b").value);
      if (a === null || b === null) return empty();
      var c = $("wd-nohol").checked ? "none" : country;
      var r = DC.businessDays(a, b, c, $("wd-inc").checked);
      var out = big(F("%s영업일", num(r.business)), esc(c === "none" ? L("주말만 뺐어요.") : F("주말과 %s 공휴일을 뺐어요.", countryName()))) + rows([
        [L("달력상 날짜"), F("%s일", num(r.calendar))],
        [L("주말"), F("%s일", num(r.weekend)), "k-w"],
        [L("평일 공휴일"), F("%s일", num(r.holidays.length)), "k-h"]
      ]);
      // 달력상 날짜 중 영업일·주말·공휴일 비율 막대
      if (r.calendar > 0) out = out.replace('<dl class="rows">', '<div class="mix" aria-hidden="true"><i class="mix-b" style="flex-grow:' + r.business +
        '"></i><i class="mix-w" style="flex-grow:' + r.weekend + '"></i><i class="mix-h" style="flex-grow:' + r.holidays.length + '"></i></div>' +
        '<p class="mix-key" aria-hidden="true"><span class="k-b">' + esc(L("영업일")) + '</span><span class="k-w">' + esc(L("주말")) + '</span><span class="k-h">' + esc(L("평일 공휴일")) + '</span></p><dl class="rows">');
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
      if (r.birthdayToday) mark.moment = "age" + b + "-" + t;
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
        if (diff === 0) mark.moment = "anniv" + a + "-" + x.kind + x.n;
        var label = x.kind === "days" ? F("%s일", num(x.n)) : F("%s주년", num(x.n));
        return '<li class="' + cls + '"><b>' + esc(label) + "</b><span>" + esc(fmtShort(x.day)) + "</span><em>" + esc(dLabel(diff)) + "</em></li>";
      }).join("") + "</ul>";
    },
    weekday: function () {
      var a = P($("wk-a").value);
      if (a === null) return empty();
      var h = holName(a), w = DC.weekday(a);
      var kind = h ? F("%s 공휴일: %s", countryName(), h) : (w === 0 || w === 6) ? L("주말이에요.") : L("평일이에요.");
      var head = big(weekdayName(a), esc(fmtDate(a) + " · " + kind), dayCls(a));
      return h ? stamp(head, a) : head;
    },
    week: function () {
      var a = P($("wn-a").value);
      if (a === null) return empty();
      var t = DC.toYMD(a), iw = DC.isoWeek(a), doy = DC.dayOfYear(a), total = DC.daysInYear(t.y);
      return big(F("%s년 %s주차", iw.year, num(iw.week)), esc(L("ISO 기준 (월요일 시작, 첫 목요일이 든 주가 1주차)"))) + rows([
        [L("그 달의"), F("%s월 %s 주", lang === "ko" ? t.m : MONTH_EN[t.m - 1], ordinal(DC.weekOfMonth(a)))],
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
      // 미국의 '(observed)' 줄은 따로 된 공휴일이 아니라 쉬는 날을 옮긴 것 → 공휴일 수에서 빼고, 평일에 쉬는 날 수에만 넣는다
      // (한국 대체 휴일은 법정 공휴일이라 그대로 센다)
      var count = list.filter(function (h) { return !/\(observed\)$/.test(h.names[1]); }).length;
      var sub = count < list.length ? F("평일에 쉬는 날은 대체 휴일을 포함해 %s일이에요.", num(weekdayCount)) : F("그중 평일은 %s일이에요.", num(weekdayCount));
      return big(F("%s년 %s 공휴일 %s일", y, countryName(), num(count)), esc(sub)) +
        '<ul class="hols">' + list.map(function (h) {
          var w = DC.weekday(h.day), cls = (h.day < today ? "past" : "") + (w === 0 || w === 6 ? " wkend" : "");
          return '<li class="' + cls + '"><span>' + esc(fmtShort(h.day)) + "</span> " + esc(h.names[lang === "ko" ? 0 : 1]) + "</li>";
        }).join("") + "</ul>";
    }
  };

  // ---------- 연출 ----------
  // 기본 반응(누름·바뀜·실수 흔들림)은 style.css. 여기는 방문자가 직접 넣은 값으로 '그 순간'이 된 때만:
  // 그날이에요(디데이 당일·생일·기념일 당일 → 계산기 카드 안 색종이), 공휴일 도장(고른 날이 공휴일).
  // 처음 열 때·다른 계산기로 바꿀 때·같은 값을 다시 그릴 때는 안 나온다. 입력칸을 가리지 않고 광고 칸에 닿지 않게 결과 칸 안에서만 그린다.
  var mark = {}, last = {}, byUser = false;
  function calm() { return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function replay(el, cls) {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    el.addEventListener("animationend", function () { el.classList.remove(cls); }, { once: true });
  }
  function confetti(card) {
    if (calm() || document.hidden || card.querySelector(".fx")) return;
    var cv = document.createElement("canvas"), g = cv.getContext && cv.getContext("2d");
    if (!g) return;
    var w = card.clientWidth, h = card.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.className = "fx"; cv.setAttribute("aria-hidden", "true");
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    card.appendChild(cv); g.scale(dpr, dpr);
    var css = getComputedStyle(document.documentElement), cols = ["--g-span", "--g-move", "--g-life", "--g-cal"].map(function (v) { return css.getPropertyValue(v).trim(); });
    var big = card.querySelector(".big"), cr = card.getBoundingClientRect(), br = big ? big.getBoundingClientRect() : cr;
    var ox = Math.min(br.left - cr.left + 80, w / 2), oy = br.top - cr.top + br.height / 2, ps = [];
    for (var i = 0; i < 60; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.8, v = 3 + Math.random() * 4;
      ps.push({ x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, s: 5 + Math.random() * 4, c: cols[i % cols.length], round: i % 3 === 0 });
    }
    var t0 = performance.now(), prev = t0, LIFE = 1600, raf;
    function end() { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", end); cv.remove(); }
    document.addEventListener("visibilitychange", end);
    (function frame(now) {
      var k = Math.min((now - prev) / 16.7, 3), age = now - t0; prev = now;
      if (age > LIFE) return end();
      g.clearRect(0, 0, w, h);
      g.globalAlpha = age > LIFE - 400 ? (LIFE - age) / 400 : 1;
      ps.forEach(function (p) {
        p.vy += 0.2 * k; p.vx *= Math.pow(0.985, k); p.x += p.vx * k; p.y += p.vy * k; p.r += p.vr * k;
        g.fillStyle = p.c; g.save(); g.translate(p.x, p.y); g.rotate(p.r);
        if (p.round) { g.beginPath(); g.arc(0, 0, p.s / 2, 0, 6.283); g.fill(); } else g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        g.restore();
      });
      raf = requestAnimationFrame(frame);
    })(t0);
  }

  function render(name) {
    var box = $("r-" + name), wasErr = !!box.querySelector(".err");
    mark = {};
    try { box.innerHTML = tools[name](); }
    catch (e) { box.innerHTML = warn(L("계산하지 못했어요. 입력을 확인해 주세요.")); }
    if (byUser) {
      if (mark.moment && mark.moment !== last[name + "m"]) confetti(box);
      if (mark.stamp && mark.stamp !== last[name + "s"]) { var st = box.querySelector(".stamp"); if (st) st.classList.add("go"); }
      if (!wasErr && box.querySelector(".err")) replay(box, "shake");
    }
    last[name + "m"] = mark.moment; last[name + "s"] = mark.stamp;
  }
  // 오늘 카드(첫 화면 일력): 오늘 날짜, 올해 며칠째, 다음 공휴일까지. 다시 올 이유가 되는 '오늘의 한 장'
  function renderToday() {
    var box = $("today");
    if (!box) return;
    var t = todayN(), d = DC.toYMD(t), doy = DC.dayOfYear(t), total = DC.daysInYear(d.y), next = null;
    for (var n = t; n < t + 400; n++) { var h = holName(n); if (h) { next = [n, h]; break; } }
    var hol = next ? (next[0] === t ? F("오늘은 %s", next[1]) : F("%s까지 %s일", next[1], num(next[0] - t))) : "";
    box.innerHTML =
      '<div class="today-sheet ' + dayCls(t) + '"><span class="today-m">' + esc(lang === "ko" ? d.m + "월" : MON_EN[d.m - 1]) + "</span>" +
      '<b class="today-d">' + d.d + '</b><span class="today-w">' + esc(weekdayName(t)) + "</span></div>" +
      '<div class="today-facts"><p class="today-k">' + esc(L("오늘")) + " · " + esc(fmtShort(t)) + "</p>" +
      "<p>" + esc(F("올해 %s일째, 남은 날 %s일", num(doy), num(total - doy))) + "</p>" +
      '<div class="today-bar" aria-hidden="true"><i style="width:' + (doy / total * 100).toFixed(1) + '%"></i></div>' +
      (hol ? '<p><a href="#holidays">' + esc(hol) + "</a></p>" : "") + "</div>";
    box.hidden = false;
  }
  function renderAll() { for (var k in tools) render(k); renderToday(); }

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
    // 쓰임별 묶음: 고른 계산기가 든 묶음을 연다(휴대폰에선 열린 묶음의 계산기만 보인다)
    document.querySelectorAll(".pg").forEach(function (g) {
      var open = !!g.querySelector('a[data-tool="' + name + '"]');
      g.classList.toggle("open", open);
      g.querySelector(".pg-h").setAttribute("aria-expanded", open ? "true" : "false");
    });
    render(name);
    syncLangLinks();
    // 휴대폰에서 가로로 넘기는 고르기 줄: 고른 칸이 보이게 줄만 옮긴다(페이지는 그대로)
    var pk = document.querySelector(".picker"), on = pk.querySelector("a.on");
    if (on && pk.scrollWidth > pk.clientWidth) {
      var want = on.offsetLeft - (pk.clientWidth - on.offsetWidth) / 2;
      pk.scrollLeft = Math.max(0, want);
    }
  }
  function fromHash() { return (location.hash || "").replace("#", ""); }
  window.addEventListener("hashchange", function () {
    if (names.indexOf(fromHash()) >= 0) { show(fromHash()); }
  });
  document.querySelector(".picker").addEventListener("click", function (e) {
    // 묶음 이름을 누르면 그 묶음의 첫 계산기로(이미 그 묶음이면 그대로)
    var h = e.target.closest(".pg-h");
    if (h && !h.parentNode.classList.contains("open")) { h.parentNode.querySelector("a[data-tool]").click(); return; }
    var a = e.target.closest("a[data-tool]");
    if (!a) return;
    e.preventDefault();
    history.replaceState(null, "", "#" + a.getAttribute("data-tool"));
    document.querySelector(".stage").classList.add("live"); document.querySelector(".picker").classList.add("live"); // 이제부터 카드 바뀜을 보여 준다(처음 열 때는 안 함)
    show(a.getAttribute("data-tool"));
    // 휴대폰에서는 고른 계산기로 내려 준다
    if (window.matchMedia("(max-width: 720px)").matches) $(a.getAttribute("data-tool")).scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---------- 언어(다른 언어 페이지로 가는 링크)·나라 ----------
  // 머리의 언어 버튼은 다른 언어 페이지로 가는 보통 링크. 고른 계산기(#해시)를 그대로 들고 간다.
  // dc.lang = 방문자가 고른 언어. 언어 제안 띠를 다시 띄울지 정할 때만 쓴다(화면 언어는 안 바꾼다).
  var other = lang === "ko" ? "en" : "ko", otherBase = lang === "ko" ? "/en/" : "/";
  function otherHref() { return otherBase + (location.hash || ""); }
  function syncLangLinks() {
    document.querySelectorAll("a[data-other-lang]").forEach(function (a) { a.href = otherHref(); });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-other-lang]");
    if (a) { a.href = otherHref(); save("lang", other); }
  });
  $("lang").setAttribute("data-other-lang", "");
  // 브라우저 언어가 이 페이지 언어와 다르면 작은 띠로 다른 언어 페이지를 알려 준다. 자동으로 넘기지 않는다.
  var navLang = /^ko\b/i.test(navigator.language || "") ? "ko" : "en";
  if (navLang !== lang && load("lang") !== lang) {
    var bar = document.createElement("div");
    bar.className = "langbar";
    bar.setAttribute("lang", other);
    bar.innerHTML = '<p class="wrap"><span>' + (other === "en" ? "This page is in Korean." : "한국어 페이지도 있어요.") + "</span> " +
      '<a data-other-lang hreflang="' + other + '" href="' + esc(otherHref()) + '">' + (other === "en" ? "English version →" : "한국어로 보기 →") + "</a>" +
      '<button type="button" class="langbar-x" aria-label="' + (other === "en" ? "Close" : "닫기") + '">×</button></p>';
    bar.querySelector("button").addEventListener("click", function () { save("lang", lang); bar.remove(); });
    document.body.insertBefore(bar, document.querySelector("header"));
  }
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
    // input과 change가 같은 값으로 두 번 오면 한 번만 그린다(도장이 찍히다 지워지지 않게)
    function upd() {
      var v = el.type === "checkbox" || el.type === "radio" ? String(el.checked) : el.value;
      if (el._v === v) return;
      el._v = v; byUser = true; render(el.closest(".tool").id); byUser = false;
    }
    el.addEventListener("input", upd);
    el.addEventListener("change", function () {
      upd();
      // 체크·고르기를 바꾸면 결과가 바뀌었다고 짧게 알려 준다(글자를 치는 중엔 안 함)
      if (el.type === "checkbox" || el.type === "radio") replay($("r-" + el.closest(".tool").id), "swap");
    });
  });

  show(fromHash());
  renderAll();
  if (window.DC_ADS) window.DC_ADS.mount();
})();
