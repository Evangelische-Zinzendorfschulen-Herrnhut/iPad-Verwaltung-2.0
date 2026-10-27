import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
function load(path, require) {
 const exports = {};
 new Function('exports','require',ts.transpile(readFileSync(new URL(path,import.meta.url),'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}))(exports,require);
 return exports;
}
const {validatePerson}=load('../src/lib/person-validation.ts');
const valid={first_name:' Marie ',last_name:'Köhler',email:'fsj@example.org',person_type:'mitarbeiter',status:'aktiv',jahrgang:'',notes:''};
test('person validation normalizes optional fields and rejects invalid values',()=>{
 assert.equal(validatePerson(valid).data.first_name,'Marie');
 assert.equal(validatePerson(valid).data.jahrgang,null);
 for(const change of [{first_name:'',last_name:' '},{email:'invalid'},{person_type:'admin'},{status:'unknown'},{jahrgang:'2026oops'},{jahrgang:'1999'},{jahrgang:'2026.5'}]) assert.ok(validatePerson({...valid,...change}).error);
 assert.equal(validatePerson({...valid,jahrgang:'2026'}).data.jahrgang,2026);
});
test('update checks role before writing, handles denied/stale writes and redirects only after confirmed update',async()=>{
 let authorized=true,writes=0,revalidated=[],result={data:{id:'id'},error:null};
 const predicates=[];
 const query={eq(k,v){predicates.push([k,v]);return this;},select(){return this;},async maybeSingle(){return result;}};
 const {updatePerson}=load('../src/app/personen/update-person.ts',name=>({
 'next/cache':{revalidatePath:path=>revalidated.push(path)},
 'next/navigation':{redirect:path=>{throw new Error('redirect:'+path);}},
 '@/lib/auth/current-user':{requireAppUser:async roles=>{assert.deepEqual(roles,['admin']);if(!authorized)throw new Error('denied');}},
 '@/lib/supabase/server':{createClient:async()=>({from:table=>{assert.equal(table,'person');return {update:fields=>{writes++;assert.equal(fields.last_name,'Köhler');assert.ok(!('person_id' in fields));return query;}};}})},
 '@/lib/person-validation':{validatePerson},
 }[name]));
 const form=new FormData(); for(const [k,v] of Object.entries({...valid,person_id:'11111111-1111-4111-8111-111111111111',updated_at:'2026-10-05T10:00:00Z',return_to:'https://example.org'}))form.set(k,v);
 authorized=false;await assert.rejects(updatePerson({},form),/denied/);assert.equal(writes,0);
 authorized=true; form.set('person_type','admin');assert.ok((await updatePerson({},form)).error);assert.equal(writes,0);form.set('person_type','mitarbeiter');
 result={data:null,error:null};assert.match((await updatePerson({},form)).error,/inzwischen/);assert.equal(revalidated.length,0);
 result={data:null,error:{message:'private database details'}};assert.ok((await updatePerson({},form)).error);assert.equal(revalidated.length,0);
 result={data:{id:'id'},error:null};await assert.rejects(updatePerson({},form),/returnTo=%2Fpersonen&saved=1/);assert.equal(revalidated.length,2);
 assert.ok(predicates.some(([key,value])=>key==='updated_at'&&value==='2026-10-05T10:00:00Z'));
});
