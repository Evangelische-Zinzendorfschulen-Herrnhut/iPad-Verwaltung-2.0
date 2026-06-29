insert into public.role (key, name, description)
values (
  'readonly',
  'Nur Lesen',
  'Darf freigegebene Personen-, Klassen-, Set-, Geräte-, Ausgabe-, Rückgabe- und Schadensfalldaten lesen, aber nicht bearbeiten.'
)
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description;

alter policy "admin and ipad_verwaltung read people"
  on public.person
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung', 'readonly']));

alter policy "admin and ipad_verwaltung read school years"
  on public.school_year
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung', 'readonly']));

alter policy "admin and ipad_verwaltung read school classes"
  on public.school_class
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung', 'readonly']));

alter policy "admin and ipad_verwaltung read class assignments"
  on public.person_class_assignment
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung', 'readonly']));

alter policy "admin and ipad_verwaltung read inventory components"
  on public.inventory_component
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung', 'readonly']));

alter policy "admin and ipad_verwaltung read inventory sets"
  on public.inventory_set
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung', 'readonly']));

alter policy "admin and ipad_verwaltung read set component assignments"
  on public.set_component_assignment
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung', 'readonly']));

alter policy "admin and ipad_verwaltung read set person assignments"
  on public.set_person_assignment
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung', 'readonly']));

alter policy "admin and ipad_verwaltung read damage cases"
  on public.damage_case
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung', 'readonly']));

alter policy "admin and ipad_verwaltung read set supplemental assignments"
  on public.set_supplemental_assignment
  using (public.current_app_user_has_any_role(array['admin', 'ipad_verwaltung', 'readonly']));

alter policy "admin ipad_verwaltung and buchhaltung read purchase invoices"
  on public.purchase_invoice
  using (
    public.current_app_user_has_any_role(array[
      'admin',
      'ipad_verwaltung',
      'buchhaltung',
      'readonly'
    ])
  );

alter policy "admin ipad_verwaltung and buchhaltung read purchase invoice positions"
  on public.purchase_invoice_position
  using (
    public.current_app_user_has_any_role(array[
      'admin',
      'ipad_verwaltung',
      'buchhaltung',
      'readonly'
    ])
  );
