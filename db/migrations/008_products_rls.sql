-- Drepturi pe rând: fiecare cerere vede doar rândurile permise
alter table catalog.products enable row level security;

-- Vizitatorii și clienții văd doar produsele active
create policy products_public_read on catalog.products
  for select to panos_anonymous
                 using (is_active);

-- Adminul vede și modifică toate produsele, inclusiv pe cele ascunse
create policy products_admin_all on catalog.products
  for all to panos_admin
  using (true)
  with check (true);