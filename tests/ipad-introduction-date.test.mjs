import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const exports = {};
new Function('exports', ts.transpile(readFileSync(new URL('../src/lib/assignment-phase.ts',import.meta.url),'utf8'), {module:ts.ModuleKind.CommonJS}))(exports);
const {assignmentPhase}=exports;

test('Unterrichtsbeginn ist Nutzung ohne regulaeres Ausgabedatum',()=>{
 const prepared={ipad_introduction_at:null,issued_at:null,returned_at:null};
 const introduction={...prepared,ipad_introduction_at:'2026-10-01'};
 assert.equal(assignmentPhase(prepared),'prepared');
 assert.equal(assignmentPhase(introduction),'introduction');
 assert.equal(assignmentPhase({...introduction,issued_at:'2026-10-08'}),'issued');
 assert.equal(assignmentPhase({...introduction,returned_at:'2026-10-08'}),'returned');
 assert.equal(assignmentPhase({...prepared,issued_at:'2026-09-01'}),'issued');
});

test('echte Migration erhaelt Altbestand und Einfuehrungsdatum und erzwingt Datumsreihenfolge',
 {skip:!process.env.PGLITE_TEST_MODULE}, async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href);
 const db=new PGlite();
 try {
  await db.exec(`create type set_availability as enum ('frei','zugeordnet','ausgegeben','blockiert','unklar'); create table set_person_assignment(id integer primary key, issued_at date, returned_at date);
   insert into set_person_assignment values(1,'2026-09-01',null);`);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261008071526_ipad_introduction_date.sql',import.meta.url),'utf8'));
  assert.equal((await db.query('select ipad_introduction_at from set_person_assignment where id=1')).rows[0].ipad_introduction_at,null);
  await db.exec("insert into set_person_assignment values(2,null,null,'2026-10-01')");
  assert.equal((await db.query('select issued_at from set_person_assignment where id=2')).rows[0].issued_at,null);
  await assert.rejects(db.exec("update set_person_assignment set issued_at='2026-09-30' where id=2"));
  await assert.rejects(db.exec("update set_person_assignment set returned_at='2026-09-30' where id=2"));
  await db.exec("update set_person_assignment set issued_at='2026-10-08' where id=2");
  const row=(await db.query('select * from set_person_assignment where id=2')).rows[0];
  assert.equal(row.ipad_introduction_at.toISOString().slice(0,10),'2026-10-01');
  assert.equal(row.issued_at.toISOString().slice(0,10),'2026-10-08');
  await db.exec("insert into set_person_assignment values(3,null,'2026-10-08','2026-10-01')");
 } finally {await db.close();}
});
