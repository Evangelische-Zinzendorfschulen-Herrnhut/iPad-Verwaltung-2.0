create extension if not exists pg_trgm
  with schema extensions;

create index if not exists inventory_component_category_inventory_idx
  on public.inventory_component (category, legacy_inventory_number);

create index if not exists inventory_component_condition_inventory_idx
  on public.inventory_component (condition, legacy_inventory_number);

create index if not exists inventory_component_legacy_set_number_idx
  on public.inventory_component (legacy_set_number);

create index if not exists inventory_component_legacy_inventory_trgm_idx
  on public.inventory_component
  using gin (legacy_inventory_number extensions.gin_trgm_ops);

create index if not exists inventory_set_availability_legacy_set_id_idx
  on public.inventory_set (availability, legacy_set_id);

create index if not exists inventory_set_condition_legacy_set_id_idx
  on public.inventory_set (condition, legacy_set_id);

create index if not exists set_component_assignment_current_component_idx
  on public.set_component_assignment (component_id)
  where valid_until is null;

create index if not exists set_component_assignment_current_set_idx
  on public.set_component_assignment (set_id)
  where valid_until is null;

create index if not exists set_person_assignment_current_set_idx
  on public.set_person_assignment (set_id)
  where returned_at is null;

create index if not exists set_person_assignment_current_person_idx
  on public.set_person_assignment (person_id)
  where returned_at is null;

create index if not exists person_class_assignment_current_person_idx
  on public.person_class_assignment (person_id)
  where valid_until is null;

create index if not exists person_class_assignment_current_class_idx
  on public.person_class_assignment (school_class_id)
  where valid_until is null;

create index if not exists damage_case_reported_number_idx
  on public.damage_case (reported_at desc, damage_number desc);

create index if not exists task_status_due_created_idx
  on public.task (status, due_date, created_at desc);

create or replace function public.inventory_component_list(
  p_query text default null,
  p_set_filter text default null,
  p_category text default null,
  p_condition text default null,
  p_assignment_filter text default null,
  p_sort text default 'inventory',
  p_limit integer default 75,
  p_offset integer default 0
)
returns table (
  id uuid,
  legacy_inventory_number text,
  legacy_set_number integer,
  category text,
  manufacturer text,
  model text,
  condition text,
  legacy_status text,
  serial_number text,
  invoice_position_number integer,
  notes text,
  purchase_date date,
  storage_label text,
  invoice_legacy_position_number integer,
  invoice_date date,
  invoice_legacy_number integer,
  invoice_supplier text,
  assignment_component_id uuid,
  assignment_role text,
  set_legacy_set_id integer,
  set_availability text,
  set_condition text,
  set_storage_label text,
  component_count bigint,
  assigned_count bigint,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with normalized_params as (
    select
      nullif(trim(p_query), '') as query,
      nullif(trim(p_set_filter), '') as set_filter,
      coalesce(nullif(ltrim(nullif(trim(p_set_filter), ''), '0'), ''), '0') as normalized_set_filter,
      nullif(trim(p_category), '') as category,
      nullif(trim(p_condition), '') as condition,
      nullif(trim(p_assignment_filter), '') as assignment_filter,
      coalesce(nullif(trim(p_sort), ''), 'inventory') as sort,
      greatest(1, least(coalesce(p_limit, 75), 200)) as limit_value,
      greatest(0, coalesce(p_offset, 0)) as offset_value
  ),
  filtered_rows as (
    select
      component.id,
      component.legacy_inventory_number,
      component.legacy_set_number,
      component.category::text as category,
      component.manufacturer,
      component.model,
      component.condition::text as condition,
      component.legacy_status,
      component.serial_number,
      component.invoice_position_number,
      component.notes,
      component.purchase_date,
      component.storage_label,
      invoice_position.legacy_invoice_position_number as invoice_legacy_position_number,
      invoice.invoice_date,
      invoice.legacy_invoice_number as invoice_legacy_number,
      invoice.supplier as invoice_supplier,
      assignment.component_id as assignment_component_id,
      assignment.role::text as assignment_role,
      inventory_set.legacy_set_id as set_legacy_set_id,
      inventory_set.availability::text as set_availability,
      inventory_set.condition::text as set_condition,
      inventory_set.storage_label as set_storage_label
    from public.inventory_component component
    left join public.purchase_invoice_position invoice_position
      on invoice_position.id = component.invoice_position_id
    left join public.purchase_invoice invoice
      on invoice.id = invoice_position.invoice_id
    left join public.set_component_assignment assignment
      on assignment.component_id = component.id
      and assignment.valid_until is null
    left join public.inventory_set inventory_set
      on inventory_set.id = assignment.set_id
    cross join normalized_params params
    where (params.category is null or component.category::text = params.category)
      and (params.condition is null or component.condition::text = params.condition)
      and (
        params.assignment_filter is null
        or (params.assignment_filter = 'set' and inventory_set.id is not null)
        or (params.assignment_filter = 'free_set' and inventory_set.availability = 'frei')
        or (
          params.assignment_filter = 'assigned_set'
          and inventory_set.id is not null
          and inventory_set.availability <> 'frei'
        )
        or (params.assignment_filter = 'unassigned' and inventory_set.id is null)
      )
      and (
        params.set_filter is null
        or component.legacy_set_number::text = params.set_filter
        or inventory_set.legacy_set_id::text = params.set_filter
        or coalesce(
          nullif(
            ltrim(
              substring(component.legacy_inventory_number from '/\s*([0-9]+)\s*$'),
              '0'
            ),
            ''
          ),
          '0'
        ) = params.normalized_set_filter
      )
      and (
        params.query is null
        or component.legacy_inventory_number ilike '%' || params.query || '%'
        or component.manufacturer ilike '%' || params.query || '%'
        or component.model ilike '%' || params.query || '%'
        or component.serial_number ilike '%' || params.query || '%'
        or component.legacy_status ilike '%' || params.query || '%'
        or component.storage_label ilike '%' || params.query || '%'
        or component.notes ilike '%' || params.query || '%'
        or component.purchase_date::text ilike '%' || params.query || '%'
        or assignment.role::text ilike '%' || params.query || '%'
        or inventory_set.legacy_set_id::text ilike '%' || params.query || '%'
        or inventory_set.availability::text ilike '%' || params.query || '%'
      )
  ),
  counted_rows as (
    select
      filtered_rows.*,
      (select count(*) from public.inventory_component) as component_count,
      (
        select count(*)
        from public.set_component_assignment
        where valid_until is null
      ) as assigned_count,
      count(*) over () as total_count
    from filtered_rows
  )
  select counted_rows.*
  from counted_rows
  cross join normalized_params params
  order by
    case when params.sort = 'category' then counted_rows.category end asc,
    case when params.sort = 'condition' then counted_rows.condition end asc,
    case when params.sort = 'set' then counted_rows.set_legacy_set_id end asc nulls last,
    counted_rows.legacy_inventory_number asc
  limit (select limit_value from normalized_params)
  offset (select offset_value from normalized_params);
$$;
