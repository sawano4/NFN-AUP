export const WILAYAS = [
  { id: '01', name: 'Adrar' },
  { id: '02', name: 'Chlef' },
  { id: '03', name: 'Laghouat' },
  { id: '04', name: 'Oum El Bouaghi' },
  { id: '05', name: 'Batna' },
  { id: '06', name: 'Béjaïa' },
  { id: '07', name: 'Biskra' },
  { id: '08', name: 'Béchar' },
  { id: '09', name: 'Blida' },
  { id: '10', name: 'Bouira' },
  { id: '11', name: 'Tamanrasset' },
  { id: '12', name: 'Tébessa' },
  { id: '13', name: 'Tlemcen' },
  { id: '14', name: 'Tiaret' },
  { id: '15', name: 'Tizi Ouzou' },
  { id: '16', name: 'Alger' },
  { id: '17', name: 'Djelfa' },
  { id: '18', name: 'Jijel' },
  { id: '19', name: 'Sétif' },
  { id: '20', name: 'Saïda' },
  { id: '21', name: 'Skikda' },
  { id: '22', name: "Sidi Bel Abbès" },
  { id: '23', name: 'Annaba' },
  { id: '24', name: 'Guelma' },
  { id: '25', name: 'Constantine' },
  { id: '26', name: 'Médéa' },
  { id: '27', name: 'Mostaganem' },
  { id: '28', name: "M\'Sila" },
  { id: '29', name: 'Mascara' },
  { id: '30', name: 'Ouargla' },
  { id: '31', name: 'Oran' },
  { id: '32', name: 'El Bayadh' },
  { id: '33', name: 'Illizi' },
  { id: '34', name: 'Bordj Bou Arréridj' },
  { id: '35', name: 'Boumerdès' },
  { id: '36', name: 'El Tarf' },
  { id: '37', name: 'Tindouf' },
  { id: '38', name: 'Tissemsilt' },
  { id: '39', name: 'El Oued' },
  { id: '40', name: 'Khenchela' },
  { id: '41', name: 'Souk Ahras' },
  { id: '42', name: 'Tipaza' },
  { id: '43', name: 'Mila' },
  { id: '44', name: 'Aïn Defla' },
  { id: '45', name: 'Naâma' },
  { id: '46', name: 'Aïn Témouchent' },
  { id: '47', name: 'Ghardaïa' },
  { id: '48', name: 'Relizane' },
];

export const COMMUNES_BY_WILAYA: Record<string, string[]> = {
  '03': ['Laghouat', 'Ksar El Hirane', 'Brida', 'Gueltat Sidi Saad', 'Aïn Madhi', 'Tadjemout', 'Hassi Delaa'],
  '05': ['Batna', 'Barika', 'Merouana', 'Seriana', 'Aïn Touta', 'Arris', 'Timgad'],
  '07': ['Biskra', 'Tolga', 'Ouled Djellal', 'Sidi Okba', 'El Outaya', 'Zeribet El Oued', 'Foughala'],
  '14': ['Tiaret', 'Frenda', 'Mahdia', 'Sougueur', 'Rahouia', 'Ksar Chellala', 'Mechraa Safa'],
  '17': ['Djelfa', 'Messaad', 'Ain Oussera', 'Birine', 'Hassi Bahbah', 'El Idrissia', 'Dar Chioukh'],
  '28': ["M'Sila", 'Bou Saada', 'Sidi Aissa', 'Aïn El Melh', 'Magra', 'Ouled Derradj', 'Maadid'],
  '29': ['Mascara', 'Sig', 'Mohammadia', 'Tighennif', 'El Ghomri', 'Hacine'],
  '32': ['El Bayadh', 'Rogassa', 'Brezina', 'Boussemghoun', 'El Abiodh Sidi Cheikh'],
  '45': ['Naâma', 'Mecheria', 'Aïn Sefra', 'Sfissifa', 'Moghrar', 'Tiout'],
};

export const RACES = [
  { id: 'ouled-djellal', label: 'Ouled Djellal', description: 'Race à laine fine, très répandue' },
  { id: 'hamra', label: 'Hamra', description: 'Race rustique, laine mi-fine' },
  { id: 'rembi', label: 'Rembi', description: 'Race locale, bonne productivité' },
  { id: 'autres', label: 'Autres', description: 'Précisez la race' },
];

