const MAX_EXPR_LENGTH = 180;
const MAX_ABS_VALUE = 10 ** 15;

export type EvalSuccess = {
  ok: true;
  value: number;
  valueText: string;
  normalizedExpression: string;
};

export type EvalFailure = {
  ok: false;
  error: string;
  normalizedExpression: string;
};

export type EvalResult = EvalSuccess | EvalFailure;

type TokenKind = "number" | "op" | "lparen" | "rparen";

type Token = {
  kind: TokenKind;
  value: string;
};

type Rational = {
  n: bigint;
  d: bigint;
};

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}

function normalizeRational(n: bigint, d: bigint): Rational {
  if (d === 0n) throw new Error("Cannot divide by zero");
  let nn = n;
  let dd = d;
  if (dd < 0n) {
    nn = -nn;
    dd = -dd;
  }
  const g = gcd(nn, dd);
  return { n: nn / g, d: dd / g };
}

function add(a: Rational, b: Rational): Rational {
  return normalizeRational(a.n * b.d + b.n * a.d, a.d * b.d);
}

function sub(a: Rational, b: Rational): Rational {
  return normalizeRational(a.n * b.d - b.n * a.d, a.d * b.d);
}

function mul(a: Rational, b: Rational): Rational {
  return normalizeRational(a.n * b.n, a.d * b.d);
}

function div(a: Rational, b: Rational): Rational {
  if (b.n === 0n) throw new Error("Cannot divide by zero");
  return normalizeRational(a.n * b.d, a.d * b.n);
}

function pow10(exp: number): bigint {
  let r = 1n;
  for (let i = 0; i < exp; i += 1) r *= 10n;
  return r;
}

function decimalStringToRational(raw: string): Rational {
  const source = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(source)) {
    throw new Error("Invalid number format");
  }
  const [intPart = "0", fracPart = ""] = source.split(".");
  const scale = fracPart.length;
  const den = pow10(scale);
  const num = BigInt(intPart) * den + (fracPart ? BigInt(fracPart) : 0n);
  return normalizeRational(num, den);
}

function rationalToText(v: Rational, maxScale = 12): string {
  const sign = v.n < 0n ? "-" : "";
  const absN = v.n < 0n ? -v.n : v.n;

  const scaling = pow10(maxScale);
  const doubled = absN * scaling * 2n;
  const rounded = (doubled + v.d) / (2n * v.d);

  const intPart = rounded / scaling;
  let frac = (rounded % scaling).toString().padStart(maxScale, "0");
  frac = frac.replace(/0+$/, "");

  if (!frac) return `${sign}${intPart.toString()}`;
  return `${sign}${intPart.toString()}.${frac}`;
}

function normalizeInput(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[₹$€£¥]/g, "")
    .replace(/[xX×]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−]/g, "-")
    .replace(/[，]/g, ",")
    .replace(/[．]/g, ".")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")");
}

function sanitizeNumericGroups(expr: string): string {
  if (!expr.includes(",")) return expr;

  let out = "";
  let buf = "";
  const flush = () => {
    if (!buf) return;
    if (/^\d+,\d+$/.test(buf) && !buf.includes(".")) {
      const [a = "", b = ""] = buf.split(",");
      out += b.length <= 2 ? `${a}.${b}` : `${a}${b}`;
    } else {
      out += buf.replace(/,/g, "");
    }
    buf = "";
  };

  for (const ch of expr) {
    if (/\d|\.|,/.test(ch)) {
      buf += ch;
      continue;
    }
    flush();
    out += ch;
  }
  flush();

  return out;
}

export function sanitizeExpression(raw: string): string {
  const normalized = sanitizeNumericGroups(normalizeInput(raw));
  return normalized.length > MAX_EXPR_LENGTH ? normalized.slice(0, MAX_EXPR_LENGTH) : normalized;
}

function tokenize(expr: string): Token[] {
  if (!expr) throw new Error("Enter a calculation");

  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr.charAt(i);

    if (/\d|\./.test(ch)) {
      let num = ch;
      i += 1;
      while (i < expr.length && /\d|\./.test(expr.charAt(i))) {
        num += expr.charAt(i);
        i += 1;
      }
      if (num.startsWith(".")) num = `0${num}`;
      if ((num.match(/\./g) ?? []).length > 1) throw new Error("Invalid decimal number");
      if (!/^\d+(\.\d+)?$/.test(num)) throw new Error("Invalid number format");
      tokens.push({ kind: "number", value: num });
      continue;
    }

    if (/[+\-*/]/.test(ch)) {
      tokens.push({ kind: "op", value: ch });
      i += 1;
      continue;
    }

    if (ch === "(") {
      tokens.push({ kind: "lparen", value: ch });
      i += 1;
      continue;
    }

    if (ch === ")") {
      tokens.push({ kind: "rparen", value: ch });
      i += 1;
      continue;
    }

    throw new Error("Unsupported character");
  }

  return tokens;
}

