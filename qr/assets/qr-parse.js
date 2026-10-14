/* 오래QR — 읽은 QR 내용 풀기(스캐너·찍힘 확인). 화면(DOM)을 모른다: 노드 시험과 브라우저가 같이 쓴다.
   QRS.parse(text) → { type, ... }   종류: url · wifi · vcard · email · sms · tel · geo · event · text · blocked
   QRS.urlRisk(url) → { host, main, scheme, flags: [코드…], openable }
   경고 코드: http(암호화 없음) · short(짧은 주소 서비스) · ip(IP 주소) · puny(퓨니코드 xn--) · at(@ 들어간 주소) · words(로그인·결제 낱말) · port(드문 포트) · blocked(열면 안 되는 종류) */
(function (root) {
  'use strict';
  var SHORT = ['bit.ly', 'bitly.com', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'v.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 'rb.gy', 't.ly', 'tiny.cc', 'lnkd.in', 'bit.do',
    's.id', 'qrco.de', 'me2.do', 'vo.la', 'han.gl', 'url.kr', 'naver.me', 'kko.to', 'buly.kr', 'abit.ly', 'shorter.me', 'tny.im', 'x.gd', 'clck.ru', 'surl.li', 'lnk.to', 'shorturl.asia', 'urlz.fr', 'adf.ly', 'rebrandly.com', 'dub.sh', 'qr.net', 'go2l.ink', 'u.to'];
  var WORDS = ['login', 'log-in', 'signin', 'sign-in', 'verify', 'verification', 'account', 'password', 'passwd', 'wallet', 'payment', 'billing', 'bank', 'secure', 'unlock', 'suspend', 'confirm',
    '로그인', '결제', '인증', '본인확인', '계좌', '비밀번호', '환불', '정지', '택배', '미납', '과태료'];
  var SLD = ['co', 'or', 'go', 'ac', 'ne', 're', 'pe', 'com', 'net', 'org', 'gov', 'edu', 'ltd', 'plc', 'gob', 'nic', 'mil'];

  function mainDomain(host) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.charAt(0) === '[') return host;
    var p = host.split('.');
    if (p.length <= 2) return host;
    var tld = p[p.length - 1], sld = p[p.length - 2];
    if (tld.length === 2 && SLD.indexOf(sld) >= 0) return p.slice(-3).join('.');
    return p.slice(-2).join('.');
  }

  function urlRisk(raw) {
    var s = String(raw).trim(), flags = [], u;
    var scheme = (/^([a-z][a-z0-9+.\-]*):/i.exec(s) || [])[1];
    scheme = scheme ? scheme.toLowerCase() : '';
    if (scheme !== 'http' && scheme !== 'https') return { host: '', main: '', scheme: scheme, flags: ['blocked'], openable: false };
    try { u = new URL(s); } catch (e) { return { host: '', main: '', scheme: scheme, flags: ['blocked'], openable: false }; }
    var host = u.hostname.toLowerCase();
    // @ 앞은 아이디 자리라서 실제로 가는 곳은 @ 뒤다(https://bank.com@evil.example → evil.example)
    var auth = s.replace(/^[a-z][a-z0-9+.\-]*:\/\//i, '').split(/[\/?#]/)[0];
    if (auth.indexOf('@') >= 0 || u.username || u.password) flags.push('at');
    if (scheme === 'http') flags.push('http');
    var isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.charAt(0) === '[';
    if (isIp) flags.push('ip');
    if (host.split('.').some(function (l) { return l.indexOf('xn--') === 0; })) flags.push('puny');
    var md = mainDomain(host);
    if (SHORT.indexOf(host) >= 0 || SHORT.indexOf(md) >= 0) flags.push('short');
    var hay = (host + ' ' + decodeSafe(u.pathname + u.search)).toLowerCase();
    if (WORDS.some(function (w) { return hay.indexOf(w) >= 0; })) flags.push('words');
    if (u.port && u.port !== '80' && u.port !== '443') flags.push('port');
    // 퍼센트 인코딩이 든 도메인(exa%6Dple.com): 브라우저는 풀어서 가지만 눈으로는 다른 이름처럼 보인다
    if (/%[0-9a-f]{2}/i.test(auth.split('@').pop().split(':')[0])) flags.push('pct');
    // 앞부분이 다른 사이트 이름처럼 꾸며짐: 실제 도메인 앞에 '.com·.co.kr' 같은 도메인 모양이 또 있으면(kakaobank.co.kr.secure-login.top)
    var sub = host.slice(0, Math.max(0, host.length - md.length - 1));
    if (sub && /(^|\.)[a-z0-9-]+\.(com|net|org|co|kr|go|or|ac|io|app|shop|bank|pay)(\.|$)/i.test(sub)) flags.push('lookalike');
    return { host: host, main: md, scheme: scheme, flags: flags, openable: true, url: u.href };
  }
  function decodeSafe(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

  /* WIFI:T:WPA;S:이름;P:비번;H:true;;  (\ 뒤 글자는 그대로) */
  function parseWifi(s) {
    var body = s.slice(5), out = { type: 'wifi', ssid: '', password: '', auth: '', hidden: false }, key = '', val = '', inVal = false;
    for (var i = 0; i < body.length; i++) {
      var ch = body.charAt(i);
      if (!inVal) { if (ch === ':') inVal = true; else if (ch !== ';') key += ch; continue; }
      if (ch === '\\' && i + 1 < body.length) { val += body.charAt(++i); continue; }
      if (ch === ';') { set(key, val); key = ''; val = ''; inVal = false; continue; }
      val += ch;
    }
    if (inVal) set(key, val);
    function set(k, v) {
      k = k.toUpperCase();
      if (k === 'S') out.ssid = v; else if (k === 'P') out.password = v; else if (k === 'T') out.auth = v; else if (k === 'H') out.hidden = /^true$/i.test(v);
    }
    return out;
  }

  function unfold(s) { return s.replace(/\r?\n[ \t]/g, ''); }
  function vUnesc(s) { return s.replace(/\\n/gi, '\n').replace(/\\([\\;,:])/g, '$1'); }
  function splitSemi(s) { var o = [], cur = ''; for (var i = 0; i < s.length; i++) { var c = s.charAt(i); if (c === '\\' && i + 1 < s.length) { cur += c + s.charAt(++i); continue; } if (c === ';') { o.push(cur); cur = ''; } else cur += c; } o.push(cur); return o.map(vUnesc); }
  function props(text) {
    var out = [];
    unfold(text).split(/\r?\n/).forEach(function (line) {
      var i = line.indexOf(':');
      if (i < 0) return;
      var head = line.slice(0, i), val = line.slice(i + 1), parts = head.split(';');
      out.push({ name: parts[0].toUpperCase(), params: parts.slice(1).join(';').toUpperCase(), value: val });
    });
    return out;
  }
  function parseVcard(s) {
    var o = { type: 'vcard', name: '', org: '', title: '', phones: [], emails: [], urls: [], adr: '', note: '' };
    props(s).forEach(function (p) {
      if (p.name === 'FN') o.name = vUnesc(p.value);
      else if (p.name === 'N' && !o.name) o.name = splitSemi(p.value).slice(0, 2).reverse().join(' ').trim();
      else if (p.name === 'ORG') o.org = splitSemi(p.value).join(' ').trim();
      else if (p.name === 'TITLE') o.title = vUnesc(p.value);
      else if (p.name === 'TEL') o.phones.push(p.value.replace(/^tel:/i, ''));
      else if (p.name === 'EMAIL') o.emails.push(p.value);
      else if (p.name === 'URL') o.urls.push(vUnesc(p.value));
      else if (p.name === 'ADR') o.adr = splitSemi(p.value).filter(Boolean).join(', ');
      else if (p.name === 'NOTE') o.note = vUnesc(p.value);
    });
    return o;
  }
  function parseEvent(s) {
    var o = { type: 'event', title: '', start: '', end: '', location: '', desc: '' };
    props(s).forEach(function (p) {
      if (p.name === 'SUMMARY') o.title = vUnesc(p.value);
      else if (p.name === 'DTSTART') o.start = p.value;
      else if (p.name === 'DTEND') o.end = p.value;
      else if (p.name === 'LOCATION') o.location = vUnesc(p.value);
      else if (p.name === 'DESCRIPTION') o.desc = vUnesc(p.value);
    });
    return o;
  }

  /* 유료 정보 서비스 번호(한국 060, 국제 +82 60, 미국 1-900)인지 */
  function premium(num) {
    var d = String(num).replace(/[^0-9+]/g, '');
    return /^(060|\+8260|\+?1900|1900)/.test(d);
  }
  function parse(text) {
    var s = String(text == null ? '' : text), t = s.trim();
    if (/^WIFI:/i.test(t)) return parseWifi(t);
    if (/^BEGIN:VCARD/i.test(t)) return parseVcard(t);
    if (/^BEGIN:VEVENT/i.test(t) || /^BEGIN:VCALENDAR/i.test(t)) return parseEvent(t);
    if (/^MATMSG:/i.test(t)) {
      var mm = { to: /TO:([^;]*)/i.exec(t), sub: /SUB:([^;]*)/i.exec(t), body: /BODY:([^;]*)/i.exec(t) };
      return { type: 'email', to: mm.to ? mm.to[1] : '', subject: mm.sub ? mm.sub[1] : '', body: mm.body ? mm.body[1] : '' };
    }
    if (/^mailto:/i.test(t)) {
      var q = t.slice(7).split('?'), o = { type: 'email', to: decodeSafe(q[0]), subject: '', body: '' };
      (q[1] || '').split('&').forEach(function (kv) { var a = kv.split('='), k = (a[0] || '').toLowerCase(), v = decodeSafe((a[1] || '').replace(/\+/g, '%20')); if (k === 'subject') o.subject = v; else if (k === 'body') o.body = v; });
      return o;
    }
    var m;
    if ((m = /^(?:SMSTO|SMS):([^:]*)(?::([\s\S]*))?$/i.exec(t))) return { type: 'sms', phone: m[1], message: m[2] || '', paid: premium(m[1]) };
    if ((m = /^sms:([^?]*)(?:\?body=([\s\S]*))?$/i.exec(t))) return { type: 'sms', phone: m[1], message: decodeSafe(m[2] || '') };
    if ((m = /^tel:(.+)$/i.exec(t))) return { type: 'tel', phone: m[1], paid: premium(m[1]) };
    if ((m = /^geo:([+\-]?\d+(?:\.\d+)?),([+\-]?\d+(?:\.\d+)?)/i.exec(t))) return { type: 'geo', lat: m[1], lng: m[2] };
    if (/^https?:\/\//i.test(t)) return { type: 'url', url: t, risk: urlRisk(t) };
    if (/^[a-z][a-z0-9+.\-]*:/i.test(t) && !/^[a-z][a-z0-9+.\-]*:\d/i.test(t) && /^(javascript|data|vbscript|file|blob|intent|about):/i.test(t)) return { type: 'blocked', text: s };
    if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(t)) return { type: 'url', url: 'https://' + t, bare: true, risk: urlRisk('https://' + t) };
    return { type: 'text', text: s };
  }

  var QRS = { premium: premium, parse: parse, urlRisk: urlRisk, mainDomain: mainDomain, parseWifi: parseWifi, SHORT: SHORT, WORDS: WORDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = QRS;
  else root.QRS = QRS;
})(typeof self !== 'undefined' ? self : this);
