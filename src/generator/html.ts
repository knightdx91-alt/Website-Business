export class Raw {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

export type Html = Raw | string | number | null | undefined | false | Html[];

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c]!);
}

export function raw(value: string): Raw {
  return new Raw(value);
}

function render(value: Html): string {
  if (value === null || value === undefined || value === false) return "";
  if (value instanceof Raw) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  return esc(String(value));
}

/** Tagged template: interpolated values are escaped unless wrapped in raw() or produced by html``. */
export function html(strings: TemplateStringsArray, ...values: Html[]): Raw {
  let out = strings[0]!;
  for (let i = 0; i < values.length; i++) {
    out += render(values[i]!) + strings[i + 1]!;
  }
  return new Raw(out);
}

export function join(parts: Html[], sep = ""): Raw {
  return new Raw(parts.map(render).filter(Boolean).join(sep));
}

/** JSON safe to embed inside <script> (no closing-tag or comment breakouts). */
export function jsonForScript(data: unknown): Raw {
  return new Raw(
    JSON.stringify(data)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029"),
  );
}

export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
