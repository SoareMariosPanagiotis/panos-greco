-- 030: Factura în PDF, păstrată (arhivată) și descărcabilă din site, ca la magazinele mari.
--
-- Până acum poștașul făcea PDF-ul doar ca să-l pună în mail. De acum îl face o singură dată,
-- imediat după emitere, și îl păstrăm în baza de date, în tabelul sales.invoice_documents:
--   - clientul îl descarcă de pe pagina comenzii (cu linkul din mail sau din „Contul meu”);
--   - tu îl descarci din admin;
--   - mailul atașează exact fișierul arhivat: ce a primit clientul = ce e în arhivă.
-- Ca factura emisă, un PDF arhivat nu se mai schimbă și nu se șterge.
--
-- Drumul unei facturi:
--   emiți → rând nou în sales.invoice_documents, încă fără PDF
--         → poștașul face PDF-ul și îl salvează (în câteva secunde)
--         → abia apoi pleacă mailul, cu PDF-ul arhivat atașat
--
-- Se poate rula de mai multe ori.

begin;

-- ---------- 1. Numele fișierului ----------
-- „Factura-PGW-3002.pdf”, „Stornare-PGW-3003.pdf”. Același nume în mail, pe site și în admin.
-- O ciornă nu are încă serie și număr, deci nici nume (null).
create or replace function sales.invoices_file_name(i sales.invoices)
    returns text
    language sql
    immutable
as $$
    select case when i.kind = 'storno' then 'Stornare' else 'Factura' end
           || '-' || i.series || '-' || i.number || '.pdf';
$$;

-- ---------- 2. Arhiva PDF-urilor ----------
-- Un rând pentru fiecare factură emisă. Cât timp pdf e gol, rândul stă în coada poștașului;
-- attempts, last_error și locked_until sunt pentru reîncercări, ca la mailuri.
create table if not exists sales.invoice_documents (
    invoice_id   uuid primary key references sales.invoices (id),
    pdf          bytea,
    rendered_at  timestamptz,
    created_at   timestamptz not null default now(),
    attempts     integer not null default 0,
    last_error   text,
    locked_until timestamptz,
    constraint invoice_documents_pdf_rendered check ((pdf is null) = (rendered_at is null))
);

-- PDF-ul e deja comprimat pe dinăuntru: Postgres nu mai încearcă să-l comprime încă o dată
alter table sales.invoice_documents alter column pdf set storage external;

-- Poștașul caută doar rândurile fără PDF: indexul le ține separat
create index if not exists invoice_documents_pending_idx
    on sales.invoice_documents (created_at)
    where pdf is null;

-- Un PDF arhivat nu se schimbă și nu se șterge (ca factura emisă, migrația 028)
create or replace function sales.protect_invoice_document()
    returns trigger
    language plpgsql
    set search_path = pg_catalog, pg_temp
as $$
begin
    if tg_op = 'DELETE' then
        if old.pdf is not null then
            raise exception 'PDF-ul unei facturi emise se păstrează: nu se șterge.';
        end if;
        return old;
    end if;
    if old.pdf is not null and new.pdf is distinct from old.pdf then
        raise exception 'PDF-ul unei facturi emise nu se mai schimbă.';
    end if;
    return new;
end;
$$;

drop trigger if exists invoice_documents_protect on sales.invoice_documents;
create trigger invoice_documents_protect
    before update or delete on sales.invoice_documents
    for each row
    execute function sales.protect_invoice_document();

-- Fiecare factură emisă (și fiecare stornare) intră în coada poștașului
create or replace function sales.queue_invoice_document()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
begin
    insert into sales.invoice_documents (invoice_id)
    values (new.id)
    on conflict on constraint invoice_documents_pkey do nothing;
    return null;
end;
$$;

drop trigger if exists invoices_queue_document on sales.invoices;
create trigger invoices_queue_document
    after update of status on sales.invoices
    for each row
    when (old.status = 'draft' and new.status = 'issued')
    execute function sales.queue_invoice_document();

-- Facturile emise înainte de migrația asta primesc și ele PDF-ul arhivat
insert into sales.invoice_documents (invoice_id, created_at)
select i.id, coalesce(i.issued_at, now())
from sales.invoices i
where i.status = 'issued'
on conflict on constraint invoice_documents_pkey do nothing;

-- ---------- 3. Poștașul: face PDF-urile și le arhivează ----------

-- Tot ce trebuie pentru PDF și pentru mail, într-un singur JSON
create or replace function mailer.invoice_data(target uuid)
    returns jsonb
    language sql
    stable
    set search_path = pg_catalog, pg_temp
