-- Golește catalogul, ca seed-ul să poată fi rulat oricând de la zero
delete from catalog.products;
delete from catalog.categories;

insert into catalog.categories (name, sort_order) values
                                                      ('Ulei de măsline', 1),
                                                      ('Produse din măsline', 2),
                                                      ('Plante aromatice și condimente', 3),
                                                      ('Oțet balsamic', 4),
                                                      ('Dulcețuri și siropuri', 5);

insert into catalog.products (name, description, is_organic, category_id) values
                                                                              ('Ulei de măsline extravirgin bio',
                                                                               'Din livada proprie din Messinia, Grecia.',
                                                                               true,
                                                                               (select id from catalog.categories where name = 'Ulei de măsline')),
                                                                              ('Măsline',
                                                                               null,
                                                                               false,
                                                                               (select id from catalog.categories where name = 'Produse din măsline'));

insert into catalog.product_variants (product_id, pack_size, pack_unit, price) values
                                                                                   ((select id from catalog.products where name = 'Ulei de măsline extravirgin bio'), 250,  'ml', 25.00),
                                                                                   ((select id from catalog.products where name = 'Ulei de măsline extravirgin bio'), 500,  'ml', 50.00),
                                                                                   ((select id from catalog.products where name = 'Ulei de măsline extravirgin bio'), 1000, 'ml', 90.00),
                                                                                   ((select id from catalog.products where name = 'Ulei de măsline extravirgin bio'), 3000, 'ml', 255.00),
                                                                                   ((select id from catalog.products where name = 'Ulei de măsline extravirgin bio'), 5000, 'ml', 395.00),
                                                                                   ((select id from catalog.products where name = 'Măsline'), 2000, 'g', 85.00);