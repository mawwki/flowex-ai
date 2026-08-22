/** Reading & applying the scene CONFIG object (the inspector's data model). */

export type ConfigValue = string | number | boolean;
export type ConfigMap = Record<string, ConfigValue>;

/** Executes the scene code in isolation and returns its CONFIG object (flattened). */
export function readConfig(js: string): ConfigMap {
  try {
    // eslint-disable-next-line no-new-func
    const raw = new Function(`${js}; return typeof CONFIG!=='undefined'?CONFIG:null;`)() as
      | Record<string, unknown>
      | null;
    if (!raw || typeof raw !== "object") return {};
    return flatten(raw);
  } catch {
    return {};
  }
}

function flatten(obj: Record<string, unknown>, prefix = ""): ConfigMap {
  const out: ConfigMap = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    } else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[key] = v;
    }
  }
  return out;
}

export const isColor = (v: unknown) =>
  typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v.trim());

/** JS appended after the scene code that applies user overrides onto CONFIG. */
export function overrideSnippet(overrides: ConfigMap | undefined): string {
  if (!overrides || !Object.keys(overrides).length) return "";
  return `
try{ if(typeof CONFIG!=='undefined'&&CONFIG){
  var __ov=${JSON.stringify(overrides)};
  for(var __k in __ov){
    var __p=__k.split('.'),__o=CONFIG,__ok=true;
    for(var __i=0;__i<__p.length-1;__i++){ if(__o[__p[__i]]==null){__ok=false;break;} __o=__o[__p[__i]]; }
    if(__ok) __o[__p[__p.length-1]]=__ov[__k];
  }
} }catch(e){}
`;
}
