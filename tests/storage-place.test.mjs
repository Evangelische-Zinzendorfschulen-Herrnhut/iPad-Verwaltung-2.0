import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const exports = {};
new Function('exports', ts.transpile(readFileSync(new URL('../src/lib/storage-place.ts',import.meta.url),'utf8'), {module:ts.ModuleKind.CommonJS}))(exports);
const {parseStoragePlace,validateStorageLabel}=exports;

test('Regal slash place is preserved for display and export and accepted for storage',()=>{
 assert.equal(validateStorageLabel('Regal - 4/1'),'Regal - 4/1');
 assert.equal(parseStoragePlace('Regal - 4/1'),'4/1');
 assert.equal(parseStoragePlace('Regal - 12/3'),'12/3');
});
test('slash places are restricted to exact Regal and positive integer pairs',()=>{
 for(const label of ['W1 - 4/1','Schrank 1 - 4/1','Regal 2.35 - 4/1','Regal - 0/1','Regal - 4/0','Regal - 4/1/2','Regal - 4.1/2']) {
  assert.throws(()=>validateStorageLabel(label),label);
  assert.equal(parseStoragePlace(label),null,label);
 }
});
test('existing integer places remain in range 1 to 30',()=>{
 for(const label of ['W1 - 04','W6 - 4','Schrank 1 - 4','Regal 2.35 - 4','W1/4']) assert.equal(parseStoragePlace(label),4,label);
 for(const label of ['W1 - 0','W1 - 31','Schrank 2 - 31','Regal 2.35 - 31',null]) assert.equal(parseStoragePlace(label),null,label);
 assert.equal(validateStorageLabel('W1/4'),'W1/4');
});

test('XLSX place cell contains literal 4/1 as text',async()=>{
 const {createRequire}=await import('node:module');
 const {inflateRawSync}=await import('node:zlib');
 const workbookExports={};
 new Function('exports','require',ts.transpile(readFileSync(new URL('../src/lib/xlsx/simple-workbook.ts',import.meta.url),'utf8'),{module:ts.ModuleKind.CommonJS}))(workbookExports,createRequire(import.meta.url));
 const bytes=Buffer.from(workbookExports.createSimpleWorkbook([{name:'Regal',rows:[['Platz'],[parseStoragePlace('Regal - 4/1')]]}]));
 let offset=0, sheet;
 while(bytes.readUInt32LE(offset)===0x04034b50){
  const size=bytes.readUInt32LE(offset+18),nameLength=bytes.readUInt16LE(offset+26),extraLength=bytes.readUInt16LE(offset+28);
  const name=bytes.subarray(offset+30,offset+30+nameLength).toString();
  const start=offset+30+nameLength+extraLength;
  if(name==='xl/worksheets/sheet1.xml') sheet=inflateRawSync(bytes.subarray(start,start+size)).toString();
  offset=start+size;
 }
 assert.match(sheet, /<c r="A2" t="inlineStr"><is><t[^>]*>4\/1<\/t>/);
});
