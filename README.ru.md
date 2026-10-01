<div align="center">

<img src="assets/logo.svg" width="96" alt="Menu Core">

# Menu Core

*Удобный способ создавать меню*

[![amxts module](https://img.shields.io/badge/amxts-module-3178c6?style=flat-square)](https://amxts.github.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Возможности](#возможности) • [Установка](#установка) • [Использование](#использование) • [Меню в файле](#меню-в-файле) • [Pawn-плагины](#pawn-плагины) • [Тесты](#тесты)

[English](README.md) | **Русский**

</div>

Опишите меню один раз — в файле INI, YAML или JSON или в коде, — а остальное Menu Core сделает сам: страницы, клавиши, возврат назад, обратный отсчёт и пункты, которые появляются, скрываются или становятся серыми в зависимости от того, кто смотрит.

> [!WARNING]
> **В работе.** В игре Menu Core пробовали всего несколько раз, и API ещё может измениться.

## Возможности

- **Меню из файла или из кода.** Админ правит `menu.ini`, `menu.yaml` или `menu.json`, не трогая плагин; плагины добавляют свои пункты на ходу.
- **Ошибки — с местом.** Незнакомый ключ, значение не того вида, условие или действие, которое никто не зарегистрировал: консоль сервера говорит об этом, с файлом и строкой.
- **Виден и доступен.** Пункт говорит, когда он вообще показан (`visible`) и когда его можно выбрать (`enabled`): иначе он серый, а рядом — сообщение первого требования, которое не выполнено.
- **Текст, который зависит от игрока.** Заголовок, пункт или сообщение могут быть функцией — ``(player) => `Лечение (${player.health} HP)` `` — она читается при каждой отрисовке; в `menu.ini` то же делают плейсхолдеры вроде `%hp%`.
- **Меню-списки.** Строка на каждого игрока или на каждый элемент своего списка, с фильтрами и сообщением, если никого не осталось.
- **Варианты.** Один пункт, несколько видов: показывается первый вариант, чьё `when` выполняется.
- **Отсчёт и блокировка.** Меню с таймером — свой у каждого игрока или один на всех — и меню, которое нельзя закрыть или заменить.
- **Один экземпляр на сервер.** Все плагины, на TypeScript и на Pawn, наполняют и открывают одни и те же меню.
- **Без ограничений Pawn.** Длинные названия, сколько угодно пунктов, меню на кириллице длиннее 500 байт.

## Установка

```bash
npx amxts module add menu-core
```

Команда ставит пакет и [Config Core](https://github.com/amxts/config-core), через который Menu Core читает меню, и добавляет оба в `modules` в `amxts.config.ts` проекта. Настройки модуля пишутся рядом, в `menus`:

```ts
export default defineConfig({
	modules: [
		"@amxts/menu-core",
		"@amxts/config-core", // needed by menu-core
	],
	menus: {
		file: "myserver/menu",   // configs/myserver/menu.ini, .yaml, .yml, .json или .jsonc
		fallback: "menu",        // configs/menu.*, если первый пуст
	},
});
```

Сборка загружает Config Core первым. Конфиг, где перечислен только Menu Core, собирается так же: сборка приводит Config Core сама.

| Опция | По умолчанию | Что делает |
| --- | --- | --- |
| `file` | `"menu"` | Файл меню в `configs/`; без расширения — первый из `.ini`, `.yaml`, `.yml`, `.json` и `.jsonc`, который есть. |
| `fallback` | `""` | Читается вместо `file`, если тот пуст или его нет; `""` — без запасного. |

## Использование

Плагин пользуется модулем как `menus`, без строки импорта: сборка добавляет импорт в те плагины, которые им пользуются, и собирает модуль, только когда им пользуется хоть один.

```ts
const shop = menus.create("SHOP", { title: (player) => `Магазин для ${player.name}` });

shop.addItem((player) => `Лечение (${player.health} HP)`, {
	visible: (player) => player.health < 100,
	onSelect: (player) => {
		player.health = 100;
	},
});
shop.addItem("Купить AWP", {
	// Серый, пока одно отвечает «нет»: первое такое даёт своё сообщение.
	enabled: [
		{ when: (player) => player.isAlive, message: "Только живым" },
		{ when: (player) => player.account >= 4750, message: (player) => `Не хватает $${4750 - player.account}` },
	],
	onSelect: (player) => {
		player.account = player.account - 4750;
		player.give("weapon_awp");
	},
});
shop.addItem("Сбросить счёт", {
	enabled: (player) => player.frags != 0,
	message: "(уже 0)",
	onSelect: (player) => {
		player.frags = 0;
	},
});
shop.addItem("Закрыть", { action: "CLOSE_MENU", spaceBefore: 1 });

server.addCommand("/shop", ({ player }) => shop.show(player));
```

Текст — заголовок, пункт, сообщение — это сам текст или функция, которая даёт его для игрока, который смотрит. Обычная строка, если это ключ словаря, переводится для него.

Пункт говорит, когда он показан и когда его можно выбрать:

- `visible` — показан ли он вообще; пока отвечает «нет», пункта нет и слот он не занимает.
- `enabled` — можно ли его выбрать; пока отвечает «нет», пункт серый, а рядом `message`. Или список требований, каждое `{ when, message }`: первое невыполненное даёт своё сообщение, а требование без своего сообщения — сообщение пункта.

В коде требование — функция. Имена — `IS_ALIVE`, `FLAG_d`, ограничение, которое зарегистрировал плагин, — для файлов меню: функцию файл не удержит.

Клавиши: **1–7** выбирают, **8** — следующая страница, **9** — предыдущая страница или назад, в меню, из которого открыли это, **0** закрывает.

Цвета в тексте пишутся метками, теми же буквами, что в чате: `!y` жёлтый, `!r` красный, `!d` серый, `!w` белый, `!R` — выравнивание вправо. Метки только для чата — `!g`, `!b` и `!t` — из меню убираются.

### API

Меню — объект: `menus.create()` его делает, а методы наполняют и открывают.

| Метод | Что делает |
| --- | --- |
| `menu.addItem(text, options?)` | Добавляет пункт: его текст или `(player, target) => текст` — `target` — цель строки в меню-списке. Опции: `onSelect`, `visible` (пункта нет, пока отвечает «нет»), `enabled` (пункт серый, пока отвечает «нет», — проверка или список `{ when, message }`), `message`, `at`, `spaceBefore`, `spaceAfter`; а для меню, которые называют зарегистрированное плагинами, — `action` и `placeholder`. |
| `menu.addFixedItem(slot, text, options?)` | Пункт, который на каждой странице занимает слот 1–7. |
| `menu.addFilter(test, message?)` | Меню-список пропускает строки, на которые `test` отвечает «нет». |
| `menu.setListSource(rows)` | Свои строки меню-списка: `listRow(target, text)`, `textRow(text)`. |
| `menu.addEventListener("open" \| "close" \| "show", listener)` | События этого меню; `"show"` приходит до открытия, `event.preventDefault()` его отменяет. |
| `menu.show(player, options?)` | Открывает меню; `false`, если оно не открылось. Опции: `time`, `target`, `resetHistory`, `force`, `skipHistory`. |
| `menu.refresh()` · `menu.close()` · `menu.clearItems()` | Перерисовать или закрыть у всех, кто его смотрит; убрать пункты. |
| `menu.setTimer(seconds)` · `menu.cancelTimer()` | Общий отсчёт для всех, кто его смотрит. |

Его поля — `title`, `time`, `hideBack`, `hideExit`, `locked`, `sharedTimer` — задаются напрямую; `name`, `kind` и `countdown` читаются.

| Функция | Что делает |
| --- | --- |
| `create(name, options?)` | Меню в коде или уже существующее с таким именем. Имя с `LIST_` делает меню-список. Опции: `title` (текст или функция), `time`, `hideBack`, `hideExit`, `locked`, `activeWhen`. |
| `find(name)` · `register(name)` | Меню по имени; `register` заранее читает его из файла. |
| `show(player, name, options?)` · `close(player)` · `activeMenu(player)` · `lock(player)` | Меню игрока, какое бы оно ни было. |
| `addCondition(name, test)` · `addAction(name, handler)` · `addPlaceholder(name, value)` · `addRestriction(name, test, message?)` | То, что называют файлы меню и Pawn-плагины, — ответы функциями; `%name%` в их тексте — плейсхолдер. `message` ограничения пишется рядом с пунктом, который оно гасит, если у пункта или требования нет своего. `menu.addPlaceholder(name, value)` задаёт его одному меню. |
| `setListSource(name, rows)` · `refresh("A B")` · `conditionChanged(name)` · `addEventListener(type, listener)` | То же для меню по имени и события всех меню. |

## Меню в файле

Меню читается из файла, когда его впервые запрашивают: через `register(name)` или через `show` с именем, которого Menu Core ещё не знает. Файл — INI, YAML или JSON: `menus: { file: "menu" }` читает первый из `menu.ini`, `menu.yaml`, `menu.yml`, `menu.json` и `menu.jsonc`, который есть, и меню значит одно и то же в любом из них — только INI не умеет скрывать пункт ([столбцы INI](#столбцы-ini)).

```yaml
# configs/menu.yaml
chatPrefix: MYPLUGIN_CHAT_PREFIX   # префикс в чате для сообщения «некого показать»
labels:
  exit: MYPLUGIN_MENU_EXIT         # кнопки: ключ словаря или сам текст
  number: MYPLUGIN_MENU_NUMBER     # "!y[%d]!w", если словарь не говорит иначе

menus:
  MAIN_MENU:
    title: MYPLUGIN_MENU_MAIN_TITLE
    hideBack: true
    items:
      - name: MYPLUGIN_MENU_MAIN_ADMIN
        visible: IS_ADMIN                  # у остальных его нет
        enabled: FLAG_d                    # серый, рядом сообщение
        message: MYPLUGIN_MENU_NEEDS_FLAG_D
        action: SHOW_ADMIN_MENU
      - name: MYPLUGIN_MENU_MAIN_AWP
        enabled:                           # первое невыполненное даёт своё сообщение
          - when: VIP
            message: MYPLUGIN_MENU_VIP_ONLY
          - when: LEVEL:5
            message: MYPLUGIN_MENU_LEVEL_5
        action: BUY_AWP
      - variants:                          # показан первый, чьё "when" выполняется
          - { name: MYPLUGIN_MENU_MAIN_SPECTATE, when: "!IS_SPECTATOR", action: JOIN_SPECTATE }
          - { name: MYPLUGIN_MENU_MAIN_JOIN, when: IS_SPECTATOR, action: JOIN_TEAM }

  LIST_SPECTATORS_MENU:
    title: MYPLUGIN_MENU_SPECTATORS_TITLE
    activeOn: IS_ROUND_RUNNING
    filters:
      - { when: IS_SPECTATOR, message: MYPLUGIN_CHAT_NO_SPECTATORS }
    view:
      name: "%name%"
      action: SWAP_WITH_SPECTATOR
```

```jsonc
// configs/menu.json
{
  "chatPrefix": "MYPLUGIN_CHAT_PREFIX",
  "labels": { "exit": "MYPLUGIN_MENU_EXIT", "number": "MYPLUGIN_MENU_NUMBER" },
  "menus": {
    "MAIN_MENU": {
      "title": "MYPLUGIN_MENU_MAIN_TITLE",
      "hideBack": true,
      "items": [
        { "name": "MYPLUGIN_MENU_MAIN_ADMIN", "visible": "IS_ADMIN", "enabled": "FLAG_d", "message": "MYPLUGIN_MENU_NEEDS_FLAG_D", "action": "SHOW_ADMIN_MENU" },
        {
          "name": "MYPLUGIN_MENU_MAIN_AWP",
          "enabled": [
            { "when": "VIP", "message": "MYPLUGIN_MENU_VIP_ONLY" },
            { "when": "LEVEL:5", "message": "MYPLUGIN_MENU_LEVEL_5" }
          ],
          "action": "BUY_AWP"
        },
        {
          "variants": [
            { "name": "MYPLUGIN_MENU_MAIN_SPECTATE", "when": "!IS_SPECTATOR", "action": "JOIN_SPECTATE" },
            { "name": "MYPLUGIN_MENU_MAIN_JOIN", "when": "IS_SPECTATOR", "action": "JOIN_TEAM" }
          ]
        }
      ]
    },
    "LIST_SPECTATORS_MENU": {
      "title": "MYPLUGIN_MENU_SPECTATORS_TITLE",
      "activeOn": "IS_ROUND_RUNNING",
      "filters": [{ "when": "IS_SPECTATOR", "message": "MYPLUGIN_CHAT_NO_SPECTATORS" }],
      "view": { "name": "%name%", "action": "SWAP_WITH_SPECTATOR" }
    }
  }
}
```

```ini
; configs/menu.ini
[MAIN]
PREFIX = MYPLUGIN_CHAT_PREFIX
KEY = {
	EXIT = MYPLUGIN_MENU_EXIT
	NUMBER = MYPLUGIN_MENU_NUMBER
}

[MAIN_MENU]
TITLE = MYPLUGIN_MENU_MAIN_TITLE
HIDE_BACK = YES
ITEMS = {
	; название | подстановка | условие | действие | ограничение | сообщение | отступ
	"MYPLUGIN_MENU_MAIN_ADMIN" "" "IS_ADMIN" "SHOW_ADMIN_MENU" "FLAG_d" "MYPLUGIN_MENU_NEEDS_FLAG_D" ""
	"MYPLUGIN_MENU_MAIN_AWP" "" "" "BUY_AWP" "VIP LEVEL:5" "VIP:MYPLUGIN_MENU_VIP_ONLY|MYPLUGIN_MENU_LEVEL_5" ""
	"MYPLUGIN_MENU_MAIN_SPECTATE|MYPLUGIN_MENU_MAIN_JOIN" "" "!IS_SPECTATOR|IS_SPECTATOR" "JOIN_SPECTATE|JOIN_TEAM" "" "" ""
}

[LIST_SPECTATORS_MENU]
TITLE = MYPLUGIN_MENU_SPECTATORS_TITLE
ACTIVE_ON = IS_ROUND_RUNNING
FILTER = {
	"IS_SPECTATOR" "MYPLUGIN_CHAT_NO_SPECTATORS"
}
VIEW = {
	; название | условие | действие | ограничение | сообщение
	"%name%" "" "SWAP_WITH_SPECTATOR" "" ""
}
```

### Поля

| YAML, JSON | INI | Что это |
| --- | --- | --- |
| `chatPrefix` | `[MAIN]` `PREFIX` | Префикс сообщений Menu Core в чате. |
| `labels`: `exit`, `back`, `next`, `number`, `disabled`, `page`, `time` | `[MAIN]` `KEY = { ... }` | Слова кнопок, страницы и отсчёта. |
| `menus`: `{ NAME: меню }` | `[NAME]` | Меню; имя на `LIST_` — меню-список. |
| `title` | `TITLE` | Заголовок; он у меню обязателен. |
| `activeOn` | `ACTIVE_ON` | Условия, при которых меню открывается. |
| `hideBack` · `hideExit` | `HIDE_BACK` · `HIDE_EXIT` | `true` (INI: `YES`) убирает кнопку. |
| `time` · `onTimeout` | `TIME` · `ON_TIMEOUT` | Отсчёт в секундах и действия, когда он закончился. |
| `locked` · `sharedTimer` | `LOCKED` · `GLOBAL` | Пункты нельзя выбрать; один отсчёт на всех. |
| `items` | `ITEMS` | Пункты обычного меню. |
| `fixedItems` | `FIXED_ITEMS` | Пункты, которые держат свой `slot`, 1–7, на каждой странице. |
| `view` · `filters` | `VIEW` · `FILTER` | Строка меню-списка и фильтры, которые проходят его строки: `when`, `message`. |

У пункта — в `items`, в `fixedItems` или в `view` — есть `name`, а ещё:

| Ключ | Что это |
| --- | --- |
| `placeholder` | Текст после названия, с плейсхолдерами: `"%hp%"`. |
| `action` | Действия, которые выполняются при выборе. |
| `visible` | Имена, при которых пункт показан; пока они не выполняются, пункта нет и слот он не занимает (у фиксированного пункта слот остаётся пустым). Не в `view`: меню-список пропускает строки через `filters`. |
| `enabled` | Имена, при которых пункт можно выбрать, а пока они не выполняются, рядом `message`, — или список требований, каждое строка имён или `{ when, message }`: первое невыполненное даёт своё сообщение. |
| `message` | Текст рядом с пунктом, пока его гасит требование без своего сообщения. |
| `spaceBefore` · `spaceAfter` | Пустые строки до и после пункта. |
| `variants` | Несколько видов, `[{ name, when, action }, ...]`: показан первый, чьё `when` выполняется; вариант без `when` выполняется всегда, а если не выполняется ни один, показан первый — серым. |

Сообщение рядом с серым пунктом идёт от общего к частному: то, с которым зарегистрировано ограничение (`addRestriction(name, test, message)`), `message` пункта, собственное сообщение требования. Каждое — текст или ключ словаря.

`visible`, `when`, `enabled`, `activeOn`, `action` и `onTimeout` — это имя, несколько имён через пробел или список: `activeOn: [IS_ALIVE, "!IS_SPECTATOR"]`. В YAML значение, которое начинается с `!` или `%`, берётся в кавычки.

- **Имена** в `visible`, `enabled` и `when` — ограничение, которое зарегистрировал плагин, условие, а иначе ответ ограничения `"*"`. `!NAME` переворачивает имя; несколько должны выполняться все. `NAME:параметр` передаёт проверке ограничения весь токен и забирает с собой остаток строки: `VIP:Only for VIP` — одно имя, поэтому пишите его последним. Незнакомое имя не выполняется.
- **Условия:** `activeOn` называет только условия. Эти встроены — на них отвечает Menu Core, пока имя не регистрирует ни один плагин (а плагин, который регистрирует, отвечает вместо него):

  | Условие | Выполняется, когда игрок |
  | --- | --- |
  | `IS_ALIVE` · `IS_DEAD` | жив · не жив (зритель тоже) |
  | `TEAM_CT` · `TEAM_TERRORIST` · `TEAM_SPECTATOR` · `TEAM_UNASSIGNED` | в этой команде |
  | `IS_BOT` | бот |
  | `IS_ADMIN` | имеет любой доступ, кроме `z` простого игрока, — `is_user_admin` AMX Mod X |
  | `FLAG_<буквы>` | имеет любую из этих букв `users.ini`: `FLAG_ab` |

  В меню-списке условие вида или фильтра спрашивается у игрока строки, а ограничение получает строку как цель. Регистр в именах не важен.
- **Встроенные действия:** `SHOW_<MENU>` открывает это меню, `CLOSE_MENU` закрывает; в строке действия их может быть несколько.
- **Подстановки:** `%name%` (текст строки списка), `%target%`, `%time%` и любые зарегистрированные.
- **Меню-список** рисует свою строку на каждого игрока или на каждую строку своего источника и пропускает те, что не прошли фильтр. Если никого не осталось, меню не открывается, а игрок получает сообщение фильтра.

> [!WARNING]
> **В файле меню:**
>
> - **Флаги** INI-меню — `HIDE_BACK`, `HIDE_EXIT`, `LOCKED`, `GLOBAL` — это `YES` или `NO`: на `true`, `1` или `yes` будет предупреждение с правильным словом, и это `NO`. В YAML `yes` — текст: флаг там — `true` или `false`.
> - **Текст с пробелами** в INI-меню берётся в кавычки: `TITLE = "Main menu"`. Без кавычек читается только первое слово.
> - **Имя пункта в YAML или JSON не делится по `|`:** его варианты пишутся через `variants`.
> - **Цвета** и в файле меню пишутся метками: `!y`, `!r`, `!d`, `!w`, `!R`. На коды Pawn (`\y`, `\r`) будет предупреждение с меткой, которую писать, и они выбрасываются. Текст из Pawn — пункты и заголовки Pawn-плагина, словарь lang — сохраняет свои коды, и Menu Core читает их как метки.
> - **`%time%` и `%target%` пишутся строчными:** `%TIME%` и `%s` остаются как написаны.
> - **`ADMIN` и `ACCESS_ADMIN` не встроены:** их регистрирует плагин, или файл пишет `IS_ADMIN` (любой админ) или `FLAG_<буквы>` (`FLAG_d`).

### Столбцы INI

INI — формат, который читают и Pawn-плагины, поэтому его столбцы неизменны. Строка пункта — `name | placeholder | condition | action | restriction | message | spacing`:

| INI | YAML, JSON |
| --- | --- |
| названия `"A\|B"`, условия `"C1\|C2"`, действия `"X\|Y"` | `variants: [{ name: A, when: C1, action: X }, { name: B, when: C2, action: Y }]` |
| условие, один вариант | `enabled: C` — серый без причины |
| ограничение и сообщение | `enabled: R`, `message: M` — серый с сообщением |
| `"NAME:message\|NAME2:message"` | `enabled: [{ when: NAME, message: ... }, { when: NAME2, message: ... }]` |
| — | `visible` — в INI нечем скрыть пункт |

Столбец условия спрашивает только условия, а столбец ограничения — сначала ограничения, затем условия. Нативы `mc_*` добавляют пункты так же.

> [!TIP]
> `menu.ini`, написанный для Pawn, красит текст кодами (`\y`, `\r`). Скрипт из пакета переписывает их метками — в INI, YAML и JSON: `bun node_modules/@amxts/menu-core/scripts/menu-colors.ts configs/menu.ini` (`--dry-run` говорит, что он изменил бы).

### Проверки

То, что не подходит файлу меню, консоль сервера называет с файлом и строкой — а в YAML и JSON и со столбцом — и пропускает; остальное меню читается.

- **Когда файл читается:** незнакомый ключ — с тем, который, может быть, имелся в виду: `visible` или `enabled` вместо `condition` и `restriction` пункта, `when` вместо `condition` варианта или фильтра; значение не того вида (`hideBack: yes` — в YAML `yes` это текст, а поле ждёт `true`; `HIDE_BACK = 1` — флаг INI это `YES` или `NO`); цветовой код (`\y`) там, где файл меню пишет метку, — с меткой, которую написать, а сам код пропускается; меню без заголовка, меню совсем без пунктов, пункт без названия, `items` в меню-списке, слот вне 1–7. Пункт без действия отмечается, но не как предупреждение: выбор его ничего не делает. Пустой блок `ITEMS = { }` — это нормально.
- **На первом кадре сервера:** каждое имя, действие и подстановка из файла, которые никто не зарегистрировал, — ни TypeScript-плагины, ни Pawn-плагины через нативы `mc_*`, ни сам Menu Core. К этому моменту все плагины прошли `plugin_init` и `plugin_cfg`, так что имя, которое Pawn-плагин регистрирует после чтения файла, за ошибку не принимается. Файл, прочитанный позже, — `setConfigFile()`, — проверяется сразу при чтении. Тогда же — строка имён, которая говорит меньше, чем кажется: имя дважды, регистр не важен (`IS_ADMIN is listed more than once`), имя и его противоположность (`IS_ALIVE and !IS_ALIVE together can never hold`) — каждое требование и каждый вариант отдельно.

```
[MenuCore] addons/amxmodx/configs/menu.yaml:12:9: MAIN_MENU: the condition "IS_SPECTATR" is not registered - did you mean "IS_SPECTATOR"?
[MenuCore] addons/amxmodx/configs/menu.yaml:14:9: MAIN_MENU: SHOW_ADMN_MENU opens the menu "ADMN_MENU", which is not there - did you mean "ADMIN_MENU"?
```

### В редакторе

Расширение amxts для VS Code проверяет файл меню прямо при наборе — теми же проверками и теми же словами — и подсказывает ключи и имена, которые регистрируют ваши плагины (TypeScript, Pawn и установленные модули), с подсказкой при наведении и переходом к регистрации. Имя, добавленное в плагине, сразу появляется в подсказках файла меню, ещё до сохранения плагина. В Marketplace его пока нет: установите `.vsix` командой `code --install-extension amxts-vscode-<версия>.vsix`.

> [!WARNING]
> Расширение знает только имена, записанные строкой в рабочей области: `menus.addAction(name, ...)` с именем в переменной и имя, которое регистрирует только плагин на Pawn на сервере, — предупреждение в редакторе. В счёт идёт проверка сервера на его первом кадре.

## Pawn-плагины

Pawn-плагины работают с Menu Core через 30 нативов `mc_*` из `menu_core.inc`, который лежит в пакете в `include/`; собранные `.amxx`-плагины работают без изменений. В `plugins.ini` он встаёт на место `menu_core.amxx`. Когда модулем не пользуется ни один плагин проекта на TypeScript, `pawn: ["@amxts/menu-core"]` в `amxts.config.ts` оставляет его в сборке для них. Подробности — в [PAWN.ru.md](PAWN.ru.md).

## Тесты

Menu Core поставляет тестовый набор для поддельного сервера amxts: его ставит `setup()` из `@amxts/core/test-utils`, а `menusOf(server)` даёт то, что показывает меню игрока, клавиши, которые он нажимает, поддельные Pawn-плагины и словарь:

```ts
import { expect, test } from "bun:test";
import { setup } from "@amxts/core/test-utils";
import { menusOf } from "@amxts/menu-core/testing";

const menu = `
[MAIN_MENU]
TITLE = "Main menu"
ITEMS = {
	"Reset score" "" "" "RESET_SCORE" "" "" ""
}
`;

test("пункт выполняет действие, которое зарегистрировал плагин на Pawn", async () => {
	const server = await setup({ files: { "addons/amxmodx/configs/menu.ini": menu } });
	const menus = menusOf(server);
	const player = server.join("Alice");
	const calls: string[] = [];
	const pawn = menus.pawnPlugin("myplugin.amxx", {
		OnAction: (id: number, action: string) => {
			calls.push(action);
		},
	});

	pawn.native("mc_register_action", "RESET_SCORE", "OnAction");
	pawn.native("mc_show_menu", player.id, "MAIN_MENU");
	expect(menus.screen(player)?.text).toContain("Reset score");   // что видит игрок

	menus.press(player, 1);
	expect(calls).toEqual(["RESET_SCORE"]);
});
```

Тесты самого модуля — в `test/` (`npm test`); `playground/` — проект с Menu Core внутри, его они тоже загружают.
