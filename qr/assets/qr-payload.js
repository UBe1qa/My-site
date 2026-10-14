/* 오래QR — QR에 담을 글(내용) 만들기. 화면(DOM)을 모른다: 노드 시험과 브라우저가 같이 쓴다.
   QRP.build(type, fields) → { ok, data, target, warn:[{f, c, p}] }  또는  { ok:false, err:[{f, c, p}] }
   f = 칸 이름, c = 알림 코드(화면 글은 content.py 의 msg 에서 코드로 찾는다), p = 끼워 넣을 값.
   형식: 와이파이 WIFI:T:..;S:..;P:..;H:true;; (특수문자 \ ; , : " 앞에 \) · 연락처 vCard 3.0(CRLF, 75바이트 줄 접기) ·
   메일 mailto:(RFC 6068) · 문자 SMSTO:번호:내용 · 전화 tel: · 위치 geo:위도,경도 또는 구글 지도 링크 · 일정 BEGIN:VEVENT · WhatsApp https://wa.me/ */
(function (root) {
  'use strict';

  var TYPES = ['url', 'text', 'wifi', 'vcard', 'email', 'sms', 'tel', 'geo', 'event', 'whatsapp'];

  function nfkc(s) { s = String(s == null ? '' : s); return s.normalize ? s.normalize('NFKC') : s; }
  function trim(s) { return String(s == null ? '' : s).replace(/^[\s\u3000]+|[\s\u3000]+$/g, ''); }
  function utf8len(s) { var n = 0; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); if (c < 0x80) n += 1; else if (c < 0x800) n += 2; else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; } else n += 3; } return n; }

  /* ---------- 주소(URL) ---------- */
  var SCHEME = /^[a-z][a-z0-9+.\-]*:/i;
  function normUrl(raw) {
    var s = trim(raw);
    if (!s) return { err: 'empty' };
    if (/\s/.test(s)) return { err: 'url_space' };
    var added = false;
    if (!SCHEME.test(s) || /^[^:\/]+\.[^:\/]+:\d+/.test(s) && !/^[a-z][a-z0-9+.\-]*:\/\//i.test(s)) {
      if (/^\/\//.test(s)) s = s.slice(2);
      s = 'https://' + s; added = true;
    }
    var m = /^([a-z][a-z0-9+.\-]*):(.*)$/i.exec(s), scheme = m[1].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') return { err: 'url_scheme', p: { s: scheme } };
    var u;
    try { u = new URL(s); } catch (e) { return { err: 'url_bad' }; }
    var host = u.hostname;
    if (!host) return { err: 'url_bad' };
    var isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^\[[0-9a-f:]+\]$/i.test(host);
    if (!isIp && host !== 'localhost' && host.indexOf('.') < 0) return { err: 'url_nodot' };
    if (!isIp && /\.$|\.\./.test(host)) return { err: 'url_bad' };
    if (!isIp && !/[a-z\u00a1-\uffff-]{2,}$/i.test(host.split('.').pop()) && host !== 'localhost') return { err: 'url_bad' };
    return { url: s, added: added, host: host, http: scheme === 'http' };
  }
  function addUtm(url, utm) {
    var parts = [];
    [['utm_source', utm.source], ['utm_medium', utm.medium], ['utm_campaign', utm.campaign]].forEach(function (kv) {
      var v = trim(kv[1]); if (v) parts.push([kv[0], v]);
    });
    if (!parts.length) return url;
    var hash = '', hi = url.indexOf('#');
    if (hi >= 0) { hash = url.slice(hi); url = url.slice(0, hi); }
    var qi = url.indexOf('?'), base = qi >= 0 ? url.slice(0, qi) : url, query = qi >= 0 ? url.slice(qi + 1) : '';
    var names = parts.map(function (p) { return p[0]; });
    var kept = query ? query.split('&').filter(function (q) { return q && names.indexOf(q.split('=')[0]) < 0; }) : [];
    if (!/^https?:\/\/[^\/]+\//i.test(base)) base += '/';   // 주소 끝에 / 가 없으면 붙인 뒤 ? (example.com?a=1 → example.com/?a=1, 브라우저와 같은 모양)
    return base + '?' + kept.concat(parts.map(function (p) { return p[0] + '=' + encodeURIComponent(p[1]); })).join('&') + hash;
  }

  /* ---------- 전화번호 ---------- */
  function phone(raw, opt) {
    var s = trim(nfkc(raw));
    if (!s) return { err: 'empty' };
    if (/[^0-9+\-\s().]/.test(s)) return { err: 'phone_bad' };
    var plus = s.charAt(0) === '+', d = s.replace(/[^0-9]/g, '');
    if (s.slice(1).indexOf('+') >= 0) return { err: 'phone_bad' };
    if (d.length < 3 || d.length > 15) return { err: 'phone_len' };
    return { num: (plus ? '+' : '') + d, digits: d, plus: plus };
  }

  /* ---------- 와이파이 ---------- */
  function wifiEsc(s) { return String(s).replace(/([\\;,:"])/g, '\\$1'); }

  /* ---------- vCard·iCalendar 글 ---------- */
  function vEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n'); }
  /* 한 줄이 75바이트(UTF-8)를 넘으면 CRLF + 빈칸으로 접는다(RFC 2425·5545). 글자 하나(여러 바이트)는 쪼개지 않는다 */
  function fold(line) {
    if (utf8len(line) <= 75) return line;
    var out = [], cur = '', n = 0, limit = 75;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i), c = line.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < line.length) { ch += line.charAt(++i); }
      var b = utf8len(ch);
      if (n + b > limit) { out.push(cur); cur = ''; n = 0; limit = 74; }   // 이어지는 줄은 앞의 빈칸 1바이트를 뺀 74바이트
      cur += ch; n += b;
    }
    out.push(cur);
    return out.join('\r\n ');
  }
  function lines(arr) { return arr.map(fold).join('\r\n'); }
  var HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;

  function email(raw) {
    var s = trim(nfkc(raw));
    if (!s) return { err: 'empty' };
    if (!/^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:.]{2,}$/.test(s)) return { err: 'email_bad' };
    return { v: s };
  }

  function num(raw) {
    var s = trim(nfkc(raw)).replace(/,/g, '.');
    if (!s) return { err: 'empty' };
    if (!/^[+\-]?(\d+\.?\d*|\.\d+)$/.test(s)) return { err: 'num_bad' };
    return { v: parseFloat(s), s: s.replace(/^\+/, '') };
  }

  /* 2026-10-14T09:30 → 20261014T093000 / 2026-10-14 → 20261014 */
  function parseDT(raw, dateOnly) {
    var s = trim(nfkc(raw));
    if (!s) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(s);
    if (!m) return { bad: true };
    var y = +m[1], mo = +m[2], d = +m[3], h = m[4] ? +m[4] : 0, mi = m[5] ? +m[5] : 0;
    var t = new Date(Date.UTC(y, mo - 1, d, h, mi));
    if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d || h > 23 || mi > 59) return { bad: true };
    return { t: t.getTime(), hasTime: !!m[4] && !dateOnly };
  }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDT(ms, dateOnly) {
    var t = new Date(ms), s = t.getUTCFullYear() + p2(t.getUTCMonth() + 1) + p2(t.getUTCDate());
    return dateOnly ? s : s + 'T' + p2(t.getUTCHours()) + p2(t.getUTCMinutes()) + '00';
  }

  function short(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /* ---------- 종류마다 ---------- */
  var B = {};

  B.url = function (f) {
    var r = normUrl(f.url);
    if (r.err) return { err: [{ f: 'url', c: r.err, p: r.p }] };
    var data = f.utm ? addUtm(r.url, { source: f.utm_source, medium: f.utm_medium, campaign: f.utm_campaign }) : r.url;
    var warn = [];
    if (r.added) warn.push({ f: 'url', c: 'url_added' });
    if (r.http) warn.push({ f: 'url', c: 'url_http' });
    var shown = data.replace(/^https?:\/\//i, '');
    return { data: data, target: short(shown, 60), host: r.host, warn: warn };
  };

  B.text = function (f) {
    var s = String(f.text == null ? '' : f.text);
    if (!trim(s)) return { err: [{ f: 'text', c: 'empty' }] };
    var warn = [];
    if (/^https?:\/\//i.test(trim(s))) warn.push({ f: 'text', c: 'text_url' });
    return { data: s, target: short(trim(s).replace(/\s+/g, ' '), 40), warn: warn };
  };

  B.wifi = function (f) {
    var ssid = String(f.ssid == null ? '' : f.ssid), pass = String(f.password == null ? '' : f.password), auth = f.auth || 'WPA';
    var err = [], warn = [];
    if (!ssid.length) err.push({ f: 'ssid', c: 'empty' });
    if (utf8len(ssid) > 32) warn.push({ f: 'ssid', c: 'ssid_long' });
    if (auth !== 'nopass') {
      if (!pass.length) err.push({ f: 'password', c: 'wifi_nopass' });
      else if (auth === 'WPA' && (pass.length < 8 || pass.length > 63)) warn.push({ f: 'password', c: 'wpa_len' });
      else if (auth === 'WEP' && [5, 13, 10, 26].indexOf(pass.length) < 0) warn.push({ f: 'password', c: 'wep_len' });
    }
    if (ssid !== trim(ssid)) warn.push({ f: 'ssid', c: 'ssid_space' });
    if (err.length) return { err: err };
    var data = 'WIFI:T:' + (auth === 'nopass' ? 'nopass' : auth) + ';S:' + wifiEsc(ssid) + ';' + (auth === 'nopass' ? '' : 'P:' + wifiEsc(pass) + ';') + (f.hidden ? 'H:true;' : '') + ';';
    return { data: data, target: short(ssid, 40), warn: warn };
  };

  var TEL_TYPES = { cell: 'CELL', work: 'WORK', home: 'HOME', fax: 'FAX' };
  B.vcard = function (f) {
    var first = trim(f.first), last = trim(f.last), org = trim(f.org), title = trim(f.title);
    var err = [], warn = [];
    if (!first && !last && !org) err.push({ f: 'first', c: 'vcard_name' });
    var tels = [];
    (f.phones || []).forEach(function (ph, i) {
      if (!ph || !trim(ph.num)) return;
      var r = phone(ph.num);
      if (r.err) err.push({ f: 'phone' + i, c: r.err });
      else tels.push({ type: TEL_TYPES[ph.type] || 'CELL', num: r.num });
    });
    var mail = trim(f.email);
    if (mail) { var e = email(mail); if (e.err) err.push({ f: 'email', c: e.err }); else mail = e.v; }
    var web = trim(f.web);
    if (web) { var w = normUrl(web); if (w.err) err.push({ f: 'web', c: w.err, p: w.p }); else web = w.url; }
    if (err.length) return { err: err };
    var korean = HANGUL.test(first + last);
    var fn = korean ? last + first : [first, last].filter(Boolean).join(' ');
    if (!fn) fn = org;
    var L = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + vEsc(last) + ';' + vEsc(first) + ';;;', 'FN:' + vEsc(fn)];
    if (org) L.push('ORG:' + vEsc(org));
    if (title) L.push('TITLE:' + vEsc(title));
    tels.forEach(function (t) { L.push('TEL;TYPE=' + t.type + (t.type === 'CELL' ? ',VOICE' : t.type === 'FAX' ? '' : ',VOICE') + ':' + t.num); });
    if (mail) L.push('EMAIL;TYPE=INTERNET:' + mail);
    if (web) L.push('URL:' + web);
    var adr = [f.street, f.city, f.region, f.zip, f.country].map(trim);
    if (adr.join('')) L.push('ADR;TYPE=WORK:;;' + adr.map(vEsc).join(';'));
    var note = String(f.note == null ? '' : f.note).replace(/^\s+|\s+$/g, '');
    if (note) L.push('NOTE:' + vEsc(note));
    L.push('END:VCARD');
    return { data: lines(L), target: short(fn, 40), warn: warn };
  };

  B.email = function (f) {
    var e = email(f.to);
    if (e.err) return { err: [{ f: 'to', c: e.err }] };
    var q = [], sub = String(f.subject == null ? '' : f.subject), body = String(f.body == null ? '' : f.body);
    if (trim(sub)) q.push('subject=' + encodeURIComponent(sub.replace(/[\r\n]+/g, ' ')));
    if (body.replace(/\s/g, '')) q.push('body=' + encodeURIComponent(body.replace(/\r\n|\r|\n/g, '\r\n')));
    return { data: 'mailto:' + e.v + (q.length ? '?' + q.join('&') : ''), target: e.v, warn: [] };
  };

  B.sms = function (f) {
    var r = phone(f.phone);
    if (r.err) return { err: [{ f: 'phone', c: r.err }] };
    var msg = String(f.message == null ? '' : f.message).replace(/\r\n|\r/g, '\n');
    return { data: 'SMSTO:' + r.num + ':' + msg, target: r.num, warn: [] };
  };

  B.tel = function (f) {
    var r = phone(f.phone);
    if (r.err) return { err: [{ f: 'phone', c: r.err }] };
    return { data: 'tel:' + r.num, target: r.num, warn: [] };
  };

  B.geo = function (f) {
    var lat = trim(nfkc(f.lat)), lng = trim(nfkc(f.lng)), err = [];
    var both = /^\s*([+\-]?\d+(?:\.\d+)?)\s*[, ]\s*([+\-]?\d+(?:\.\d+)?)\s*$/.exec(lat);   // '37.55, 126.97' 을 위도 칸에 한 번에 붙여 넣어도 된다
    if (both && !lng) { lat = both[1]; lng = both[2]; }
    var a = num(lat), b = num(lng);
    if (a.err) err.push({ f: 'lat', c: a.err === 'empty' ? 'empty' : 'lat_bad' });
    else if (a.v < -90 || a.v > 90) err.push({ f: 'lat', c: 'lat_range' });
    if (b.err) err.push({ f: 'lng', c: b.err === 'empty' ? 'empty' : 'lng_bad' });
    else if (b.v < -180 || b.v > 180) err.push({ f: 'lng', c: 'lng_range' });
    if (err.length) return { err: err };
    var ll = a.s + ',' + b.s;
    var data = f.mode === 'geo' ? 'geo:' + ll : 'https://www.google.com/maps/search/?api=1&query=' + ll;
    return { data: data, target: ll, warn: [], lat: a.v, lng: b.v };
  };

  B.event = function (f) {
    var title = trim(f.title), err = [], warn = [];
    if (!title) err.push({ f: 'title', c: 'empty' });
    var allday = !!f.allday;
    var s = parseDT(allday ? String(f.start || '').slice(0, 10) : f.start, allday), e = parseDT(allday ? String(f.end || '').slice(0, 10) : f.end, allday);
    if (!s) err.push({ f: 'start', c: 'empty' });
    else if (s.bad) err.push({ f: 'start', c: 'date_bad' });
    if (e && e.bad) err.push({ f: 'end', c: 'date_bad' });
    if (s && !s.bad && !allday && !s.hasTime) err.push({ f: 'start', c: 'time_need' });
    if (err.length) return { err: err };
    var DAY = 86400000, start = s.t, end;
    if (allday) end = (e ? e.t : start) + DAY;   // 하루 종일: 끝 날짜는 '그다음 날'로 적는다(그날을 포함하지 않는 끝)
    else end = e ? e.t : start + 3600000;
    if (end < start + (allday ? DAY : 0)) return { err: [{ f: 'end', c: 'end_before' }] };
    if (!allday && end === start) warn.push({ f: 'end', c: 'end_same' });
    var L = ['BEGIN:VEVENT', 'SUMMARY:' + vEsc(title)];
    if (allday) { L.push('DTSTART;VALUE=DATE:' + fmtDT(start, true)); L.push('DTEND;VALUE=DATE:' + fmtDT(end, true)); }
    else if (typeof f.tzOffset === 'number') {
      // 시각은 만든 기기의 시간대로 넣은 것 → 세계 표준시(UTC, 끝에 Z)로 바꿔 적는다. 다른 나라 휴대폰에서도 같은 순간이 된다(평가 L9)
      var off = f.tzOffset * 60000;   // Date.getTimezoneOffset(): UTC - 현지(분)
      L.push('DTSTART:' + fmtDT(start + off) + 'Z'); L.push('DTEND:' + fmtDT(end + off) + 'Z');
    } else { L.push('DTSTART:' + fmtDT(start)); L.push('DTEND:' + fmtDT(end)); }
    var loc = trim(f.location), desc = String(f.desc == null ? '' : f.desc).replace(/^\s+|\s+$/g, '');
    if (loc) L.push('LOCATION:' + vEsc(loc));
    if (desc) L.push('DESCRIPTION:' + vEsc(desc));
    L.push('END:VEVENT');
    return { data: lines(L), target: short(title, 40), warn: warn };
  };

  B.whatsapp = function (f) {
    var r = phone(f.phone);
    if (r.err) return { err: [{ f: 'phone', c: r.err }] };
    if (!r.plus && r.digits.charAt(0) === '0') return { err: [{ f: 'phone', c: 'wa_country' }] };
    if (r.digits.length < 8) return { err: [{ f: 'phone', c: 'phone_len' }] };
    var msg = String(f.message == null ? '' : f.message);
    return { data: 'https://wa.me/' + r.digits + (msg.replace(/\s/g, '') ? '?text=' + encodeURIComponent(msg.replace(/\r\n|\r/g, '\n')) : ''), target: '+' + r.digits, warn: [] };
  };

  function build(type, f) {
    var fn = B[type];
    if (!fn) return { ok: false, err: [{ f: '', c: 'type_bad' }] };
    var r = fn(f || {});
    if (r.err) return { ok: false, err: r.err };
    r.ok = true; r.type = type; r.warn = r.warn || [];
    r.bytes = utf8len(r.data);
    return r;
  }

  /* 비어 있는 칸들(종류마다) */
  function blank(type) {
    switch (type) {
      case 'url': return { url: '', utm: false, utm_source: 'qr', utm_medium: 'print', utm_campaign: '' };
      case 'text': return { text: '' };
      case 'wifi': return { ssid: '', password: '', auth: 'WPA', hidden: false };
      case 'vcard': return { first: '', last: '', org: '', title: '', phones: [{ type: 'cell', num: '' }], email: '', web: '', street: '', city: '', region: '', zip: '', country: '', note: '' };
      case 'email': return { to: '', subject: '', body: '' };
      case 'sms': return { phone: '', message: '' };
      case 'tel': return { phone: '' };
      case 'geo': return { lat: '', lng: '', mode: 'map' };
      case 'event': return { title: '', start: '', end: '', allday: false, location: '', desc: '' };
      case 'whatsapp': return { phone: '', message: '' };
    }
    return {};
  }

  /* 파일 이름: 내용에서(주소면 도메인, 와이파이면 이름…). 파일 이름에 못 쓰는 글자는 뺀다 */
  function fileBase(r) {
    var s = r && r.ok ? (r.type === 'url' ? (r.host || '') + (r.data.replace(/^https?:\/\/[^\/?#]+/i, '').split(/[?#]/)[0].replace(/\/+$/, '').replace(/\//g, '-')) : r.target) : '';
    s = String(s).replace(/^www\./i, '').replace(/[\\\/:*?"<>|\u0000-\u001f\u007f]+/g, '-').replace(/[\s.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (s.length > 48) s = s.slice(0, 48).replace(/-$/, '');
    return 'qr-' + (r && r.ok ? r.type + (s ? '-' + s : '') : 'code');
  }

  var QRP = { TYPES: TYPES, build: build, blank: blank, fileBase: fileBase, normUrl: normUrl, addUtm: addUtm, phone: phone, wifiEsc: wifiEsc, vEsc: vEsc, fold: fold, utf8len: utf8len, nfkc: nfkc };
  if (typeof module !== 'undefined' && module.exports) module.exports = QRP;
  else root.QRP = QRP;
})(typeof self !== 'undefined' ? self : this);
