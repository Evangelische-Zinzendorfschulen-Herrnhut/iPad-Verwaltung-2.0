import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
const requireNode = createRequire(import.meta.url);
import ts from 'typescript';

function load(path, mocks = {}) {
 const source = readFileSync(new URL(`../${path}`, import.meta.url),'utf8');
 const output = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports = {};
 new Function('require','exports',output)((name) => {
  if(name==='server-only') return {};
  if(name in mocks) return mocks[name];
  if(name==='react' || name==='react/jsx-runtime') return requireNode(name);
  throw new Error(`Unexpected import: ${name}`);
 },exports);
 return exports;
}
const names = load('src/lib/sharepoint/folder-name.ts');
const graph = load('src/lib/sharepoint/graph.ts',{'./folder-name':names});
const config={tenantId:'11111111-1111-4111-8111-111111111111',clientId:'22222222-2222-4222-8222-222222222222',clientSecret:'test-only',driveId:'drive',parentId:'cases'};
const folder={id:'folder',name:'Schaden-000238_Mustermann-Max',webUrl:'https://ezshde.sharepoint.com/sites/IT2/folder',folder:{},parentReference:{id:'cases',driveId:'drive'},createdBy:{application:{id:config.clientId}}};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status});
function mockFetch(responses,calls=[]) { return async (url,options)=>{calls.push({url,options}); const next=responses.shift(); if(next instanceof Error) throw next; if(!next) throw new Error('Unexpected request'); return next;}; }

test('stable name and inventory fallback, normalization and truncation',()=>{
 assert.equal(names.damageFolderName(238,{last_name:'Mustermann',first_name:'Max'},null),folder.name);
 assert.equal(names.damageFolderName(238,null,'E123456 / 1234'),'Schaden-000238_Inventar-E123456-1234');
 assert.equal(names.damageFolderName(238,null,null),'Schaden-000238_Ohne-Zuordnung');
 assert.equal(names.normalizeFolderPart(' . Ma/x: #\u0000% '),'Ma-x');
 assert.equal(names.normalizeFolderPart('Mu\u0308ller'),'Müller');
 assert.ok(names.damageFolderName(1000001,{last_name:'A'.repeat(400),first_name:'B'},null).length<=180);
 assert.throws(()=>names.damageFolderName('bad',null,null));
});
test('only safe school SharePoint links are allowed',()=>{
 for(const url of ['javascript:alert(1)','http://ezshde.sharepoint.com/x','https://ezshde.sharepoint.com.evil.com/x','https://user:pass@ezshde.sharepoint.com/x','https://evil.com/x']) assert.equal(names.safeSharePointUrl(url),null);
 assert.ok(names.safeSharePointUrl(folder.webUrl));
});
test('missing or invalid Graph config stays disabled',()=>{
 assert.equal(graph.graphConfig({}),null);
 assert.equal(graph.graphConfig({SHAREPOINT_TENANT_ID:'x'}),null);
});
test('creates only in configured parent with fail-on-conflict; credentials stay at token endpoint',async()=>{
 const calls=[];
 assert.deepEqual(await graph.ensureGraphFolder(config,folder.name,mockFetch([response({access_token:'test-token'}),response(folder,201)],calls)),{itemId:'folder',webUrl:folder.webUrl});
 assert.equal(JSON.parse(calls[1].options.body)['@microsoft.graph.conflictBehavior'],'fail');
 assert.ok(calls[1].url.endsWith('/items/cases/children'));
 assert.equal(calls[1].options.redirect,'error');
 assert.equal(calls[1].options.body.includes(config.clientSecret),false);
});
test('retry recovers same application-owned folder after a lost response',async()=>{
 assert.equal((await graph.ensureGraphFolder(config,folder.name,mockFetch([response({access_token:'token'}),response({},409),response(folder)]))).itemId,'folder');
});
test('never adopts a foreign collision or invalid destination',async()=>{
 for(const bad of [{...folder,createdBy:{application:{id:'other'}}},{...folder,parentReference:{id:'other',driveId:'drive'}},{...folder,webUrl:'https://evil.com/x'}]) {
  await assert.rejects(graph.ensureGraphFolder(config,folder.name,mockFetch([response({access_token:'token'}),response({},409),response(bad)])),e=>['folder_conflict','invalid_response'].includes(e.code));
 }
});
test('Graph auth/access errors have sanitized codes',async()=>{
 await assert.rejects(graph.ensureGraphFolder(config,folder.name,mockFetch([response({secret:'never surface'},401)])),e=>e.code==='graph_auth');
 await assert.rejects(graph.ensureGraphFolder(config,folder.name,mockFetch([response({access_token:'token'}),response({},403)])),e=>e.code==='graph_access');
});

