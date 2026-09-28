// "나는 어느 쪽?" 세 가지 질문 → 더 많이 고른 쪽 카드를 표시
(function () {
  var quiz = document.getElementById('quiz');
  if (!quiz) return;
  var result = document.getElementById('result');
  var answers = [null, null, null];
  var names = { rw: '레드윙', dm: '닥터마틴' };
  var cards = { rw: document.getElementById('pick-rw'), dm: document.getElementById('pick-dm') };

  function clearCards() {
    ['rw', 'dm'].forEach(function (k) {
      cards[k].classList.remove('hit');
      cards[k].querySelector('.me').hidden = true;
    });
  }

  function render() {
    if (answers.indexOf(null) !== -1) { result.hidden = true; clearCards(); return; }
    var rw = answers.filter(function (a) { return a === 'rw'; }).length;
    var win = rw >= 2 ? 'rw' : 'dm';
    var n = win === 'rw' ? rw : 3 - rw;
    clearCards();
    cards[win].classList.add('hit');
    cards[win].querySelector('.me').hidden = false;

    result.textContent = '';
    var b = document.createElement('b');
    b.textContent = names[win] + ' 쪽이에요';
    result.appendChild(b);
    result.appendChild(document.createTextNode(' (3개 중 ' + n + '개) 아래 카드에서 모델까지 골라 보세요. '));
    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'reset';
    again.textContent = '다시 고르기';
    again.addEventListener('click', function () {
      answers = [null, null, null];
      quiz.querySelectorAll('button[data-q]').forEach(function (btn) { btn.setAttribute('aria-pressed', 'false'); });
      render();
    });
    result.appendChild(again);
    result.hidden = false;
  }

  quiz.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-q]');
    if (!btn) return;
    var q = Number(btn.getAttribute('data-q'));
    answers[q] = btn.getAttribute('data-v');
    quiz.querySelectorAll('button[data-q="' + q + '"]').forEach(function (other) {
      other.setAttribute('aria-pressed', other === btn ? 'true' : 'false');
    });
    render();
  });
})();
