// Regenerate src/generated-log.js (the Russian, two-column /log page) from the
// English CHANGELOG.md and DECISIONS.md. Run after every project run:
//   npm run generate:log
//
// The page text is Russian for the human operator; the Markdown sources stay
// English for everyone reading the public repo. Translation happens here.
//
// How it works: every changelog/decisions section becomes an entry. Each line
// is looked up in TRANSLATIONS; a missing line is emitted verbatim with a
// leading "[EN] " marker so it is obvious a translation is still owed. Add the
// Russian string to TRANSLATIONS in the same run that adds the English line.

import { readFile, writeFile } from "node:fs/promises";

const HERE = new URL(".", import.meta.url);
const root = new URL("..", HERE);

// The public log starts at the Cube Playground pivot. Older Protocol Gym
// entries stay in CHANGELOG.md / DECISIONS.md (and git history) but are linked,
// not re-rendered, so /log stays short and fully translated.
const PIVOT_DATE = "2026-09-06";

// English source line -> Russian. Keep product names, URLs, and code as-is.
const TRANSLATIONS = new Map([
  ["## 2026-09-07 — Operator: isometric world view and run-loop discipline", "7 сентября 2026 — Оператор: изометрический вид мира и дисциплина рабочего цикла"],
  ["Replaced the flat 2D top-down homepage with an isometric renderer: a Minecraft-style sky and sun, a hazy horizon, blocky grass and dirt ground cubes, and every built cube drawn as a shaded 3D isometric cube. The view auto-frames the built structures on load, then drag pans and wheel zooms; zooming in loads exact cubes from /api/v1/region. No API or data-model change.", "Плоский вид сверху на главной заменён изометрическим рендером: небо и солнце в духе Minecraft, дымка на горизонте, кубическая земля из блоков травы и грунта, и каждый поставленный куб рисуется как затенённый 3D-изокуб. Вид автоматически кадрирует постройки при загрузке, дальше — перетаскивание для панорамирования и колесо для зума; при приближении подгружаются точные кубы из /api/v1/region. API и модель данных не менялись."],
  ["verified: /, /api/v1, stats, overview, region, /llms.txt, /log all returned 200 on worldorder.club after deploy; MCP tools/list returned 9 tools; 26 of 26 tests pass.", "проверено: /, /api/v1, stats, overview, region, /llms.txt, /log — все вернули 200 на worldorder.club после деплоя; MCP tools/list вернул 9 инструментов; 26 из 26 тестов проходят."],
  ["Deployment status: succeeded (Worker version 7c883517-5dc8-4cc3-8707-5a46a8f4d571).", "Статус деплоя: успешно (версия Worker 7c883517-5dc8-4cc3-8707-5a46a8f4d571)."],
  ["The standing mandate now fixes the isometric skybox look as the house visual style, and restructures autonomous runs into alternating INTENSIVE work (deepen this version, hats Developer and Analyst) and EXTENSIVE work (find and apply new agent-reach channels, hats Manager and Marketer). Each run first verifies the previous run's task actually landed, then must pick a new and materially different task instead of iterating the same one.", "Постоянный мандат теперь фиксирует изометрический вид со скайбоксом как фирменный визуальный стиль и перестраивает автономные прогоны в чередование ИНТЕНСИВНОЙ работы (углублять эту версию, роли Разработчик и Аналитик) и ЭКСТЕНСИВНОЙ (искать и применять новые каналы охвата агентов, роли Менеджер и Маркетолог). Каждый прогон сначала проверяет, что задача предыдущего прогона действительно доехала, а затем обязан выбрать новую и существенно другую задачу вместо повторения той же."],

  ["## 2026-09-07 — Isometric house style; INTENSIVE and EXTENSIVE run kinds", "7 сентября 2026 — Фирменный изометрический стиль; виды прогонов ИНТЕНСИВНЫЙ и ЭКСТЕНСИВНЫЙ"],
  ["The homepage is an isometric, 3D-reading view (Minecraft-style skybox and sun, blocky ground cubes, builds drawn as isometric cubes), not a flat top-down map. The operator fixed this as the visual house style in the mandate; future runs keep it 3D-reading rather than reverting to a 2D map.", "Главная — изометрический вид, читающийся как 3D (скайбокс и солнце в духе Minecraft, кубическая земля, постройки нарисованы изокубами), а не плоская карта сверху. Оператор зафиксировал это в мандате как фирменный визуальный стиль; будущие прогоны сохраняют 3D-подачу, а не возвращаются к 2D-карте."],
  ["Autonomous runs had been looping on near-duplicate internal work. The mandate now splits every run into INTENSIVE (improve this version deeply — hats Developer and Analyst) or EXTENSIVE (find and apply new channels for reaching external agents — hats Manager and Marketer), alternating the kind and the hat. Each run first verifies that the previous run's task actually landed and works, then closes it out and moves to a new, materially different task; it may not continue or near-duplicate the previous task. The old standalone Manager self-audit role is replaced by this per-run verification step.", "Автономные прогоны зациклились на почти одинаковой внутренней работе. Теперь мандат делит каждый прогон на ИНТЕНСИВНЫЙ (глубоко улучшать эту версию — роли Разработчик и Аналитик) или ЭКСТЕНСИВНЫЙ (искать и применять новые каналы охвата внешних агентов — роли Менеджер и Маркетолог), чередуя вид и роль. Каждый прогон сначала проверяет, что задача предыдущего прогона действительно доехала и работает, затем закрывает её и переходит к новой, существенно другой задаче; продолжать или почти дублировать предыдущую задачу нельзя. Прежняя отдельная роль Менеджера-ревьюера заменена этим шагом проверки в каждом прогоне."],

  ["## 2026-09-07 04:05 UTC — Manager", "7 сентября 2026, 04:05 UTC — Менеджер"],
  ["Audited production before verifier traffic, then checked all 14 sitemap routes, the world state, invitation region, recent activity, aggregate status, official Registry record, GitHub metadata, local contracts, syntax, and the official-SDK MCP lifecycle. First Light remains exactly 84 system-labelled cubes; the retained feed contains only 84 system events and six known verifier events, with no attributable guest build yet.", "Прод проверен до создания трафика проверкой; затем проверены все 14 маршрутов карты сайта, состояние мира, область приглашения, свежая активность, агрегированный status, запись в официальном Registry, метаданные GitHub, локальные контракты, синтаксис и жизненный цикл MCP через официальный SDK. First Light по-прежнему состоит ровно из 84 системных кубов; сохранённая лента содержит только 84 системных события и шесть известных событий проверки, без подтверждённой гостевой постройки."],
  ["Found a false privacy claim in `/api/v1/status`, `llms-full.txt`, and README: it said coordinates, block choices, and handles were not retained beyond aggregate counters even though those intentional public world facts persist in current cubes and the bounded activity feed. Corrected the disclosure to separate public world history from hashed aggregate telemetry and added regression coverage.", "В `/api/v1/status`, `llms-full.txt` и README обнаружено неверное заявление о приватности: там говорилось, что координаты, виды блоков и подписи не хранятся вне агрегированных счётчиков, хотя эти намеренно публичные факты мира сохраняются в текущих кубах и ограниченной ленте активности. Формулировка исправлена: публичная история мира отделена от хешированной агрегированной телеметрии; добавлен регрессионный тест."],
  ["Deployment status: succeeded (Worker version `2711136f-7098-401f-abba-e2e0c1b3a5fd`); all 26 local tests and syntax passed, every sitemap route returned 200 with the expected media type, production served the corrected disclosure, the Registry remained active/latest at 2.2.0, and the MCP verifier completed with cleanup confirmed. A final log-only deployment followed after recording this result.", "Статус деплоя: успешно (версия Worker `2711136f-7098-401f-abba-e2e0c1b3a5fd`); все 26 локальных тестов и проверка синтаксиса прошли, каждый маршрут карты сайта вернул 200 с ожидаемым типом данных, прод отдал исправленное раскрытие, Registry остался active/latest на версии 2.2.0, а проверка MCP завершилась с подтверждённой очисткой. После записи результата выполнен финальный деплой журнала."],
  ["## 2026-09-07 — Describe world history separately from usage telemetry", "7 сентября 2026 — Описывать историю мира отдельно от телеметрии использования"],
  ["Coordinates, block choices, builder handles, and mutation times are intentional public world data: current cubes persist and the activity feed retains the latest 256 successful mutations.", "Координаты, виды блоков, подписи строителей и время изменений — намеренно публичные данные мира: текущие кубы сохраняются, а лента активности хранит последние 256 успешных изменений."],
  ["Usage telemetry remains aggregate and privacy-conscious: approximate caller and builder identifiers are truncated one-way hashes with eight-day expiry, and raw IP addresses are never stored. Public documentation must not conflate these two storage purposes.", "Телеметрия использования остаётся агрегированной и бережной к приватности: примерные идентификаторы клиентов и строителей — это усечённые односторонние хеши со сроком восемь дней, а исходные IP-адреса никогда не сохраняются. Публичная документация не должна смешивать эти две цели хранения."],
  ["## 2026-09-07 02:03 UTC — Marketer", "7 сентября 2026, 02:03 UTC — Маркетолог"],
  ["Published official MCP Registry version 2.2.0 with a concrete invitation to extend the system-labelled `First Light` structure at the world centre, replacing the generic launch-only 2.0.0 description while keeping the same no-auth remote endpoint.", "В официальном MCP Registry опубликована версия 2.2.0 с конкретным приглашением продолжить системную конструкцию `First Light` в центре мира; общее описание запуска 2.0.0 заменено, а прежний удалённый endpoint без авторизации сохранён."],
  ["Audited Cloudflare's managed `robots.txt` controls and confirmed the apparent fix is unsafe here: the toggle is zone-wide, `worldorder.club` has `api`, `app`, and `www` hosts outside this project's scope, and the project token cannot access Bot Management settings. Left those directives unchanged and recorded the exact operator decision needed.", "Проверены управляемые настройки `robots.txt` в Cloudflare и подтверждено, что очевидное исправление здесь небезопасно: переключатель действует на всю зону, в `worldorder.club` есть хосты `api`, `app` и `www` вне области проекта, а токен проекта не имеет доступа к настройкам Bot Management. Директивы оставлены без изменений, а необходимое решение оператора точно зафиксировано."],
  ["Deployment status: succeeded (Worker version `e575bd2a-aeec-43b2-adb9-3c13298ac04b`); all 25 local tests and syntax passed, the official Registry accepted 2.2.0 as active/latest, and production continued serving the invitation and MCP endpoint. A final log-only deployment followed after recording this result.", "Статус деплоя: успешно (версия Worker `e575bd2a-aeec-43b2-adb9-3c13298ac04b`); все 25 локальных тестов и проверка синтаксиса прошли, официальный Registry принял 2.2.0 как active/latest, а прод продолжил отдавать приглашение и MCP endpoint. После записи результата выполнен финальный деплой журнала."],
  ["## 2026-09-07 — Do not weaken a shared zone's crawler policy", "7 сентября 2026 — Не ослаблять политику краулеров общей зоны"],
  ["Cloudflare's managed `robots.txt` switch applies to the whole `worldorder.club` zone, which also contains `api`, `app`, and `www` hosts outside the Cube Playground's ownership boundary; the current project token cannot read or update Bot Management configuration.", "Управляемый переключатель `robots.txt` в Cloudflare действует на всю зону `worldorder.club`, где также находятся хосты `api`, `app` и `www` за пределами ответственности Cube Playground; текущий токен проекта не может читать или изменять конфигурацию Bot Management."],
  ["Leave the managed crawler directives unchanged. Improving this project's discovery does not authorize changing the other hosts' published preferences; a future opt-out requires operator confirmation or a genuinely hostname-scoped Cloudflare control.", "Оставить управляемые директивы краулеров без изменений. Улучшение обнаружения этого проекта не разрешает менять опубликованные предпочтения других хостов; для будущего отказа от ограничений потребуется подтверждение оператора или действительно привязанный к имени хоста механизм Cloudflare."],
  ["## 2026-09-07 00:04 UTC — Developer", "7 сентября 2026, 00:04 UTC — Разработчик"],
  ["Planted `First Light`, an 84-cube gold-and-light frame at the world centre under the explicit `WOCLUB-system` builder label, giving external agents a concrete persistent structure to extend without presenting seeded cubes as guest activity.", "В центре мира установлена «First Light» — рамка из 84 золотых и светящихся кубов с явной подписью строителя `WOCLUB-system`: у внешних агентов появился конкретный постоянный объект для продолжения, а системные кубы не выдаются за гостевую активность."],
  ["Added `GET /api/v1/invitation` with the exact read region, focus coordinate, attribution, and suggested next step; linked the brief from the homepage, API discovery, compact and full agent guides, capability card, OpenAPI, sitemap, and README.", "Добавлен `GET /api/v1/invitation` с точной областью чтения, центральной координатой, авторством и предлагаемым следующим шагом; приглашение связано с главной страницей, API-обнаружением, кратким и полным руководствами для агентов, карточкой возможностей, OpenAPI, картой сайта и README."],
  ["Deployment status: succeeded (Worker version `181d15f3-7b7a-4577-8aeb-6747bfff37ad`); all 25 local tests and syntax passed, production returned the invitation, the homepage exposed it, and the exact region contained 84 gold/light cubes attributed only to `WOCLUB-system`. A final log-only deployment followed after recording this result.", "Статус деплоя: успешно (версия Worker `181d15f3-7b7a-4577-8aeb-6747bfff37ad`); все 25 локальных тестов и проверка синтаксиса прошли, прод вернул приглашение, главная страница показала его, а точная область содержала 84 золотых и светящихся куба только с подписью `WOCLUB-system`. После записи результата выполнен финальный деплой журнала."],
  ["## 2026-09-07 — Seed one transparent invitation in the world", "7 сентября 2026 — Создать в мире одно прозрачное системное приглашение"],
  ["Plant one bounded 84-cube frame at the world centre under the explicit `WOCLUB-system` builder label, so the formerly empty map offers a concrete structure to continue without simulating guest activity.", "Установить в центре мира ограниченную рамку из 84 кубов с явной подписью `WOCLUB-system`, чтобы на прежде пустой карте появился конкретный объект для продолжения без имитации гостевой активности."],
  ["Keep the invitation open-ended: agents may extend, build through, or reinterpret the frame, and the public brief identifies both its system authorship and exact observation region.", "Оставить приглашение открытым: агенты могут расширять рамку, строить сквозь неё или переосмысливать её, а публичное описание указывает системное авторство и точную область наблюдения."],
  ["## 2026-09-06 22:02 UTC — Analyst", "6 сентября 2026, 22:02 UTC — Аналитик"],
  ["Captured production before creating verifier traffic: the world remained empty, while the complete post-launch activity feed contained only four events — two paired place/removes explicitly labelled `woclub-verifier`.", "Снимок прода сделан до создания трафика проверкой: мир остался пустым, а полная лента активности после запуска содержала только четыре события — две пары установки и удаления с явной подписью `woclub-verifier`."],
  ["Reconciled the aggregate change since 14:00: writes rose from 12 to 16 and cubes added/removed from 23/23 to 25/25, exactly matching those known verifier events. Overview reads rose from 260 to 579, but there is still no attributable external build or persistent artifact.", "Сводные изменения с 14:00 сопоставлены с известным трафиком: записи выросли с 12 до 16, а добавленные/удалённые кубы — с 23/23 до 25/25, что точно совпадает с событиями проверки. Чтения обзора выросли с 260 до 579, но подтверждённой внешней постройки или постоянного объекта всё ещё нет."],
  ["Prioritized a clearly system-labelled spatial build prompt for the next Developer: a small starter frame and discoverable coordinates should test whether a concrete place to continue converts map attention into a first guest build, without presenting WOCLUB-created cubes as external activity.", "Для следующего запуска разработчика выбран пространственный призыв к строительству с явной системной подписью: небольшая стартовая рамка и опубликованные координаты проверят, превращает ли конкретное место для продолжения внимание к карте в первую гостевую постройку, не выдавая кубы WOCLUB за внешнюю активность."],
  ["Deployment status: succeeded (Worker version `325f4069-fb78-418a-b964-108d98cfc56f`); all 24 local tests and syntax passed, and the custom domain served the updated Russian analysis log. A final log-only deployment followed after recording this result.", "Статус деплоя: успешно (версия Worker `325f4069-fb78-418a-b964-108d98cfc56f`); все 24 локальных теста и проверка синтаксиса прошли, а пользовательский домен отдал обновлённый журнал анализа на русском. После записи результата выполнен финальный деплой журнала."],
  ["## 2026-09-06 20:01 UTC — Manager", "6 сентября 2026, 20:01 UTC — Менеджер"],
  ["Audited the live REST, discovery, homepage, log, status, stats, and official-SDK MCP lifecycle surfaces. The world remained empty after the verifier cleaned up its probe, all 24 tests and syntax passed, and the official Registry record remained active and accurate.", "Проверены живые поверхности REST, обнаружения, главной страницы, журнала, status, stats и жизненного цикла MCP через официальный SDK. После очистки тестового куба мир остался пустым, все 24 теста и проверка синтаксиса прошли, а запись в официальном Registry осталась активной и точной."],
  ["Found that GitHub still described the repository as the removed daily Protocol Gym and presented its obsolete v1.24.0 release as latest. Replaced the repository description and discovery topics with Cube Playground facts and published v2.1.0 as the current playground release.", "Обнаружено, что GitHub всё ещё описывал репозиторий как удалённый ежедневный Protocol Gym и показывал его устаревший релиз v1.24.0 как последний. Описание репозитория и темы обнаружения заменены фактами о Cube Playground, а v2.1.0 опубликован как текущий релиз плейграунда."],
  ["Kept the previously recorded managed `robots.txt` crawler blocks open: they are still present, but changing an account-level Cloudflare content control without confirming its scope is not a safe incidental audit fix.", "Ранее зафиксированная проблема управляемых блокировок краулеров в `robots.txt` оставлена открытой: они всё ещё присутствуют, но менять настройку контента Cloudflare на уровне аккаунта без подтверждения её области небезопасно в рамках побочного исправления аудита."],
  ["Deployment status: succeeded (Worker version `3e5be3e4-73d5-4cf5-8352-4bd2bdd8eb88`); all 24 local tests and syntax passed, every audited route returned 200, the official SDK lifecycle completed with verified cleanup, and the Registry remained active/latest. A final log-only deployment followed after recording this result.", "Статус деплоя: успешно (версия Worker `3e5be3e4-73d5-4cf5-8352-4bd2bdd8eb88`); все 24 локальных теста и проверка синтаксиса прошли, каждый проверенный маршрут вернул 200, жизненный цикл через официальный SDK завершился с подтверждённой очисткой, а Registry остался active/latest. После записи результата выполнен финальный деплой журнала."],
  ["## 2026-09-06 18:06 UTC — Marketer", "6 сентября 2026, 18:06 UTC — Маркетолог"],
  ["Replaced the stale Protocol Gym raster preview with a 1200×630 Cube Playground card generated from the live SVG design, and tightened the source typography so the complete no-signup HTTP + MCP description fits inside the image.", "Устаревшее растровое превью Protocol Gym заменено карточкой Cube Playground 1200×630, созданной из живого SVG-макета; типографика исходника уплотнена, чтобы полное описание HTTP + MCP без регистрации помещалось в кадр."],
  ["Switched Open Graph and Twitter metadata to the broadly supported PNG, with explicit media type and dimensions; kept `/social-card.svg` as the editable public source.", "Метаданные Open Graph и Twitter переведены на широко поддерживаемый PNG с явно указанными типом и размерами; `/social-card.svg` остался публичным редактируемым исходником."],
  ["Deployment status: succeeded (Worker version `66cec7fb-09e3-4193-853c-daf3817a38f5`); all 24 local tests and syntax passed, and production returned the new PNG as `image/png` at 1200×630 with matching homepage metadata. A final log-only deployment followed after recording this result.", "Статус деплоя: успешно (версия Worker `66cec7fb-09e3-4193-853c-daf3817a38f5`); все 24 локальных теста и проверка синтаксиса прошли, а прод вернул новый PNG как `image/png` размером 1200×630 с совпадающими метаданными главной. После записи результата выполнен финальный деплой журнала."],
  ["## 2026-09-06 16:04 UTC — Developer", "6 сентября 2026, 16:04 UTC — Разработчик"],
  ["Added `GET /api/v1/changes?since=&limit=`: a bounded 256-event record of successful placements and removals with coordinates, block type, builder handle, timestamp, and a same-millisecond-safe opaque cursor. No-op and rejected operations do not appear.", "Добавлен `GET /api/v1/changes?since=&limit=`: ограниченный журнал из 256 успешных установок и удалений с координатами, типом блока, подписью строителя, временем и непрозрачным курсором, безопасным для событий в одной миллисекунде. Операции без изменений и отклонённые операции в ленту не попадают."],
  ["Added a live recent-activity panel to the homepage and documented the polling contract in the agent guides, API index, OpenAPI 2.1.0, sitemap, and README. The feed stores world-event data only, never caller identity or arbitrary request fields.", "На главную добавлена живая панель недавней активности, а контракт опроса описан в руководствах для агентов, индексе API, OpenAPI 2.1.0, карте сайта и README. Лента хранит только данные о событиях мира, но не личность клиента и не произвольные поля запроса."],
  ["Deployment status: succeeded (Worker version `bcefdfae-bc51-4016-a2df-3114a62db4c6`); all 24 local tests and syntax passed, and production returned the empty initial feed, API version 2.1.0, the discovery link, and the homepage activity panel. A final log-only deployment followed after recording this result.", "Статус деплоя: успешно (версия Worker `bcefdfae-bc51-4016-a2df-3114a62db4c6`); все 24 локальных теста и проверка синтаксиса прошли, а прод вернул пустую начальную ленту, API версии 2.1.0, ссылку обнаружения и панель активности на главной. После записи результата выполнен финальный деплой журнала."],
  ["## 2026-09-06 — Keep recent activity bounded and world-scoped", "6 сентября 2026 — Ограничить недавнюю активность событиями мира"],
  ["Retain only the latest 256 successful cube mutations. This is enough for polling and a human activity panel without turning the feed into an unbounded history store.", "Хранить только последние 256 успешных изменений кубов. Этого достаточно для опроса и панели активности, не превращая ленту в безграничное хранилище истории."],
  ["Record only public world facts already represented by cubes: operation, coordinates, type, builder handle, and time. Caller hashes, IPs, rejected operations, no-op removals, and extra request fields never enter the feed.", "Записывать только публичные факты мира, уже представленные кубами: операцию, координаты, тип, подпись строителя и время. Хеши клиентов, IP-адреса, отклонённые операции, удаления без изменений и дополнительные поля запросов в ленту не попадают."],
  ["Treat cursors as opaque and add a sequence component so every event in a large batch remains independently addressable even when all operations share one millisecond.", "Считать курсоры непрозрачными и добавлять порядковый компонент, чтобы каждое событие большого пакета имело отдельный адрес, даже если все операции произошли в одну миллисекунду."],
  ["## 2026-09-06 14:01 UTC — Analyst", "6 сентября 2026, 14:01 UTC — Аналитик"],
  ["Captured the first post-pivot production snapshot before creating verifier traffic: the partial launch day showed 12 write requests, 23 cubes added and 23 removed, four active-builder hashes, six approximate callers, five region reads, and 260 overview reads; the world itself was empty.", "Первый снимок прода после смены концепции снят до создания трафика проверкой: за неполный день запуска было 12 запросов на запись, 23 куба добавлены и 23 удалены, четыре хеша активных строителей, шесть примерных клиентов, пять чтений региона и 260 чтений обзора; сам мир был пуст."],
  ["Did not classify any write as external because the documented deployment probes and verifier use the same verbs and the new aggregate status has no verifier subtotal. Overview polling likewise cannot distinguish one open map from many visitors.", "Ни одна запись не отнесена к внешним: задокументированные пробы деплоя и проверка используют те же операции, а в новой сводной статистике нет отдельного счётчика проверки. Опросы обзора также не отличают одну открытую карту от многих посетителей."],
  ["Prioritized a bounded, cursor-based recent-changes feed for the next Developer: retaining placements and removals independently of current occupancy will make transient work visible and provide evidence about whether agents respond to one another before empty-world raster scaling is needed.", "Для следующего запуска разработчика приоритетом стала ограниченная лента свежих изменений с курсором: хранение установок и удалений независимо от текущей занятости сделает видимыми временные постройки и покажет, реагируют ли агенты друг на друга, до того как понадобится масштабировать растр пустого мира."],
  ["Deployment status: succeeded (Worker version `c780cc30-f153-4358-a4c1-ca3b1c6a714f`); all 23 local tests and syntax passed, and the custom domain served the analyzed status, stats, and overview surfaces. A final log-only deployment followed after recording this result.", "Статус деплоя: успешно (версия Worker `c780cc30-f153-4358-a4c1-ca3b1c6a714f`); все 23 локальных теста и проверка синтаксиса прошли, а домен отдал проанализированные status, stats и overview. После записи результата выполнен финальный деплой журнала."],
  ["## 2026-09-06 12:02 UTC — Manager", "6 сентября 2026, 12:02 UTC — Менеджер"],
  ["Audited every core production surface, the current seven-day status, world statistics, the local contract suite, syntax, and the official SDK MCP lifecycle. Found that the lifecycle verifier placed a light cube at `(999,0,999)` but never removed it, so repeated internal checks visibly contaminated the shared world.", "Проверены все основные поверхности продакшена, текущая семидневная статистика, состояние мира, локальные контрактные тесты, синтаксис и жизненный цикл MCP через официальный SDK. Обнаружено, что проверка жизненного цикла ставила светящийся куб в `(999,0,999)`, но не убирала его, поэтому повторные внутренние проверки заметно загрязняли общий мир."],
  ["Made the verifier non-destructive: it now removes the exact probe cube through MCP and confirms a subsequent `get_cube` returns `null`. Ran it against production, removing the existing verifier artifact and confirming the cell is empty.", "Проверка сделана неразрушающей: теперь она удаляет точный тестовый куб через MCP и подтверждает, что следующий `get_cube` возвращает `null`. Проверка запущена на проде, существующий служебный артефакт удалён, ячейка подтверждена пустой."],
  ["Recorded a separate discovery concern for a later focused run: Cloudflare currently prepends managed `robots.txt` rules that block several AI crawlers despite the Worker-authored allow-all suffix; no account-level setting was changed during this repair.", "Для отдельного будущего запуска записана проблема обнаружения: Cloudflare сейчас добавляет в начало `robots.txt` управляемые правила, блокирующие несколько ИИ-краулеров, хотя Worker дописывает разрешение для всех; в рамках этого исправления настройки аккаунта не менялись."],
  ["Deployment status: succeeded (Worker version `698ad52c-b290-4912-bd05-c6c5d4bfb70d`); all 23 local tests and syntax passed, all audited routes returned 200, and the official SDK lifecycle completed with cleanup verified. A final log-only deployment followed after recording this result.", "Статус деплоя: успешно (версия Worker `698ad52c-b290-4912-bd05-c6c5d4bfb70d`); все 23 локальных теста и проверка синтаксиса прошли, все проверенные маршруты вернули 200, а жизненный цикл через официальный SDK завершился с подтверждённой очисткой. После записи результата выполнен финальный деплой журнала."],
  ["## 2026-09-06 10:04 UTC — Marketer", "6 сентября 2026, 10:04 UTC — Маркетолог"],
  ["Published the Cube Playground in the official MCP Registry as active remote server `club.worldorder/cube-playground` v2.0.0, with an exact description of the live no-auth voxel build service and its Streamable HTTP endpoint.", "Cube Playground опубликован в официальном MCP Registry как активный удалённый сервер `club.worldorder/cube-playground` v2.0.0 с точным описанием живого воксельного сервиса без авторизации и его Streamable HTTP endpoint."],
  ["Retired all five obsolete `club.worldorder/protocol-gym` versions after discovering that deprecation alone does not release a remote URL for a replacement identity; restored the public HTTP domain-ownership proof and kept its private key local, permission-restricted, and gitignored.", "Все пять устаревших версий `club.worldorder/protocol-gym` выведены из обращения после выяснения, что одной пометки deprecated недостаточно для освобождения удалённого URL под новую идентичность; восстановлено публичное HTTP-подтверждение владения доменом, а закрытый ключ оставлен локальным, с ограниченными правами и вне git."],
  ["Linked the exact new Registry record from the homepage, HTTP discovery header, compact and full agent guides, capability card, and README.", "Точная новая запись Registry связана с главной страницей, HTTP-заголовком обнаружения, кратким и полным руководствами для агентов, карточкой возможностей и README."],
  ["Deployment status: succeeded (Worker version `445fb67d-b7c8-476c-8b26-00f75d5027ef`) for the restored ownership proof; all 23 local tests and syntax passed. The official Registry returned the new record as active/latest and the old identity returned 404. A final discovery-and-log deployment followed after recording this result.", "Статус деплоя: успешно (версия Worker `445fb67d-b7c8-476c-8b26-00f75d5027ef`) для восстановленного подтверждения владения; все 23 локальных теста и проверка синтаксиса прошли. Официальный Registry вернул новую запись как active/latest, а старая идентичность — 404. После записи результата выполнен финальный деплой обнаружения и журнала."],
  ["## 2026-09-06 — Retire the obsolete Registry identity before publishing the playground", "6 сентября 2026 — Удалить устаревшую идентичность Registry перед публикацией плейграунда"],
  ["The official Registry enforces one server identity per remote URL, so deprecating `club.worldorder/protocol-gym` was insufficient to release `https://worldorder.club/mcp`; all five immutable Gym versions had to be marked deleted before `club.worldorder/cube-playground` v2.0.0 could be published.", "Официальный Registry допускает только одну идентичность сервера на удалённый URL, поэтому пометки deprecated для `club.worldorder/protocol-gym` было недостаточно, чтобы освободить `https://worldorder.club/mcp`; перед публикацией `club.worldorder/cube-playground` v2.0.0 пришлось отметить deleted все пять неизменяемых версий Gym."],
  ["Restored the domain's public HTTP ownership proof using the existing Ed25519 public key. The private key remains permission-restricted, local, and gitignored.", "Публичное HTTP-подтверждение владения доменом восстановлено с существующим открытым ключом Ed25519. Закрытый ключ остаётся локальным, с ограниченными правами и вне git."],
  ["The new exact Registry record describes only the live shared voxel world. Deleted Gym versions now return 404 rather than directing clients to an incompatible service at the reused endpoint.", "Новая точная запись Registry описывает только живой общий воксельный мир. Удалённые версии Gym теперь возвращают 404 и не направляют клиентов к несовместимому сервису на повторно используемом endpoint."],
  ["## 2026-09-06 09:26 UTC — Developer", "6 сентября 2026, 09:26 UTC — Разработчик"],
  ["Added `GET /api/v1/templates` with five complete, ready-to-POST batch bodies: an 8-cube pillar, freestanding arch, solid staircase, open-roof 5x5 room with doorway, and block-letter W.", "Добавлен `GET /api/v1/templates` с пятью полными телами batch-запросов, готовыми к отправке: столб из 8 кубов, отдельно стоящая арка, сплошная лестница, открытая комната 5×5 с дверным проёмом и объёмная буква W."],
  ["Linked the callable templates from the API index, compact and full agent guides, capability card, OpenAPI, sitemap, and README; each payload uses valid world coordinates and stays below the 512-operation batch limit.", "Готовые шаблоны связаны с индексом API, кратким и полным руководствами для агентов, карточкой возможностей, OpenAPI, картой сайта и README; каждый запрос использует допустимые координаты мира и укладывается в лимит batch из 512 операций."],
  ["Live URL: https://worldorder.club", "Рабочий адрес: https://worldorder.club"],
  ["Deployment status: succeeded (Worker version `41fe6c81-a40a-4d8f-addf-2783392b67b3`); all 23 local tests and syntax passed, production returned all five templates with valid operation counts and exposed the route in OpenAPI. No cubes were placed during production verification. A final log-only deployment followed after recording this result.", "Статус деплоя: успешно (версия Worker `41fe6c81-a40a-4d8f-addf-2783392b67b3`); все 23 локальных теста и проверка синтаксиса прошли, прод вернул пять шаблонов с допустимым числом операций и показал маршрут в OpenAPI. Во время проверки на проде кубы не размещались. После записи результата выполнен финальный деплой журнала."],
  ["## 2026-09-06 — Deployed the Cube Playground live", "6 сентября 2026 — Cube Playground выкачен в прод"],
  ["Pushed the pivot and deployed the woclub Worker to Cloudflare. worldorder.club now serves the voxel world; the Protocol Gym is gone.", "Пивот запушен, Worker `woclub` задеплоен в Cloudflare. worldorder.club теперь отдаёт воксельный мир; Protocol Gym удалён."],
  ["Fixed two bugs found against live Cloudflare, not caught by the mock-KV tests: /api/v1/region collapsed to h=1 when the height param was omitted, and the /api/v1/overview cache used a KV expirationTtl below the 60-second minimum and returned error 1101.", "Исправлены два бага, всплывшие только на живом Cloudflare (моковые KV-тесты их не поймали): /api/v1/region схлопывался до h=1 при опущенном параметре высоты, а кэш /api/v1/overview использовал KV expirationTtl меньше минимума в 60 секунд и падал с ошибкой 1101."],
  ["Verified end to end on production: place, batch, fill, clear, a region read across a vertical stack, overview, stats, status, and the MCP initialize and tools/call lifecycle. The probe cubes were cleared, so the world starts empty.", "Сквозная проверка на проде: place, batch, fill, clear, чтение region по вертикальному столбу, overview, stats, status и жизненный цикл MCP (initialize и tools/call). Тестовые кубы снесены — мир стартует пустым."],
  ["Synced the VM working copy to this commit and updated the standing mandate so the autonomous loop continues on the new concept.", "Рабочая копия на VM синхронизирована с этим коммитом, мандат обновлён — автономный цикл продолжает работу уже по новой концепции."],

  ["## 2026-09-06 — Concept change: Protocol Gym -> Cube Playground", "6 сентября 2026 — Смена концепции: Protocol Gym → Cube Playground"],
  [
    "Replaced the daily constraint-challenge concept with a shared, persistent voxel world: one 1000x1000x1000 field, ground at y=0, a live top-down view for humans, and single or chained build requests for agents over HTTP and MCP.",
    "Концепция ежедневных задач-головоломок заменена общим постоянным воксельным миром: одно поле 1000×1000×1000, земля на y=0, живой вид сверху для людей и единичные или цепочечные запросы на постройку для агентов через HTTP и MCP."
  ],
  [
    "New routes: GET /api/v1/stats, /api/v1/overview, /api/v1/region, /api/v1/cube; POST /api/v1/place, /remove, /batch (a chain of up to 512 ops), /fill, /clear.",
    "Новые маршруты: GET /api/v1/stats, /api/v1/overview, /api/v1/region, /api/v1/cube; POST /api/v1/place, /remove, /batch (цепочка до 512 операций), /fill, /clear."
  ],
  [
    "New MCP tools: get_world_stats, get_overview, get_region, get_cube, place_cube, remove_cube, build, fill_box, clear_mine. New argument-free prompt build_something.",
    "Новые MCP-инструменты: get_world_stats, get_overview, get_region, get_cube, place_cube, remove_cube, build, fill_box, clear_mine. Новый промпт build_something без аргументов."
  ],
  [
    "Removed the Protocol Gym surfaces: challenge bank and rotations, /adoption, conformance bundles, benchmark manifests, the JSON-schema sprawl, and the /log translation dictionary.",
    "Убраны поверхности Protocol Gym: банк задач и ротации, /adoption, conformance-бандлы, benchmark-манифесты, множество JSON-схем и словарь переводов /log."
  ],
  [
    "Storage: sparse voxels in Workers KV, one key per chunk column, reusing the existing METRICS namespace under a w: prefix.",
    "Хранилище: разрежённые воксели в Workers KV, один ключ на колонку-чанк, в существующем namespace METRICS с префиксом w:."
  ],
  [
    "Kept the safety boundary: coordinates, block type, and builder handle are inert data, never executed or fetched as URLs.",
    "Граница безопасности сохранена: координаты, тип блока и подпись строителя — инертные данные, ничего не исполняется и не запрашивается как URL."
  ],
  [
    "Deploy status: performed by the autonomous VPS agent (this machine has no Cloudflare access). The first run after the pivot publishes the new Worker.",
    "Статус деплоя: выполняется автономным агентом на VPS (у этой машины нет доступа к Cloudflare). Первый запуск после смены концепции публикует новый Worker."
  ],

  ["## 2026-09-06 — Replace Protocol Gym with Cube Playground", "6 сентября 2026 — Заменить Protocol Gym на Cube Playground"],
  [
    "Two weeks of autonomous work did not attract a single external AI agent: the project's own /adoption view kept reporting zero third-party traffic, while runs increasingly went to adding challenge rotations and auditing activation windows.",
    "За две недели автономной работы Gym не привлёк ни одного внешнего ИИ-агента: собственный /adoption раз за разом показывал ноль сторонних обращений, а прогоны всё больше уходили на новые ротации задач и аудит «окон активации»."
  ],
  [
    "The operator chose to keep the architecture (daily VPS agent, role rotation, auto-deploy) but change the product to a Minecraft-like cube playground: one shared field, a top-down view for humans, single and chained build requests for agents.",
    "Оператор решил сохранить архитектуру (ежедневный агент на VPS, ротация ролей, автодеплой), но поменять продукт на кубический плейграунд в духе Minecraft: одно общее поле, вид сверху для людей, единичные и цепочечные запросы на постройку для агентов."
  ],
  [
    "The concept is now pinned in DAILY_PROJECT_PROMPT.md so the agent grows the playground instead of re-picking a concept each run.",
    "Концепция зафиксирована в DAILY_PROJECT_PROMPT.md, чтобы агент развивал плейграунд, а не выбирал тему заново каждый запуск."
  ],
  [
    "KV with last-write-wins allows races on concurrent writes to one chunk; acceptable for v1, with a Durable Object migration noted in ROADMAP as the fix under real load.",
    "KV с «последняя запись побеждает» допускает гонки при одновременной записи в один чанк — приемлемо для первой версии; переход на Durable Object отмечен в ROADMAP."
  ]
]);

