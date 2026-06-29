alter table public.app_user
  add column first_name text,
  add column last_name text;

comment on column public.app_user.first_name is
  'Vorname des lokalen App-Benutzers. Wird spaeter aus SSO-Profilclaims befuellt.';
comment on column public.app_user.last_name is
  'Nachname des lokalen App-Benutzers. Wird spaeter aus SSO-Profilclaims befuellt.';
