import { readFileSync } from 'node:fs';
import ts from 'typescript';
const exports = {};
const code = ts.transpileModule(readFileSync(new URL('../../src/app/list-search.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function('exports', code)(exports);
export default exports;