export const MONTHS = [
  { id: 'jan', label: 'Jan.' },
  { id: 'fev', label: 'Fév.' },
  { id: 'mar', label: 'Mar.' },
  { id: 'avr', label: 'Avr.' },
  { id: 'mai', label: 'Mai' },
  { id: 'jun', label: 'Jun.' },
  { id: 'jul', label: 'Jul.' },
  { id: 'aou', label: 'Aoû.' },
  { id: 'sep', label: 'Sep.' },
  { id: 'oct', label: 'Oct.' },
  { id: 'nov', label: 'Nov.' },
  { id: 'dec', label: 'Déc.' },
];

export type LotStatut =
  | 'collecté' |'au_dépôt' |'classifié' |'en_transit_laverie' |'en_laverie' |'lavé' |'en_transit_transformateur' |'livré';

export type SourceStatut = 'en_attente' | 'actif' | 'rejeté' | 'suspendu';

export interface TimelineEvent {
  type: string;
  label: string;
  date: string;
  heure: string;
  acteur: string;
  lieu: string;
  poids?: number;
  ecart?: number;
  completed: boolean;
}

export interface Lot {
  id: string;
  date_collecte: string;
  poids_kg: number;
  race: string;
  type_laine: string;
  statut: LotStatut;
  agent_nom: string;
  photo_url: string | null;
  timeline: TimelineEvent[];
}

