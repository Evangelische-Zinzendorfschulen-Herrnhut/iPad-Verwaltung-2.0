alter table public.inventory_component
  drop constraint if exists inventory_component_legacy_inventory_number_key;

create unique index inventory_component_owned_inventory_number_unique
  on public.inventory_component (legacy_inventory_number)
  where legacy_inventory_number is not null
    and legacy_inventory_number !~ '^M[0-9]{6}$';

create unique index inventory_component_rental_inventory_number_category_unique
  on public.inventory_component (legacy_inventory_number, category)
  where legacy_inventory_number ~ '^M[0-9]{6}$';

update public.inventory_component component
set legacy_inventory_number = ipad.legacy_inventory_number,
    updated_at = now()
from public.set_component_assignment assignment
join public.inventory_set inventory_set on inventory_set.id = assignment.set_id
join public.set_component_assignment ipad_assignment
  on ipad_assignment.set_id = assignment.set_id
  and ipad_assignment.role = 'ipad'
  and ipad_assignment.valid_until is null
join public.inventory_component ipad on ipad.id = ipad_assignment.component_id
where assignment.component_id = component.id
  and assignment.valid_until is null
  and inventory_set.acquisition_type = 'rented'
  and ipad.legacy_inventory_number ~ '^M[0-9]{6}$'
  and component.category in ('keyboard', 'pencil')
  and component.legacy_inventory_number is distinct from ipad.legacy_inventory_number;
