/* LINK prototype — richer demo profiles (Hinge-style): photos, prompts, vitals.
   DEMO ONLY: names and details are fictional; photos are free stock images from Unsplash, loaded at view time
   (if an image can't load, a coloured tile with the initial is shown instead). */
const U = (id, w=720, h=900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=faces&w=${w}&h=${h}&q=70`;
const LIFESTYLE = {
  concerts:["1501386761578-eac5c94b800a","1470229722913-7c0e2dbbafd3","1493225457124-a3eb161ffa5f"],
  festivals:["1533174072545-7a4b6ad7a6c3","1459749411175-04bf5292ceea"],
  clubs:["1514525253161-7a46d19cd819","1566737236500-c8ac43014a67"],
  rooftops:["1514362545857-3bc16c4c7d1b","1470337458703-46ad1756a187"],
  culture:["1554907984-15263bfd63bd","1518998053901-5348d3961a04"],
  activities:["1551632811-561732d1e306","1528605248644-14dd04022da1"],
  sports:["1461896836934-ffe607ba8211","1517649763962-0c623066013b"],
  trips:["1507525428034-b723cf961d3e","1469854523086-cc02fe5d8800"],
  food:["1504674900247-0877df9cc836","1414235077428-338989a2e8c0"]
};
const PROMPT_KEYS = ["pr_ideal_night","pr_never_no","pr_best_concert","pr_hidden_spot","pr_looking_crew","pr_next_trip","pr_green_flag","pr_sunday"];

const PROFILE_EXTRA = {
  p0:{portrait:"1472099645785-5658abf4ff4e", job:{en:"Electrical engineer (smart buildings)",fr:"Ingé génie électrique (smart building)"}, lf:["friends","outings","travel"], av:"weeknights",
    prompts:[["pr_ideal_night",{en:"Sunset concert on the Seine, a rooftop after, and the last metro we definitely miss.",fr:"Concert au coucher du soleil sur la Seine, un rooftop après, et le dernier métro qu'on rate forcément."}],
             ["pr_never_no",{en:"Going out on a Tuesday. Or a Wednesday. Basically yes.",fr:"Sortir un mardi. Ou un mercredi. En gros, oui."}],
             ["pr_green_flag",{en:"Dances first, asks questions later.",fr:"Danse d'abord, pose des questions après."}]]},
  p1:{portrait:"1494790108377-be9c29b29330", job:{en:"Graphic designer",fr:"Graphiste"}, lf:["friends","outings"], av:"weeknights",
    prompts:[["pr_best_concert",{en:"A tiny jazz club in Montmartre, 40 people, the band played until 2am.",fr:"Un mini club de jazz à Montmartre, 40 personnes, le groupe a joué jusqu'à 2 h."}],
             ["pr_looking_crew",{en:"go to gigs on a Tuesday without overthinking it.",fr:"aller à des concerts un mardi sans se prendre la tête."}],
             ["pr_hidden_spot",{en:"The rooftop above the Belleville bookshop. Ask me.",fr:"Le toit au-dessus de la librairie de Belleville. Demande-moi."}]]},
  p2:{portrait:"1500648767791-00dcc994a43e", job:{en:"Sound engineer",fr:"Ingé son"}, lf:["friends","outings","travel"], av:"weekends",
    prompts:[["pr_ideal_night",{en:"Dinner at 9, club at 1, croissant at 6.",fr:"Dîner à 21 h, club à 1 h, croissant à 6 h."}],
             ["pr_next_trip",{en:"Ibiza in June — still need a crew.",fr:"Ibiza en juin — il me manque la team."}],
             ["pr_green_flag",{en:"Shares the playlist before the road trip.",fr:"Partage la playlist avant le road trip."}]]},
  p3:{portrait:"1517841905240-472988babdf9", job:{en:"Physio",fr:"Kiné"}, lf:["friends","outings"], av:"flexible",
    prompts:[["pr_sunday",{en:"Climbing gym, then the longest brunch in Paris.",fr:"Salle d'escalade, puis le brunch le plus long de Paris."}],
             ["pr_never_no",{en:"A spontaneous tasting menu.",fr:"Un menu dégustation improvisé."}],
             ["pr_looking_crew",{en:"try every bouldering gym in the city.",fr:"tester toutes les salles de bloc de la ville."}]]},
  p4:{portrait:"1507003211169-0a1dd7228f2d", job:{en:"Product manager",fr:"Product manager"}, lf:["friends","outings"], av:"weekends",
    prompts:[["pr_ideal_night",{en:"Pub quiz, then whatever happens.",fr:"Quiz au pub, puis advienne que pourra."}],
             ["pr_best_concert",{en:"Underworld at Brixton. Still recovering.",fr:"Underworld à Brixton. Je m'en remets encore."}],
             ["pr_next_trip",{en:"Berlin for a long weekend of techno.",fr:"Berlin pour un long week-end techno."}]]},
  p5:{portrait:"1524504388940-b1c1722653e1", job:{en:"Architect",fr:"Architecte"}, lf:["friends","outings","dating"], av:"weeknights",
    prompts:[["pr_hidden_spot",{en:"A terrace in Gràcia with the best vermouth.",fr:"Une terrasse à Gràcia avec le meilleur vermouth."}],
             ["pr_green_flag",{en:"Knows when to stay for one more.",fr:"Sait quand rester pour un dernier verre."}],
             ["pr_next_trip",{en:"Milan design week.",fr:"La design week de Milan."}]]},
  p6:{portrait:"1506794778202-cad84cf45f1d", job:{en:"Museum curator",fr:"Conservateur de musée"}, lf:["friends","outings"], av:"weekends",
    prompts:[["pr_ideal_night",{en:"Late opening at a museum, then techno until sunrise.",fr:"Nocturne au musée, puis techno jusqu'au lever du soleil."}],
             ["pr_never_no",{en:"A guided tour nobody else signed up for.",fr:"Une visite guidée où personne d'autre ne s'est inscrit."}],
             ["pr_looking_crew",{en:"discover Berlin's courtyards.",fr:"découvrir les arrière-cours de Berlin."}]]},
  p7:{portrait:"1544005313-94ddf0286df2", job:{en:"Photographer",fr:"Photographe"}, lf:["friends","outings","travel"], av:"flexible",
    prompts:[["pr_hidden_spot",{en:"Miradouro da Graça at 6:40pm in October.",fr:"Le Miradouro da Graça à 18 h 40 en octobre."}],
             ["pr_next_trip",{en:"Paris in two weeks — show me your city?",fr:"Paris dans deux semaines — tu me fais visiter ?"}],
             ["pr_green_flag",{en:"Lets me stop every 5 minutes for photos.",fr:"Me laisse m'arrêter toutes les 5 minutes pour une photo."}]]},
  p8:{portrait:"1519085360753-af0119f7cbe7", job:{en:"Chef",fr:"Chef cuisinier"}, lf:["friends","outings"], av:"weeknights",
    prompts:[["pr_never_no",{en:"Seconds of anything with guanciale.",fr:"Une deuxième assiette de n'importe quoi avec du guanciale."}],
             ["pr_ideal_night",{en:"Long table, ten strangers, one jazz record.",fr:"Une grande tablée, dix inconnus, un vinyle de jazz."}],
             ["pr_sunday",{en:"Market at Campo de' Fiori, then I cook for everyone.",fr:"Marché du Campo de' Fiori, puis je cuisine pour tout le monde."}]]},
  p9:{portrait:"1438761681033-6461ffad8d80", job:{en:"UX researcher",fr:"UX researcher"}, lf:["friends","travel"], av:"weekends",
    prompts:[["pr_sunday",{en:"Kayak on the canals before the tourists wake up.",fr:"Kayak sur les canaux avant que les touristes se lèvent."}],
             ["pr_next_trip",{en:"Barcelona, beach volley included.",fr:"Barcelone, beach-volley compris."}],
             ["pr_looking_crew",{en:"go to open-air festivals all summer.",fr:"faire tous les festivals open-air de l'été."}]]},
  p10:{portrait:"1539571696357-5a69c17a67c6", job:{en:"Boat skipper",fr:"Skipper"}, lf:["friends","outings","travel"], av:"flexible",
    prompts:[["pr_hidden_spot",{en:"A beach with no name, 20 min by boat.",fr:"Une plage sans nom, à 20 min en bateau."}],
             ["pr_ideal_night",{en:"Sunset on the water, then dinner in Ano Mera.",fr:"Coucher de soleil en mer, puis dîner à Ano Mera."}],
             ["pr_green_flag",{en:"Doesn't get seasick. Bonus if they bring snacks.",fr:"N'a pas le mal de mer. Bonus si on ramène à grignoter."}]]},
  p11:{portrait:"1531123897727-8f129e1688ce", job:{en:"Music journalist",fr:"Journaliste musique"}, lf:["friends","outings"], av:"weeknights",
    prompts:[["pr_best_concert",{en:"A surprise set in a Brooklyn warehouse.",fr:"Un set surprise dans un entrepôt de Brooklyn."}],
             ["pr_never_no",{en:"A 7am run if there's coffee after.",fr:"Un footing à 7 h s'il y a un café après."}],
             ["pr_next_trip",{en:"London in December for gigs.",fr:"Londres en décembre pour des concerts."}]]},
  p12:{portrait:"1492562080023-ab3db95bfbce", job:{en:"Brewer",fr:"Brasseur"}, lf:["friends","outings"], av:"weeknights",
    prompts:[["pr_ideal_night",{en:"Jam session in a cellar, my guitar, your voice.",fr:"Jam dans une cave, ma guitare, ta voix."}],
             ["pr_hidden_spot",{en:"The fries stand nobody posts about.",fr:"La baraque à frites dont personne ne parle."}],
             ["pr_sunday",{en:"Flea market at Jeu de Balle.",fr:"Marché aux puces du Jeu de Balle."}]]},
  p13:{portrait:"1529626455594-4ff0802cfb7e", job:{en:"Event planner",fr:"Organisatrice d'événements"}, lf:["friends","outings","travel"], av:"weekends",
    prompts:[["pr_never_no",{en:"One more tapas bar.",fr:"Un bar à tapas de plus."}],
             ["pr_next_trip",{en:"Paris — I want the bakery tour.",fr:"Paris — je veux la tournée des boulangeries."}],
             ["pr_looking_crew",{en:"watch the derby with real fans.",fr:"regarder le derby avec de vrais supporters."}]]},
  p14:{portrait:"1488426862026-3ee34a7d66df", job:{en:"Fashion buyer",fr:"Acheteuse mode"}, lf:["friends","outings"], av:"flexible",
    prompts:[["pr_hidden_spot",{en:"An aperitivo bar on the Navigli with live vinyl.",fr:"Un bar à apéritivo sur les Navigli avec vinyles en live."}],
             ["pr_ideal_night",{en:"Gallery opening, rooftop, house music.",fr:"Vernissage, rooftop, house music."}],
             ["pr_green_flag",{en:"Always on time for the aperitivo.",fr:"Toujours à l'heure pour l'apéritivo."}]]}
};

for (const p of PEOPLE) {
  const x = PROFILE_EXTRA[p.id]; if (!x) continue;
  p.photos = [U(x.portrait)].concat(p.interests.slice(0,2).map((cat,i)=>{ const pool=LIFESTYLE[cat]||LIFESTYLE.activities; return U(pool[i%pool.length], 720, 720); }));
  p.photoCats = ["portrait"].concat(p.interests.slice(0,2));
  p.job = x.job; p.lookingFor = x.lf; p.availability = x.av; p.prompts = x.prompts.map(([q,a])=>({q, a}));
}
