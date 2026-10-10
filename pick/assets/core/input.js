// 사람이 친 숫자 읽기 (DOM을 모르는 파일)

/**
 * 정수 하나를 읽는다. 전각 숫자(１２３), 자릿수 쉼표(1,000 · 1，000), 띄어쓰기, 여러 가지 빼기표(- − – －)를 받아 준다.
 * @param {string} text
 * @param {number} [maxDigits] 자릿수 한도(기본 15: 이 안에서는 어떤 범위든 계산이 정확하다)
 * @returns {{ok:true, value:number} | {ok:false, reason:'empty'|'not-integer'|'too-long'}}
 */
export function readInteger(text, maxDigits = 15) {
  let s = String(text == null ? '' : text).normalize('NFKC'); // 전각 숫자·기호를 반각으로
  s = s.replace(/[\s,_\u3000]/g, '').replace(/^[\u2212\u2013\u2012\u2010\u2011]/, '-');
  if (s === '') return { ok: false, reason: 'empty' };
  if (!/^[+-]?\d+$/.test(s)) return { ok: false, reason: 'not-integer' };
  const neg = s[0] === '-';
  const digits = s.replace(/^[+-]/, '').replace(/^0+(?=\d)/, '');
  if (digits.length > maxDigits) return { ok: false, reason: 'too-long' };
  const value = Number(digits);
  return { ok: true, value: neg && value !== 0 ? -value : value };
}
