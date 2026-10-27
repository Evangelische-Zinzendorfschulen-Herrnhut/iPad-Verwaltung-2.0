-- Separate Unterrichtsnutzung und regulaere Ausgabe, ohne Bestands-Backfill.
alter table public.set_person_assignment
  add column ipad_introduction_at date;

alter table public.set_person_assignment
  add constraint set_person_assignment_introduction_dates_valid check (
    ipad_introduction_at is null or (
      (issued_at is null or issued_at >= ipad_introduction_at)
      and (returned_at is null or returned_at >= ipad_introduction_at)
    )
  );

comment on column public.set_person_assignment.ipad_introduction_at is
  'Beginn der eingeschraenkten Unterrichtsnutzung im Wagen; issued_at bezeichnet weiterhin erst die regulaere Ausgabe zur Mitnahme.';

alter type public.set_availability add value if not exists 'ipad_einfuehrung';
