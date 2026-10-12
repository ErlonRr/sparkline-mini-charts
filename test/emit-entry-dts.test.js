// emit-entry-dts.test.js — The CommonJS declaration rewrite of scripts/emit-entry-dts.mjs.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { toCommonJsDeclaration } from "../scripts/emit-entry-dts.mjs";

const MODE = 'with { "resolution-mode": "import" }';

describe("toCommonJsDeclaration", () => {
  test("relative .js specifiers point at the .cjs siblings, bare specifiers stay", () => {
    assert.equal(
      toCommonJsDeclaration(`export * from "./components/a.js";\nimport type { B } from '../b.js';\nimport("./c.js");\nimport React from "react";\n`),
      `export * from "./components/a.cjs";\nimport type { B } from '../b.cjs';\nimport("./c.cjs");\nimport React from "react";\n`,
    );
  });

  test("every static import form of @angular/core becomes type-only with resolution-mode", () => {
    const cases = [
      [`import { EventEmitter, OutputEmitterRef } from '@angular/core';`, `import type { EventEmitter, OutputEmitterRef } from '@angular/core' ${MODE};`],
      [`import type { InputSignal } from "@angular/core";`, `import type { InputSignal } from "@angular/core" ${MODE};`],
      [`import * as ng from '@angular/core';`, `import type * as ng from '@angular/core' ${MODE};`],
      [`import core from '@angular/core';`, `import type core from '@angular/core' ${MODE};`],
      [
        `import core, { Directive } from '@angular/core';`,
        `import type core from '@angular/core' ${MODE};\nimport type { Directive } from '@angular/core' ${MODE};`,
      ],
      [`import {\n  A,\n  B,\n} from "@angular/core";`, `import type {\n  A,\n  B,\n} from "@angular/core" ${MODE};`],
    ];
    for (const [input, expected] of cases) assert.equal(toCommonJsDeclaration(input), expected, input);
  });

  test("re-exports from @angular/core become type-only with resolution-mode", () => {
    const cases = [
      [`export { EventEmitter } from '@angular/core';`, `export type { EventEmitter } from '@angular/core' ${MODE};`],
      [`export type { InputSignal } from '@angular/core';`, `export type { InputSignal } from '@angular/core' ${MODE};`],
      [`export * from '@angular/core';`, `export type * from '@angular/core' ${MODE};`],
      [`export * as ng from '@angular/core';`, `export type * as ng from '@angular/core' ${MODE};`],
    ];
    for (const [input, expected] of cases) assert.equal(toCommonJsDeclaration(input), expected, input);
  });

  test("inline import() types get the attribute, and the rewrite is idempotent", () => {
    const once = toCommonJsDeclaration(`readonly x: import('@angular/core').InputSignal<any>;\nimport { A } from '@angular/core';`);
    assert.equal(once, `readonly x: import('@angular/core', { with: { "resolution-mode": "import" } }).InputSignal<any>;\nimport type { A } from '@angular/core' ${MODE};`);
    assert.equal(toCommonJsDeclaration(once), once);
  });

  test("other packages and look-alike names are left alone", () => {
    const source = `import { Directive } from '@angular/core/testing';\nimport { h } from "vue";\nexport { x } from "@angular/core-extra";\n`;
    assert.equal(toCommonJsDeclaration(source), source);
  });
});
