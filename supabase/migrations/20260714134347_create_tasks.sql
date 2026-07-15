-- Aufgabenverwaltung
-- Grundlage: specs/features/011-task-management.md

create type public.task_status as enum (
  'offen',
  'in_bearbeitung',
  'erledigt',
  'archiviert'
);

create type public.task_priority as enum (
  'normal',
  'hoch'
);

create table public.task (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.task_status not null default 'offen',
  priority public.task_priority not null default 'normal',
  due_date date,
  created_by_user_id uuid not null references public.app_user(id),
  completed_by_user_id uuid references public.app_user(id),
  completed_at timestamptz,
  related_object_type text,
  related_object_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_title_not_blank check (length(btrim(title)) > 0),
  constraint task_related_object_type_known check (
    related_object_type is null
    or related_object_type in (
      'person',
      'set',
      'komponente',
      'ausleihe',
      'schadensfall',
      'zahlungsforderung'
    )
  ),
  constraint task_related_object_complete check (
    (related_object_type is null and related_object_id is null)
    or (related_object_type is not null and related_object_id is not null)
  ),
  constraint task_completed_fields_consistent check (
    (
      status = 'erledigt'
      and completed_at is not null
      and completed_by_user_id is not null
    )
    or (
      status <> 'erledigt'
      and completed_at is null
      and completed_by_user_id is null
    )
  )
);

create table public.task_audit_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.task(id) on delete cascade,
  actor_user_id uuid references public.app_user(id),
  action text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index task_status_due_date_idx on public.task (status, due_date);
create index task_priority_due_date_idx on public.task (priority, due_date);
create index task_created_by_user_idx on public.task (created_by_user_id);
create index task_related_object_idx
  on public.task (related_object_type, related_object_id);
create index task_audit_log_task_idx on public.task_audit_log (task_id, created_at);

create trigger task_set_updated_at
  before update on public.task
  for each row execute function public.set_updated_at();

create or replace function public.log_task_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
begin
  actor_id := public.current_app_user_id();

  if tg_op = 'INSERT' then
    insert into public.task_audit_log (
      task_id,
      actor_user_id,
      action,
      new_values
    )
    values (
      new.id,
      actor_id,
      'created',
      to_jsonb(new)
    );

    return new;
  end if;

  if tg_op = 'UPDATE' then
    insert into public.task_audit_log (
      task_id,
      actor_user_id,
      action,
      old_values,
      new_values
    )
    values (
      new.id,
      actor_id,
      case
        when old.status is distinct from new.status then 'status_changed'
        else 'updated'
      end,
      to_jsonb(old),
      to_jsonb(new)
    );

    return new;
  end if;

  return null;
end;
$$;

create trigger task_audit_insert_update
  after insert or update on public.task
  for each row execute function public.log_task_audit();

revoke execute on function public.log_task_audit() from public;
revoke execute on function public.log_task_audit() from anon;
revoke execute on function public.log_task_audit() from authenticated;

alter table public.task enable row level security;
alter table public.task_audit_log enable row level security;

create policy "admins manage tasks"
  on public.task
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins read task audit logs"
  on public.task_audit_log
  for select
  to authenticated
  using (public.is_admin());

comment on table public.task is
  'Admin-only Aufgabenverwaltung fuer operative Folgearbeiten.';
comment on table public.task_audit_log is
  'Audit-Historie fuer Aufgabenanlage und Aufgabenänderungen.';
