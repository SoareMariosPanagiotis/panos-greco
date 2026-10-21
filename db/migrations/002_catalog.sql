create schema catalog;

create table catalog.categories (
                                    id          uuid primary key default gen_random_uuid(),
                                    name        text not null unique,
                                    sort_order  integer not null default 0
);

create table catalog.products (
                                  id           uuid primary key default gen_random_uuid(),
                                  name         text not null,
                                  description  text,
                                  price        numeric(10,2) not null check (price >= 0),
                                  pack_size    integer not null check (pack_size > 0),
                                  pack_unit    text not null check (pack_unit in ('g', 'ml')),
                                  stock        integer not null default 0 check (stock >= 0),
                                  is_organic   boolean not null default false,
                                  image_url    text,
                                  category_id  uuid not null references catalog.categories(id)
);