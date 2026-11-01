/* LINK prototype — DEMO DATA ONLY. Every event, venue and person below is fictional.
   In production, cities come from the admin-managed `cities` table and events from authorised sources. */
const CITIES = [
  {id:"paris", name:"Paris", country:"FR", tz:"Europe/Paris", cur:"EUR", priority:1},
  {id:"london", name:"London", country:"GB", tz:"Europe/London", cur:"GBP", priority:2},
  {id:"amsterdam", name:"Amsterdam", country:"NL", tz:"Europe/Amsterdam", cur:"EUR", priority:3},
  {id:"ibiza", name:"Ibiza", country:"ES", tz:"Europe/Madrid", cur:"EUR", priority:4},
  {id:"barcelona", name:"Barcelona", country:"ES", tz:"Europe/Madrid", cur:"EUR", priority:5},
  {id:"berlin", name:"Berlin", country:"DE", tz:"Europe/Berlin", cur:"EUR", priority:6},
  {id:"madrid", name:"Madrid", country:"ES", tz:"Europe/Madrid", cur:"EUR", priority:7},
  {id:"milan", name:"Milan", country:"IT", tz:"Europe/Rome", cur:"EUR", priority:8},
  {id:"rome", name:"Rome", country:"IT", tz:"Europe/Rome", cur:"EUR", priority:9},
  {id:"brussels", name:"Brussels", country:"BE", tz:"Europe/Brussels", cur:"EUR", priority:10},
  {id:"lisbon", name:"Lisbon", country:"PT", tz:"Europe/Lisbon", cur:"EUR", priority:11},
  {id:"mykonos", name:"Mykonos", country:"GR", tz:"Europe/Athens", cur:"EUR", priority:12},
  {id:"newyork", name:"New York", country:"US", tz:"America/New_York", cur:"USD", priority:13}
];

const CATEGORIES = ["concerts","festivals","clubs","rooftops","culture","activities","sports","trips","food","private"];
const CAT_ART = {
  concerts:["#FF5A4E","#7A1FA2","LIVE"], festivals:["#FFB020","#E8436B","FEST"], clubs:["#3A1C71","#D76D77","NIGHT"],
  rooftops:["#FF8C42","#2E5BBA","SKY"], culture:["#0E9F9A","#1D3557","ART"], activities:["#19B58C","#F2C230","PLAY"],
  sports:["#1559D6","#00B3A4","GAME"], trips:["#00A6D6","#F7B32B","GO"], food:["#E85D2F","#8C2F39","EAT"], private:["#5B3E96","#E0447C","VIP"]
};
const INTERESTS = ["concerts","festivals","clubs","rooftops","culture","activities","sports","trips","food"];
const MUSIC = ["House","Techno","Pop","Hip-hop","R&B","Afrobeats","Rock","Jazz","Latin","Reggaeton","Classical","Indie"];
const LANG_NAMES = {fr:"Français",en:"English",es:"Español",de:"Deutsch",pt:"Português",it:"Italiano",nl:"Nederlands",el:"Ελληνικά",ar:"العربية"};

/* d = day offset from today, t = local time in the city. price = lowest price in local currency, null = unknown.
   tk = ticketing case: A LINK-operated, B partner, C third-party API with rights, D community (no sale). */
