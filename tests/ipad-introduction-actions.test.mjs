import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
function load(path,require=()=>({}),jsx=false) {
 const exports={};
 new Function('exports','require',ts.transpile(readFileSync(new URL(path,import.meta.url),'utf8'),{module:ts.ModuleKind.CommonJS,jsx:jsx?ts.JsxEmit.ReactJSX:undefined}))(exports,require);
 return exports;
}
const validation=load('../src/lib/ipad-introduction.ts');
const id='11111111-1111-4111-8111-111111111111';
test('validation uses Berlin date and excludes introduction donors independently of person flags',()=>{
 assert.equal(validation.berlinToday(new Date('2026-09-30T22:30:00Z')),'2026-10-01');
 for(const date of ['','2026-02-30','2026-10-02','01.10.2026']) assert.equal(validation.validIssueDate(date,'2026-10-01'),false);
 assert.equal(validation.validIssueDate('2026-10-01','2026-10-01'),true);
 for(const label of ['W0 - 01','W7 - 01','W1 - 31','W1','Schrank1','W1 - 00']) assert.equal(validation.wagonPlace(label),null);
 assert.deepEqual(validation.wagonPlace('W6 - 30'),{wagon:'W6',place:30});
 assert.equal(validation.canSupplyReplacement('ipad_einfuehrung',null,false),false);
 assert.equal(validation.canSupplyReplacement('zugeordnet',null,false),false);
 assert.equal(validation.canSupplyReplacement('frei',null,false),true);
 assert.equal(validation.canSupplyReplacement('blockiert',id,false),false);
});
test('wagon action requires authorized role and deliberate confirmation; forwards exact preview and date',async()=>{
 let denied=false,calls=[],result={data:2,error:null};
 const {issueWagon}=load('../src/app/sets/w1/issue-wagon.ts',name=>({
  'next/cache':{revalidatePath:()=>{}},
  '@/lib/auth/current-user':{requireAppUser:async roles=>{assert.deepEqual(roles,['admin','ipad_verwaltung']);if(denied) throw Error('denied');}},
  '@/lib/supabase/server':{createClient:async()=>({rpc:async(name,params)=>{calls.push({name,params});return result;}})},
  '@/lib/ipad-introduction':validation,
  '@/lib/introduction-support':{supportsIntroduction:async()=>true},
 }[name]));
 const form=new FormData();const snapshot=[{id,updated_at:'2026-10-01T10:00:00Z'}];
 form.set('wagon','W1');form.set('issued_at','2026-09-01');form.set('snapshot',JSON.stringify(snapshot));
 assert.ok((await issueWagon({},form)).error);assert.equal(calls.length,0);
 form.set('confirmed','yes');denied=true;await assert.rejects(issueWagon({},form),/denied/);assert.equal(calls.length,0);
 denied=false;form.set('wagon','all');assert.ok((await issueWagon({},form)).error);assert.equal(calls.length,0);
 form.set('wagon','W1');assert.deepEqual(await issueWagon({},form),{count:2});
 assert.deepEqual(calls[0],{name:'issue_introduction_wagon',params:{p_wagon:'W1',p_snapshot:snapshot,p_date:'2026-09-01'}});
 result={data:null,error:{code:'P0001',message:'Bestand geändert'}};assert.deepEqual(await issueWagon({},form),{error:'Bestand geändert'});
 result={data:null,error:{code:'XX000',message:'private'}};assert.ok(!(await issueWagon({},form)).error.includes('private'));
});
test('wagon UI shows full count, resettable preview, required confirmation and date',()=>{
 const jsx=(type,props,key)=>({type,props,key});
 const {WagonIssueForm}=load('../src/app/sets/w1/wagon-issue-form.tsx',name=>({
  'react':{useActionState:()=>[{},()=>{},false]},'react/jsx-runtime':{jsx,jsxs:jsx},'./issue-wagon':{issueWagon:()=>{}},
 }[name]),true);
 const snapshot=[{id,updated_at:'2026-10-01T10:00:00Z'}];
 const tree=WagonIssueForm({wagon:'W1',snapshot,today:'2026-10-01'});
 function nodes(node){return !node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
 const all=nodes(tree);
 const confirm=all.find(n=>n.props?.name==='confirmed');assert.equal(confirm.props.required,true);assert.equal(confirm.props.value,'yes');
 assert.equal(all.find(n=>n.props?.name==='snapshot').props.value,JSON.stringify(snapshot));
 assert.equal(all.find(n=>n.type==='form').key,JSON.stringify(snapshot));
 const date=all.find(n=>n.props?.name==='issued_at');assert.equal(date.props.required,true);assert.equal(date.props.max,'2026-10-01');
 const text=all.flatMap(n=>[n.props?.children].flat(Infinity)).filter(c=>typeof c==='string').join(' ');
 assert.ok(text.includes('ganzen Wagen'));assert.ok(text.includes('Wagenplätze werden frei'));
});

test('wagon page hides completion box for empty wagons and shows it wherever introduction sets exist',()=>{
 const source=readFileSync(new URL('../src/app/sets/w1/page.tsx',import.meta.url),'utf8');
 const expression=source.match(/\{(canManageSets[^\n]+<WagonIssueForm[^\n]+: null)\}/)[1];
 const code=ts.transpile('export const renderBox=()=>('+expression+');',{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX});
 for(const wagon of ['W1','W2','W3','W4','W5','W6']) {
  for(const count of [0,1,26]) {
   const jsx=(type,props,key)=>({type,props,key});
   const exports={};const snapshot=Array.from({length:count},()=>({id,updated_at:'2026-10-08T10:00:00Z'}));
   new Function('exports','require','canManageSets','isWagenFilter','introductionEnabled','wagonSnapshot','selectedStorage','WagonIssueForm','berlinToday',code)(exports,()=>({jsx,jsxs:jsx}),true,true,true,snapshot,wagon,'WagonIssueForm',()=> '2026-10-08');
   const box=exports.renderBox();
   if(count===0) assert.equal(box,null,wagon);
   else {assert.equal(box.props.wagon,wagon);assert.equal(box.props.snapshot,snapshot);}
  }
 }
});

test('damage handler preserves atomic introduction exchanges and does not restore the old wagon place',async()=>{
 const source=readFileSync(new URL('../src/app/sets/[setId]/damage/new/page.tsx',import.meta.url),'utf8');
 const code=ts.transpile('export '+source.slice(source.indexOf('async function createDamageCase('),source.indexOf('\nexport const maxDuration')),{module:ts.ModuleKind.CommonJS});
 for(const kind of ['set','component']) {
  let legacySwaps=0,storageWrites=0,inserted;
  const client={from(table){const filters={};let operation='read',columns='';
   function reply(){
    if(operation==='update') return {data:null,error:null};
    if(table==='damage_case')return {data:{id:'damage',damage_number:42},error:null};
    if(table==='set_introduction_audit'||table==='damage_component_exchange_log')return {data:[{id:'audit'}],error:null};
    if(table==='inventory_set')return {data:filters.id==='source'?{availability:'frei',assigned_person_id:null}:{availability:'ipad_einfuehrung',assigned_person_id:'person',legacy_set_id:1},error:null};
    if(table==='set_person_assignment')return {data:filters.set_id==='source'?null:{id:'assignment',person_id:'person'},error:null};
    if(table==='inventory_component')return {data:{category:'pencil',condition:'ok',legacy_inventory_number:'P123'},error:null};
    if(table==='set_component_assignment')return {data:columns==='set_id'?{set_id:'source'}:{id:'original'},error:null};
    return {data:{first_name:'Test',last_name:'Person'},error:null};
   }
   const b={select(value){columns=value;return b;},eq(k,v){filters[k]=v;return b;},is(){return b;},limit(){return b;},single:async()=>reply(),maybeSingle:async()=>reply(),
    insert(fields){inserted=fields;operation='insert';return b;},update(fields){operation='update';if(table==='inventory_set'&&'storage_label' in fields)storageWrites++;return b;},then(resolve,reject){return Promise.resolve(reply()).then(resolve,reject);}};
   return b;
  }};
  const env={exchangeStatusOptions:[{value:''},{value:'ausgegeben'}],INTRODUCTION:'ipad_einfuehrung',canSupplyReplacement:validation.canSupplyReplacement,
   getCurrentAppUser:async()=>({id:'actor'}),hasAnyRole:()=>true,createClient:async()=>client,
   affectedItemLabel:()=>kind,applyReplacementSetIssue:async()=>legacySwaps++,applyReplacementComponentIssue:async()=>legacySwaps++,
   provisionDamageFolder:async()=>{},appendFlagToHref:(href)=>href,redirect:href=>{throw Error('redirect:'+href);}};
  const exports={};new Function(...Object.keys(env),'exports',code)(...Object.values(env),exports);
  const form=new FormData();for(const [key,value] of Object.entries({set_id:'target',assignment_id:'assignment',person_id:'person',case_type:'schaden',affected_item:kind,reported_at:'2026-09-05',replacement_issued_at:'2026-09-05',storage_label:'W1 - 01',...(kind==='set'?{replacement_set_id:'replacement'}:{component_id:'original',replacement_component_id:'replacement'})}))form.set(key,value);
  await assert.rejects(exports.createDamageCase(form),/redirect:\/schadensfaelle\?detail=damage/);
  assert.equal(legacySwaps,0,kind);assert.equal(inserted.set_person_assignment_id,'assignment');
  assert.equal(storageWrites,kind==='set'?0:1,kind);
 }
});
