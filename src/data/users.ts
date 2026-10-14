import type { User } from '../types'

export const me: User = {
  id: 'me',
  name: 'Алекс',
  age: 27,
  city: 'Санкт-Петербург',
  bio: 'Собираю плейлисты под настроение, ищу новые места и людей, с которыми можно потеряться в городе.',
  interests: ['Кофе', 'Путешествия', 'Кино', 'Винил'],
  sign: 'Весы',
  compatibility: 100,
  photos: [
    '/images/mila-portrait.jpg',
    '/images/mila-cafe.jpg',
  ],
  goals: ['Серьёзные отношения', 'Новые впечатления'],
}

export const users: User[] = [
  {
    id: 'mila',
    name: 'Мила',
    age: 25,
    city: 'Санкт-Петербург',
    bio: 'Архитектор по будням, исследовательница маленьких кофеен по выходным. Верю в случайные хорошие встречи.',
    interests: ['Архитектура', 'Кофе', 'Путешествия', 'Кино'],
    sign: 'Рыбы',
    compatibility: 67,
    photos: [
      '/images/mila-portrait.jpg',
      '/images/mila-cafe.jpg',
      '/images/mila-walk.jpg',
    ],
    goals: ['Серьёзные отношения', 'Путешествовать вместе'],
    online: true,
  },
  {
    id: 'leo',
    name: 'Лев',
    age: 28,
    city: 'Москва',
    bio: 'Музыкант, который слишком часто говорит «ещё одну песню» и слишком редко говорит «пора домой».',
    interests: ['Винил', 'Музыка', 'Кино', 'Горы'],
    sign: 'Лев',
    compatibility: 87,
    photos: [
      '/images/leo-portrait.jpg',
      '/images/leo-music.jpg',
      '/images/leo-profile.jpg',
    ],
    goals: ['Посмотреть, куда приведёт'],
    online: true,
  },
  {
    id: 'anya',
    name: 'Аня',
    age: 26,
    city: 'Санкт-Петербург',
    bio: 'Люблю длинные завтраки, короткие поездки и людей, рядом с которыми можно быть собой.',
    interests: ['Книги', 'Кофе', 'Музеи', 'Йога'],
    sign: 'Телец',
    compatibility: 82,
    photos: [
      '/images/anya-portrait.jpg',
      '/images/anya-cafe.jpg',
      '/images/anya-profile.jpg',
    ],
    goals: ['Серьёзные отношения', 'Вместе расти'],
  },
  {
    id: 'sasha',
    name: 'Саша',
    age: 29,
    city: 'Казань',
    bio: 'Велосипед, плёночная камера и спонтанные билеты в один конец. Ищу своего напарника по приключениям.',
    interests: ['Путешествия', 'Велосипед', 'Фото', 'Горы'],
    sign: 'Стрелец',
    compatibility: 78,
    photos: [
      '/images/leo-music.jpg',
      '/images/leo-portrait.jpg',
      '/images/sasha-portrait.jpg',
    ],
    goals: ['Новые впечатления', 'Серьёзные отношения'],
  },
]

