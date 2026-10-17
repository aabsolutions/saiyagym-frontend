// Copies the backend OpenAPI spec into this repo so CI never needs the backend checkout.
// Usage: npm run api:sync [-- <path-to-openapi.json>]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve(process.argv[2] ?? '../saiyagym-backend/openapi.json');
const target = resolve('openapi/openapi.json');

const spec = JSON.parse(readFileSync(source, 'utf8'));

// The Nest swagger plugin infers Record<K, T> properties as `additionalProperties`, even when
// the DTO already lists the keys in `properties`. Two consequences we normalize away:
// 1. `items: true` (invalid in OpenAPI 3.0, must be a Schema Object) crashes ng-openapi-gen.
// 2. `properties` + `additionalProperties` generates an index signature that conflicts with
//    the optional properties under TS strict mode (TS2411).
let booleanItems = 0;
let redundantAdditional = 0;
const normalize = (node) => {
  if (!node || typeof node !== 'object') return;
  if (node.properties && typeof node.additionalProperties === 'object') {
    delete node.additionalProperties;
    redundantAdditional++;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'items' && value === true) {
      node[key] = {};
      booleanItems++;
    } else {
      normalize(value);
    }
  }
};
normalize(spec);

writeFileSync(target, JSON.stringify(spec, null, 2) + '\n');
console.log(
  `OpenAPI spec copied from ${source} ` +
    `(normalized: ${booleanItems} boolean "items", ${redundantAdditional} redundant "additionalProperties").`,
);