export const MOCK_LOTS: Lot[] = [
  {
    id: 'LOT-2026-042',
    date_collecte: '18/04/2026',
    poids_kg: 187.5,
    race: 'Ouled Djellal',
    type_laine: 'Tonte printanière',
    statut: 'en_laverie',
    agent_nom: 'Karim Bensalem',
    photo_url: null,
    timeline: [
      { type: 'collecte', label: 'Collecte effectuée', date: '18/04/2026', heure: '09:14', acteur: 'Karim Bensalem', lieu: 'Ferme Benali — Djelfa', poids: 187.5, completed: true },
      { type: 'depot', label: 'Réceptionné au dépôt', date: '18/04/2026', heure: '15:30', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', poids: 186.0, ecart: -1.5, completed: true },
      { type: 'classifie', label: 'Classifié', date: '20/04/2026', heure: '10:00', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', completed: true },
      { type: 'transit_laverie', label: 'En transit vers laverie', date: '21/04/2026', heure: '07:45', acteur: 'Chauffeur: Ali Mekki', lieu: 'Route Djelfa → Alger', completed: true },
      { type: 'laverie', label: 'Arrivé en laverie', date: '21/04/2026', heure: '16:20', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 185.5, ecart: -0.5, completed: true },
      { type: 'lave', label: 'Lavage terminé', date: '', heure: '', acteur: '', lieu: '', completed: false },
      { type: 'transit_transformateur', label: 'En transit transformateur', date: '', heure: '', acteur: '', lieu: '', completed: false },
      { type: 'livre', label: 'Livré', date: '', heure: '', acteur: '', lieu: '', completed: false },
    ],
  },
  {
    id: 'LOT-2026-031',
    date_collecte: '05/03/2026',
    poids_kg: 142.0,
    race: 'Hamra',
    type_laine: 'Tonte hivernale',
    statut: 'livré',
    agent_nom: 'Karim Bensalem',
    photo_url: null,
    timeline: [
      { type: 'collecte', label: 'Collecte effectuée', date: '05/03/2026', heure: '08:30', acteur: 'Karim Bensalem', lieu: 'Ferme Benali — Djelfa', poids: 142.0, completed: true },
      { type: 'depot', label: 'Réceptionné au dépôt', date: '05/03/2026', heure: '14:00', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', poids: 141.5, ecart: -0.5, completed: true },
      { type: 'classifie', label: 'Classifié', date: '07/03/2026', heure: '09:00', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', completed: true },
      { type: 'transit_laverie', label: 'En transit vers laverie', date: '09/03/2026', heure: '06:00', acteur: 'Chauffeur: Omar Belkadi', lieu: 'Route Djelfa → Alger', completed: true },
      { type: 'laverie', label: 'Arrivé en laverie', date: '09/03/2026', heure: '13:45', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 141.0, ecart: -0.5, completed: true },
      { type: 'lave', label: 'Lavage terminé', date: '12/03/2026', heure: '11:00', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 98.5, completed: true },
      { type: 'transit_transformateur', label: 'En transit transformateur', date: '14/03/2026', heure: '07:00', acteur: 'Chauffeur: Samir Ziani', lieu: 'Route Alger → Oran', completed: true },
      { type: 'livre', label: 'Livré', date: '15/03/2026', heure: '10:30', acteur: 'Transformateur T1 Oran', lieu: 'Usine Textil Oran', poids: 98.0, completed: true },
    ],
  },
  {
    id: 'LOT-2026-019',
    date_collecte: '28/01/2026',
    poids_kg: 203.0,
    race: 'Ouled Djellal',
    type_laine: 'Tonte hivernale',
    statut: 'livré',
    agent_nom: 'Djamel Khoury',
    photo_url: null,
    timeline: [
      { type: 'collecte', label: 'Collecte effectuée', date: '28/01/2026', heure: '10:00', acteur: 'Djamel Khoury', lieu: 'Ferme Benali — Djelfa', poids: 203.0, completed: true },
      { type: 'depot', label: 'Réceptionné au dépôt', date: '28/01/2026', heure: '16:30', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', poids: 201.5, ecart: -1.5, completed: true },
      { type: 'classifie', label: 'Classifié', date: '30/01/2026', heure: '09:30', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', completed: true },
      { type: 'transit_laverie', label: 'En transit vers laverie', date: '02/02/2026', heure: '06:30', acteur: 'Chauffeur: Ali Mekki', lieu: 'Route Djelfa → Alger', completed: true },
      { type: 'laverie', label: 'Arrivé en laverie', date: '02/02/2026', heure: '14:00', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 201.0, ecart: -0.5, completed: true },
      { type: 'lave', label: 'Lavage terminé', date: '06/02/2026', heure: '15:00', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 139.0, completed: true },
      { type: 'transit_transformateur', label: 'En transit transformateur', date: '08/02/2026', heure: '07:00', acteur: 'Chauffeur: Samir Ziani', lieu: 'Route Alger → Oran', completed: true },
      { type: 'livre', label: 'Livré', date: '09/02/2026', heure: '11:00', acteur: 'Transformateur T1 Oran', lieu: 'Usine Textil Oran', poids: 138.5, completed: true },
    ],
  },
  {
    id: 'LOT-2025-118',
    date_collecte: '14/11/2025',
    poids_kg: 165.0,
    race: 'Rembi',
    type_laine: 'Tonte automnale',
    statut: 'livré',
    agent_nom: 'Karim Bensalem',
    photo_url: null,
    timeline: [
      { type: 'collecte', label: 'Collecte effectuée', date: '14/11/2025', heure: '09:00', acteur: 'Karim Bensalem', lieu: 'Ferme Benali — Djelfa', poids: 165.0, completed: true },
      { type: 'depot', label: 'Réceptionné au dépôt', date: '14/11/2025', heure: '15:00', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', poids: 164.0, ecart: -1.0, completed: true },
      { type: 'classifie', label: 'Classifié', date: '16/11/2025', heure: '10:00', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', completed: true },
      { type: 'transit_laverie', label: 'En transit vers laverie', date: '18/11/2025', heure: '07:00', acteur: 'Chauffeur: Omar Belkadi', lieu: 'Route Djelfa → Alger', completed: true },
      { type: 'laverie', label: 'Arrivé en laverie', date: '18/11/2025', heure: '14:30', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 163.5, ecart: -0.5, completed: true },
      { type: 'lave', label: 'Lavage terminé', date: '22/11/2025', heure: '12:00', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 113.0, completed: true },
      { type: 'transit_transformateur', label: 'En transit transformateur', date: '24/11/2025', heure: '06:00', acteur: 'Chauffeur: Samir Ziani', lieu: 'Route Alger → Oran', completed: true },
      { type: 'livre', label: 'Livré', date: '25/11/2025', heure: '10:00', acteur: 'Transformateur T2 Oran', lieu: 'Usine Filature Oran', poids: 112.5, completed: true },
    ],
  },
  {
    id: 'LOT-2025-097',
    date_collecte: '22/09/2025',
    poids_kg: 98.5,
    race: 'Hamra',
    type_laine: 'Tonte automnale',
    statut: 'livré',
    agent_nom: 'Djamel Khoury',
    photo_url: null,
    timeline: [
      { type: 'collecte', label: 'Collecte effectuée', date: '22/09/2025', heure: '08:00', acteur: 'Djamel Khoury', lieu: 'Ferme Benali — Djelfa', poids: 98.5, completed: true },
      { type: 'depot', label: 'Réceptionné au dépôt', date: '22/09/2025', heure: '13:30', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', poids: 98.0, ecart: -0.5, completed: true },
      { type: 'classifie', label: 'Classifié', date: '24/09/2025', heure: '09:00', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', completed: true },
      { type: 'transit_laverie', label: 'En transit vers laverie', date: '26/09/2025', heure: '07:00', acteur: 'Chauffeur: Ali Mekki', lieu: 'Route Djelfa → Alger', completed: true },
      { type: 'laverie', label: 'Arrivé en laverie', date: '26/09/2025', heure: '14:00', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 97.5, ecart: -0.5, completed: true },
      { type: 'lave', label: 'Lavage terminé', date: '29/09/2025', heure: '11:00', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 67.0, completed: true },
      { type: 'transit_transformateur', label: 'En transit transformateur', date: '01/10/2025', heure: '07:00', acteur: 'Chauffeur: Samir Ziani', lieu: 'Route Alger → Oran', completed: true },
      { type: 'livre', label: 'Livré', date: '02/10/2025', heure: '09:30', acteur: 'Transformateur T1 Oran', lieu: 'Usine Textil Oran', poids: 66.5, completed: true },
    ],
  },
  {
    id: 'LOT-2025-061',
    date_collecte: '10/06/2025',
    poids_kg: 220.0,
    race: 'Ouled Djellal',
    type_laine: 'Tonte printanière',
    statut: 'livré',
    agent_nom: 'Karim Bensalem',
    photo_url: null,
    timeline: [
      { type: 'collecte', label: 'Collecte effectuée', date: '10/06/2025', heure: '07:30', acteur: 'Karim Bensalem', lieu: 'Ferme Benali — Djelfa', poids: 220.0, completed: true },
      { type: 'depot', label: 'Réceptionné au dépôt', date: '10/06/2025', heure: '13:00', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', poids: 218.5, ecart: -1.5, completed: true },
      { type: 'classifie', label: 'Classifié', date: '12/06/2025', heure: '10:00', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', completed: true },
      { type: 'transit_laverie', label: 'En transit vers laverie', date: '14/06/2025', heure: '06:00', acteur: 'Chauffeur: Omar Belkadi', lieu: 'Route Djelfa → Alger', completed: true },
      { type: 'laverie', label: 'Arrivé en laverie', date: '14/06/2025', heure: '13:30', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 218.0, ecart: -0.5, completed: true },
      { type: 'lave', label: 'Lavage terminé', date: '18/06/2025', heure: '14:00', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 150.0, completed: true },
      { type: 'transit_transformateur', label: 'En transit transformateur', date: '20/06/2025', heure: '06:30', acteur: 'Chauffeur: Samir Ziani', lieu: 'Route Alger → Oran', completed: true },
      { type: 'livre', label: 'Livré', date: '21/06/2025', heure: '10:00', acteur: 'Transformateur T1 Oran', lieu: 'Usine Textil Oran', poids: 149.5, completed: true },
    ],
  },
  {
    id: 'LOT-2025-038',
    date_collecte: '15/04/2025',
    poids_kg: 178.0,
    race: 'Rembi',
    type_laine: 'Tonte printanière',
    statut: 'livré',
    agent_nom: 'Djamel Khoury',
    photo_url: null,
    timeline: [
      { type: 'collecte', label: 'Collecte effectuée', date: '15/04/2025', heure: '09:00', acteur: 'Djamel Khoury', lieu: 'Ferme Benali — Djelfa', poids: 178.0, completed: true },
      { type: 'depot', label: 'Réceptionné au dépôt', date: '15/04/2025', heure: '15:00', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', poids: 177.0, ecart: -1.0, completed: true },
      { type: 'classifie', label: 'Classifié', date: '17/04/2025', heure: '09:30', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', completed: true },
      { type: 'transit_laverie', label: 'En transit vers laverie', date: '19/04/2025', heure: '07:00', acteur: 'Chauffeur: Ali Mekki', lieu: 'Route Djelfa → Alger', completed: true },
      { type: 'laverie', label: 'Arrivé en laverie', date: '19/04/2025', heure: '14:00', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 176.5, ecart: -0.5, completed: true },
      { type: 'lave', label: 'Lavage terminé', date: '23/04/2025', heure: '12:00', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 121.0, completed: true },
      { type: 'transit_transformateur', label: 'En transit transformateur', date: '25/04/2025', heure: '06:00', acteur: 'Chauffeur: Samir Ziani', lieu: 'Route Alger → Oran', completed: true },
      { type: 'livre', label: 'Livré', date: '26/04/2025', heure: '10:30', acteur: 'Transformateur T2 Oran', lieu: 'Usine Filature Oran', poids: 120.5, completed: true },
    ],
  },
  {
    id: 'LOT-2025-012',
    date_collecte: '03/02/2025',
    poids_kg: 134.0,
    race: 'Hamra',
    type_laine: 'Tonte hivernale',
    statut: 'livré',
    agent_nom: 'Karim Bensalem',
    photo_url: null,
    timeline: [
      { type: 'collecte', label: 'Collecte effectuée', date: '03/02/2025', heure: '08:30', acteur: 'Karim Bensalem', lieu: 'Ferme Benali — Djelfa', poids: 134.0, completed: true },
      { type: 'depot', label: 'Réceptionné au dépôt', date: '03/02/2025', heure: '14:30', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', poids: 133.0, ecart: -1.0, completed: true },
      { type: 'classifie', label: 'Classifié', date: '05/02/2025', heure: '10:00', acteur: 'Youcef Rahmani', lieu: 'Dépôt Central Djelfa', completed: true },
      { type: 'transit_laverie', label: 'En transit vers laverie', date: '07/02/2025', heure: '07:00', acteur: 'Chauffeur: Omar Belkadi', lieu: 'Route Djelfa → Alger', completed: true },
      { type: 'laverie', label: 'Arrivé en laverie', date: '07/02/2025', heure: '14:00', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 132.5, ecart: -0.5, completed: true },
      { type: 'lave', label: 'Lavage terminé', date: '11/02/2025', heure: '13:00', acteur: 'Farid Hamdi', lieu: 'Laverie NFN Alger', poids: 91.0, completed: true },
      { type: 'transit_transformateur', label: 'En transit transformateur', date: '13/02/2025', heure: '07:00', acteur: 'Chauffeur: Samir Ziani', lieu: 'Route Alger → Oran', completed: true },
      { type: 'livre', label: 'Livré', date: '14/02/2025', heure: '10:00', acteur: 'Transformateur T1 Oran', lieu: 'Usine Textil Oran', poids: 90.5, completed: true },
    ],
  },
];

export const MOCK_PROFILE = {
  id: 'src-0042',
  type: 'éleveur',
  statut: 'actif' as SourceStatut,
  nom: 'Benali',
  prenom: 'Mohamed',
  nin: '9876543210123456',
  telephone: '+213 661 234 567',
  wilaya: 'Djelfa',
  commune: 'Hassi Bahbah',
  gps: { latitude: 34.6836, longitude: 3.4894 },
  races: ['Ouled Djellal', 'Hamra', 'Rembi'],
  nombre_tetes: { 'Ouled Djellal': 320, Hamra: 85, Rembi: 140 },
  mois_disponibilite: ['Fév.', 'Mar.', 'Avr.', 'Sep.', 'Oct.', 'Nov.'],
  date_inscription: '12/01/2025',
  date_validation: '19/01/2025',
  admin_feedback: null,
  scoring_fiabilite: 94,
};

export const LOT_STATUT_CONFIG: Record<LotStatut, { label: string; color: string; bg: string; dot: string }> = {
  collecté: { label: 'Collecté', color: '#8B7355', bg: '#F5F0EA', dot: '#8B7355' },
  au_dépôt: { label: 'Au dépôt', color: '#5A8F7B', bg: '#EBF5F1', dot: '#5A8F7B' },
  classifié: { label: 'Classifié', color: '#5A8F7B', bg: '#EBF5F1', dot: '#5A8F7B' },
  en_transit_laverie: { label: 'En transit', color: '#F4A261', bg: '#FEF3E8', dot: '#F4A261' },
  en_laverie: { label: 'En laverie', color: '#4A90D9', bg: '#EBF4FC', dot: '#4A90D9' },
  lavé: { label: 'Lavé', color: '#4A90D9', bg: '#EBF4FC', dot: '#4A90D9' },
  en_transit_transformateur: { label: 'En transit', color: '#F4A261', bg: '#FEF3E8', dot: '#F4A261' },
  livré: { label: 'Livré ✓', color: '#7FB069', bg: '#EBF5E7', dot: '#7FB069' },
};