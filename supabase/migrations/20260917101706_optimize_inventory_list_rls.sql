-- The role helpers return one value for the whole statement. Wrapping them in
-- scalar subqueries lets Postgres cache that value as an initPlan instead of
-- evaluating the same role lookup for every row scanned by the inventory list.
alter policy "admin and ipad_verwaltung read inventory components"
  on public.inventory_component
  using ((select public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung', 'readonly'])));

alter policy "admin manages inventory components"
  on public.inventory_component
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

alter policy "admin and ipad_verwaltung read inventory sets"
  on public.inventory_set
  using ((select public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung', 'readonly'])));

alter policy "admin and ipad_verwaltung manage inventory sets"
  on public.inventory_set
  using ((select public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung'])))
  with check ((select public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung'])));

alter policy "admin and ipad_verwaltung read set component assignments"
  on public.set_component_assignment
  using ((select public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung', 'readonly'])));

alter policy "admin manages set component assignments"
  on public.set_component_assignment
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
