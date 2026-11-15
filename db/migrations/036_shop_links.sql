-- 036: Linkurile magazinului: pagina de Facebook, contul de Instagram și locul magazinului pe Google Maps.
-- Le completezi din admin, la „Datele firmei”. Apar în subsolul site-ului, pe pagina Contact și
-- (harta) în banda de sub banner, la „Magazin în Galați”.
--
-- De ce verificăm adresa (check): un link pus aici apare pe fiecare pagină. Acceptăm doar adrese https
-- de pe Facebook, Instagram și Google Maps, ca nimeni (nici din greșeală, nici cu un cont de admin furat)
-- să nu poată pune pe site un link spre altă parte sau un „javascript:”.
-- Se poate rula de mai multe ori.

begin;

alter table sales.shop_info add column if not exists facebook_url text;
alter table sales.shop_info add column if not exists instagram_url text;
alter table sales.shop_info add column if not exists maps_url text;

alter table sales.shop_info drop constraint if exists shop_info_facebook_url_check;
alter table sales.shop_info add constraint shop_info_facebook_url_check
    check (char_length(facebook_url) <= 300 and facebook_url ~ '^https://(www\.|m\.)?(facebook|fb)\.com/');

alter table sales.shop_info drop constraint if exists shop_info_instagram_url_check;
alter table sales.shop_info add constraint shop_info_instagram_url_check
    check (char_length(instagram_url) <= 300 and instagram_url ~ '^https://(www\.)?instagram\.com/');

-- Linkul din „Distribuie” al Google Maps (maps.app.goo.gl/…) sau adresa din bara browserului (google.com/maps/…).
-- Domeniul e scris strict (google.ro, google.com, google.co.uk…), ca „google.com.altceva.com” să nu treacă.
alter table sales.shop_info drop constraint if exists shop_info_maps_url_check;
alter table sales.shop_info add constraint shop_info_maps_url_check
    check (char_length(maps_url) <= 500
           and maps_url ~ '^https://((www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?/maps|maps\.google\.[a-z]{2,3}(\.[a-z]{2})?/|maps\.app\.goo\.gl/|goo\.gl/maps/)');

-- Adminul le poate modifica, ca pe celelalte date ale firmei (vezi 023)
grant update (facebook_url, instagram_url, maps_url) on sales.shop_info to panos_admin;

commit;
