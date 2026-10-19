// Explicit manager/person identities. Nations come from the bundled Wikidata P1532 records;
// a missing person or nation remains unknown. No nationality is inferred from a managed club.
// NATION: a P1532 label under FIFA's name for that team; West Germany's record is Germany's, and the
// United Kingdom fields no football team, so it is unknown.
export const NATION = { 'West Germany':'Germany', 'Kingdom of the Netherlands':'Netherlands',
  'Socialist Federal Republic of Yugoslavia':'Yugoslavia', 'Federal Republic of Yugoslavia':'Yugoslavia', 'United Kingdom':'' };
export const nation = x => NATION[x] ?? x ?? '';
export const MANAGER_PEOPLE = {
  'Miguel Muñoz':'Q361210', 'Don Revie':'Q350795', 'Ernst Happel':'Q157126',
  'Luis Aragonés':'Q576614', 'Robert Herbin':'Q729021', 'Kees Rijvers':'Q955365',
  'Giovanni Trapattoni':'Q44420', 'Kenny Dalglish':'Q187198', 'George Graham':'Q313763',
  'Terry Venables':'Q314039', 'Ottavio Bianchi':'Q645692', 'Aimé Jacquet':'Q311027',
  'Guus Hiddink':'Q484534', 'Artur Jorge':'Q502977', 'Johan Cruyff':'Q17163',
  'Vujadin Boškov':'Q373776', 'Fabio Capello':'Q183108', 'Marcello Lippi':'Q43304',
  'Ottmar Hitzfeld':'Q44478', 'Jupp Heynckes':'Q152107', 'Kevin Keegan':'Q152832',
  'Otto Rehhagel':'Q518211', 'Vicente del Bosque':'Q657360', 'Frank Rijkaard':'Q169098',
  'Carlo Ancelotti':'Q174614', 'Javier Irureta':'Q505659', 'Paul Le Guen':'Q239958',
  'Roberto Mancini':'Q48330', 'Felix Magath':'Q153293', 'Pep Guardiola':'Q164038',
  'Zinedine Zidane':'Q1835', 'Luis Enrique':'Q222789', 'Diego Simeone':'Q258115',
  'Antonio Conte':'Q26580', 'Mauricio Pochettino':'Q313000', 'Laurent Blanc':'Q1839',
  'Hansi Flick':'Q577384', 'Xabi Alonso':'Q208104', 'Simone Inzaghi':'Q314670',
  'Arne Slot':'Q1029223', 'Mikel Arteta':'Q185572',
};

export function staff(G, m, q = null, D = 1990) {
  const full = G.managers.find(x=>x.nm===m.nm) || m, p = G.people?.[MANAGER_PEOPLE[m.nm]];
  q ||= m.cq || full.t?.find(([,a,b])=>a<=D+9&&b>=D)?.[0] || full.t?.[0]?.[0];
  return {...m,cq:q||'',lg:G.clubs?.[q]?.cc||m.lg||'',nat:m.nat||(p?.nm===m.nm?nation(p.nat):'')};
}