as $$
    select jsonb_build_object(
        'invoice', to_jsonb(i) - 'issued_by',
        'file_name', sales.invoices_file_name(i),
        'lines', (select coalesce(jsonb_agg(to_jsonb(l) order by l.line_no), '[]'::jsonb)
                  from sales.invoice_lines l where l.invoice_id = i.id),
        'original', (select jsonb_build_object('series', s.series, 'number', s.number, 'issue_date', s.issue_date)
                     from sales.invoices s where s.id = i.storno_of),
        'order', jsonb_build_object('id', o.id, 'order_number', o.order_number, 'first_name', o.first_name,
                                    'has_account', o.user_id is not null),
        'shop', (select to_jsonb(s) - 'id' - 'updated_at' from sales.shop_info s where s.id)
    )
    from sales.invoices i
    join sales.orders o on o.id = i.order_id
    where i.id = target;
$$;

-- Ia facturile fără PDF și le rezervă 2 minute (alt poștaș pornit în paralel nu le mai ia)
create or replace function mailer.claim_invoice_documents(batch_size integer default 5)
    returns table (invoice_id uuid, attempts integer, data jsonb)
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    with picked as (
        select d.invoice_id
        from sales.invoice_documents d
        where d.pdf is null
          and (d.locked_until is null or d.locked_until < now())
        order by d.created_at
        limit batch_size
        for update skip locked
    ),
    claimed as (
        update sales.invoice_documents d
        set locked_until = now() + interval '2 minutes'
        from picked
        where d.invoice_id = picked.invoice_id
        returning d.invoice_id, d.attempts, d.created_at
    )
    select c.invoice_id, c.attempts, mailer.invoice_data(c.invoice_id)
    from claimed c
    order by c.created_at;
$$;

-- PDF-ul e gata: îl arhivăm. Verificăm că e chiar un PDF (orice PDF începe cu „%PDF-”).
create or replace function mailer.complete_invoice_document(target uuid, file bytea)
    returns void
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
begin
    if file is null or substring(file from 1 for 5) <> convert_to('%PDF-', 'UTF8') then
        raise exception 'Fișierul primit nu e un PDF.';
    end if;

    update sales.invoice_documents d
    set pdf          = file,
        rendered_at  = now(),
        locked_until = null,
        last_error   = null
    where d.invoice_id = target
      and d.pdf is null;
end;
$$;

-- N-a mers (de exemplu, lipsește biblioteca pdf-lib): notăm eroarea și reîncercăm după 1, 2, 3...
-- minute, cel mult la 30 de minute. Nu renunțăm: după ce repari, PDF-ul se face singur.
create or replace function mailer.fail_invoice_document(target uuid, error_message text)
    returns void
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    update sales.invoice_documents d
    set attempts     = d.attempts + 1,
        last_error   = left(error_message, 500),
        locked_until = now() + make_interval(mins => least(d.attempts + 1, 30))
    where d.invoice_id = target
      and d.pdf is null;
$$;

-- Mailul cu factura (migrația 029) pleacă doar după ce PDF-ul e arhivat și atașează exact PDF-ul
-- arhivat. Funcția întoarce acum și PDF-ul, așa că o facem din nou (alt tip de rezultat).
drop function if exists mailer.claim_invoice_emails(integer);
create function mailer.claim_invoice_emails(batch_size integer default 10)
    returns table (invoice_id uuid, attempts integer, data jsonb, pdf bytea)
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    with picked as (
        select e.invoice_id
        from sales.invoice_emails e
        join sales.invoice_documents d on d.invoice_id = e.invoice_id
        where e.sent_at is null
          and e.attempts < 8
          and (e.locked_until is null or e.locked_until < now())
          and d.pdf is not null
        order by e.created_at
        limit batch_size
        for update of e skip locked
    ),
    claimed as (
        update sales.invoice_emails e
        set locked_until = now() + interval '2 minutes'
        from picked
        where e.invoice_id = picked.invoice_id
        returning e.invoice_id, e.attempts, e.email, e.created_at
    )
    select c.invoice_id,
           c.attempts,
           mailer.invoice_data(c.invoice_id) || jsonb_build_object('email', c.email),
           d.pdf
    from claimed c
    join sales.invoice_documents d on d.invoice_id = c.invoice_id
    order by c.created_at;
$$;

-- ---------- 4. Ce vede clientul pe site ----------

-- Facturile comenzii, pe pagina comenzii: doar cele emise, fără nimic din interiorul lor.
-- Rândul comenzii îl primește doar cine are voie să-l vadă: clientul prin RLS (comenzile lui),
-- vizitatorul prin linkul din mail (sales.order_receipt, 30 de zile).
create or replace function sales.orders_invoice_files(o sales.orders)
    returns jsonb
    language sql
    stable
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    select coalesce(jsonb_agg(jsonb_build_object(
               'id', i.id,
               'kind', i.kind,
               'series', i.series,
               'number', i.number,
               'issueDate', i.issue_date,
               'total', i.total,
               'ready', d.rendered_at is not null
           ) order by i.issued_at), '[]'::jsonb)
    from sales.invoices i
    left join sales.invoice_documents d on d.invoice_id = i.id
    where i.order_id = o.id
      and i.status = 'issued';
$$;

