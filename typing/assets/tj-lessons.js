/* 토독 자리 연습 단계. 화면(DOM)을 모른다. tj-core.js 다음에 불러온다(노드에서는 require).
   단계마다 새로 배우는 키(keys)와 그때까지 배운 키(allowed)가 있고, 연습 글은 '배운 키만으로 칠 수 있는 것'만 나온다
   (tests/run.mjs 'lessons' 묶음이 검사). 단어는 직접 고른 흔한 말이다. */
(function (root) {
  'use strict';
  var TJ = root.TJ || (typeof require === 'function' ? require('./tj-core.js') : null);
  var H = TJ.hangul;

  /* 단계: id, 새로 배우는 키, 단어 후보(배운 키로 못 치는 말은 걸러진다) */
  var DEF = {
    ko: [
      { id: 'home', keys: 'ㅁㄴㅇㄹㅎㅗㅓㅏㅣ', words: ['아이', '어머니', '나라', '머리', '이마', '나이', '오리', '하나', '호미', '미리', '엄마', '할머니', '어린이', '나란히', '얼마', '호랑이', '오로라', '마리', '아니', '하마', '오이', '인어', '안마', '올림', '놀이', '미나리', '모임', '알림', '온몸', '마님', '아리랑', '노인', '하모니', '오라', '말', '날', '알', '힘', '홀로', '이리', '머나먼'] },
      { id: 'top', keys: 'ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ', words: ['가방', '사진', '대답', '다리', '바다', '가게', '새벽', '요리', '여행', '내일', '생각', '저녁', '지갑', '고양이', '강아지', '사랑', '기억', '도서관', '선생님', '야경', '교실', '세상', '경험', '정리', '약속', '시작', '독서', '방법', '식당', '영어', '재미', '노래', '배', '별', '집', '길', '소리', '동네', '거리', '여기', '저기', '모레', '벽', '자리'] },
      { id: 'bottom', keys: 'ㅋㅌㅊㅍㅠㅜㅡ', words: ['추억', '친구', '커피', '우유', '구름', '포도', '튼튼', '축구', '휴일', '처음', '우산', '주말', '운동', '음식', '그림', '은행', '눈물', '채소', '특별', '편지', '표현', '토마토', '컴퓨터', '유리', '휴지', '충분', '출발', '그릇', '트럭', '튤립', '풀', '춤', '콩', '키', '물', '큰길', '틈', '추위', '푸른', '천천히', '한글', '하늘', '마음', '이름', '오늘'] },
      { id: 'shift', keys: 'ㄲㄸㅃㅆㅉㅒㅖ', words: ['꽃', '떡', '빵', '쌀', '짝', '얘기', '예의', '깨끗이', '따뜻한', '빨리', '쓰다', '찌개', '꿈', '땅', '뿌리', '씨앗', '짜장', '계절', '시계', '지혜', '꼬리', '또', '뻐꾸기', '싸움', '쪽지', '예쁘다', '있다', '갔다', '묶다', '깎다', '떠나다', '뽑다', '썰매', '찜', '차례', '세계', '얘들아', '깜짝', '똑똑', '빨래', '쓸쓸', '쭉'] },
      { id: 'all', keys: '', words: [] }
    ],
    en: [
      { id: 'home', keys: 'asdfghjkl;', words: ['add', 'ask', 'all', 'dad', 'sad', 'fall', 'glass', 'had', 'has', 'hall', 'flask', 'salad', 'lad', 'gas', 'half', 'shall', 'dash', 'flash', 'lash', 'hash', 'alas', 'slash', 'glad', 'flag', 'lag', 'sag', 'fad', 'as', 'a', 'gall', 'saga', 'ash', 'jag'] },
      { id: 'top', keys: 'qwertyuiop', words: ['the', 'quiet', 'write', 'type', 'power', 'your', 'their', 'people', 'water', 'tree', 'house', 'work', 'world', 'door', 'lake', 'week', 'little', 'great', 'story', 'sugar', 'yellow', 'purple', 'paper', 'guitar', 'upper', 'equal', 'try', 'daily', 'light', 'right', 'after', 'today', 'take', 'first', 'quite', 'query', 'ripe', 'tower', 'jelly', 'pillow', 'reply', 'quit', 'yes', 'with'] },
      { id: 'bottom', keys: 'zxcvbnm,.', words: ['zebra', 'box', 'mix', 'never', 'cabin', 'number', 'maybe', 'voice', 'move', 'become', 'came', 'next', 'been', 'name', 'many', 'moon', 'bank', 'vast', 'exam', 'zoom', 'calm', 'bench', 'exact', 'music', 'comb', 'van', 'mine', 'bacon', 'civic', 'cozy', 'maze', 'nervous', 'vacuum', 'combine', 'between', 'now,', 'done.', 'no,', 'ok.', 'climb', 'banana', 'common'] },
      { id: 'shift', keys: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ?!:"', words: ['Monday', 'Tuesday', 'Friday', 'Sunday', 'April', 'June', 'March', 'October', 'Why?', 'Yes!', 'No.', 'Wait:', '"Okay"', 'Dear', 'Thanks!', 'I', 'We', 'Good?', 'Hello,', 'Really?', 'Zero', 'Quiet!', 'Next:', 'Karen', 'Paris', 'Rome', 'Venice', 'Excuse', 'Bye!', 'How?', 'Just', 'Until', 'Who?', '"Maybe"', 'Late?', 'Go!', 'Xavier', 'Yours,'] },
      { id: 'all', keys: '', words: [] }
    ]
  };

  function toks(text) { return H.keyStream(text); }
  function build(lang) {
    var allowed = [' '], out = [];
    DEF[lang].forEach(function (d, i) {
      var fresh = Array.from(d.keys);
      fresh.forEach(function (k) { if (allowed.indexOf(k) < 0) allowed.push(k); });
      var set = allowed.slice();
      var words = d.words.filter(function (w) { return toks(w).every(function (k) { return set.indexOf(k) >= 0; }); });
      out.push({ id: d.id, n: i + 1, keys: fresh, allowed: d.id === 'all' ? null : set, words: words });
    });
    return out;
  }
  var L = { ko: build('ko'), en: build('en') };

  /* 키 익히기 줄: 새 키를 두세 개씩 묶어 되풀이한다(예: 'ㅁㅁ ㄴㄴ ㅁㄴ') */
  function drills(keys, rand, n) {
    var out = [], P = TJ.pick, ks = keys.filter(function (k) { return ',.":?!'.indexOf(k) < 0; });
    if (!ks.length) return out;
    var order = P.shuffle(ks, rand);
    for (var i = 0; out.length < n; i++) {
      var a = order[i % order.length], b = order[(i + 1 + Math.floor(rand() * (order.length - 1))) % order.length];
      out.push(i % 3 === 0 ? a + a + a : i % 3 === 1 ? a + b + a : a + a + b + b);
    }
    return out;
  }
  /* 한 판의 연습 글. texts = TJ_TEXT[lang] (마지막 '전체' 단계에서 문장을 쓴다) */
  function text(lang, idx, rand, texts) {
    var les = L[lang][idx], P = TJ.pick;
    if (!les) throw new Error('없는 단계예요');
    if (les.id === 'all') {
      var list = lang === 'ko' ? [].concat(texts.sentences.daily, texts.sentences.season) : texts.sentences;
      return P.sentences(list, 90, rand).join(' ');
    }
    if (les.id === 'shift' && lang === 'en') return P.shuffle(les.words, rand).slice(0, 16).join(' ');
    var d = drills(les.keys, rand, les.id === 'shift' ? 4 : 6), w = P.shuffle(les.words, rand).slice(0, 12);
    return d.concat(w).join(' ');
  }
  /* 통과 기준: 정확도 95% 이상. 반올림하기 전 값으로 따진다(94.87%는 화면에 95%로 보여도 통과가 아니다).
     ok = 맞게 누른 키, typed = 누른 키. 나눗셈 없이 정수로 견준다 */
  var PASS_ACC = 95;
  function pass(ok, typed) { return typed > 0 && ok * 100 >= PASS_ACC * typed; }

  var out = { list: L, text: text, drills: drills, PASS_ACC: PASS_ACC, pass: pass };
  if (typeof module !== 'undefined' && module.exports) module.exports = out;
  else TJ.lessons = out;
})(typeof globalThis !== 'undefined' ? globalThis : this);