function serviceHarness({roles=['admin'],row={id:'case',damage_number:238,person:{last_name:'Mustermann',first_name:'Max'},component:null,inventory_set:null},claimMode='new',configured=true,remoteError=null,finish=true}={}) {
 const calls=[];let graphCalls=0;
 const actor={id:'actor',roles};
 const serverDb={from(){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:null};}};},async rpc(name,args){
  calls.push({name,args});
  if(name.startsWith('claim')) return {data:[{status:claimMode==='ready'?'ready':'provisioning',web_url:claimMode==='ready'?folder.webUrl:null,folder_name:folder.name,lease_token:claimMode==='busy'?'other':args.p_request}]};
  return {data:finish};
 }};
 const db={from(){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:row};}};}};
 const svc=load('src/lib/sharepoint/folder-service.ts',{
  '@supabase/supabase-js':{createClient:()=>serverDb},
  '@/lib/auth/current-user':{getCurrentAppUser:async()=>actor,hasAnyRole:(u,r)=>u?.roles.some(x=>r.includes(x))},
  '@/lib/supabase/server':{createClient:async()=>db},'./folder-name':names,
  './graph':{...graph,graphConfig:()=>configured?config:null,ensureGraphFolder:async()=>{graphCalls++;if(remoteError)throw new graph.FolderError(remoteError);return {itemId:folder.id,webUrl:folder.webUrl};}},
 });
 return {svc,calls,graphCalls:()=>graphCalls};
}
process.env.SUPABASE_SECRET_KEY='unit-test-secret';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';
test('writers required; nonexisting cases denied before privileged operations',async()=>{
 for(const roles of [[],['readonly'],['buchhaltung']]) {
  const h=serviceHarness({roles}); await assert.rejects(h.svc.provisionDamageFolder('case'),e=>e.code==='forbidden');assert.equal(h.calls.length,0);
 }
 const h=serviceHarness({row:null});await assert.rejects(h.svc.provisionDamageFolder('case'),e=>e.code==='not_found');assert.equal(h.calls.length,0);
});
test('missing config records failure and never calls Graph',async()=>{
 const h=serviceHarness({configured:false}); const state=await h.svc.provisionDamageFolder('case');
 assert.equal(state.error_code,'not_configured');assert.equal(h.graphCalls(),0);
 assert.equal(h.calls[1].args.p_error,'not_configured');
});
test('ready and concurrent claims do not repeat external creation',async()=>{
 for(const claimMode of ['ready','busy']) {
  const h=serviceHarness({claimMode});await h.svc.provisionDamageFolder('case');assert.equal(h.graphCalls(),0);assert.equal(h.calls.length,1);
 }
});
test('successful finalization records actor and stable item, failed finalization stays retryable',async()=>{
 const h=serviceHarness();assert.equal((await h.svc.provisionDamageFolder('case')).status,'ready');
 assert.equal(h.calls[1].args.p_item_id,'folder');assert.equal(h.calls[1].args.p_actor_id,'actor');
 const failed=serviceHarness({finish:false});assert.equal((await failed.svc.provisionDamageFolder('case')).error_code,'database_unavailable');
});
test('remote failure is finalized without deleting the case',async()=>{
 const h=serviceHarness({remoteError:'graph_access'});assert.equal((await h.svc.provisionDamageFolder('case')).error_code,'graph_access');
 assert.equal(h.calls[1].args.p_item_id,null);
});


test('retry endpoint rejects cross-origin requests and invalid IDs before provisioning',async()=>{
 let called=0;
 const route=load('src/app/api/schadensfaelle/[id]/sharepoint-folder/route.ts',{
  'next/server':{NextResponse:{json:(data,options)=>Response.json(data,options)}},
  '@/lib/sharepoint/folder-service':{provisionDamageFolder:async()=>{called++;return {status:'ready'};}},
  '@/lib/sharepoint/graph':graph,
 });
 const params={params:Promise.resolve({id:'11111111-1111-4111-8111-111111111111'})};
 assert.equal((await route.POST(new Request('https://app.example/api',{method:'POST',headers:{origin:'https://evil.example'}}),params)).status,403);
 assert.equal(called,0);
 assert.equal((await route.POST(new Request('https://app.example/api',{method:'POST',headers:{origin:'https://app.example'}}),{params:Promise.resolve({id:'bad'})})).status,400);
 assert.equal(called,0);
 assert.equal((await route.POST(new Request('https://app.example/api',{method:'POST',headers:{origin:'https://app.example'}}),params)).status,200);
 assert.equal(called,1);
});
test('folder UI exposes safe link and retry only to managers',()=>{
 const {SharePointFolderControls}=load('src/app/schadensfaelle/sharepoint-folder-controls.tsx',{
  'next/navigation':{useRouter:()=>({refresh(){}})},'@/lib/sharepoint/folder-name':names,
 });
 const render=(props)=>renderToStaticMarkup(React.createElement(SharePointFolderControls,{caseId:'case',status:'failed',webUrl:null,message:'Noch nicht eingerichtet',canManage:false,...props}));
 assert.ok(render({status:'ready',webUrl:folder.webUrl}).includes('Fotos in SharePoint öffnen'));
 assert.equal(render({status:'ready',webUrl:'https://evil.com'}).includes('href='),false);
 assert.equal(render({}).includes('<button'),false);
 assert.ok(render({canManage:true}).includes('Bereitstellung erneut versuchen'));
});
