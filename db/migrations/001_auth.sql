create schema auth;

create table auth.users (
                            id            uuid primary key default gen_random_uuid(),
                            email         text not null unique,
                            password_hash text not null,
                            role          text not null default 'client'
                                check (role in ('admin', 'angajat', 'client')),
                            created_at    timestamptz not null default now()
);