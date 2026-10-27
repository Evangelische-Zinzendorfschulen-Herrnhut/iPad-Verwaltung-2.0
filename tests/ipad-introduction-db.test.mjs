import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
const runtime=process.env.PGLITE_TEST_MODULE;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const migration=name=>readFileSync(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8');
async function fixture() {
 const {PGlite}=await import(pathToFileURL(runtime).href);
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create function auth.uid() returns uuid language sql as $$select '${id(1)}'::uuid$$;
 create function current_app_user_id() returns uuid language sql as $$select auth.uid()$$;
 create function current_app_user_has_any_role(keys text[]) returns boolean language sql as $$select current_setting('test.role',true)=any(keys)$$;
 create function is_admin() returns boolean language sql as $$select public.current_app_user_has_any_role(array['admin'])$$;
 create function set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=clock_timestamp();return new;end$$;
 create table app_user(id uuid primary key);
 create table person(id uuid primary key,person_type text,status text);
 create table person_class_assignment(person_id uuid,valid_until timestamptz);
 insert into app_user values('${id(1)}');
 insert into person values('${id(2)}','schueler','aktiv'),('${id(3)}','schueler','aktiv');
 insert into person_class_assignment values('${id(2)}',null),('${id(3)}',null);
 select set_config('test.role','admin',false);`);
 await db.exec(migration('20260624105529_create_inventory_sets_and_assignments.sql').replaceAll('citext','text'));
 await db.exec(migration('20260626111500_add_return_protocol_text_fields.sql'));
 await db.exec(migration('20260702110000_allow_ipad_verwaltung_issue_return_sets.sql'));
 await db.exec(migration('20260713120000_add_assigned_set_availability.sql'));
 await db.exec(`create table damage_case(id uuid primary key default gen_random_uuid(),set_id uuid,person_id uuid,set_person_assignment_id uuid,component_id uuid,replacement_component_id uuid,replacement_set_id uuid,replacement_issued_at date,legacy_exchange_status text,case_type text default 'schaden',problem_type text default 'hardware');
 grant select on app_user,person,person_class_assignment to authenticated;
 grant all on inventory_set,set_person_assignment,inventory_component,set_component_assignment,damage_case to authenticated;
 grant usage on schema auth to authenticated;
 alter table damage_case enable row level security;
 create policy damage_manage on damage_case for all to authenticated using(current_app_user_has_any_role(array['admin','ipad_verwaltung'])) with check(current_app_user_has_any_role(array['admin','ipad_verwaltung']));`);
 await db.exec(migration('20260911073918_damage_edit_component_replacement.sql'));
 await db.exec(migration('20261008071526_ipad_introduction_date.sql'));
 await db.exec(migration('20261008072727_ipad_introduction_workflows.sql'));
 for(let n=10;n<=15;n++) {
  const person=n===10?id(2):n===11?id(3):null;
  await db.query(`insert into inventory_set(id,legacy_set_id,condition,availability,assigned_person_id,storage_label) values($1,$2,'ok',$3,$4,$5)`,[id(n),n,person?'zugeordnet':'frei',person,`W1 - ${n-9}`]);
  for(const [offset,role] of [[0,'ipad'],[1,'pencil'],[2,'keyboard']]) {
   await db.query(`insert into inventory_component(id,legacy_inventory_number,category,condition) values($1,$2,$3,'ok')`,[id(n*10+offset),`E${n*10+offset}`,role]);
   await db.query(`insert into set_component_assignment(id,set_id,component_id,role,valid_from) values($1,$2,$3,$4,'2026-01-01')`,[id(n*100+offset),id(n),id(n*10+offset),role]);
  }
  if(person) await db.query(`insert into set_person_assignment(id,legacy_assignment_id,set_id,person_id,legacy_user_id) values($1,$2,$3,$4,$2)`,[id(n+1000),n,id(n),person]);
 }
 return db;
}
async function asRole(db,role) {await db.exec('reset role');await db.query("select set_config('test.role',$1,false)",[role]);await db.exec('set role authenticated');}
const start=(db,n,date='2026-09-01')=>db.query("select change_set_issue($1,'ipad_einfuehrung',$2,null)",[id(n),date]);
const snapshot=async(db)=> (await db.query("select id,updated_at from inventory_set where availability='ipad_einfuehrung' and left(storage_label,2)='W1' order by id")).rows;
const batch=(db,rows,date='2026-10-01')=>db.query("select issue_introduction_wagon('W1',$1::jsonb,$2) as count",[JSON.stringify(rows),date]);

test('real PostgreSQL: state invariants, separate dates, single issue, return and protected audit',{skip:!runtime},async()=>{
 const db=await fixture();try {
  await asRole(db,'ipad_verwaltung');
  await assert.rejects(start(db,10,'2999-01-01'));
  for(const label of ['W1','W1 - 0','W1 - 31','W7 - 1']) assert.equal((await db.query('select ipad_wagon_place($1) place',[label])).rows[0].place,null);
  await db.query("update inventory_set set storage_label='Schrank1' where id=$1",[id(10)]);
  await assert.rejects(start(db,10));
  await db.query("update inventory_set set storage_label='W1 - 01' where id=$1",[id(10)]);
  await start(db,10);
  const row=(await db.query('select * from set_person_assignment where set_id=$1',[id(10)])).rows[0];
  assert.equal(row.issued_at,null);assert.equal(row.ipad_introduction_at.toISOString().slice(0,10),'2026-09-01');
  await assert.rejects(db.query("update inventory_set set storage_label=null where id=$1",[id(10)]));
  await assert.rejects(db.query("update inventory_set set assigned_person_id=null where id=$1",[id(10)]));
  await assert.rejects(db.query("update set_person_assignment set ipad_introduction_at=null where set_id=$1",[id(10)]));
  await assert.rejects(db.query('delete from set_introduction_audit'));
  await assert.rejects(db.query("insert into set_introduction_audit(actor_id,object_type,object_id,after_data) values($1,'fake',$1,'{}')",[id(1)]));
  await db.query("select change_set_issue($1,'ausgegeben','2026-10-01',null)",[id(10)]);
  assert.equal((await db.query('select storage_label from inventory_set where id=$1',[id(10)])).rows[0].storage_label,null);
  const issued=(await db.query('select * from set_person_assignment where set_id=$1',[id(10)])).rows[0];
  assert.equal(issued.ipad_introduction_at.toISOString().slice(0,10),'2026-09-01');
  assert.equal(issued.issued_at.toISOString().slice(0,10),'2026-10-01');
  await start(db,11);
  const checks={return_ipad_present:true,return_pencil_present:true,return_keyboard_present:true,return_power_adapter_present:true,return_charging_cable_present:true,return_pencil_cap_present:true,pencil_accessory_required:true};
  await db.query("select return_introduction_set($1,$2,'2026-10-01',$3::jsonb,'W1 - 2',null,null,null)",[id(11),id(1011),JSON.stringify(checks)]);
  assert.ok((await db.query('select * from set_introduction_audit')).rows.length>=6);
 }finally{await db.close();}
});

test('whole wagon: exact snapshot, untouched states, rollback on failure, role denial and per-set audit',{skip:!runtime},async()=>{
 const db=await fixture();try {
  await asRole(db,'admin');await start(db,10);await start(db,11,'2026-09-04');
  const rows=await snapshot(db);
  await assert.rejects(batch(db,rows.slice(0,1)));
  await assert.rejects(batch(db,rows,'2026-09-02'));
  assert.equal((await db.query("select count(*)::int n from inventory_set where availability='ipad_einfuehrung'")).rows[0].n,2);
  assert.equal((await db.query('select issued_at from set_person_assignment where set_id=$1',[id(10)])).rows[0].issued_at,null);
  await db.query("update inventory_set set notes='Version changed' where id=$1",[id(10)]);
  await assert.rejects(batch(db,rows));
  await asRole(db,'readonly');await assert.rejects(batch(db,rows));await assert.rejects(start(db,10));
  await asRole(db,'buchhaltung');await assert.rejects(batch(db,rows));
  await asRole(db,'ipad_verwaltung');
  assert.equal((await batch(db,await snapshot(db))).rows[0].count,2);
  await assert.rejects(batch(db,rows));
  const unaffected=(await db.query('select availability,storage_label from inventory_set where id=$1',[id(12)])).rows[0];
  assert.equal(unaffected.availability,'frei');assert.equal(unaffected.storage_label,'W1 - 3');
  assert.equal((await db.query("select count(*)::int n from set_introduction_audit where object_type='inventory_set' and before_data->>'availability'='ipad_einfuehrung' and after_data->>'availability'='ausgegeben'")).rows[0].n,2);
 }finally{await db.close();}
});

test('damage creation: internal exchange retains introduction; introduction donors and direct removal rejected',{skip:!runtime},async()=>{
 const db=await fixture();try {
  await asRole(db,'ipad_verwaltung');await start(db,10);await start(db,11);
  // Damage insert without replacement is permitted before take-home.
  await db.query('insert into damage_case(set_id,person_id,set_person_assignment_id) values($1,$2,$3)',[id(10),id(2),id(1010)]);
  await assert.rejects(db.query('insert into damage_case(set_id,person_id,set_person_assignment_id,component_id,replacement_component_id,replacement_issued_at) values($1,$2,$3,$4,$5,$6)',[id(10),id(2),id(1010),id(101),id(111),'2026-09-05']));
  assert.equal((await db.query("update set_component_assignment set valid_until=now() where component_id=$1 returning id",[id(101)])).rows.length,0);
  // RLS denies direct writes for ipad_verwaltung; confirm admin cannot donate either.
  await asRole(db,'admin');
  await assert.rejects(db.query("update set_component_assignment set valid_until=now() where component_id=$1",[id(101)]));
  await asRole(db,'ipad_verwaltung');
  await db.query('insert into damage_case(set_id,person_id,set_person_assignment_id,component_id,replacement_component_id,replacement_issued_at) values($1,$2,$3,$4,$5,$6)',[id(10),id(2),id(1010),id(101),id(121),'2026-09-05']);
  const target=(await db.query('select * from inventory_set where id=$1',[id(10)])).rows[0];
  assert.equal(target.availability,'ipad_einfuehrung');assert.equal(target.storage_label,'W1 - 1');assert.equal(target.assigned_person_id,id(2));
  assert.equal((await db.query("select component_id from set_component_assignment where set_id=$1 and role='pencil' and valid_until is null",[id(10)])).rows[0].component_id,id(121));
  assert.equal((await db.query('select * from damage_component_exchange_log')).rows.length,1);
  // The same atomic path also applies when an existing introduction damage is edited.
  const pending=(await db.query('insert into damage_case(set_id,person_id,set_person_assignment_id,component_id) values($1,$2,$3,$4) returning id',[id(11),id(3),id(1011),id(111)])).rows[0];
  await db.query('update damage_case set replacement_component_id=$1,replacement_issued_at=$2 where id=$3',[id(131),'2026-09-05',pending.id]);
  assert.equal((await db.query('select * from damage_component_exchange_log')).rows.length,2);
  assert.equal((await db.query('select availability from inventory_set where id=$1',[id(11)])).rows[0].availability,'ipad_einfuehrung');
 }finally{await db.close();}
});

test('full-set exchange transfers person, wagon and original introduction date without take-home',{skip:!runtime},async()=>{
 const db=await fixture();try {
  await asRole(db,'ipad_verwaltung');await start(db,10);
  await db.query('insert into damage_case(set_id,person_id,set_person_assignment_id,replacement_set_id,replacement_issued_at) values($1,$2,$3,$4,$5)',[id(10),id(2),id(1010),id(12),'2026-09-05']);
  const before=(await db.query('select * from inventory_set where id=$1',[id(10)])).rows[0];
  assert.equal(before.availability,'blockiert');assert.equal(before.assigned_person_id,null);assert.equal(before.storage_label,null);
  const after=(await db.query('select * from inventory_set where id=$1',[id(12)])).rows[0];
  assert.equal(after.availability,'ipad_einfuehrung');assert.equal(after.assigned_person_id,id(2));assert.equal(after.storage_label,'W1 - 1');
  const next=(await db.query('select * from set_person_assignment where set_id=$1',[id(12)])).rows[0];
  assert.equal(next.issued_at,null);assert.equal(next.ipad_introduction_at.toISOString().slice(0,10),'2026-09-01');
  const old=(await db.query('select * from set_person_assignment where set_id=$1',[id(10)])).rows[0];
  assert.equal(old.returned_at.toISOString().slice(0,10),'2026-09-05');assert.equal(old.issued_at,null);
  assert.equal((await db.query("select * from set_introduction_audit where object_type='introduction_set_exchange'")).rows.length,1);
 }finally{await db.close();}
});
