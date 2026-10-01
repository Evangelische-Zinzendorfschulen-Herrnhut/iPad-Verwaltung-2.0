import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
import ts from 'typescript';
const validationModule={exports:{}};
new Function('exports',ts.transpile(readFileSync(new URL('../src/lib/damage-exchange-validation.ts',import.meta.url),'utf8'),{module:ts.ModuleKind.CommonJS}))(validationModule.exports);
const {berlinToday,validExchangeDate}=validationModule.exports;
test('exchange date uses Berlin midnight and rejects missing, impossible and future dates',()=>{
 assert.equal(berlinToday(new Date('2026-09-30T22:30:00Z')),'2026-10-01');
 for(const value of ['', '2026-02-30','2026-10-02','01.10.2026']) assert.equal(validExchangeDate(value,'2026-10-01'),false,value);
 assert.equal(validExchangeDate('2026-10-01','2026-10-01'),true);
 assert.equal(validExchangeDate('2026-09-30','2026-10-01'),true);
});
test('real exchange trigger: missing date is P0001 with no partial writes; valid date exchanges and audits', {skip: !process.env.PGLITE_TEST_MODULE},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.PGLITE_TEST_MODULE).href);
 const db=new PGlite();
 const old='11111111-1111-4111-8111-111111111111', replacement='22222222-2222-4222-8222-222222222222', set='33333333-3333-4333-8333-333333333333', damage='44444444-4444-4444-8444-444444444444';
 try {
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create function auth.uid() returns uuid language sql as $$select '${old}'::uuid$$;
 create function current_app_user_has_any_role(text[]) returns boolean language sql as $$select true$$;
 create type set_condition as enum ('ok','unvollständig','defekt','unklar');
 create table inventory_component(id uuid primary key,category text,condition text);
 create table inventory_set(id uuid primary key,condition set_condition,availability text,assigned_person_id uuid);
 create table set_component_assignment(id uuid primary key default gen_random_uuid(),set_id uuid,component_id uuid,role text,legacy_set_id integer,valid_from timestamptz default now(),valid_until timestamptz,source text);
 create table set_person_assignment(set_id uuid,returned_at timestamptz);
 create table damage_case(id uuid primary key,component_id uuid,set_id uuid,replacement_component_id uuid,replacement_issued_at date,legacy_exchange_status text);
 insert into inventory_component values('${old}','pencil','defekt'),('${replacement}','pencil','ok');
 insert into inventory_set values('${set}','defekt','ausgegeben',null);
 insert into set_component_assignment(set_id,component_id,role) values('${set}','${old}','pencil');
 insert into damage_case(id,component_id,set_id) values('${damage}','${old}','${set}');`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20260911073918_damage_edit_component_replacement.sql',import.meta.url),'utf8'));
 await assert.rejects(db.exec(`update damage_case set replacement_component_id='${replacement}' where id='${damage}'`),e=>e.code==='P0001' && e.message.includes('Austauschdatum'));
 assert.equal((await db.query('select * from damage_component_exchange_log')).rows.length,0);
 assert.equal((await db.query('select * from set_component_assignment where valid_until is null')).rows[0].component_id,old);
 await db.exec(`update damage_case set replacement_component_id='${replacement}', replacement_issued_at=current_date where id='${damage}'`);
 assert.equal((await db.query('select * from set_component_assignment where valid_until is null')).rows[0].component_id,replacement);
 assert.equal((await db.query('select * from damage_component_exchange_log')).rows.length,1);
 await db.exec(`update damage_case set replacement_component_id='${replacement}' where id='${damage}'`);
 assert.equal((await db.query('select * from damage_component_exchange_log')).rows.length,1);
 }finally{await db.close();}
});

test('replacement selection prefills today, remains editable and requires date only for a replacement',()=>{
 const source=readFileSync(new URL('../src/app/schadensfaelle/replacement-component-search.tsx',import.meta.url),'utf8');
 let states=[],index=0;
 const react={useState(initial){const i=index++; if(!(i in states))states[i]=initial; return [states[i],v=>{states[i]=v;}];}};
 const jsx=(type,props)=>({type,props});
 const exports={};
 const compiled=ts.transpile(source,{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX});
 new Function('require','exports',compiled)(name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name.includes('validation')?{berlinToday:()=> '2026-10-01'}:{FieldIcon:()=>null},exports);
 const render=()=>{index=0;return exports.ReplacementComponentSearch({options:[{id:'replacement',inventoryNumber:'P123',model:'Pencil',source:'Einzelkomponente',storage:'Regal1',priority:1}]});};
 const nodes=(node)=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];
 let tree=nodes(render());
 assert.equal(tree.find(n=>n.props?.name==='replacement_issued_at').props.required,false);
 tree.find(n=>n.type==='input'&&n.props.type==='radio'&&!n.props.checked).props.onChange();
 tree=nodes(render());
 let date=tree.find(n=>n.props?.name==='replacement_issued_at');
 assert.equal(date.props.value,'2026-10-01'); assert.equal(date.props.required,true);
 date.props.onChange({target:{value:'2026-09-29'}});
 tree=nodes(render());assert.equal(tree.find(n=>n.props?.name==='replacement_issued_at').props.value,'2026-09-29');
 tree.find(n=>n.type==='input'&&n.props.type==='radio'&&!n.props.checked).props.onChange();
 tree=nodes(render());assert.equal(tree.find(n=>n.props?.name==='replacement_issued_at').props.required,false);
});

test('server handler rejects missing exchange date before writes and catches trigger P0001',async()=>{
 const source=readFileSync(new URL('../src/app/schadensfaelle/page.tsx',import.meta.url),'utf8');
 const start=source.indexOf('async function updateDamageCase('),end=source.indexOf('\nasync function updateSetStorage(',start);
 const code=ts.transpile('export '+source.slice(start,end),{module:ts.ModuleKind.CommonJS});
 const exports={};let writes=0;
 const builder={select(){return this;},eq(){return this;},update(){writes++;return this;},maybeSingle:async()=>({data:{id:'replacement'}}),single:async()=>({error:{code:'P0001',message:'Bitte ein gültiges, nicht zukünftiges Austauschdatum angeben.'}})};
 new Function('exports','validExchangeDate','exchangeStatusOptions','getCurrentAppUser','hasAnyRole','createClient','nullableText','appendFlagToHref','redirect',code)(exports,validExchangeDate,[{value:''}],async()=>({}),()=>true,async()=>({from:()=>builder}),()=>null,(href,key,value)=>`${href}&${key}=${value}`,href=>{throw new Error(href);});
 const form=new FormData();
 for(const [key,value] of Object.entries({id:'damage',return_to:'/schadensfaelle?edit=damage',case_type:'schaden',affected_item:'component',status:'offen',reported_at:'2026-10-01',billing_assessment:'unklar',short_description:'Test',replacement_inventory_number:'P123'})) form.set(key,value);
 await assert.rejects(exports.updateDamageCase(form),/error=exchange_date/);assert.equal(writes,0);
 form.set('replacement_issued_at','2026-09-01');
 await assert.rejects(exports.updateDamageCase(form),/error=exchange_rejected/);assert.equal(writes,1);
});
