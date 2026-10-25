create table catalog.product_variants (
                                          id          uuid primary key default gen_random_uuid(),
                                          product_id  uuid not null references catalog.products(id) on delete cascade,
                                          pack_size   integer not null check (pack_size > 0),
                                          pack_unit   text not null check (pack_unit in ('g', 'ml')),
                                          price       numeric(10,2) not null check (price >= 0),
                                          stock       integer not null default 0 check (stock >= 0),
                                          unique (product_id, pack_size, pack_unit)
);

create index on catalog.product_variants (product_id);

alter table catalog.products
    drop column price,
    drop column pack_size,
    drop column pack_unit,
    drop column stock;