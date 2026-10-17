// Kleine JSON-Schema-validator voor precies de sleutelwoorden die het schema in
// §9.1 gebruikt: type, const, enum, required, properties,
// additionalProperties (false), items, minItems, maxItems, uniqueItems,
// minimum, maximum, multipleOf, minLength, pattern, minProperties, $ref
// (#/$defs/...), allOf, oneOf en if/then. Andere sleutelwoorden worden
// geweigerd, zodat een schemawijziging niet stilletjes genegeerd wordt.

const KNOWN = new Set([
  '$schema', '$id', '$defs', '$ref', 'title', 'type', 'const', 'enum', 'required',
  'properties', 'additionalProperties', 'items', 'minItems', 'maxItems', 'uniqueItems',
  'minimum', 'maximum', 'multipleOf', 'minLength', 'pattern', 'minProperties',
  'allOf', 'oneOf', 'if', 'then',
]);

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

function matchesType(v, t) {
  const actual = typeOf(v);
  if (t === 'number') return actual === 'number' || actual === 'integer';
  return actual === t;
}

function equal(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function describe(v) {
  return JSON.stringify(v);
}

// Geeft een lijst fouten terug: { path, message }. Leeg = geldig.
export function validateSchema(value, schema, root = schema, path = '') {
  const errors = [];
  const err = (message, p = path) => errors.push({ path: p || '(root)', message });

  for (const key of Object.keys(schema)) {
    if (!KNOWN.has(key)) err(`onbekend schema-sleutelwoord "${key}"`);
  }

  if (schema.$ref) {
    const m = /^#\/\$defs\/(.+)$/.exec(schema.$ref);
    const target = m && root.$defs?.[m[1]];
    if (!target) err(`onbekende $ref ${schema.$ref}`);
    else errors.push(...validateSchema(value, target, root, path));
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      err(`verwacht type ${types.join(' of ')}, kreeg ${typeOf(value)}`);
      return errors;
    }
  }

  if ('const' in schema && !equal(value, schema.const)) {
    err(`moet ${describe(schema.const)} zijn, is ${describe(value)}`);
  }
  if (schema.enum && !schema.enum.some((e) => equal(e, value))) {
    err(`moet een van ${schema.enum.map(describe).join(', ')} zijn, is ${describe(value)}`);
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) err(`moet ≥ ${schema.minimum} zijn, is ${value}`);
    if (schema.maximum !== undefined && value > schema.maximum) err(`moet ≤ ${schema.maximum} zijn, is ${value}`);
    if (schema.multipleOf !== undefined && !Number.isInteger(value / schema.multipleOf)) {
      err(`moet een veelvoud van ${schema.multipleOf} zijn, is ${value}`);
    }
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      err(`moet minstens ${schema.minLength} tekens hebben`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(value)) {
      err(`voldoet niet aan patroon ${schema.pattern}: ${describe(value)}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      err(`moet minstens ${schema.minItems} elementen hebben, heeft ${value.length}`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      err(`mag hoogstens ${schema.maxItems} elementen hebben, heeft ${value.length}`);
    }
    if (schema.uniqueItems) {
      const seen = new Set(value.map((v) => JSON.stringify(v)));
      if (seen.size !== value.length) err('elementen moeten uniek zijn');
    }
    if (schema.items) {
      value.forEach((item, i) => errors.push(...validateSchema(item, schema.items, root, `${path}[${i}]`)));
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const props = schema.properties ?? {};
    for (const req of schema.required ?? []) {
      if (!(req in value)) err(`verplicht veld "${req}" ontbreekt`);
    }
    if (schema.minProperties !== undefined && Object.keys(value).length < schema.minProperties) {
      err(`moet minstens ${schema.minProperties} velden hebben`);
    }
    for (const [k, v] of Object.entries(value)) {
      const sub = `${path}${path ? '.' : ''}${k}`;
      if (props[k]) errors.push(...validateSchema(v, props[k], root, sub));
      else if (schema.additionalProperties === false) err(`onbekend veld "${k}"`, sub);
    }
  }

  for (const sub of schema.allOf ?? []) errors.push(...validateSchema(value, sub, root, path));

  if (schema.oneOf) {
    const passing = schema.oneOf.filter((s) => validateSchema(value, s, root, path).length === 0).length;
    if (passing !== 1) err(`moet aan precies één van ${schema.oneOf.length} varianten voldoen, voldoet aan ${passing}`);
  }

  if (schema.if && validateSchema(value, schema.if, root, path).length === 0 && schema.then) {
    errors.push(...validateSchema(value, schema.then, root, path));
  }

  return errors;
}
