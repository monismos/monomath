import type { Solver } from '../labs/types';
import type { Step } from '../scene/spec';

export interface Fraction {
  n: number;
  d: number;
}
export type FractionKind = 'add' | 'subtract' | 'multiply' | 'divide' | 'simplify' | 'mixed';
export interface FractionProblem {
  kind: FractionKind;
  a: Fraction;
  b?: Fraction;
  raw: string;
}
export interface FractionSolution {
  answer: string;
  result: Fraction;
  steps: Step[];
  method: string;
  visualCuts: number;
  visualSupported: boolean;
}
export const MAX_INPUT_COMPONENT = 10000;
export const MAX_VISUAL_CUTS = 24;
export const MAX_VISUAL_WHOLES = 4;
const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
function gcdBig(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}
export function gcd(a: number, b: number): number {
  return Number(gcdBig(BigInt(a), BigInt(b)));
}
export function lcm(a: number, b: number): number {
  return Math.abs((a / gcd(a, b)) * b);
}
function fromBig(n: bigint, d: bigint): Fraction {
  if (!d) throw new Error('A fraction needs a nonzero denominator.');
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const factor = gcdBig(n, d);
  n /= factor;
  d /= factor;
  if (n > maxSafe || n < -maxSafe || d > maxSafe)
    throw new Error('These numbers exceed the exact workspace limit.');
  return { n: Number(n), d: Number(d) };
}
export function normalizeFraction(value: Fraction): Fraction {
  if (!Number.isSafeInteger(value.n) || !Number.isSafeInteger(value.d))
    throw new Error('Use whole-number numerators and denominators.');
  return fromBig(BigInt(value.n), BigInt(value.d));
}
export function equalFractions(a: Fraction, b: Fraction): boolean {
  try {
    const left = normalizeFraction(a);
    const right = normalizeFraction(b);
    return left.n === right.n && left.d === right.d;
  } catch {
    return false;
  }
}
export function fractionText(value: Fraction): string {
  const f = normalizeFraction(value);
  return f.d === 1 ? String(f.n) : `${f.n}/${f.d}`;
}
export function mixedText(value: Fraction): string {
  const f = normalizeFraction(value);
  const whole = Math.floor(Math.abs(f.n) / f.d);
  const remainder = Math.abs(f.n) % f.d;
  if (!whole || !remainder) return fractionText(f);
  return `${f.n < 0 ? '-' : ''}${whole} ${remainder}/${f.d}`;
}
export function fractionLatex(value: Fraction): string {
  return value.d === 1
    ? String(value.n)
    : `${value.n < 0 ? '-' : ''}\\frac{${Math.abs(value.n)}}{${value.d}}`;
}
function productLatex(a: Fraction, b: Fraction): string {
  const n = BigInt(a.n) * BigInt(b.n),
    d = BigInt(a.d) * BigInt(b.d);
  return `${n < 0n ? '-' : ''}\\frac{${n < 0n ? -n : n}}{${d}}`;
}
const literal = '[+-]?\\d+(?:\\s+\\d+\\s*/\\s*\\d+|\\s*/\\s*[+-]?\\d+)?';
function parseLiteral(input: string): Fraction | null {
  const text = input.trim();
  const mixed = /^([+-]?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(text);
  if (mixed) {
    const [, sign, whole, top, bottom] = mixed;
    const w = Number(whole),
      n = Number(top),
      d = Number(bottom);
    if (
      d === 0 ||
      n >= d ||
      [w, n, d].some((v) => !Number.isSafeInteger(v) || v > MAX_INPUT_COMPONENT)
    )
      return null;
    return { n: (sign === '-' ? -1 : 1) * (w * d + n), d };
  }
  const fraction = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/.exec(text);
  if (fraction) {
    let n = Number(fraction[1]),
      d = Number(fraction[2]);
    if (!d || [n, d].some((v) => !Number.isSafeInteger(v) || Math.abs(v) > MAX_INPUT_COMPONENT))
      return null;
    if (d < 0) {
      n = -n;
      d = -d;
    }
    return { n, d };
  }
  if (/^[+-]?\d+$/.test(text)) {
    const n = Number(text);
    return Number.isSafeInteger(n) && Math.abs(n) <= MAX_INPUT_COMPONENT ? { n, d: 1 } : null;
  }
  return null;
}
export type FractionParseResult =
  { ok: true; problem: FractionProblem } | { ok: false; reason: string };
export function parseFractionInput(input: string): FractionParseResult {
  if (!input.trim() || input.length > 160)
    return { ok: false, reason: 'Enter a short fraction problem, such as 3/4 + 1/6.' };
  const text = input.replace(/[−–]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, ':').trim();
  const command = /^(simplify|reduce|mixed|improper|equivalent)\s+(.+)$/i.exec(text);
  if (command) {
    const a = parseLiteral(command[2]);
    if (a)
      return {
        ok: true,
        problem: { kind: /mixed|improper/i.test(command[1]) ? 'mixed' : 'simplify', a, raw: input },
      };
  }
  const binary = new RegExp(`^(${literal})\\s*([+*:-])\\s*(${literal})$`).exec(text);
  if (binary) {
    const a = parseLiteral(binary[1]),
      b = parseLiteral(binary[3]);
    const kind = ({ '+': 'add', '-': 'subtract', '*': 'multiply', ':': 'divide' } as const)[
      binary[2] as '+' | '-' | '*' | ':'
    ];
    if (a && b) {
      if (kind === 'divide' && b.n === 0)
        return {
          ok: false,
          reason: 'Division by zero has no defined result. Try a nonzero measuring part.',
        };
      return { ok: true, problem: { kind, a, b, raw: input } };
    }
  }
  const a = parseLiteral(text);
  if (a)
    return {
      ok: true,
      problem: {
        kind: Math.abs(a.n) >= a.d || /\d\s+\d/.test(text) ? 'mixed' : 'simplify',
        a,
        raw: input,
      },
    };
  return {
    ok: false,
    reason:
      'Use integers or fractions up to 10,000, with +, −, × or ÷. Denominators must be nonzero; write division with ÷.',
  };
}
export function solveValue(problem: FractionProblem): Fraction {
  const a = normalizeFraction(problem.a);
  if (problem.kind === 'simplify' || problem.kind === 'mixed') return a;
  if (!problem.b) throw new Error('This operation needs two fractions.');
  const b = normalizeFraction(problem.b);
  const n = BigInt(a.n),
    d = BigInt(a.d),
    m = BigInt(b.n),
    e = BigInt(b.d);
  if (problem.kind === 'add') return fromBig(n * e + m * d, d * e);
  if (problem.kind === 'subtract') return fromBig(n * e - m * d, d * e);
  if (problem.kind === 'multiply') return fromBig(n * m, d * e);
  if (!m) throw new Error('Division by zero has no defined result.');
  return fromBig(n * e, d * m);
}
export function visualCutCount(problem: FractionProblem, method?: string): number {
  if (problem.kind === 'add' || problem.kind === 'subtract')
    return method === 'product' ? problem.a.d * problem.b!.d : lcm(problem.a.d, problem.b!.d);
  if (problem.kind === 'multiply') return problem.a.d * problem.b!.d;
  if (problem.kind === 'divide') return lcm(problem.a.d, problem.b!.d);
  return problem.a.d;
}
export function isEquivalentAnswer(answer: unknown, expected: Fraction): boolean {
  if (typeof answer !== 'string' && typeof answer !== 'number') return false;
  const text = String(answer).replace(/−/g, '-');
  const f = parseLiteral(text);
  return !!f && equalFractions(f, expected);
}
const bindings = [
  { token: 'left', entities: ['left-piece'], color: 'whole' },
  { token: 'right', entities: ['right-piece'], color: 'part' },
  { token: 'result', entities: ['result-piece'], color: 'result' },
];
function token(id: string, tex: string): string {
  return `\\htmlClass{tk-${id}}{${tex}}`;
}
function expression(p: FractionProblem): string {
  const a = token('left', fractionLatex(p.a));
  if (!p.b) return a;
  const operator = {
    add: '+',
    subtract: '-',
    multiply: '\\times',
    divide: '\\div',
    simplify: '',
    mixed: '',
  }[p.kind];
  return `${a}${operator}${token('right', fractionLatex(p.b))}`;
}
function step(
  p: FractionProblem,
  result: Fraction,
  id: string,
  title: string,
  say: Step['say'],
  predict?: Step['predict'],
): Step {
  return {
    id: `${p.kind}-${id}`,
    title,
    latexBefore: expression(p),
    latexAfter: `${expression(p)}=${token('result', id === 'result' ? fractionLatex(result) : '?')}`,
    say,
    ops: [
      {
        t: 'pulse',
        ids: [id === 'result' ? 'result-piece' : 'left-piece', ...(p.b ? ['right-piece'] : [])],
      },
    ],
    tethers: p.b ? bindings : bindings.filter((binding) => binding.token !== 'right'),
    predict,
    gaze: [id === 'result' ? 'result-piece' : 'left-piece'],
    aria: `${title}. ${say.standard}`,
  };
}
function prediction(
  prompt: string,
  value: Fraction,
  hints: [string, string, string],
): Step['predict'] {
  return { kind: 'number', prompt, check: (answer) => isEquivalentAnswer(answer, value), hints };
}
const methodList: Record<FractionKind, { id: string; name: string }[]> = {
  add: [
    { id: 'common', name: 'Smallest common cuts' },
    { id: 'product', name: 'Product denominator' },
  ],
  subtract: [
    { id: 'common', name: 'Smallest common cuts' },
    { id: 'product', name: 'Product denominator' },
  ],
  multiply: [
    { id: 'area', name: 'Overlap area' },
    { id: 'cancel', name: 'Cancel factors first' },
  ],
  divide: [
    { id: 'measure', name: 'How many fit?' },
    { id: 'reciprocal', name: 'Multiply by the reciprocal' },
  ],
  mixed: [
    { id: 'group', name: 'Group complete wholes' },
    { id: 'quotient', name: 'Quotient and remainder' },
  ],
  simplify: [
    { id: 'gcd', name: 'Greatest common divisor' },
    { id: 'groups', name: 'Group equal parts' },
  ],
};
export function solveFractions(p: FractionProblem, method?: string): FractionSolution {
  const choices = methodList[p.kind];
  const selected = method ?? choices[0].id;
  if (!choices.some((m) => m.id === selected))
    throw new Error('Choose one of this problem’s supported methods.');
  const result = solveValue(p),
    a = p.a,
    b = p.b;
  const steps: Step[] = [];
  steps.push(
    step(p, result, 'read', 'Read the quantity and the unit', {
      quick: b
        ? `Start with ${fractionText(a)} and ${fractionText(b)}.`
        : `Start with ${a.n}/${a.d}.`,
      standard: b
        ? 'The denominator names equal pieces of one fixed whole. Read both quantities and the operation before changing any cuts.'
        : 'The numerator counts pieces and the denominator names the equal cuts in one whole. Keep that unit size fixed as the representation changes.',
      deep: 'A fraction is an exact ratio, including a sign when needed. Different cuts can describe the same quantity; changing notation must preserve that value.',
    }),
  );
  if (p.kind === 'add' || p.kind === 'subtract') {
    const cut = selected === 'product' ? a.d * b!.d : lcm(a.d, b!.d),
      left = a.n * (cut / a.d),
      right = b!.n * (cut / b!.d);
    const removing = p.kind === 'subtract';
    steps.push(
      step(
        p,
        result,
        'cuts',
        selected === 'product' ? 'Cut by the product' : 'Find common-size pieces',
        {
          quick: `Use ${cut} equal parts per whole.`,
          standard: `${cut} is divisible by both ${a.d} and ${b!.d}. Recut both wholes into equal ${cut}ths before ${removing ? 'removing' : 'combining'} pieces.`,
          deep:
            selected === 'product'
              ? `Multiplying the denominators always gives a common cut count. It may create extra cuts, which we can group again after counting.`
              : `The least common multiple gives the fewest equal cuts that work for both original denominators. The whole stays the same size.`,
        },
        prediction('How many equal cuts will this method use?', { n: cut, d: 1 }, [
          'Choose a multiple of both denominators.',
          'Each old piece must split into whole new pieces.',
          `This method uses ${cut} cuts.`,
        ]),
      ),
    );
    steps.push(
      step(p, result, 'rewrite', 'Keep the amount; change the cuts', {
        quick: `${a.n}/${a.d} becomes ${left}/${cut}; ${b!.n}/${b!.d} becomes ${right}/${cut}.`,
        standard: `Each numerator changes by the same factor as its denominator. We keep both quantities while making their piece sizes match.`,
        deep: `Scaling the numerator and denominator by the same nonzero integer preserves their ratio. Signed quantities retain their direction while their unit pieces are recut.`,
      }),
    );
    steps.push(
      step(p, result, 'combine', removing ? 'Remove matching pieces' : 'Combine matching pieces', {
        quick: `${left} ${removing ? '-' : '+'} ${right} = ${removing ? left - right : left + right} equal parts.`,
        standard: `Count the signed numerator contributions; keep the common denominator ${cut}. The denominator names the piece size, so it is not added or subtracted.`,
        deep: removing
          ? `Subtraction measures a signed difference. If more is removed than was present, the result is negative; it is not clamped to an empty positive whole.`
          : `Addition combines amounts measured with the same unit. When the count exceeds ${cut}, each group of ${cut} parts fills another whole.`,
      }),
    );
  } else if (p.kind === 'multiply') {
    const count = a.d * b!.d,
      overlap = Math.abs(a.n * b!.n);
    const factorA = gcd(a.n, b!.d),
      factorB = gcd(b!.n, a.d);
    steps.push(
      step(
        p,
        result,
        'model',
        selected === 'area' ? 'Build an overlap grid' : 'Cancel shared factors',
        {
          quick:
            selected === 'area'
              ? `A ${a.d} by ${b!.d} grid has ${count} equal cells.`
              : `Cancel factors ${factorA} and ${factorB} across the product.`,
          standard:
            selected === 'area'
              ? `One fraction selects columns and the other selects rows. Their overlap is the product area; improper factors continue across unit squares.`
              : `A numerator may cancel a common factor in the opposite denominator because the entire expression is a product. This rule does not apply across addition.`,
          deep:
            selected === 'area'
              ? `Splitting both axes gives cells with area 1/(${a.d}×${b!.d}). The magnitudes select ${Math.abs(a.n)} column units and ${Math.abs(b!.n)} row units; signs are carried separately.`
              : `Dividing a numerator and a denominator of the whole product by the same factor preserves the value and reduces the multiplication sizes.`,
        },
        prediction('What is the product, as a fraction?', result, [
          'Find the overlap of the two selected directions.',
          'Multiply the numerators and multiply the denominators.',
          `The exact product is ${fractionText(result)}.`,
        ]),
      ),
    );
    steps.push(
      step(p, result, 'count', 'Count the overlap', {
        quick: `${overlap} cells out of ${count}, with the product’s sign.`,
        standard: `Multiply the top counts and the bottom counts. Two matching signs give a positive result; opposite signs give a negative result.`,
        deep: `The area describes magnitude. The sign follows signed multiplication, so a negative product is labelled rather than pretending area itself has negative size.`,
      }),
    );
  } else if (p.kind === 'divide') {
    const cut = lcm(a.d, b!.d);
    const dividend = a.n * (cut / a.d),
      divisor = b!.n * (cut / b!.d);
    steps.push(
      step(
        p,
        result,
        'measure',
        selected === 'measure' ? 'Choose a measuring unit' : 'Turn division into multiplication',
        {
          quick:
            selected === 'measure'
              ? `Ask how many ${fractionText(b!)} units fit in ${fractionText(a)}.`
              : `Flip the divisor, then multiply.`,
          standard:
            selected === 'measure'
              ? `In common cuts, the dividend has ${dividend} parts and each measuring unit has ${divisor}. The quotient is their signed ratio, including partial fits.`
              : `The reciprocal of ${fractionText(b!)} is ${fractionText({ n: b!.d, d: b!.n })}. Multiplying by it asks the same “how many fit?” question.`,
          deep:
            selected === 'measure'
              ? `A quotient counts units of the divisor, not units of the original whole. If less than one divisor fits, the answer is a fraction of a measuring unit.`
              : `For a nonzero divisor b, multiplying by 1/b reverses multiplication by b. Division by zero cannot define a consistent measuring unit.`,
        },
        prediction('How many measuring units fit? Fractions are allowed.', result, [
          'Compare the dividend to one measuring bar.',
          'Use equal cuts, or multiply by the reciprocal.',
          `There are ${fractionText(result)} measuring units.`,
        ]),
      ),
    );
    steps.push(
      step(p, result, 'ratio', 'Count complete and partial fits', {
        quick: `${dividend} ÷ ${divisor} = ${fractionText(result)}.`,
        standard: `Count full measuring units and any remaining fraction of a unit. Keep the sign explicit when the divisor or dividend is negative.`,
        deep: `The result satisfies divisor × quotient = dividend. This identity also checks partial quotients such as 5/6, which integer fit counting would miss.`,
      }),
    );
  } else if (p.kind === 'mixed') {
    const whole = Math.floor(Math.abs(a.n) / a.d),
      remainder = Math.abs(a.n) % a.d;
    const fromMixed = /\d\s+\d\s*\//.test(p.raw);
    steps.push(
      step(
        p,
        result,
        'wholes',
        selected === 'group' ? 'Fill complete unit wholes' : 'Use quotient and remainder',
        {
          quick: fromMixed
            ? `Combine the whole parts and the remaining fraction.`
            : `${Math.abs(a.n)} parts fill ${whole} wholes, with ${remainder} parts left.`,
          standard:
            selected === 'group'
              ? `Each complete whole holds ${a.d} equal parts. Group the pieces without changing that whole’s size, and label any remaining parts.`
              : `Divide the numerator’s magnitude by ${a.d}. The quotient counts complete wholes; the remainder counts the leftover equal parts.`,
          deep: `${Math.abs(a.n)} = ${whole} × ${a.d} + ${remainder}. A leading minus applies to the whole mixed number, not just its integer component.`,
        },
        prediction('How many complete wholes can these pieces fill?', { n: whole, d: 1 }, [
          'A whole needs one full denominator of pieces.',
          `Group the magnitude of the numerator into sets of ${a.d}.`,
          `The pieces fill ${whole} complete wholes.`,
        ]),
      ),
    );
    steps.push(
      step(p, result, 'notation', 'Write both representations', {
        quick: `${fractionText(result)} is ${mixedText(result)}.`,
        standard: `Improper and mixed notation describe the same amount. Complete units keep their boundaries; the remaining fraction keeps an equal cut size.`,
        deep: `Whole-number results need no trailing fraction, and proper fractions need no leading zero whole. The representation changes while the exact rational value stays fixed.`,
      }),
    );
  } else {
    const factor = gcd(a.n, a.d);
    if (selected === 'gcd') {
      let left = Math.max(Math.abs(a.n), a.d),
        right = Math.min(Math.abs(a.n), a.d);
      const divisions: string[] = [];
      while (right) {
        const remainder = left % right;
        divisions.push(`${left} = ${Math.floor(left / right)} × ${right} + ${remainder}`);
        left = right;
        right = remainder;
      }
      steps.push(
        step(p, result, 'euclid', 'Find the factor by remainders', {
          quick: `The last nonzero remainder gives ${factor}.`,
          standard: divisions.length
            ? divisions.join('; ')
            : `Zero and ${a.d} share the factor ${a.d}.`,
          deep: 'Euclid’s algorithm replaces two counts with the smaller count and their remainder. Common factors do not change, so the last nonzero count is their greatest common divisor.',
        }),
      );
    }
    steps.push(
      step(
        p,
        result,
        'factor',
        selected === 'gcd' ? 'Find the greatest shared factor' : 'Group equal-sized parts',
        {
          quick: `Group by ${factor}; divide both counts by ${factor}.`,
          standard:
            selected === 'gcd'
              ? `${factor} is the greatest positive factor shared by ${Math.abs(a.n)} and ${a.d}. Divide numerator and denominator by that factor.`
              : `Bundle ${factor} old cuts into each new equal part. Both the selected count and the whole’s cut count shrink by the same factor.`,
          deep:
            factor === 1
              ? `No integer larger than 1 divides both counts, so this fraction is already in lowest terms.`
              : `Grouping changes the size of a part and the number of parts together. The selected area remains unchanged; only its description becomes simpler.`,
        },
        prediction('What is the fraction in lowest terms?', result, [
          'Look for a factor shared by both counts.',
          'Divide the top and bottom by the same greatest factor.',
          `The reduced value is ${fractionText(result)}.`,
        ]),
      ),
    );
    steps.push(
      step(p, result, 'reduce', 'Keep the area unchanged', {
        quick: `${a.n}/${a.d} becomes ${fractionText(result)}.`,
        standard: `The reduced numerator and denominator have no common factor greater than 1. Zero is written as 0 and whole results use integer notation.`,
        deep: `Lowest terms provide one canonical description of an exact rational value. Equivalent fractions remain equal even when their cut counts differ.`,
      }),
    );
  }
  steps.push(
    step(p, result, 'result', 'Read and check the result', {
      quick: `The exact result is ${p.kind === 'mixed' ? mixedText(result) : fractionText(result)}.`,
      standard: `The shapes, fraction and Python Fraction computation describe the same value: ${fractionText(result)}. You can change layers without changing the amount.`,
      deep: `The canonical denominator is positive and the numerator and denominator share no factor above 1. A different valid representation must preserve this exact rational value.`,
    }),
  );
  for (const authored of steps) {
    const suffix = authored.id.slice(p.kind.length + 1);
    if ((p.kind === 'add' || p.kind === 'subtract') && b) {
      const cut = selected === 'product' ? a.d * b.d : lcm(a.d, b.d),
        left = a.n * (cut / a.d),
        right = b.n * (cut / b.d),
        op = p.kind === 'add' ? '+' : '-';
      if (suffix === 'cuts')
        authored.latexAfter = `${selected === 'product' ? '' : String.raw`\operatorname{lcm}`}(${token('left', String(a.d))}${selected === 'product' ? String.raw`\times` : ','}${token('right', String(b.d))})=${token('result', String(cut))}`;
      if (suffix === 'rewrite')
        authored.latexAfter = `${token('left', fractionLatex({ n: left, d: cut }))}${op}${token('right', fractionLatex({ n: right, d: cut }))}=${token('result', '?')}`;
      if (suffix === 'combine')
        authored.latexAfter = String.raw`\frac{${token('left', String(left))}${op}${token('right', String(right))}}{${cut}}=${token('result', fractionLatex({ n: p.kind === 'add' ? left + right : left - right, d: cut }))}`;
    }
    if (p.kind === 'multiply' && b && (suffix === 'model' || suffix === 'count'))
      authored.latexAfter = String.raw`\frac{${token('left', String(a.n))}\times${token('right', String(b.n))}}{${a.d}\times${b.d}}=${token('result', suffix === 'count' ? productLatex(a, b) : '?')}`;
    if (p.kind === 'divide' && b && suffix !== 'read' && suffix !== 'result')
      authored.latexAfter = `${token('left', fractionLatex(a))}\\times${token('right', fractionLatex(normalizeFraction({ n: b.d, d: b.n })))}=${token('result', suffix === 'ratio' ? fractionLatex(result) : '?')}`;
    if (p.kind === 'mixed' && suffix !== 'read' && suffix !== 'result') {
      const magnitude = Math.abs(a.n),
        whole = Math.floor(magnitude / a.d),
        remainder = magnitude % a.d;
      const parts = `${whole}${remainder ? `+${fractionLatex({ n: remainder, d: a.d })}` : ''}`;
      authored.latexAfter = `${token('left', fractionLatex(a))}=${token('result', a.n < 0 ? `-(${parts})` : parts)}`;
    }
    if (p.kind === 'simplify') {
      const factor = gcd(a.n, a.d);
      if (suffix === 'euclid')
        authored.latexAfter = `\\gcd(${token('left', String(Math.abs(a.n)))},${a.d})=${token('result', String(factor))}`;
      if (suffix === 'factor' || suffix === 'reduce')
        authored.latexAfter = `${token('left', fractionLatex(a))}\\xrightarrow{\\div ${factor}}${token('result', fractionLatex(result))}`;
    }
  }
  const visualCuts = visualCutCount(p, selected);
  const operandsSupported = [a, b].every(
    (value) =>
      !value ||
      (value.d <= MAX_VISUAL_CUTS && Math.ceil(Math.abs(value.n) / value.d) <= MAX_VISUAL_WHOLES),
  );
  const resultSupported =
    p.kind === 'divide'
      ? Math.ceil(Math.abs(result.n) / result.d) <= MAX_VISUAL_CUTS
      : result.d <= MAX_VISUAL_CUTS &&
        Math.ceil(Math.abs(result.n) / result.d) <= MAX_VISUAL_WHOLES;
  const visualSupported = visualCuts <= MAX_VISUAL_CUTS && operandsSupported && resultSupported;
  return {
    answer:
      p.kind === 'mixed' && !/^improper\s/i.test(p.raw) ? mixedText(result) : fractionText(result),
    result,
    steps,
    method: selected,
    visualCuts,
    visualSupported,
  };
}
export const fractionsSolver: Solver<FractionProblem, FractionSolution> = {
  id: 'fractions',
  domain: 'math',
  parse: (input) => {
    const result = parseFractionInput(input);
    return result.ok ? result.problem : null;
  },
  methods: (problem) => methodList[problem.kind],
  solve: solveFractions,
};
