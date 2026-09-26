<div align="center">

# Menu Core

*Удобный способ создавать меню для серверов Counter-Strike 1.6*

[![amxts module](https://img.shields.io/badge/amxts-module-3178c6?style=flat-square)](https://amxts.github.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Возможности](#возможности) • [Установка](#установка) • [Использование](#использование) • [Меню в файле](#меню-в-файле) • [Pawn-плагины](#pawn-плагины) • [Тесты](#тесты)

[English](README.md) | **Русский**

</div>

Опишите меню один раз — в ini-файле или в коде, — а остальное Menu Core сделает сам: страницы, клавиши, возврат назад, обратный отсчёт и пункты, которые появляются, скрываются или становятся серыми в зависимости от того, кто смотрит. Это модуль [amxts](https://amxts.github.io/), написанный на TypeScript. Он же отдаёт нативы оригинального `menu_core.amxx`, так что существующие Pawn-плагины продолжают работать.

> [!WARNING]
> **В работе.** В игре Menu Core пробовали всего несколько раз, и API ещё может измениться.

## Возможности

- **Меню из файла или из кода.** Админ правит `menu.ini`, не трогая плагин; плагины добавляют свои пункты на ходу.
- **Условия и ограничения.** Пункт показывается, только когда он уместен (`IS_ALIVE`, `!IS_SPECTATOR`), или становится серым с причиной (`ADMIN`, `FLAG_abc`).
- **Подстановки.** `%hp%`, `%name%`, `%time%` и любые свои значения подставляются при каждой отрисовке.
- **Меню-списки.** Строка на каждого игрока или на каждый элемент своего списка, с фильтрами и сообщением, если никого не осталось.
- **Варианты.** `SPECTATE|JOIN` показывает тот вариант, чьё условие выполняется.
- **Отсчёт и блокировка.** Меню с таймером — свой у каждого игрока или один на всех — и меню, которое нельзя закрыть или заменить.
- **Один экземпляр на сервер.** Все плагины, на TypeScript и на Pawn, наполняют и открывают одни и те же меню.
- **Без ограничений Pawn.** Длинные названия, сколько угодно пунктов, меню на кириллице длиннее 500 байт.

## Установка

```bash
npm install @amxts/menu-core
```

И добавьте его в `amxts.config.ts` проекта:

```ts
export default defineConfig({
	modules: ["@amxts/menu-core"],
	menus: {
		file: "myserver/menu",   // configs/myserver/menu.ini
		fallback: "menu",        // configs/menu.ini, если в первом нет меню
	},
});
```

Menu Core читает меню через [Universal Config](https://github.com/amxts/universal-config). Пакетный менеджер ставит его вместе с Menu Core, а сборка загружает первым, так что для него ничего добавлять не нужно.

| Опция | По умолчанию | Что делает |
| --- | --- | --- |
| `file` | `"menu"` | Файл меню в `configs/`, без `.ini`. |
| `fallback` | `""` | Читается вместо `file`, если в нём нет меню; `""` — без запасного. |

## Использование

```ts
import { server } from "@amxts/core";
import * as menus from "@amxts/menu-core";

menus.addCondition("IS_HURT", (player) => player.health < 100);
menus.addPlaceholder("hp", (player) => `${player.health}`);

const shop = menus.create("SHOP", "Магазин");
menus.addItem(shop, "Лечение (%hp% HP)", {
	condition: "IS_HURT",
	onSelect: (player) => {
		player.health = 100;
	},
});
menus.addItem(shop, "Сбросить счёт", {
	onSelect: (player) => {
		player.frags = 0;
	},
});
menus.addItem(shop, "Закрыть", { action: "CLOSE_MENU", spaceBefore: 1 });

server.addCommand("/shop", (player) => {
	menus.show(player, "SHOP");
});
```

Клавиши: **1–7** выбирают, **8** — следующая страница, **9** — предыдущая страница или назад, в меню, из которого открыли это, **0** закрывает.

Цвета в тексте пишутся метками: `!y` жёлтый, `!r` красный, `!w` белый, `!d` серый, `!R` выравнивание вправо.

### API

| Функция | Что делает |
| --- | --- |
| `create(name, title)` | Меню в коде или уже существующее с таким именем. Имя с `LIST_` делает меню-список. |
| `register(name)` | Заранее загружает меню из файла. |
| `addItem(menu, name, options?)` | Добавляет пункт. Опции: `placeholder`, `condition`, `action` или `onSelect`, `restriction`, `restrictionMessage`, `at`, `spaceBefore`, `spaceAfter`. |
| `addFixedItem(menu, slot, name, options?)` | Пункт, который на каждой странице занимает слот 1–7. |
| `addCondition(name, test)` | Когда пункт показывается. |
| `addAction(name, handler)` | Что делает пункт, названный в файле. |
| `addPlaceholder(name, value)` | Во что превращается `%name%`. |
| `addRestriction(name, test, message?)` | Когда пункт серый и почему. |
| `setListSource(name, rows)` | Строки меню-списка: `listRow(target, text)`, `textRow(text)`. |
| `addEventListener("open" \| "close" \| "show", listener)` | `"show"` приходит до открытия меню; `event.preventDefault()` его отменяет. |
| `show(player, name, options?)` | Открывает меню; `false`, если оно не открылось. Опции: `time`, `target`, `resetHistory`, `force`, `skipHistory`. |
| `close(player)` · `refresh("A B")` · `conditionChanged(name)` | Закрыть, перерисовать названные меню, перерисовать то, что зависит от условия. |
| `lock(player)` · `setTimer(menu, seconds)` · `cancelTimer(menu)` | Блокировка и отсчёт. |

Меню — обычный объект `Menu`: поля вроде `hideExit`, `locked` и `time` задаются напрямую.

## Меню в файле

Меню читается из файла, когда его впервые запрашивают: через `register(name)` или через `show` с именем, которого Menu Core ещё не знает.

```ini
[MAIN]
PREFIX = MYPLUGIN_CHAT_PREFIX       ; префикс в чате для сообщения «некого показать»
KEY = {
	EXIT = MYPLUGIN_MENU_EXIT       ; кнопки: ключ словаря или сам текст
	NUMBER = MYPLUGIN_MENU_NUMBER   ; "!y[%d]!w", если словарь не говорит иначе
}

[MAIN_MENU]
TITLE = MYPLUGIN_MENU_MAIN_TITLE
HIDE_BACK = YES
ITEMS = {
	; название | подстановка | условие | действие | ограничение | сообщение | отступ
	"MYPLUGIN_MENU_MAIN_ADMIN" "" "IS_ADMIN" "SHOW_ADMIN_MENU" "ADMIN" "" ""
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

- **Ключи меню:** `TITLE`, `ACTIVE_ON` (меню открывается, только пока условие выполняется), `HIDE_BACK`, `HIDE_EXIT`, `TIME` (отсчёт в секундах), `ON_TIMEOUT` (действие, когда он закончился), `LOCKED`, `GLOBAL` (один отсчёт на всех).
- **Варианты:** `A|B` в названии, условии или действии; показывается первый, чьё условие выполняется.
- **Условия:** `!NAME` переворачивает условие; несколько имён через пробел должны выполняться все. `ADMIN` и `FLAG_<буквы>`, если их никто не зарегистрировал, проверяются по правам игрока; любое другое незнакомое условие не выполняется.
- **Встроенные действия:** `SHOW_<MENU>` открывает это меню, `CLOSE_MENU` закрывает; в строке действия их может быть несколько.
- **Подстановки:** `%name%` (текст строки списка), `%target%`, `%time%` и любые зарегистрированные.
- **Меню-список** рисует строку `VIEW` на каждого игрока или на каждую строку своего источника и пропускает те, что не прошли `FILTER`. Если никого не осталось, меню не открывается, а игрок получает сообщение фильтра.

> [!TIP]
> Цветовые коды из меню для Pawn (`\y`, `\r`) по-прежнему работают, так что существующий `menu.ini` подойдёт без правок.

## Pawn-плагины

Существующие Pawn-плагины продолжают работать: Menu Core отдаёт 29 нативов `mc_*` оригинального `menu_core.amxx` с теми же сигнатурами, а в пакете лежит `include/menu_core.inc`. Замените им `menu_core.amxx` в `plugins.ini`. Подробности и отличия от оригинала — в [PAWN.ru.md](PAWN.ru.md).

## Тесты

`installMenus(server)` из тестовой библиотеки amxts даёт фейковому серверу меню, клавиши, фейковые Pawn-плагины и словарь. Вызывается до загрузки плагинов:

```ts
import { FakeServer, installMenus } from "@amxts/core/src/testing";

const server = new FakeServer({ files });
const menus = installMenus(server);
const admin = menus.pawnPlugin("admin.amxx", {
	OnKick: (_id: number, target: number) => kicked.push(target),
});
await server.load("@amxts/universal-config");
await server.load("@amxts/menu-core");
server.start();

admin.native("mc_register_action", "KICK", "OnKick");
admin.native("mc_show_menu", player.id, "LIST_KICK");
menus.screen(player)?.text;   // что видит игрок
menus.press(player, 1);
```
