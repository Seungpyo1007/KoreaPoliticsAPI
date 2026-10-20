// Person ids from the Revised Romanization of Korean, applied syllable by syllable.
// Names keep no sound changes (rule 4.2 of the official romanization), so 한복남 is
// han-boknam, not han-bongnam, and the family name 이 is i, not lee.

// deno-fmt-ignore
const INITIAL = [
  "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p",
  "h"
];
// deno-fmt-ignore
const MEDIAL = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we",
  "wi", "yu", "eu", "ui", "i"
];
// deno-fmt-ignore
const FINAL = [
  "", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p",
  "t", "t", "ng", "t", "t", "k", "t", "p", "t"
];

export function romanize(hangul: string): string {
  let out = "";
  for (const ch of hangul) {
    const code = ch.codePointAt(0)! - 0xac00;
    if (code < 0 || code > 11171) throw new Error(`not a Hangul syllable: ${ch}`);
    const i = Math.floor(code / 588);
    const m = Math.floor((code % 588) / 28);
    const f = code % 28;
    // ㄹㄹ is written ll.
    const init = INITIAL[i] === "r" && out.endsWith("l") ? "l" : INITIAL[i];
    out += init + MEDIAL[m] + FINAL[f];
  }
  return out;
}

// The family name is passed separately because 선우진 could be 선우 진 or 선 우진.
export function personId(family: string, given: string, birthYear: number, n = 1): string {
  const id = `${romanize(family)}-${romanize(given)}-${birthYear}`;
  return n > 1 ? `${id}-${n}` : id;
}
