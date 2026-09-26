<div align="center">

# Menu Core

*An opinionated way to create menus for Counter-Strike 1.6 servers*

[![amxts module](https://img.shields.io/badge/amxts-module-3178c6?style=flat-square)](https://amxts.github.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Menus in a file](#menus-in-a-file) • [Pawn plugins](#pawn-plugins) • [Testing](#testing)

**English** | [Русский](README.ru.md)

</div>

Describe a menu once, in an ini file or in code, and Menu Core handles the rest: pages, keys, the way back, countdowns, and items that appear, disappear or grey out depending on who is looking. It is an [amxts](https://amxts.github.io/) module written in TypeScript, and it also serves the original `menu_core.amxx` natives, so existing Pawn plugins keep working.

> [!WARNING]
> **In progress.** Menu Core has been tried in game only a few times, and its API may still change.

## Features

- **Menus from a file or from code.** Admins edit `menu.ini` without touching a plugin; plugins add their own items at run time.
- **Conditions and restrictions.** Show an item only when it applies (`IS_ALIVE`, `!IS_SPECTATOR`), or grey it out with a reason (`ADMIN`, `FLAG_abc`).
- **Placeholders.** `%hp%`, `%name%`, `%time%` and any value you register are filled in each time the menu is drawn.
- **List menus.** A row per player or per item of your own list, with filters and a message when nothing is left.
- **Variants.** `SPECTATE|JOIN` shows whichever variant's condition holds.
- **Countdowns and locks.** Timed menus, one timer per player or one for everyone, and menus that cannot be closed or replaced.
- **One instance per server.** Every plugin, TypeScript or Pawn, fills and opens the same menus.
- **No Pawn limits.** Long names, many items, Cyrillic menus over 500 bytes.

## Installation

```bash
npm install @amxts/menu-core
```

Then add it to your project's `amxts.config.ts`:

```ts
export default defineConfig({
	modules: ["@amxts/menu-core"],
	menus: {
		file: "myserver/menu",   // configs/myserver/menu.ini
		fallback: "menu",        // configs/menu.ini when the first one has no menus
	},
});
```

Menu Core reads its menus through [Config Core](https://github.com/amxts/config-core). The package manager installs it along with Menu Core, and the build loads it first, so there is nothing to add for it.

| Option | Default | What it does |
| --- | --- | --- |
| `file` | `"menu"` | The menu file under `configs/`, without `.ini`. |
| `fallback` | `""` | Read instead when `file` has no menus; `""` is none. |

## Usage

```ts
import { server } from "@amxts/core";
import * as menus from "@amxts/menu-core";

const shop = menus.create("SHOP", { title: "Shop" });
shop.addPlaceholder("hp", (player) => `${player.health}`);

shop.addItem("Heal (%hp% HP)", {
	visible: (player) => player.health < 100,
	onSelect: (player) => {
		player.health = 100;
	},
});
shop.addItem("Reset score", {
	onSelect: (player) => {
		player.frags = 0;
	},
});
shop.addItem("Close", { action: "CLOSE_MENU", spaceBefore: 1 });

server.addCommand("/shop", (player) => {
	shop.show(player);
});
```

Keys: **1–7** choose, **8** is the next page, **9** the previous page or back to the menu this one was opened from, **0** closes.

Text colours are written as tags: `!y` yellow, `!r` red, `!w` white, `!d` grey, `!R` aligns right.

### API

A menu is an object: `menus.create()` makes one, and its methods fill and open it.

| Method | What it does |
| --- | --- |
| `menu.addItem(text, options?)` | Adds an item. Options: `onSelect`, `visible` (left out while it says no), `enabled` (greyed out while it says no) with `message`, `at`, `spaceBefore`, `spaceAfter` — and the menu.ini names `condition`, `action`, `restriction`, `restrictionMessage`, `placeholder`. |
| `menu.addFixedItem(slot, text, options?)` | An item that keeps slot 1–7 on every page. |
| `menu.addPlaceholder(name, value)` | What `%name%` becomes in this menu. |
| `menu.addFilter(test, message?)` | A list menu leaves out the rows `test` says no to. |
| `menu.setListSource(rows)` | A list menu's own rows: `listRow(target, text)`, `textRow(text)`. |
| `menu.addEventListener("open" \| "close" \| "show", listener)` | This menu's events; `"show"` comes before it opens, `event.preventDefault()` stops it. |
| `menu.show(player, options?)` | Opens the menu; `false` when it does not open. Options: `time`, `target`, `resetHistory`, `force`, `skipHistory`. |
| `menu.refresh()` · `menu.close()` · `menu.clearItems()` | Redraw it or close it for whoever looks at it; remove its items. |
| `menu.setTimer(seconds)` · `menu.cancelTimer()` | The countdown everyone looking at it shares. |

Its fields — `title`, `time`, `hideBack`, `hideExit`, `locked`, `sharedTimer` — are set directly; `name`, `kind` and `countdown` are read.

| Function | What it does |
| --- | --- |
| `create(name, options?)` | A menu in code, or the existing one with that name. A name starting with `LIST_` makes a list menu. Options: `title`, `time`, `hideBack`, `hideExit`, `locked`, `activeWhen`. |
| `find(name)` · `register(name)` | A menu by its name; `register` reads it from the file ahead of time. |
| `show(player, name, options?)` · `close(player)` · `activeMenu(player)` · `lock(player)` | The player's menu, whichever it is. |
| `addCondition(name, test)` · `addAction(name, handler)` · `addPlaceholder(name, value)` · `addRestriction(name, test, message?)` | What menu.ini and Pawn plugins name, answered by functions. |
| `setListSource(name, rows)` · `refresh("A B")` · `conditionChanged(name)` · `addEventListener(type, listener)` | The same for menus by name, and every menu's events. |

## Menus in a file

A menu is read from the file the first time it is asked for: by `register(name)`, or by `show` of a name Menu Core does not know yet.

```ini
[MAIN]
PREFIX = MYPLUGIN_CHAT_PREFIX       ; chat prefix of the "nothing to list" message
KEY = {
	EXIT = MYPLUGIN_MENU_EXIT       ; the buttons: a lang key or the text itself
	NUMBER = MYPLUGIN_MENU_NUMBER   ; "!y[%d]!w" unless the dictionary says otherwise
}

[MAIN_MENU]
TITLE = MYPLUGIN_MENU_MAIN_TITLE
HIDE_BACK = YES
ITEMS = {
	; name | placeholder | condition | action | restriction | message | spacing
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
	; name | condition | action | restriction | message
	"%name%" "" "SWAP_WITH_SPECTATOR" "" ""
}
```

- **Menu keys:** `TITLE`, `ACTIVE_ON` (the menu opens only while it holds), `HIDE_BACK`, `HIDE_EXIT`, `TIME` (a countdown in seconds), `ON_TIMEOUT` (the action when it ends), `LOCKED`, `GLOBAL` (one countdown for everyone).
- **Variants:** `A|B` in a name, condition or action; the first whose condition holds is shown.
- **Conditions:** `!NAME` turns one around; several names, space-separated, must all hold. `ADMIN` and `FLAG_<letters>` are answered from the player's access when nobody registered them; any other unknown condition does not hold.
- **Built-in actions:** `SHOW_<MENU>` opens that menu, `CLOSE_MENU` closes; an action line may list several.
- **Placeholders:** `%name%` (a list row's text), `%target%`, `%time%`, and any registered one.
- **List menus** draw their `VIEW` row per player, or per row of their list source, leaving out rows that fail a `FILTER`. With none left the menu does not open, and the player gets the filter's message.

> [!TIP]
> Colour codes in menus written for Pawn (`\y`, `\r`) still work, so an existing `menu.ini` can be used as it is.

## Pawn plugins

Existing Pawn plugins keep working: Menu Core serves the 29 `mc_*` natives of the original `menu_core.amxx` with the same signatures, and the package ships `include/menu_core.inc`. Replace `menu_core.amxx` with it in `plugins.ini`. Details and the differences from the original: [PAWN.md](PAWN.md).

## Testing

Menu Core ships a test kit for the amxts fake server: `setup()` from `@amxts/core/test-utils` installs it, and `menusOf(server)` gives what the player's menu shows, the keys he presses, fake Pawn plugins and a dictionary:

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
menus.screen(player)?.text;   // what the player sees
menus.press(player, 1);
```

The module's own tests are in `test/` (`npm test`); `playground/` is a project with Menu Core in it, which they load too.
