/** Search-side Arabic normalization (plan §7.3). Display text is never altered. */
export function normalize(s: string) {
  return s
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '') // tashkeel, Quranic marks, tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^ء-ي0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Particles and question words that carry no topic.
const STOP = new Set(
  'ما ماذا من هل كيف لماذا متى اين اي في على عن الى الي من ان او و ثم قد لا لم لن هو هي هم انا انت نحن هذا هذه ذلك التي الذي الذين كان يكون مع عند بعد قبل كل بين حتى اذا لي لنا عليه عليها فيه فيها به بها له لها الاحاديث احاديث حديث الايات ايات ايه اية القران الاسلام ورد يجوز يجب حكم'.split(' '),
);

/** Topic tokens of a question, with the common clitics (و ف ب ك ل ال) stripped. */
export function tokens(q: string) {
  return normalize(q)
    .split(' ')
    .map((w) => w.replace(/^(و|ف)(?=..)/, '').replace(/^(بال|كال|فال|وال|لل|ال)(?=..)/, '').replace(/^(ب|ك|ل)(?=...)/, ''))
    .filter((w) => w.length >= 2 && !STOP.has(w));
}

/** Does normalized text contain the token as a word or word-stem (prefix/suffix tolerant)? */
export function hasToken(normText: string, token: string) {
  return normText.includes(token);
}
