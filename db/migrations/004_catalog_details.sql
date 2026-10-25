alter table catalog.products
    add column slug       text unique,
    add column vat_rate   numeric(4,2) not null default 11 check (vat_rate >= 0),
    add column is_active  boolean not null default true;

alter table catalog.product_variants
    add column barcode text unique;