-- PDF-ul de descărcat. Îl primește:
--   - adminul: orice factură emisă;
--   - clientul conectat: facturile comenzilor lui, oricând;
--   - cine are linkul din mail (receipt_id = id-ul comenzii): 30 de zile de la emiterea facturii,
--     ca pagina comenzii. După aceea îi rămân PDF-ul atașat la mail și, dacă are cont, contul.
-- Răspunsul e JSON: { fileName, pdf } cu PDF-ul ca text base64. pdf e null cât timp poștașul
-- încă îl pregătește. Fără drept (sau factură inexistentă): null, fără să spunem care din ele.
create or replace function sales.invoice_pdf(invoice_id uuid, receipt_id uuid default null)
    returns jsonb
    language plpgsql
    stable
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_invoice sales.invoices;
    v_owner   uuid;
    v_user    uuid    := nullif(current_setting('jwt.claims.user_id', true), '')::uuid;
    v_admin   boolean := current_setting('jwt.claims.role', true) = 'panos_admin';
    v_allowed boolean;
    v_pdf     bytea;
begin
    select i.* into v_invoice
    from sales.invoices i
    where i.id = invoice_pdf.invoice_id
      and i.status = 'issued';
    if v_invoice.id is null then
        return null;
    end if;

    select o.user_id into v_owner
    from sales.orders o
    where o.id = v_invoice.order_id;

    v_allowed := v_admin
                 or v_owner = v_user
                 or (invoice_pdf.receipt_id = v_invoice.order_id
                     and v_invoice.issued_at > now() - interval '30 days');

    -- Atenție la null: o comandă fără cont are v_owner null, un vizitator are v_user null, iar
    -- null = ceva dă null („nu știu”), nu false. De aceea întrebăm „e sigur adevărat?” (is true):
    -- orice altceva, inclusiv null, înseamnă „nu are voie”.
    if v_allowed is not true then
        return null;
    end if;

    select d.pdf into v_pdf
    from sales.invoice_documents d
    where d.invoice_id = v_invoice.id;

    return jsonb_build_object(
        'fileName', sales.invoices_file_name(v_invoice),
        'pdf', translate(encode(v_pdf, 'base64'), E'\n', '')
    );
end;
$$;

-- Pentru admin: e gata PDF-ul? Dacă nu, de ce?
create or replace function sales.invoices_pdf_status(i sales.invoices)
    returns jsonb
    language sql
    stable
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    select jsonb_build_object(
        'ready', d.rendered_at is not null,
        'renderedAt', d.rendered_at,
        'bytes', octet_length(d.pdf),
        'attempts', d.attempts,
        'lastError', d.last_error
    )
    from sales.invoice_documents d
    where d.invoice_id = i.id;
$$;

-- ---------- 5. „Trimite din nou pe email” grăbește și PDF-ul ----------
-- Aceeași funcție ca în migrația 029, plus un pas: dacă PDF-ul nu e gata încă (de exemplu,
-- poștașul a dat de o eroare și așteaptă până la următoarea încercare), îl reîncearcă acum.
-- „create or replace” păstrează dreptul dat adminului în 029.
create or replace function sales.resend_invoice_email(invoice_id uuid)
    returns boolean
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_invoice sales.invoices;
begin
    select i.* into v_invoice from sales.invoices i where i.id = resend_invoice_email.invoice_id;
    if v_invoice.id is null or v_invoice.status <> 'issued' then
        raise exception 'Doar o factură emisă se trimite pe email.';
    end if;
    if v_invoice.buyer_email is null then
        raise exception 'Factura nu are adresa de email a clientului.';
    end if;

    insert into sales.invoice_emails (invoice_id, email)
    values (v_invoice.id, v_invoice.buyer_email)
    on conflict on constraint invoice_emails_pkey do update
        set email = excluded.email, sent_at = null, attempts = 0, last_error = null, locked_until = null,
            created_at = now();

    update sales.invoice_documents d
    set locked_until = null
    where d.invoice_id = v_invoice.id
      and d.pdf is null;
    return true;
end;
$$;

-- ---------- 6. API și drepturi ----------

comment on table sales.invoice_documents is E'@omit';

alter table sales.invoice_documents enable row level security; -- nimeni din API nu o citește direct

grant execute on function sales.invoices_file_name(sales.invoices) to panos_admin;
grant execute on function sales.invoices_pdf_status(sales.invoices) to panos_admin;
grant execute on function sales.orders_invoice_files(sales.orders) to panos_anonymous;
grant execute on function sales.invoice_pdf(uuid, uuid) to panos_anonymous;

grant execute on function mailer.claim_invoice_documents(integer) to panos_mailer;
grant execute on function mailer.complete_invoice_document(uuid, bytea) to panos_mailer;
grant execute on function mailer.fail_invoice_document(uuid, text) to panos_mailer;
grant execute on function mailer.claim_invoice_emails(integer) to panos_mailer;

commit;
