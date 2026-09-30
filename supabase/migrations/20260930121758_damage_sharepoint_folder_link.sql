-- Folder references are readable with the case, but writable only by the server.
create table public.damage_sharepoint_folder (
 damage_case_id uuid primary key references public.damage_case(id) on delete restrict,
 folder_name text not null check (length(folder_name) between 1 and 180),
 drive_id text,
 parent_item_id text,
 client_id text,
 item_id text,
 web_url text check (web_url is null or web_url ~ '^https://ezshde[.]sharepoint[.]com/'),
 status text not null default 'pending' check (status in ('pending','provisioning','ready','failed')),
 error_code text,
 lease_token uuid,
 lease_until timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (status <> 'ready' or (drive_id is not null and item_id is not null and web_url is not null))
);
create unique index damage_sharepoint_folder_item_unique on public.damage_sharepoint_folder(drive_id,item_id) where item_id is not null;
create table public.damage_sharepoint_folder_audit (
 id uuid primary key default gen_random_uuid(),
 damage_case_id uuid not null references public.damage_case(id) on delete restrict,
 actor_id uuid not null references public.app_user(id),
 event text not null check (event in ('requested','ready','failed')),
 error_code text,
 created_at timestamptz not null default now()
);
alter table public.damage_sharepoint_folder enable row level security;
alter table public.damage_sharepoint_folder_audit enable row level security;
revoke all on public.damage_sharepoint_folder, public.damage_sharepoint_folder_audit from anon, authenticated;
grant select on public.damage_sharepoint_folder to authenticated;
grant select on public.damage_sharepoint_folder_audit to authenticated;
grant all on public.damage_sharepoint_folder, public.damage_sharepoint_folder_audit to service_role;
create policy folder_read_with_case on public.damage_sharepoint_folder for select to authenticated
 using (exists (select 1 from public.damage_case d where d.id = damage_case_id));
create policy folder_audit_read_managers on public.damage_sharepoint_folder_audit for select to authenticated
 using (public.current_app_user_has_any_role(array['admin','ipad_verwaltung']));

-- SECURITY INVOKER, exclusively callable by the privileged server. Each function
-- also validates the supplied app actor; browser callers cannot supply an actor.
create function public.claim_damage_sharepoint_folder(p_case_id uuid, p_actor_id uuid, p_name text,
 p_drive_id text, p_parent_id text, p_client_id text, p_request uuid)
returns setof public.damage_sharepoint_folder language plpgsql security invoker set search_path = public as $$
declare f public.damage_sharepoint_folder; token uuid;
begin
 if not exists (select 1 from public.app_user u join public.user_role ur on ur.app_user_id=u.id
 join public.role r on r.id=ur.role_id where u.id=p_actor_id and u.status='active' and r.key in ('admin','ipad_verwaltung')) then
 raise exception 'Not authorized'; end if;
 -- Serialize insertion and claiming, including two requests for a new case.
 perform 1 from public.damage_case where id=p_case_id for update;
 if not found then raise exception 'Case not found'; end if;
 insert into public.damage_sharepoint_folder(damage_case_id,folder_name)
 values(p_case_id,p_name) on conflict do nothing;
 select * into f from public.damage_sharepoint_folder where damage_case_id=p_case_id for update;
 if f.status='ready' or (f.status='provisioning' and f.lease_until > now()) then return next f; return; end if;
 -- Once configured, recovery never silently switches destination or application.
 if f.drive_id is not null and (f.drive_id is distinct from p_drive_id or f.parent_item_id is distinct from p_parent_id or f.client_id is distinct from p_client_id) then
 raise exception 'Destination changed'; end if;
 token := p_request;
 update public.damage_sharepoint_folder set status='provisioning', error_code=null,
 drive_id=p_drive_id,parent_item_id=p_parent_id,client_id=p_client_id,
 lease_token=token,lease_until=now()+interval '2 minutes',updated_at=now()
 where damage_case_id=p_case_id returning * into f;
 insert into public.damage_sharepoint_folder_audit(damage_case_id,actor_id,event) values(p_case_id,p_actor_id,'requested');
 return next f;
end $$;

create function public.finish_damage_sharepoint_folder(p_case_id uuid,p_actor_id uuid,p_token uuid,
 p_item_id text,p_web_url text,p_error text)
returns boolean language plpgsql security invoker set search_path = public as $$
begin
 if not exists (select 1 from public.app_user u join public.user_role ur on ur.app_user_id=u.id
 join public.role r on r.id=ur.role_id where u.id=p_actor_id and u.status='active' and r.key in ('admin','ipad_verwaltung')) then
 raise exception 'Not authorized'; end if;
 if p_error is not null and p_error not in ('not_configured','graph_auth','graph_access','graph_unavailable','folder_conflict','invalid_response','destination_changed') then
 raise exception 'Invalid error code'; end if;
 update public.damage_sharepoint_folder set status=case when p_error is null then 'ready' else 'failed' end,
 item_id=case when p_error is null then p_item_id else null end,
 web_url=case when p_error is null then p_web_url else null end,error_code=p_error,
 lease_until=null,lease_token=null,updated_at=now()
 where damage_case_id=p_case_id and status='provisioning' and lease_token=p_token;
 if not found then return false; end if;
 insert into public.damage_sharepoint_folder_audit(damage_case_id,actor_id,event,error_code)
 values(p_case_id,p_actor_id,case when p_error is null then 'ready' else 'failed' end,p_error);
 return true;
end $$;
revoke all on function public.claim_damage_sharepoint_folder(uuid,uuid,text,text,text,text,uuid) from public,anon,authenticated;
revoke all on function public.finish_damage_sharepoint_folder(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_damage_sharepoint_folder(uuid,uuid,text,text,text,text,uuid) to service_role;
grant execute on function public.finish_damage_sharepoint_folder(uuid,uuid,uuid,text,text,text) to service_role;