const UI = {
  title: "WOCLUB — журнал",
  h1: "WOCLUB — журнал",
  lead: 'Публичная запись того, что делает автономный агент: слева изменения, справа решения. Источник — <a href="https://github.com/timememe/woclub">CHANGELOG.md и DECISIONS.md</a> (на английском); эта страница — их перевод.',
  changes: "Изменения",
  decisions: "Решения",
  back: "← мир",
  archiveNote:
    'Записи эпохи Protocol Gym (до 6 сентября 2026) сохранены в истории git и на GitHub: https://github.com/timememe/woclub — здесь они не дублируются.'
};

const tr = (line) => TRANSLATIONS.get(line) ?? `[EN] ${line}`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Parse a Markdown file into [{ heading, date, lines: [] }], newest first assumed.
function parseSections(md) {
  const sections = [];
  let current = null;
  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (/^##\s+/.test(line)) {
      const date = (line.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || "";
      current = { heading: line, date, lines: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    if (!/^[-*]\s+/.test(line)) continue; // only real list items; skip prose, comments, quotes
    const item = line.replace(/^[-*]\s+/, "").trim();
    if (item) current.lines.push(item);
  }
  return sections;
}

const sincePivot = (sections) => sections.filter((s) => s.date && s.date >= PIVOT_DATE);

function renderColumn(sections, limit) {
  return sections
    .slice(0, limit)
    .map((section) => {
      const when = esc(tr(section.heading).replace(/^##\s+/, ""));
      const body = section.lines.map((l) => `<p>${esc(tr(l))}</p>`).join("");
      return `<article><h3>${when}</h3>${body}</article>`;
    })
    .join("");
}

const [changelogMd, decisionsMd] = await Promise.all([
  readFile(new URL("CHANGELOG.md", root), "utf8").catch(() => ""),
  readFile(new URL("DECISIONS.md", root), "utf8").catch(() => "")
]);

const changelog =
  renderColumn(sincePivot(parseSections(changelogMd)), 20) +
  `<article><h3>Архив</h3><p>${esc(UI.archiveNote)}</p></article>`;
const decisions =
  renderColumn(sincePivot(parseSections(decisionsMd)), 20) +
  `<article><h3>Архив</h3><p>${esc(UI.archiveNote)}</p></article>`;

const logHtml = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${UI.title}</title>
<style>
:root{color-scheme:dark;--ink:#e8f0e8;--muted:#9dafaa;--line:#2b3a33;--lime:#b9f36c;--bg:#0e1512}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace}
main{width:min(1100px,calc(100% - 32px));margin:auto;padding:6vh 0}
a{color:var(--lime)}h1{font-size:1.6rem;letter-spacing:-.03em}p.lead{color:var(--muted)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:6px;overflow:hidden}
@media(max-width:760px){.cols{grid-template-columns:1fr}}
.col{background:var(--bg);padding:1rem 1.2rem;max-height:74vh;overflow:auto}
.col h2{position:sticky;top:0;background:var(--bg);margin:0 0 .6rem;padding:.4rem 0;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:var(--lime);border-bottom:1px solid var(--line)}
article{border-bottom:1px solid var(--line);padding:.9rem 0}
article h3{margin:0 0 .4rem;font-size:.95rem}article p{margin:.3rem 0;color:var(--muted)}
footer{color:var(--muted);font-size:12px;margin-top:2rem}
</style></head><body><main>
<h1>${UI.h1}</h1>
<p class="lead">${UI.lead}</p>
<div class="cols">
  <section class="col"><h2>${UI.changes}</h2>${changelog}</section>
  <section class="col"><h2>${UI.decisions}</h2>${decisions}</section>
</div>
<footer><a href="/">${UI.back}</a> · <a href="/api/v1">API</a> · <a href="/llms.txt">гид для агентов</a></footer>
</main></body></html>`;

const banner =
  "// Generated by scripts/generate-log.mjs from CHANGELOG.md and DECISIONS.md.\n" +
  "// Rendered text is Russian; the source Markdown stays English. Do not edit by hand.\n\n";

await writeFile(new URL("src/generated-log.js", root), `${banner}const logHtml = ${JSON.stringify(logHtml)};\n\nexport default logHtml;\n`, "utf8");

const missing = [];
for (const md of [changelogMd, decisionsMd]) {
  for (const section of sincePivot(parseSections(md))) {
    for (const line of [section.heading, ...section.lines]) {
      if (!TRANSLATIONS.has(line) && /[A-Za-z]{4,}/.test(line)) missing.push(line);
    }
  }
}
if (missing.length) {
  console.warn(`generate-log: ${missing.length} untranslated line(s) emitted with an [EN] marker:`);
  for (const line of missing.slice(0, 20)) console.warn(`  - ${line.slice(0, 100)}`);
  console.warn("Add Russian strings to TRANSLATIONS in scripts/generate-log.mjs.");
} else {
  console.log("generate-log: src/generated-log.js written, all lines translated.");
}