const EVENTS = [
  {id:"e1", city:"paris", cat:"concerts", title:"Seine Sunset Sessions", venue:"Péniche Lumière", area:"Bercy", d:2, t:"20:00", price:22, avail:"verified", tk:"B", age:18, acc:true, going:14, org:"Lumière Live (fictif)",
   desc:{en:"Acoustic soul on a moored barge as the sun drops behind the bridges.", fr:"Soul acoustique sur une péniche amarrée, pendant que le soleil passe derrière les ponts."}},
  {id:"e2", city:"paris", cat:"rooftops", title:"Toits & Spritz", venue:"Terrasse du 9e", area:"Pigalle", d:0, t:"18:30", price:null, avail:"unknown", tk:"D", age:18, acc:null, going:6, org:"Communauté LINK",
   desc:{en:"After-work on a rooftop with a view over Montmartre. Drinks paid on site.", fr:"Afterwork sur un toit avec vue sur Montmartre. Consos payées sur place."}},
  {id:"e3", city:"paris", cat:"culture", title:"Nocturne au musée imaginaire", venue:"Galerie Quinze", area:"Le Marais", d:5, t:"19:00", price:0, avail:"verified", tk:"A", age:18, acc:true, going:21, org:"LINK Events",
   desc:{en:"Late opening, guided tour in small groups, then drinks in the courtyard.", fr:"Ouverture tardive, visite guidée en petits groupes, puis verre dans la cour."}},
  {id:"e4", city:"london", cat:"clubs", title:"Basement Frequencies", venue:"The Vault 9", area:"Shoreditch", d:3, t:"23:00", price:18, avail:"verified", tk:"C", age:18, acc:false, going:30, org:"Vault Nights (fictional)",
   desc:{en:"Deep house until 5am in a converted railway arch.", fr:"Deep house jusqu'à 5 h sous une ancienne arche ferroviaire."}},
  {id:"e5", city:"london", cat:"food", title:"Borough Street Food Crawl", venue:"Meeting point: market gate", area:"Southwark", d:1, t:"12:30", price:0, avail:"unknown", tk:"D", age:18, acc:true, going:9, org:"LINK community",
   desc:{en:"Six stalls, small bites, one big group. Pay for what you eat.", fr:"Six stands, petites bouchées, un grand groupe. Chacun paie ce qu'il mange."}},
  {id:"e6", city:"amsterdam", cat:"activities", title:"Canal Kayak at Dusk", venue:"Kayak Dock West", area:"Jordaan", d:4, t:"17:30", price:35, avail:"verified", tk:"B", age:18, acc:false, going:8, org:"Grachten Paddle (fictief)",
   desc:{en:"Two hours paddling through quiet canals. Beginners welcome.", fr:"Deux heures de pagaie sur les canaux calmes. Débutants bienvenus."}},
  {id:"e7", city:"amsterdam", cat:"festivals", title:"Noord Open Air", venue:"Werf Terrein", area:"Noord", d:9, t:"14:00", price:59, avail:"verified", tk:"C", age:18, acc:true, going:47, org:"Werf Collective (fictief)",
   desc:{en:"Day festival on the old shipyard: three stages, electronic and disco.", fr:"Festival de jour sur l'ancien chantier naval : trois scènes, électro et disco."}},
  {id:"e8", city:"ibiza", cat:"clubs", title:"Sunrise Terrace", venue:"Cala Blanca Club", area:"Sant Antoni", d:6, t:"23:30", price:65, avail:"soldout", tk:"C", age:18, acc:false, going:52, org:"Blanca Group (ficticio)",
   desc:{en:"Open-air terrace party that ends with the sunrise over the bay.", fr:"Soirée en terrasse qui se termine avec le lever du soleil sur la baie."}},
  {id:"e9", city:"ibiza", cat:"trips", title:"Boat Day to Formentera", venue:"Port d'Eivissa", area:"Marina", d:7, t:"10:00", price:89, avail:"verified", tk:"B", age:18, acc:false, going:16, org:"Mar Azul Charters (ficticio)",
   desc:{en:"Full day at sea, snorkelling stop and lunch on the beach.", fr:"Journée en mer, arrêt snorkeling et déjeuner sur la plage."}},
  {id:"e10", city:"barcelona", cat:"sports", title:"Beach Volley Sunday", venue:"Platja de la Barceloneta", area:"Barceloneta", d:5, t:"11:00", price:0, avail:"unknown", tk:"D", age:18, acc:true, going:12, org:"LINK community",
   desc:{en:"Mixed teams, all levels. Bring water and sunscreen.", fr:"Équipes mixtes, tous niveaux. Prends de l'eau et de la crème solaire."}},
  {id:"e11", city:"barcelona", cat:"concerts", title:"Rumba al Patio", venue:"Patio del Raval", area:"El Raval", d:2, t:"21:30", price:15, avail:"verified", tk:"A", age:18, acc:true, going:19, org:"LINK Events",
   desc:{en:"Catalan rumba band in a hidden courtyard. Dancing strongly encouraged.", fr:"Groupe de rumba catalane dans une cour cachée. Danse vivement conseillée."}},
  {id:"e12", city:"berlin", cat:"clubs", title:"Kraftwerk Halle 4", venue:"Halle 4", area:"Friedrichshain", d:4, t:"23:59", price:20, avail:"unknown", tk:"C", age:18, acc:false, going:38, org:"Halle Kollektiv (fiktiv)",
   desc:{en:"Industrial techno, no photos on the dancefloor.", fr:"Techno industrielle, pas de photos sur le dancefloor."}},
  {id:"e13", city:"berlin", cat:"culture", title:"Open Studios Kreuzberg", venue:"Hinterhof Ateliers", area:"Kreuzberg", d:1, t:"16:00", price:0, avail:"verified", tk:"D", age:18, acc:true, going:11, org:"LINK community",
   desc:{en:"Twelve artists open their studios. Walk it as a group.", fr:"Douze artistes ouvrent leurs ateliers. On fait le tour en groupe."}},
  {id:"e14", city:"madrid", cat:"food", title:"Tapas por La Latina", venue:"Plaza de la Cebada", area:"La Latina", d:3, t:"20:30", price:25, avail:"verified", tk:"B", age:18, acc:true, going:13, org:"Ruta Sabor (ficticio)",
   desc:{en:"Four bars, four tapas and a vermouth, with a local host.", fr:"Quatre bars, quatre tapas et un vermouth, avec un hôte du quartier."}},
  {id:"e15", city:"madrid", cat:"sports", title:"Derby Night Watch Party", venue:"Bar Estadio (ficticio)", area:"Chamberí", d:8, t:"21:00", price:null, avail:"unknown", tk:"D", age:18, acc:null, going:24, org:"LINK community",
   desc:{en:"Watch the big match together on a giant screen.", fr:"On regarde le grand match ensemble sur écran géant."}},
  {id:"e16", city:"milan", cat:"rooftops", title:"Aperitivo sul Tetto", venue:"Terrazza Navigli", area:"Navigli", d:2, t:"19:00", price:18, avail:"verified", tk:"B", age:18, acc:true, going:17, org:"Terrazza Milano (fittizio)",
   desc:{en:"Spritz and buffet with a view over the canals.", fr:"Spritz et buffet avec vue sur les canaux."}},
  {id:"e17", city:"milan", cat:"culture", title:"Design Week Night Walk", venue:"Start: Brera", area:"Brera", d:10, t:"18:00", price:0, avail:"unknown", tk:"D", age:18, acc:true, going:28, org:"LINK community",
   desc:{en:"Evening walk through showrooms and installations.", fr:"Balade du soir entre showrooms et installations."}},
  {id:"e18", city:"rome", cat:"food", title:"Cooking Carbonara Class", venue:"Cucina Trastevere", area:"Trastevere", d:4, t:"18:30", price:45, avail:"verified", tk:"A", age:18, acc:false, going:10, org:"LINK Events",
   desc:{en:"Learn the real thing, then eat it together.", fr:"Apprends la vraie recette, puis on mange ensemble."}},
  {id:"e19", city:"rome", cat:"concerts", title:"Jazz sotto le Stelle", venue:"Chiostro Antico", area:"Monti", d:6, t:"21:00", price:28, avail:"unknown", tk:"C", age:18, acc:true, going:9, org:"Chiostro Musica (fittizio)",
   desc:{en:"Quartet in a 16th-century cloister.", fr:"Quartet de jazz dans un cloître du XVIe siècle."}},
  {id:"e20", city:"brussels", cat:"food", title:"Beer & Frites Tour", venue:"Grand-Place (rdv)", area:"Centre", d:1, t:"19:30", price:30, avail:"verified", tk:"B", age:18, acc:true, going:15, org:"Brussels Tasting (fictif)",
   desc:{en:"Three craft-beer bars and the city's best fries.", fr:"Trois bars à bières artisanales et les meilleures frites de la ville."}},
  {id:"e21", city:"brussels", cat:"concerts", title:"Midi Jazz Club", venue:"Cave Saint-Gilles", area:"Saint-Gilles", d:5, t:"21:00", price:null, avail:"unknown", tk:"D", age:18, acc:null, going:7, org:"LINK community",
   desc:{en:"Jam session in a cellar bar. Musicians can bring instruments.", fr:"Jam session dans une cave. Les musiciens peuvent venir avec leur instrument."}},
  {id:"e22", city:"lisbon", cat:"rooftops", title:"Miradouro Sunset", venue:"Miradouro da Graça", area:"Graça", d:0, t:"18:00", price:0, avail:"unknown", tk:"D", age:18, acc:false, going:20, org:"LINK community",
   desc:{en:"Meet at the viewpoint, then fado in a tasca nearby.", fr:"Rendez-vous au belvédère, puis fado dans une tasca à côté."}},
  {id:"e23", city:"lisbon", cat:"trips", title:"Sintra Day Trip", venue:"Rossio Station", area:"Baixa", d:7, t:"09:00", price:39, avail:"verified", tk:"B", age:18, acc:false, going:12, org:"Serra Tours (fictício)",
   desc:{en:"Palaces, forest and pastries. Train and guide included.", fr:"Palais, forêt et pâtisseries. Train et guide inclus."}},
  {id:"e24", city:"mykonos", cat:"festivals", title:"Aegean Beach Festival", venue:"Paradise Bay", area:"South coast", d:12, t:"16:00", price:75, avail:"verified", tk:"C", age:18, acc:false, going:61, org:"Aegean Sound (fictional)",
   desc:{en:"Two days of house music by the sea.", fr:"Deux jours de house au bord de la mer."}},
  {id:"e25", city:"mykonos", cat:"private", title:"Villa Dinner Club", venue:"Address shared after approval", area:"Ano Mera", d:8, t:"20:30", price:120, avail:"verified", tk:"B", age:21, acc:false, going:8, org:"Ano Mera Hosts (fictional)",
   desc:{en:"Long-table dinner for 20, private chef. Host approval required.", fr:"Dîner en longue table pour 20, chef privé. Validation de l'hôte requise."}},
  {id:"e26", city:"newyork", cat:"concerts", title:"Brooklyn Rooftop Live", venue:"Pier Roof 7", area:"Williamsburg", d:3, t:"20:00", price:35, avail:"verified", tk:"C", age:21, acc:true, going:33, org:"Pier Roof (fictional)",
   desc:{en:"Indie bands with the Manhattan skyline behind the stage.", fr:"Groupes indé avec la skyline de Manhattan derrière la scène."}},
  {id:"e27", city:"newyork", cat:"activities", title:"Central Park Run Club", venue:"Bethesda Fountain", area:"Central Park", d:1, t:"07:30", price:0, avail:"unknown", tk:"D", age:18, acc:true, going:18, org:"LINK community",
   desc:{en:"5 km easy pace, then coffee. Every level.", fr:"5 km à allure tranquille, puis café. Tous niveaux."}}
];

