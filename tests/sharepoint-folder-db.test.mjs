// Run with PGLITE_TEST_MODULE pointing to an isolated, pinned PGlite installation.
// This exercises the real migration on PostgreSQL, never on the school's DB.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const runtime = process.env.PGLITE_TEST_MODULE;
test('PostgreSQL migration: leases, audit transactions, RLS and immutable references', {skip: !runtime && 'Set PGLITE_TEST_MODULE to run isolated PostgreSQL tests'}, async()=>{
 const { PGlite } = await import(pathToFileURL(runtime).href);
 const db = new PGlite();
 const actor='11111111-1111-4111-8111-111111111111';
 const caseId='22222222-2222-4222-8222-222222222222';
 const other='33333333-3333-4333-8333-333333333333';
 const request='44444444-4444-4444-8444-444444444444';
 const concurrent='55555555-5555-4555-8555-555555555555';
 try {
  await db.exec(`
   create role anon; create role authenticated; create role service_role bypassrls;
   create table app_user(id uuid primary key,status text);
   create table role(id uuid primary key,key text);
   create table user_role(app_user_id uuid,role_id uuid);
   create table damage_case(id uuid primary key,billing_assessment text);
   grant all on app_user,role,user_role,damage_case to service_role;
   grant select on damage_case to authenticated;
   create function current_app_user_has_any_role(keys text[]) returns boolean language sql as
    $$ select current_setting('test.app_role',true) = any(keys) $$;
   alter table damage_case enable row level security;
   create policy case_read on damage_case for select to authenticated using
    (current_setting('test.app_role',true) in ('admin','ipad_verwaltung','readonly')
     or (current_setting('test.app_role',true)='buchhaltung' and billing_assessment='abrechenbar'));
   insert into app_user values('${actor}','active');
   insert into role values('${actor}','admin');
   insert into user_role values('${actor}','${actor}');
   insert into damage_case values('${caseId}','abrechenbar'),('${other}','unklar');
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/20260930121758_damage_sharepoint_folder_link.sql',import.meta.url),'utf8'));
  const claim=(id=caseId,token=request,name='Schaden-000238_Test-Max',drive='drive')=>db.query('select * from claim_damage_sharepoint_folder($1,$2,$3,$4,$5,$6,$7)',[id,actor,name,drive,'cases','client',token]);
  const finish=(token=request,url='https://ezshde.sharepoint.com/sites/IT2/test',error=null)=>db.query('select finish_damage_sharepoint_folder($1,$2,$3,$4,$5,$6) as ok',[caseId,actor,token,error?null:'item',error?null:url,error]);
  await db.exec('set role service_role');
  assert.equal((await claim()).rows[0].lease_token,request);
  assert.equal((await claim(caseId,concurrent)).rows[0].lease_token,request);
  assert.equal((await finish(concurrent)).rows[0].ok,false);
  assert.equal((await db.query('select * from damage_sharepoint_folder_audit')).rows.length,1);
  await assert.rejects(finish(request,'https://evil.com/x'));
  assert.equal((await db.query('select status from damage_sharepoint_folder')).rows[0].status,'provisioning');
  assert.equal((await finish()).rows[0].ok,true);
  assert.equal((await claim(caseId,concurrent,'changed-name')).rows[0].folder_name,'Schaden-000238_Test-Max');
  assert.equal((await db.query('select * from damage_sharepoint_folder_audit')).rows.length,2);
  await claim(other,concurrent,'Schaden-000239_Inventar-E123');
  await db.query('select finish_damage_sharepoint_folder($1,$2,$3,null,null,$4)',[other,actor,concurrent,'not_configured']);
  await assert.rejects(claim(other,request,'other','different-drive'));
  await db.exec('reset role');
  for(const [appRole,visible,auditVisible] of [['admin',2,4],['ipad_verwaltung',2,4],['readonly',2,0],['buchhaltung',1,0],['unknown',0,0]]) {
   await db.query("select set_config('test.app_role',$1,false)",[appRole]);
   await db.exec('set role authenticated');
   assert.equal((await db.query('select * from damage_sharepoint_folder')).rows.length,visible,appRole);
   assert.equal((await db.query('select * from damage_sharepoint_folder_audit')).rows.length,auditVisible,appRole);
   await assert.rejects(db.exec("update damage_sharepoint_folder set folder_name='tampered'"));
   await assert.rejects(db.exec('delete from damage_sharepoint_folder_audit'));
   await assert.rejects(claim());
   await assert.rejects(finish());
   await db.exec('reset role');
  }
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from damage_sharepoint_folder'));
  await assert.rejects(claim());
  await db.exec('reset role');
  await db.exec("update app_user set status='disabled'; set role service_role");
  await assert.rejects(claim());
 } finally {await db.close();}
});
