<div align="center">

# Menu Core

*Удобный способ создавать меню*

[![amxts module](https://img.shields.io/badge/amxts-module-3178c6?style=flat-square)](https://amxts.github.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Возможности](#возможности) • [Установка](#установка) • [Использование](#использование) • [Меню в файле](#меню-в-файле) • [Pawn-плагины](#pawn-плагины) • [Тесты](#тесты)

[English](README.md) | **Русский**

</div>

Опишите меню один раз — в ini-файле или в коде, — а остальное Menu Core сделает сам: страницы, клавиши, возврат назад, обратный отсчёт и пункты, которые появляются, скрываются или становятся серыми в зависимости от того, кто смотрит.

> [!WARNING]
> **В работе.** В игре Menu Core пробовали всего несколько раз, и API ещё может измениться.

## Возможности

- **Меню из файла или из кода.** Админ правит `menu.ini`, не трогая плагин; плагины добавляют свои пункты на ходу.
- **Условия и ограничения.** Пункт показывается, только когда он уместен (`IS_ALIVE`, `!IS_SPECTATOR`), или становится серым с причиной (`ADMIN`, `FLAG_abc`).
- **Текст, который зависит от игрока.** Заголовок, пункт или сообщение могут быть функцией — ``(player) => `Лечение (${player.health} HP)` `` — она читается при каждой отрисовке; в `menu.ini` то же делают плейсхолдеры вроде `%hp%`.
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

Menu Core читает меню через [Config Core](https://github.com/amxts/config-core). Пакетный менеджер ставит его вместе с Menu Core, а сборка загружает первым, так что для него ничего добавлять не нужно.

| Опция | По умолчанию | Что делает |
| --- | --- | --- |
| `file` | `"menu"` | Файл меню в `configs/`, без `.ini`. |
| `fallback` | `""` | Читается вместо `file`, если в нём нет меню; `""` — без запасного. |

## Использование

```ts
import { server } from "@amxts/core";
import * as menus from "@amxts/menu-core";

const shop = menus.create("SHOP", { title: (player) => `Магазин для ${player.name}` });

shop.addItem((player) => `Лечение (${player.health} HP)`, {
	visible: (player) => player.health < 100,
	onSelect: (player) => {
		player.health = 100;
	},
});
shop.addItem("Сбросить счёт", {
	onSelect: (player) => {
		player.frags = 0;
	},
});
shop.addItem("Закрыть", { action: "CLOSE_MENU", spaceBefore: 1 });

server.addCommand("/shop", (player) => {
	shop.show(player);
});
```

Текст — заголовок, пункт, сообщение — это сам текст или функция, которая даёт его для игрока, который смотрит. Обычная строка, если это ключ словаря, переводится для него.

Клавиши: **1–7** выбирают, **8** — следующая страница, **9** — предыдущая страница или назад, в меню, из которого открыли это, **0** закрывает.

Цвета в тексте пишутся метками, теми же буквами, что в чате: `!y` жёлтый, `!r` красный, `!d` серый, `!w` белый, `!R` — выравнивание вправо. Метки только для чата — `!g`, `!b` и `!t` — из меню убираются.

### API

Меню — объект: `menus.create()` его делает, а методы наполняют и открывают.

| Метод | Что делает |
| --- | --- |
| `menu.addItem(text, options?)` | Добавляет пункт: его текст или `(player, target) => текст` — `target` — цель строки в меню-списке. Опции: `onSelect`, `visible` (пункта нет, пока отвечает «нет»), `enabled` (пункт серый, пока отвечает «нет») с `message`, `at`, `spaceBefore`, `spaceAfter` — и имена из menu.ini `condition`, `action`, `restriction`, `restrictionMessage`, `placeholder`. |
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
| `addCondition(name, test)` · `addAction(name, handler)` · `addPlaceholder(name, value)` · `addRestriction(name, test, message?)` | То, что называют menu.ini и Pawn-плагины, — ответы функциями; `%name%` в их тексте — плейсхолдер. `menu.addPlaceholder(name, value)` задаёт его одному меню. |
| `setListSource(name, rows)` · `refresh("A B")` · `conditionChanged(name)` · `addEventListener(type, listener)` | То же для меню по имени и события всех меню. |

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

Menu Core поставляет тестовый набор для поддельного сервера amxts: его ставит `setup()` из `@amxts/core/test-utils`, а `menusOf(server)` даёт то, что показывает меню игрока, клавиши, которые он нажимает, поддельные Pawn-плагины и словарь:

```ts
import { setup } from "@amxts/core/test-utils";
import { menusOf } from "@amxts/menu-core/testing";

const server = await setup({ files });
const menus = menusOf(server);
const admin = menus.pawnPlugin("admin.amxx", {
	OnKick: (_id: number, target: number) => kicked.push(target),
});

admin.native("mc_register_action", "KICK", "OnKick");
admin.native("mc_show_menu", player.id, "LIST_KICK");
menus.screen(player)?.text;   // что видит игрок
menus.press(player, 1);
```

Тесты самого модуля — в `test/` (`npm test`); `playground/` — проект с Menu Core внутри, его они тоже загружают.