/* Fictional members. Photos are replaced by initials; verified = demo flag. */
const PEOPLE = [
  {id:"p1", name:"Léa", age:27, city:"paris", langs:["fr","en"], interests:["concerts","rooftops","culture"], music:["Indie","Jazz"], verified:true, color:"#FF5A4E",
   bio:{en:"Gig addict, always one ticket short of a friend.", fr:"Accro aux concerts, toujours un billet de trop."}, trips:[{city:"lisbon", d:20}]},
  {id:"p2", name:"Malik", age:31, city:"paris", langs:["fr","en","ar"], interests:["clubs","festivals","food"], music:["House","Afrobeats"], verified:true, color:"#7A3DD1",
   bio:{en:"New to Paris. Looking for a crew for festivals.", fr:"Nouveau à Paris. Je cherche une team pour les festivals."}, trips:[{city:"ibiza", d:6}]},
  {id:"p3", name:"Chloé", age:24, city:"paris", langs:["fr","es"], interests:["activities","sports","food"], music:["Pop","Latin"], verified:false, color:"#0E9F9A",
   bio:{en:"Weekend climber, weekday foodie.", fr:"Grimpeuse le week-end, gourmande la semaine."}, trips:[]},
  {id:"p4", name:"James", age:34, city:"london", langs:["en"], interests:["clubs","concerts","sports"], music:["Techno","Rock"], verified:true, color:"#1559D6",
   bio:{en:"Will dance to anything after midnight.", fr:"Je danse sur n'importe quoi après minuit."}, trips:[{city:"berlin", d:4}]},
  {id:"p5", name:"Sofia", age:29, city:"barcelona", langs:["es","en","it"], interests:["rooftops","food","culture"], music:["R&B","Latin"], verified:true, color:"#E8436B",
   bio:{en:"Architect. I know every hidden terrace in town.", fr:"Architecte. Je connais toutes les terrasses cachées."}, trips:[{city:"milan", d:10}]},
  {id:"p6", name:"Jonas", age:38, city:"berlin", langs:["de","en"], interests:["clubs","culture","trips"], music:["Techno","Classical"], verified:true, color:"#3A1C71",
   bio:{en:"Museum by day, Halle by night.", fr:"Musée le jour, club la nuit."}, trips:[]},
  {id:"p7", name:"Inês", age:26, city:"lisbon", langs:["pt","en","fr"], interests:["rooftops","concerts","trips"], music:["Indie","Afrobeats"], verified:true, color:"#19B58C",
   bio:{en:"Sunset hunter. Show me your favourite miradouro.", fr:"Chasseuse de couchers de soleil."}, trips:[{city:"paris", d:15}]},
  {id:"p8", name:"Marco", age:42, city:"rome", langs:["it","en"], interests:["food","culture","concerts"], music:["Jazz","Classical"], verified:true, color:"#E85D2F",
   bio:{en:"Home cook and jazz fan. Always up for a long dinner.", fr:"Cuisinier amateur et fan de jazz."}, trips:[]},
  {id:"p9", name:"Emma", age:30, city:"amsterdam", langs:["en","de"], interests:["activities","festivals","sports"], music:["House","Pop"], verified:false, color:"#FFB020",
   bio:{en:"Kayak, bikes, open air. In that order.", fr:"Kayak, vélo, plein air. Dans cet ordre."}, trips:[{city:"barcelona", d:12}]},
  {id:"p10", name:"Alexis", age:33, city:"mykonos", langs:["el","en","fr"], interests:["festivals","trips","food"], music:["House","Reggaeton"], verified:true, color:"#00A6D6",
   bio:{en:"Islander. I can tell you which beach for which mood.", fr:"Insulaire. Je te dis quelle plage pour quelle humeur."}, trips:[]},
  {id:"p11", name:"Nia", age:28, city:"newyork", langs:["en","es"], interests:["concerts","rooftops","activities"], music:["Hip-hop","R&B"], verified:true, color:"#D76D77",
   bio:{en:"Run club at 7, rooftop at 7 too.", fr:"Run club à 7 h, rooftop à 19 h."}, trips:[{city:"london", d:18}]},
  {id:"p12", name:"Hugo", age:36, city:"brussels", langs:["fr","nl","en"], interests:["food","concerts","culture"], music:["Jazz","Indie"], verified:true, color:"#8C2F39",
   bio:{en:"Beer nerd, jam session regular.", fr:"Passionné de bière, habitué des jams."}, trips:[]},
  {id:"p13", name:"Lucía", age:25, city:"madrid", langs:["es","en"], interests:["food","sports","clubs"], music:["Reggaeton","Pop"], verified:true, color:"#F25F5C",
   bio:{en:"Tapas route expert. Real Madrid or nothing.", fr:"Experte des routes à tapas."}, trips:[{city:"paris", d:9}]},
  {id:"p14", name:"Giulia", age:32, city:"milan", langs:["it","en","fr"], interests:["rooftops","culture","festivals"], music:["House","Indie"], verified:false, color:"#5B3E96",
   bio:{en:"Design week every week.", fr:"La design week, toute l'année."}, trips:[]}
];

/* Seeded received invitations so the Activity tab shows the flow. */
const SEED_INVITES = [
  {id:"i1", dir:"in", from:"p1", event:"e1", note:{en:"I have a spare ticket, want to come?", fr:"J'ai une place en plus, tu viens ?"}, status:"pending", d:2},
  {id:"i2", dir:"in", from:"p7", event:"e22", note:{en:"Sunset at Graça this week?", fr:"Coucher de soleil à Graça cette semaine ?"}, status:"pending", d:1}
];