class Parser {
  private idx = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): Rational {
    const value = this.parseExpression();
    if (this.idx < this.tokens.length) {
      throw new Error("Invalid expression");
    }
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.idx];
  }

  private next(): Token | undefined {
    const t = this.tokens[this.idx];
    this.idx += 1;
    return t;
  }

  private parseExpression(): Rational {
    let left = this.parseTerm();

    while (true) {
      const tk = this.peek();
      if (!tk || tk.kind !== "op" || (tk.value !== "+" && tk.value !== "-")) break;
      this.next();
      const right = this.parseTerm();
      left = tk.value === "+" ? add(left, right) : sub(left, right);
    }

    return left;
  }

  private parseTerm(): Rational {
    let left = this.parseUnary();

    while (true) {
      const tk = this.peek();
      if (!tk || tk.kind !== "op" || (tk.value !== "*" && tk.value !== "/")) break;
      this.next();
      const right = this.parseUnary();
      left = tk.value === "*" ? mul(left, right) : div(left, right);
    }

    return left;
  }

  private parseUnary(): Rational {
    const tk = this.peek();
    if (!tk) throw new Error("Expression is incomplete");

    if (tk.kind === "op" && tk.value === "-") {
      this.next();
      const v = this.parseUnary();
      return normalizeRational(-v.n, v.d);
    }

    if (tk.kind === "op" && tk.value === "+") {
      throw new Error("Invalid operator sequence");
    }

    return this.parsePrimary();
  }

  private parsePrimary(): Rational {
    const tk = this.next();
    if (!tk) throw new Error("Expression is incomplete");

    if (tk.kind === "number") {
      return decimalStringToRational(tk.value);
    }

    if (tk.kind === "lparen") {
      if (this.peek()?.kind === "rparen") throw new Error("Empty brackets are not allowed");
      const inside = this.parseExpression();
      const close = this.next();
      if (!close || close.kind !== "rparen") throw new Error("Mismatched parentheses");
      return inside;
    }

    if (tk.kind === "rparen") {
      throw new Error("Mismatched parentheses");
    }

    throw new Error("Invalid expression");
  }
}

function quickOperatorSafety(tokens: Token[]) {
  let prev: Token | null = null;
  let balance = 0;

  for (const tk of tokens) {
    if (tk.kind === "lparen") {
      balance += 1;
      if (prev && (prev.kind === "number" || prev.kind === "rparen")) {
        throw new Error("Missing operator before (");
      }
    }

    if (tk.kind === "rparen") {
      balance -= 1;
      if (balance < 0) throw new Error("Mismatched parentheses");
      if (!prev || prev.kind === "op" || prev.kind === "lparen") {
        throw new Error("Invalid expression");
      }
    }

    if (tk.kind === "number") {
      if (prev && (prev.kind === "number" || prev.kind === "rparen")) {
        throw new Error("Missing operator between values");
      }
    }

    if (tk.kind === "op") {
      if (prev?.kind === "op" && !(tk.value === "-")) {
        throw new Error("Invalid operator sequence");
      }
      if (prev?.kind === "lparen" && tk.value !== "-") {
        throw new Error("Invalid operator sequence");
      }
    }

    prev = tk;
  }

  if (balance !== 0) throw new Error("Mismatched parentheses");
  if (prev?.kind === "op" || prev?.kind === "lparen") throw new Error("Expression is incomplete");
}

export function evaluateMiniCalculator(raw: string): EvalResult {
  const expr = sanitizeExpression(raw);

  try {
    const tokens = tokenize(expr);
    quickOperatorSafety(tokens);
    const parsed = new Parser(tokens).parse();
    const valueText = rationalToText(parsed, 12);
    const value = Number(valueText);

    if (!Number.isFinite(value)) {
      return { ok: false, error: "Result is out of range", normalizedExpression: expr };
    }
    if (Math.abs(value) > MAX_ABS_VALUE) {
      return { ok: false, error: "Result is too large", normalizedExpression: expr };
    }

    return {
      ok: true,
      value,
      valueText,
      normalizedExpression: expr,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid expression",
      normalizedExpression: expr,
    };
  }
}

export function toDisplayNumber(value: number | string) {
  const str = typeof value === "number" ? String(value) : String(value ?? "");
  if (!str) return "";
  return str.replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
}
