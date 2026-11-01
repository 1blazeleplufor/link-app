-- LINK — reference data. Cities, languages and categories are rows, not code: admins add more from the console.
insert into public.countries(code, name) values
 ('FR','France'),('GB','United Kingdom'),('NL','Netherlands'),('ES','Spain'),('DE','Germany'),
 ('IT','Italy'),('BE','Belgium'),('PT','Portugal'),('GR','Greece'),('US','United States')
on conflict do nothing;
update public.countries set min_age_default = 21 where code = 'US'; -- many US venues serving alcohol are 21+

insert into public.cities(id, name, country_code, timezone, currency, lat, lng, is_priority, priority_rank) values
 ('paris','Paris','FR','Europe/Paris','EUR',48.85660,2.35220,true,1),
 ('london','London','GB','Europe/London','GBP',51.50740,-0.12780,true,2),
 ('amsterdam','Amsterdam','NL','Europe/Amsterdam','EUR',52.36760,4.90410,true,3),
 ('ibiza','Ibiza','ES','Europe/Madrid','EUR',38.90670,1.42060,true,4),
 ('barcelona','Barcelona','ES','Europe/Madrid','EUR',41.38740,2.16860,true,5),
 ('berlin','Berlin','DE','Europe/Berlin','EUR',52.52000,13.40500,true,6),
 ('madrid','Madrid','ES','Europe/Madrid','EUR',40.41680,-3.70380,true,7),
 ('milan','Milan','IT','Europe/Rome','EUR',45.46420,9.19000,true,8),
 ('rome','Rome','IT','Europe/Rome','EUR',41.90280,12.49640,true,9),
 ('brussels','Brussels','BE','Europe/Brussels','EUR',50.85030,4.35170,true,10),
 ('lisbon','Lisbon','PT','Europe/Lisbon','EUR',38.72230,-9.13930,true,11),
 ('mykonos','Mykonos','GR','Europe/Athens','EUR',37.44670,25.32890,true,12),
 ('new-york','New York','US','America/New_York','USD',40.71280,-74.00600,true,13)
on conflict do nothing;

insert into public.languages(code, name, is_ui_supported) values
 ('en','English',true),('fr','Français',true),('es','Español',true),('de','Deutsch',true),('pt','Português',true),('it','Italiano',true),
 ('nl','Nederlands',false),('el','Ελληνικά',false),('ar','العربية',false)
on conflict do nothing;

insert into public.categories(id, sort) values
 ('concerts',1),('festivals',2),('clubs',3),('rooftops',4),('culture',5),('activities',6),('sports',7),('trips',8),('food',9),('private',10)
on conflict do nothing;

insert into public.event_sources(id, name, kind, display_rights, image_rights, resale_rights) values
 ('link','LINK','link',true,true,true),
 ('community','LINK community','community',true,false,false)
on conflict do nothing;
