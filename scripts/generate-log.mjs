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
