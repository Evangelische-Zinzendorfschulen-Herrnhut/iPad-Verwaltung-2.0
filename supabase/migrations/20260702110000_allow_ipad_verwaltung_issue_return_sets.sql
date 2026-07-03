drop policy if exists "admin manages inventory sets" on public.inventory_set;
drop policy if exists "admin manages set person assignments" on public.set_person_assignment;

create policy "admin and ipad_verwaltung manage inventory sets"
  on public.inventory_set
  for all
  to authenticated
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']))
  with check (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']));

create policy "admin and ipad_verwaltung manage set person assignments"
  on public.set_person_assignment
  for all
  to authenticated
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']))
  with check (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung']));
