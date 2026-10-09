import type { LayoutDef } from "./layout-kit.ts";

/** More page layouts (see layouts.ts). CSS only, on the shared markup; layoutCss adds the layout marker comment. */
export const LAYOUTS_C = {} as const satisfies Record<string, LayoutDef>;
