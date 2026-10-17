# Контракт сервера для Fate

Источник: [Perry-Utkonos-backend](https://github.com/Perry-Utkonos/Perry-Utkonos-backend), ветка `feature/chat-backend`, коммит `bf8010db3b4256915dd0d05de93ea7fa29957e2e`. Изменения хранятся в [backend.patch](backend.patch). Они применяются командой `node integration/prepare.mjs`; исходный репозиторий на GitHub не изменён.

Патч нужен для совместного запуска: в исходной версии дублировались DTO и конфигурации EF, отсутствовали несколько зависимостей, вход, действующая JWT-авторизация, API анкет и лайков, а также миграции базы. Одна передача `X-User-Id` позволяла представиться другим пользователем.

## Настройки контейнера

| Переменная | Назначение |
| --- | --- |
| `ConnectionStrings__Postgres` | Строка подключения PostgreSQL; внутри Compose используется имя сервиса базы. |
| `Jwt__SigningKey` | Случайный секрет минимум 32 байта; обязателен, общего встроенного ключа нет. |
| `Jwt__Issuer` / `Jwt__Audience` | По умолчанию `chatapp` / `chatapp-clients`. |
| `Database__ApplyMigrations` | `true` применяет включённую EF-миграцию перед стартом API. При ошибке процесс завершится. |
| `ConnectionStrings__Redis` | Пусто для одного API; адрес Redis для нескольких экземпляров SignalR. |
| `Cors__Origins__0` | Дополнительный разрешённый origin, если интерфейс и API расположены на разных доменах. При едином Nginx не нужен. |

В Compose Nginx передаёт `/api/` и `/hubs/` в API. Браузеру нужны адрес сайта и HTTPS, а не имена Docker-сервисов и доступ к PostgreSQL. `GET /api/health` возвращает `200 {"status":"ok"}`, если база доступна.

Начальная миграция рассчитана на пустую базу. Существующую базу с таблицами, но без соответствующей истории EF, нужно отдельно сверить и привести к миграциям; автоматического удаления таблиц или `EnsureCreated` нет.

## Аккаунты

Все ответы JSON используют `camelCase`; идентификаторы — UUID, даты — UTC ISO 8601.

| Метод | Путь | JSON запроса |
| --- | --- | --- |
| POST | `/api/auth/register` | `{username,email,password,displayName?}` |
| POST | `/api/auth/login` | `{usernameOrEmail,password}` |
| POST | `/api/auth/refresh` | `{refreshToken}` |

Ответ каждого метода: `{accessToken,refreshToken,accessTokenExpiresAt,user}`. `user` содержит `{id,username,email,displayName,avatarUrl,lastSeenAt}`. Refresh-токен хранится в базе в виде хеша и заменяется при обновлении; повторное использование старого токена отклоняется. Имя пользователя нормализуется в нижний регистр, его длина 3–32 символа, пароль — 8–72 байта UTF-8.

Остальные методы требуют `Authorization: Bearer <accessToken>`. `X-User-Id` и `?userId=` больше не авторизуют запросы. Ошибки: `400` — неверные данные, `401` — нет действующей авторизации, `403` — нет доступа к диалогу, `404` — объект не найден, `409` — конфликт. Доменная ошибка имеет вид `{error,status}`; ошибки валидации ASP.NET также могут содержать `errors`.

## Анкеты

| Метод | Путь | Ответ |
| --- | --- | --- |
| GET | `/api/me` | Текущая анкета. |
| PATCH | `/api/me` | Сохранённая анкета. |
| GET | `/api/profiles?limit=100&offset=0` | Массив активных анкет без текущего пользователя; `limit` 1–200. |
| GET | `/api/profiles/{id}` | Анкета по UUID. |

Анкета: `{id,username,displayName,avatarUrl,lastSeenAt,age,birthDate,city,bio,interests,sign,photos,goals,gender}`. `age` и `birthDate` могут быть `null`; массивы всегда возвращаются массивами. Поля рождения хранятся как `YYYY-MM-DD`, возраст рассчитывается сервером.

PATCH принимает поля `displayName`, `avatarUrl`, `birthDate`, `city`, `bio`, `interests`, `sign`, `photos`, `goals`, `gender`. Отсутствующее поле не меняется, явный `null` очищает необязательное поле. Дата рождения ограничена возрастом 18–120 лет. Длины: имя 80, город 120, описание 500, знак 40, пол 16 символов. Интересов до 30, целей до 10, фотографий до 10. Фотографии передаются HTTP(S)-ссылками или путями вида `/images/file.jpg`; загрузки файлов сервер пока не предоставляет.

## Лайки и совпадения

| Метод | Путь | Запрос / ответ |
| --- | --- | --- |
| GET | `/api/likes` | `{likedUserIds:[],incomingUserIds:[]}` |
| POST | `/api/likes` | `{targetUserId}` → `{targetUserId,isMatch,conversationId}` |
| DELETE | `/api/likes/{targetUserId}` | `204` |

Лайки хранятся в PostgreSQL. `isMatch` становится `true` только при ответном лайке, тогда создаётся один диалог и возвращается его UUID. Повторный лайк не создаёт дубликатов; отмена лайка сохраняет существующую переписку.

## Диалоги и сообщения

| Метод | Путь | Запрос / ответ |
| --- | --- | --- |
| GET | `/api/conversations` | Массив диалогов. |
| POST | `/api/conversations` | `{peerId}` → существующий или новый диалог. |
| GET | `/api/conversations/{id}/messages?before=SEQ&limit=50` | `{items,nextCursor,hasMore}`; сообщения внутри страницы идут от старых к новым. |

Диалог: `{id,peer,lastMessageBody,lastMessageAt,lastMessageSenderId,lastSeq,unreadCount}`. `peer` имеет форму `user` из ответа авторизации. Список ограничен последними 100 диалогами; история доступна участникам, размер страницы 1–100.

SignalR: `/hubs/chat`, авторизация через стандартный `accessTokenFactory` клиента `@microsoft/signalr`. Для WebSocket библиотека передаёт JWT в `access_token`.

В API категория логирования `Microsoft.AspNetCore.Hosting.Diagnostics` ограничена уровнем `Warning`, чтобы JWT из URL WebSocket не попадал в обычный журнал запросов. Конфигурация Nginx также должна сохранять путь запроса без query-параметров.

| Направление | Метод / событие | Аргументы |
| --- | --- | --- |
| Клиент → сервер | `SendMessage` | `conversationId, clientMessageId, body` |
| Клиент → сервер | `MarkRead` | `conversationId, lastReadSeq` |
| Клиент → сервер | `Typing` | `conversationId` |
| Сервер → клиент | `ReceiveMessage` | `message` |
| Сервер → клиент | `ReadReceipt` | `conversationId, userId, lastReadSeq` |
| Сервер → клиент | `UserTyping` | `conversationId, userId` |

`SendMessage` возвращает сохранённое сообщение. `clientMessageId` — созданный клиентом UUID; он же становится серверным `id`, поэтому повторная отправка с тем же UUID не добавляет сообщение. Лимит текста — 8000 символов. Сообщение: `{id,conversationId,senderId,seq,body,type,replyToId,createdAt,editedAt,deletedAt}`; текстовый `type` равен `0`.

Доставка идёт в личные SignalR-группы обоих участников: новый диалог получает сообщения и без переподключения. На reconnect нужно перечитать список и историю, чтобы получить сообщения, отправленные во время отключения. Сервер проверяет участие до отправки, чтения и повторного использования UUID; позиция прочтения не выходит за последнюю последовательность сообщения.

## Что ещё отсутствует на сервере

- `/api/recommendations` читает сохранённые записи с `targetUserId`, но генератор рекомендаций не реализован. `/rebuild` возвращает `501`.
- `/api/payments` создаёт и читает записи `pending`; платёжного провайдера и выдачи подписки нет. `/api/payments/{id}/complete` возвращает `501`, пользователь не может сам подтвердить оплату.
- Нет загрузки фотографий, доставки почты, сброса пароля и удаления аккаунта. Эти функции нельзя считать подключёнными по наличию интерфейса.
