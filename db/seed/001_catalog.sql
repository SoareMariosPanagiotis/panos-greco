-- Golește catalogul, ca seed-ul să poată fi rulat oricând de la zero
delete from catalog.products;
delete from catalog.categories;

insert into catalog.categories (name, slug, sort_order) values
                                                            ('Ulei de măsline', 'ulei-de-masline', 1),
                                                            ('Măsline și pastă de măsline', 'masline', 2),
                                                            ('Oțet balsamic și sosuri', 'otet-balsamic-si-sosuri', 3),
                                                            ('Condimente și plante aromatice', 'condimente', 4),
                                                            ('Ceaiuri', 'ceaiuri', 5),
                                                            ('Dulcețuri și marmelade', 'dulceturi-si-marmelade', 6),
                                                            ('Siropuri și sucuri concentrate', 'siropuri', 7),
                                                            ('Miere', 'miere', 8),
                                                            ('Fructe uscate', 'fructe-uscate', 9),
                                                            ('Cafea', 'cafea', 10);

-- Un rând = un articol din MicroERP. Rândurile cu același slug devin
-- un singur produs cu mai multe variante (mărimi).
with articles (category, name, slug, is_organic, vat_rate, pack_size, pack_unit, price, barcode) as (
    values
        -- Ulei de măsline
        ('Ulei de măsline', 'Ulei de măsline extravirgin bio', 'ulei-de-masline-extravirgin-bio', true, 11, 250,  'ml', 25.00,  '5214001645022'),
        ('Ulei de măsline', 'Ulei de măsline extravirgin bio', 'ulei-de-masline-extravirgin-bio', true, 11, 500,  'ml', 50.00,  '5214001645039'),
        ('Ulei de măsline', 'Ulei de măsline extravirgin bio', 'ulei-de-masline-extravirgin-bio', true, 11, 1000, 'ml', 90.00,  '5214001645053'),
        ('Ulei de măsline', 'Ulei de măsline extravirgin bio', 'ulei-de-masline-extravirgin-bio', true, 11, 3000, 'ml', 255.00, '5214001645060'),
        ('Ulei de măsline', 'Ulei de măsline extravirgin bio', 'ulei-de-masline-extravirgin-bio', true, 11, 5000, 'ml', 395.00, '5214001645077'),

        -- Măsline și pastă de măsline
        ('Măsline și pastă de măsline', 'Măsline Kalamon', 'masline-kalamon', false, 11, 200,  'g', 20.00, '5214001645268'),
        ('Măsline și pastă de măsline', 'Măsline Kalamon', 'masline-kalamon', false, 11, 2000, 'g', 85.00, '5214001645084'),
        ('Măsline și pastă de măsline', 'Măsline Kalamon feliate', 'masline-kalamon-feliate', false, 11, 180, 'g', 20.00, '5214001645282'),
        ('Măsline și pastă de măsline', 'Măsline Kalamon fără sâmbure', 'masline-kalamon-fara-samburi', false, 11, 180, 'g', 20.00, '5214001645275'),
        ('Măsline și pastă de măsline', 'Pastă de măsline', 'pasta-de-masline', false, 11, 240, 'g', 25.00, '5214001645152'),

        -- Oțet balsamic și sosuri
        ('Oțet balsamic și sosuri', 'Oțet balsamic', 'otet-balsamic', false, 21, 250, 'ml', 20.00, '5200117810102'),
        ('Oțet balsamic și sosuri', 'Cremă de oțet balsamic cu miere', 'crema-otet-balsamic-miere', false, 21, 250, 'ml', 23.00, '5214001645305'),
        ('Oțet balsamic și sosuri', 'Cremă de oțet balsamic cu smochine', 'crema-otet-balsamic-smochine', false, 21, 250, 'ml', 23.00, '5214001645299'),
        ('Oțet balsamic și sosuri', 'Cremă de oțet balsamic cu rodie', 'crema-otet-balsamic-rodie', false, 21, 250, 'ml', 23.00, '5214001645121'),
        ('Oțet balsamic și sosuri', 'Suc de lămâie Vrionis', 'suc-de-lamaie-vrionis', false, 11, 350, 'ml', 10.00, '5200117811567'),

        -- Condimente și plante aromatice
        ('Condimente și plante aromatice', 'Oregano grecesc', 'oregano-grecesc', false, 11, 50,  'g', 23.00, '5205429010325'),
        ('Condimente și plante aromatice', 'Oregano grecesc', 'oregano-grecesc', false, 11, 100, 'g', 30.00, '5214001645329'),
        ('Condimente și plante aromatice', 'Cardamom măcinat', 'cardamom-macinat', false, 11, 10, 'g', 20.00, '5213010360681'),
        ('Condimente și plante aromatice', 'Ceapă', 'ceapa', false, 11, 40, 'g', 15.00, '5213010360735'),
        ('Condimente și plante aromatice', 'Muștar', 'mustar', false, 11, 40, 'g', 15.00, '5213010360773'),
        ('Condimente și plante aromatice', 'Nucșoară măcinată', 'nucsoara-macinata', false, 11, 30, 'g', 20.00, '5213010360278'),
        ('Condimente și plante aromatice', 'Cuișoare măcinate', 'cuisoare-macinate', false, 11, 30, 'g', 15.00, '5213010360223'),
        ('Condimente și plante aromatice', 'Lavandă', 'lavanda', false, 11, 40, 'g', 20.00, '5205429010110'),
        ('Condimente și plante aromatice', 'Salvie', 'salvie', false, 11, 50, 'g', 20.00, '5205429010141'),
        ('Condimente și plante aromatice', 'Mentă', 'menta', false, 11, 40, 'g', 20.00, '5205429010349'),
        ('Condimente și plante aromatice', 'Busuioc', 'busuioc', false, 11, 60, 'g', 20.00, '5205429010233'),
        ('Condimente și plante aromatice', 'Urzică uscată', 'urzica-uscata', false, 11, 30, 'g', 20.00, '5205429010400'),
        ('Condimente și plante aromatice', 'Anghinare', 'anghinare', false, 11, 50, 'g', 25.00, '5205429020126'),
        ('Condimente și plante aromatice', 'Boia de ardei afumată', 'boia-de-ardei-afumata', false, 11, 40, 'g', 15.00, '5213010362050'),
        ('Condimente și plante aromatice', 'Mix pentru tzatziki', 'mix-tzatziki', false, 11, 50, 'g', 15.00, '5213010360759'),
        ('Condimente și plante aromatice', 'Mix pentru salată grecească', 'mix-salata-greceasca', false, 11, 30, 'g', 15.00, '5213010360797'),
        ('Condimente și plante aromatice', 'Mix pentru pește', 'mix-peste', false, 11, 40, 'g', 15.00, '5213010360810'),
        ('Condimente și plante aromatice', 'Mix pentru suvlaki', 'mix-suvlaki', false, 11, 40, 'g', 15.00, '5213010360834'),
        ('Condimente și plante aromatice', 'Mix pentru pui', 'mix-pui', false, 11, 40, 'g', 15.00, '5213010360858'),
        ('Condimente și plante aromatice', 'Rozmarin', 'rozmarin', false, 11, 60, 'g', 20.00, '5205429010288'),
        ('Condimente și plante aromatice', 'Frunze de dafin', 'frunze-de-dafin', false, 11, 40, 'g', 20.00, '5205429010332'),
        ('Condimente și plante aromatice', 'Frunze de măslin', 'frunze-de-maslin', false, 11, 50, 'g', 20.00, '5205429020027'),
        ('Condimente și plante aromatice', 'Sare de mare grunjoasă', 'sare-de-mare-grunjoasa', false, 11, 200, 'g', 25.00, null),

        -- Ceaiuri
        ('Ceaiuri', 'Ceai de pasiflora', 'ceai-de-pasiflora', false, 11, 40, 'g', 25.00, '5205429020836'),
        ('Ceaiuri', 'Ceai de pasiflora', 'ceai-de-pasiflora', false, 11, 50, 'g', 25.00, '5205429020157'),
        ('Ceaiuri', 'Ceai de hibiscus', 'ceai-de-hibiscus', false, 11, 40, 'g', 25.00, '5205429020799'),
        ('Ceaiuri', 'Ceai de luiza', 'ceai-de-luiza', false, 11, 10, 'g', 20.00, '5205429020485'),
        ('Ceaiuri', 'Ceai de luiza', 'ceai-de-luiza', false, 11, 30, 'g', 25.00, '5205429010103'),
        ('Ceaiuri', 'Ceai verde', 'ceai-verde', false, 11, 60, 'g', 20.00, '5205429010387'),
        ('Ceaiuri', 'Ceai de munte', 'ceai-de-munte', false, 11, 30, 'g', 25.00, '5213010362104'),

        -- Dulcețuri și marmelade
        ('Dulcețuri și marmelade', 'Marmeladă de zmeură cu stevie', 'marmelada-zmeura-stevie', false, 11, 400, 'g', 45.00, '5214001645091'),
        ('Dulcețuri și marmelade', 'Marmeladă de căpșuni', 'marmelada-capsuni', false, 21, 400, 'g', 40.00, null),
        ('Dulcețuri și marmelade', 'Marmeladă de zmeură', 'marmelada-zmeura', false, 21, 400, 'g', 45.00, null),
        ('Dulcețuri și marmelade', 'Marmeladă de lămâie', 'marmelada-lamaie', false, 21, 400, 'g', 40.00, '5214001645176'),
        ('Dulcețuri și marmelade', 'Marmeladă de portocale', 'marmelada-portocale', false, 21, 400, 'g', 40.00, '5214001645183'),
        ('Dulcețuri și marmelade', 'Dulceață de mandarine', 'dulceata-mandarine', false, 21, 400, 'g', 40.00, '5214001645046'),
        ('Dulcețuri și marmelade', 'Dulceață de măsline', 'dulceata-masline', false, 21, 220, 'g', 40.00, '5214001645145'),
        ('Dulcețuri și marmelade', 'Dulceață de smochine', 'dulceata-smochine', false, 21, 400, 'g', 45.00, '5214001645237'),
        ('Dulcețuri și marmelade', 'Dulceață de lămâie', 'dulceata-lamaie', false, 21, 400, 'g', 40.00, '5214001645138'),
        ('Dulcețuri și marmelade', 'Dulceață de portocale', 'dulceata-portocale', false, 21, 400, 'g', 40.00, '5214001645169'),

        -- Siropuri și sucuri concentrate
        ('Siropuri și sucuri concentrate', 'Suc concentrat de rodie', 'suc-concentrat-rodie', false, 21, 700, 'ml', 45.00, '5214001645220'),
        ('Siropuri și sucuri concentrate', 'Suc concentrat de căpșuni', 'suc-concentrat-capsuni', false, 21, 700, 'ml', 45.00, '5214001645206'),
        ('Siropuri și sucuri concentrate', 'Suc concentrat de zmeură', 'suc-concentrat-zmeura', false, 21, 700, 'ml', 45.00, '5214001645190'),
        ('Siropuri și sucuri concentrate', 'Suc concentrat de lămâie', 'suc-concentrat-lamaie', false, 21, 700, 'ml', 45.00, '5214001645213'),
        ('Siropuri și sucuri concentrate', 'Suc concentrat de portocale', 'suc-concentrat-portocale', false, 21, 700, 'ml', 45.00, '5214001645244'),

        -- Miere
        ('Miere', 'Miere de portocal', 'miere-de-portocal', false, 21, 500, 'g', 50.00, '5214001645251'),

        -- Fructe uscate
        ('Fructe uscate', 'Smochine uscate Kalamata', 'smochine-uscate-kalamata', false, 11, 250, 'g', 25.00, '5205429002658')

    -- Lipsesc deocamdată, pentru că nu știu gramajul:
    -- Mastică de Chios (30 lei, 5213010360247)
    -- Cafea grecească Spinos Kalamata (15 lei, 5200126990321)
    -- Marmeladă de smochine și struguri (45 lei, 5214001645015)
),
     new_products as (
         insert into catalog.products (name, slug, is_organic, vat_rate, category_id)
             select distinct a.name, a.slug, a.is_organic, a.vat_rate, c.id
             from articles a
                      join catalog.categories c on c.name = a.category
             returning id, slug
     )
insert into catalog.product_variants (product_id, pack_size, pack_unit, price, barcode)
select p.id, a.pack_size, a.pack_unit, a.price, a.barcode
from articles a
         join new_products p on p.slug = a.slug;

update catalog.products
set description = 'Din livada proprie din Messinia, Grecia.'
where slug = 'ulei-de-masline-extravirgin-bio';