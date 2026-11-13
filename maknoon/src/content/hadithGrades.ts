/** A grading as stored: status as written (`s`), its Arabic where the source gives one (`a`), the grader (`by`). */
export type Grade = { s: string; a: string; by: string };

// ── gradings, for display: the label in Arabic where its meaning is plain; otherwise as written

const plain = (s: string) => s.toLowerCase().replace(/[’`ʿ]/g, "'").replace(/\s+/g, ' ').trim();
const LABELS: [RegExp, string][] = [
  [/^muttafaqun 'alayh/, 'متفق عليه'],
  [/^sa?h[iī]h li ghairih/, 'صحيح لغيره'],
  [/^hasan li ghairih/, 'حسن لغيره'],
  [/^hasan sah[iī]h/, 'حسن صحيح'],
  [/^(sanad |isn[aā]d )?da'?[iī]f jiddan/, 'ضعيف جدًّا'],
  [/^(isn[aā]d )?sah[iī]h( isn[aā]d| in chain)/, 'إسناده صحيح'],
  [/^isn[aā]d sah[iī]h/, 'إسناده صحيح'],
  [/^(isn[aā]d )?hasan( isn[aā]d| in chain)/, 'إسناده حسن'],
  [/^isn[aā]d hasan/, 'إسناده حسن'],
  [/^(isn[aā]d )?da'?[iī]f( isn[aā]d| in chain)/, 'إسناده ضعيف'],
  [/^isn[aā]d da'?[iī]f/, 'إسناده ضعيف'],
  [/^sah[iī]h mauquf/, 'صحيح موقوف'],
  [/^sah[iī]h maqtu/, 'صحيح مقطوع'],
  [/^da'?[iī]f mursal/, 'ضعيف مرسل'],
  [/^maud?u/, 'موضوع'],
  [/^munkar/, 'منكر'],
  [/^shadh/, 'شاذ'],
  [/^sah[iī]h/, 'صحيح'],
  [/^hasan/, 'حسن'],
  [/^da'? ?[iī]f|^daif/, 'ضعيف'],
];
export function gradeLabel(g: Grade): string {
  if (g.a.trim()) return g.a.trim();
  const s = plain(g.s.replace(/\(.*$/, ''));
  for (const [re, ar] of LABELS) if (re.test(s)) return ar;
  return g.s;
}
export type GradeTone = 'sahih' | 'hasan' | 'daif' | 'other';
export function gradeTone(g: Grade): GradeTone {
  const l = gradeLabel(g);
  if (/موضوع|منكر|ضعيف|شاذ/.test(l)) return 'daif';
  if (/حسن/.test(l) && !/صحيح/.test(l)) return 'hasan';
  if (/صحيح|متفق/.test(l)) return 'sahih';
  return 'other';
}
const GRADERS: Record<string, string> = { 'al-albani': 'الألباني', darussalam: 'دار السلام', "zubair `aliza'i": 'زبير علي زئي', 'زبیر علی زئی': 'زبير علي زئي' };
/** The grader, named in Arabic where known; a grader the source leaves out reads «غير مسمّى». */
export function graderName(g: Grade): string {
  const k = g.by.trim().toLowerCase();
  if (!k) return 'غير مسمّى';
  // a few source cells carry the verdict and the grader together, «صَحِيح(الألباني»
  const inner = g.by.match(/\(([^)]+)$/)?.[1];
  return GRADERS[k] ?? (inner ? GRADERS[inner.toLowerCase()] ?? inner : g.by.trim());
}

