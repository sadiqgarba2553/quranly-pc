import { getReciterAvatarUrl } from '../utils/reciterPhotos';

const rawReciters = [
  {
    id: 1,
    name: 'Ali Jaber',
    country: 'Saudi Arabia',
    categories: ['Top Reciters', 'Your favourites'],
    server: 'https://server11.mp3quran.net/a_jbr/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server11.mp3quran.net/a_jbr/' }],
  },
  {
    id: 2,
    name: 'Muhammad Ayub',
    country: 'Saudi Arabia',
    categories: ['Top Reciters', 'Your favourites'],
    server: 'https://server8.mp3quran.net/ayyoub/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server8.mp3quran.net/ayyoub/' }],
  },
  {
    id: 3,
    name: 'Abdulrahman Al-Sudais',
    country: 'Saudi Arabia',
    categories: ['Top Reciters', 'Your favourites'],
    server: 'https://server5.mp3quran.net/sds/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server5.mp3quran.net/sds/' }],
  },
  {
    id: 4,
    name: 'Maher Al-Muaiqly',
    country: 'Saudi Arabia',
    categories: ['Top Reciters'],
    server: 'https://server11.mp3quran.net/maher/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server11.mp3quran.net/maher/' }],
  },
  {
    id: 5,
    name: 'Raad Al Kurdi',
    country: 'Iraq',
    categories: ['Your favourites'],
    server: 'https://server6.mp3quran.net/kurdi/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server6.mp3quran.net/kurdi/' }],
  },
  {
    id: 6,
    name: 'Mishary Rashid Alafasy',
    country: 'Kuwait',
    categories: ['Top Reciters'],
    server: 'https://server8.mp3quran.net/afs/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server8.mp3quran.net/afs/' }],
  },
  {
    id: 7,
    name: 'Abdul Basit Abdus Samad',
    country: 'Egypt',
    categories: ['Top Reciters'],
    server: 'https://server7.mp3quran.net/basit/',
    moshaf: [{ id: 1, name: 'Murattal', server: 'https://server7.mp3quran.net/basit/' }],
  },
  {
    id: 8,
    name: 'Muhammad Al-Luhaidan',
    country: 'Saudi Arabia',
    categories: ['Featured'],
    server: 'https://server8.mp3quran.net/lhdan/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server8.mp3quran.net/lhdan/' }],
  },
  {
    id: 9,
    name: 'Yasser Al-Dosari',
    country: 'Saudi Arabia',
    categories: ['Featured'],
    server: 'https://server11.mp3quran.net/yasser/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server11.mp3quran.net/yasser/' }],
  },
  {
    id: 10,
    name: 'Yerkinbek Shoqai',
    country: 'Kazakhstan',
    categories: ['From Kazakhstan'],
    server: 'https://server16.mp3quran.net/yerkinbek/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server16.mp3quran.net/yerkinbek/' }],
  },
  {
    id: 11,
    name: 'Ihlas Salih',
    country: 'Kazakhstan',
    categories: ['From Kazakhstan'],
    server: 'https://server16.mp3quran.net/ihlas/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server16.mp3quran.net/ihlas/' }],
  },
  {
    id: 12,
    name: 'Yergen Kumarov',
    country: 'Kazakhstan',
    categories: ['From Kazakhstan'],
    server: 'https://server16.mp3quran.net/kumarov/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server16.mp3quran.net/kumarov/' }],
  },
  {
    id: 13,
    name: 'Hani Ar-Rifai',
    country: 'Saudi Arabia',
    categories: ['Popular'],
    server: 'https://server8.mp3quran.net/rifai/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server8.mp3quran.net/rifai/' }],
  },
  {
    id: 14,
    name: 'Saud Al-Shuraim',
    country: 'Saudi Arabia',
    categories: ['Popular'],
    server: 'https://server7.mp3quran.net/shur/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server7.mp3quran.net/shur/' }],
  },
  {
    id: 15,
    name: 'Nasser Al-Qatami',
    country: 'Saudi Arabia',
    categories: ['Popular'],
    server: 'https://server6.mp3quran.net/qtm/',
    moshaf: [{ id: 1, name: 'Hafs A\'n Asim', server: 'https://server6.mp3quran.net/qtm/' }],
  },
  {
    id: 16,
    name: 'English Audio (Ibrahim Walk)',
    country: 'USA / UK',
    categories: ['Top Reciters', 'English Audio'],
    server: 'https://download.quranicaudio.com/quran/english/ibrahim_walk/',
    moshaf: [{ id: 1, name: 'Saheeh International (English)', server: 'https://download.quranicaudio.com/quran/english/ibrahim_walk/' }],
  },
];

const reciters = rawReciters.map(r => ({
  ...r,
  avatar: getReciterAvatarUrl(r.name, r.id),
}));

export default reciters;

/**
 * Get reciters filtered by category
 * @param {string} category
 * @returns {Array}
 */
export function getRecitersByCategory(category) {
  return reciters.filter(r => r.categories.includes(category));
}

/**
 * Get a reciter by ID
 * @param {number} id
 * @returns {object|undefined}
 */
export function getReciterById(id) {
  return reciters.find(r => r.id === id);
}
