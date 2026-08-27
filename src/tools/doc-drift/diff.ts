import { stableId } from "./id.js";
import { SEVERITY_BY_KIND } from "./types.js";
import type { SchemaNode, DriftKind, DriftFinding } from "./types.js";

function typeList(n: SchemaNode): string[] | null {
  const t = n.type;
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return [...t].map(String).sort();
  return null; // no declared type
}

function hasProps(n: SchemaNode): boolean {
  return (
    !!n.properties &&
    typeof n.properties === "object" &&
    Object.keys(n.properties).length > 0
  );
}

// Opaque = a present node that specifies no properties and is an object (or
// untyped): "unspecified here", a wildcard. A typed leaf ({type:"string"}) is NOT
// opaque — its type is compared. Written as the definition (Obs 10).
export function isOpaque(n: SchemaNode): boolean {
  if (hasProps(n)) return false;
  const t = typeList(n);
  return t === null || t.includes("object");
}

// A human descriptor of a node's shape, for the object-vs-leaf mismatch message.
function shape(n: SchemaNode): string {
  if (hasProps(n)) return "an object";
  const t = typeList(n);
  return t ? `type ${t.join("|")}` : "untyped";
}

export interface PairDiff {
  label: string;
  findings: DriftFinding[];
  fields_compared: number;
  in_sync: number;
  drifted: number;
}

export function diffPair(declared: SchemaNode, canonical: SchemaNode, label: string): PairDiff {
  const findings: DriftFinding[] = [];
  let fieldsCompared = 0;
  let drifted = 0;

  const emit = (kind: DriftKind, path: string, message: string, evidence: string) => {
    findings.push({
      id: stableId(kind, label, path),
      category: kind,
      severity: SEVERITY_BY_KIND[kind],
      label,
      path,
      message,
      evidence,
    });
  };

  const walk = (d: SchemaNode, c: SchemaNode, prefix: string) => {
    // A wildcard node has nothing to compare at this level (guards the ROOT call;
    // recursive calls are already opaque-guarded before descending).
    if (isOpaque(d) || isOpaque(c)) return;

    const dProps = (d.properties ?? {}) as Record<string, SchemaNode>;
    const cProps = (c.properties ?? {}) as Record<string, SchemaNode>;
    const dReq = new Set(Array.isArray(d.required) ? d.required : []);
    const cReq = new Set(Array.isArray(c.required) ? c.required : []);
    const keys = Array.from(new Set([...Object.keys(dProps), ...Object.keys(cProps)])).sort();

    for (const k of keys) {
      const path = prefix ? `${prefix}.${k}` : k;
      const inD = k in dProps;
      const inC = k in cProps;

      if (inD && !inC) {
        fieldsCompared++; drifted++;
        emit("field_only_in_doc", path, `\`${path}\` is documented but absent from the canonical schema`, "present in declared, absent in canonical");
        continue;
      }
      if (inC && !inD) {
        fieldsCompared++; drifted++;
        emit("field_only_in_canonical", path, `\`${path}\` exists in the canonical schema but is undocumented`, "present in canonical, absent in declared");
        continue;
      }

      // present on both sides
      const dChild = dProps[k];
      const cChild = cProps[k];

      // Opaque on either side -> wildcard: exclude this field-path entirely (D9).
      if (isOpaque(dChild) || isOpaque(cChild)) continue;

      fieldsCompared++;
      let fieldDrifted = false;

      // required-membership drift (parent-level contract).
      if (dReq.has(k) !== cReq.has(k)) {
        fieldDrifted = true;
        const dSide = dReq.has(k) ? "required" : "optional";
        const cSide = cReq.has(k) ? "required" : "optional";
        emit("required_drift", path, `\`${path}\` is ${dSide} in the doc but ${cSide} in the canonical schema`, `declared: ${dSide}; canonical: ${cSide}`);
      }

      // type comparison (only when both sides declare a type).
      const dt = typeList(dChild);
      const ct = typeList(cChild);
      const dHas = hasProps(dChild);
      const cHas = hasProps(cChild);
      if (dt !== null && ct !== null && dt.join(",") !== ct.join(",")) {
        fieldDrifted = true;
        emit("type_mismatch", path, `\`${path}\` has type ${dt.join("|")} in the doc but ${ct.join("|")} in the canonical schema`, `declared: ${dt.join("|")}; canonical: ${ct.join("|")}`);
      } else if (dHas && cHas) {
        // types match/absent AND both are object-with-properties -> recurse.
        walk(dChild, cChild, path);
      } else if (dHas !== cHas) {
        // one side is an object-with-properties, the other a (non-opaque) typed
        // leaf: a shape mismatch the type-list compare misses when the object side
        // omits an explicit `type` (dt/ct null). Flag it rather than count in sync.
        fieldDrifted = true;
        const ds = shape(dChild);
        const cs = shape(cChild);
        emit("type_mismatch", path, `\`${path}\` is ${ds} in the doc but ${cs} in the canonical schema`, `declared: ${ds}; canonical: ${cs}`);
      }

      if (fieldDrifted) drifted++;
    }
  };

  walk(declared, canonical, "");
  return { label, findings, fields_compared: fieldsCompared, in_sync: fieldsCompared - drifted, drifted };
}
