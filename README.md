<div align="center">

# Menu Core

*An opinionated way to create menus*

[![amxts module](https://img.shields.io/badge/amxts-module-3178c6?style=flat-square)](https://amxts.github.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Menus in a file](#menus-in-a-file) • [Pawn plugins](#pawn-plugins) • [Testing](#testing)

**English** | [Русский](README.ru.md)

</div>

Describe a menu once, in a file — INI, YAML or JSON — or in code, and Menu Core handles the rest: pages, keys, the way back, countdowns, and items that appear, disappear or grey out depending on who is looking.

> [!WARNING]
> **In progress.** Menu Core has been tried in game only a few times, and its API may still change.

## Features

- **Menus from a file or from code.** Admins edit `menu.ini`, `menu.yaml` or `menu.json` without touching a plugin; plugins add their own items at run time.
- **Mistakes said where they are.** An unknown key, a value of the wrong kind, a condition or an action nobody registered: the server console says so, with the file and the line.
- **Conditions and restrictions.** Show an item only when it applies (`IS_ALIVE`, `!IS_SPECTATOR`), or grey it out with a reason (`ADMIN`, `FLAG_abc`).
- **Text that follows the player.** A title, an item or a message can be a function — ``(player) => `Heal (${player.health} HP)` `` — read each time the menu is drawn; in `menu.ini`, `%hp%`-style placeholders do the same.
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
		file: "myserver/menu",   // configs/myserver/menu.ini, .yaml, .yml, .json or .jsonc
		fallback: "menu",        // configs/menu.* when the first one is empty
	},
});
```

Menu Core reads its menus through [Config Core](https://github.com/amxts/config-core). The package manager installs it along with Menu Core, and the build loads it first, so there is nothing to add for it.

| Option | Default | What it does |
| --- | --- | --- |
| `file` | `"menu"` | The menu file under `configs/`; without an extension, the first of `.ini`, `.yaml`, `.yml`, `.json` and `.jsonc` that is there. |
| `fallback` | `""` | Read instead when `file` is empty or not there; `""` is none. |

## Usage

```ts
import { server } from "@amxts/core";
import * as menus from "@amxts/menu-core";

const shop = menus.create("SHOP", { title: (player) => `Shop for ${player.name}` });

shop.addItem((player) => `Heal (${player.health} HP)`, {
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

Text — a title, an item, a message — is the text itself or a function that gives it for the player who looks. A plain string that is a lang key is translated for him.

Keys: **1–7** choose, **8** is the next page, **9** the previous page or back to the menu this one was opened from, **0** closes.

Text colours are written as tags, the same letters as in chat: `!y` yellow, `!r` red, `!d` grey, `!w` white, `!R` aligns right. Chat's own `!g`, `!b` and `!t` are dropped from a menu.

### API

A menu is an object: `menus.create()` makes one, and its methods fill and open it.

| Method | What it does |
| --- | --- |
| `menu.addItem(text, options?)` | Adds an item: its text, or `(player, target) => text` — `target` is the row's in a list menu. Options: `onSelect`, `visible` (left out while it says no), `enabled` (greyed out while it says no) with `message`, `at`, `spaceBefore`, `spaceAfter` — and the menu.ini names `condition`, `action`, `restriction`, `restrictionMessage`, `placeholder`. |
| `menu.addFixedItem(slot, text, options?)` | An item that keeps slot 1–7 on every page. |
| `menu.addFilter(test, message?)` | A list menu leaves out the rows `test` says no to. |
| `menu.setListSource(rows)` | A list menu's own rows: `listRow(target, text)`, `textRow(text)`. |
| `menu.addEventListener("open" \| "close" \| "show", listener)` | This menu's events; `"show"` comes before it opens, `event.preventDefault()` stops it. |
| `menu.show(player, options?)` | Opens the menu; `false` when it does not open. Options: `time`, `target`, `resetHistory`, `force`, `skipHistory`. |
| `menu.refresh()` · `menu.close()` · `menu.clearItems()` | Redraw it or close it for whoever looks at it; remove its items. |
| `menu.setTimer(seconds)` · `menu.cancelTimer()` | The countdown everyone looking at it shares. |

Its fields — `title`, `time`, `hideBack`, `hideExit`, `locked`, `sharedTimer` — are set directly; `name`, `kind` and `countdown` are read.

| Function | What it does |
| --- | --- |
| `create(name, options?)` | A menu in code, or the existing one with that name. A name starting with `LIST_` makes a list menu. Options: `title` (text or a function), `time`, `hideBack`, `hideExit`, `locked`, `activeWhen`. |
| `find(name)` · `register(name)` | A menu by its name; `register` reads it from the file ahead of time. |
| `show(player, name, options?)` · `close(player)` · `activeMenu(player)` · `lock(player)` | The player's menu, whichever it is. |
| `addCondition(name, test)` · `addAction(name, handler)` · `addPlaceholder(name, value)` · `addRestriction(name, test, message?)` | What menu.ini and Pawn plugins name, answered by functions — `%name%` in their text is a placeholder. `menu.addPlaceholder(name, value)` gives one to a single menu. |
| `setListSource(name, rows)` · `refresh("A B")` · `conditionChanged(name)` · `addEventListener(type, listener)` | The same for menus by name, and every menu's events. |

## Menus in a file

A menu is read from the file the first time it is asked for: by `register(name)`, or by `show` of a name Menu Core does not know yet. The file is INI, YAML or JSON: `menus: { file: "menu" }` reads the first of `menu.ini`, `menu.yaml`, `menu.yml`, `menu.json` and `menu.jsonc` that is there, and a menu means the same in each of them.

```yaml
# configs/menu.yaml
chatPrefix: MYPLUGIN_CHAT_PREFIX   # chat prefix of the "nothing to list" message
labels:
  exit: MYPLUGIN_MENU_EXIT         # the buttons: a lang key or the text itself
  number: MYPLUGIN_MENU_NUMBER     # "!y[%d]!w" unless the dictionary says otherwise

menus:
  MAIN_MENU:
    title: MYPLUGIN_MENU_MAIN_TITLE
    hideBack: true
    items:
      - name: MYPLUGIN_MENU_MAIN_ADMIN
        condition: IS_ADMIN
        action: SHOW_ADMIN_MENU
        restriction: ADMIN
      - variants:
          - { name: MYPLUGIN_MENU_MAIN_SPECTATE, condition: "!IS_SPECTATOR", action: JOIN_SPECTATE }
          - { name: MYPLUGIN_MENU_MAIN_JOIN, condition: IS_SPECTATOR, action: JOIN_TEAM }

  LIST_SPECTATORS_MENU:
    title: MYPLUGIN_MENU_SPECTATORS_TITLE
    activeOn: IS_ROUND_RUNNING
    filters:
      - { condition: IS_SPECTATOR, message: MYPLUGIN_CHAT_NO_SPECTATORS }
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
        { "name": "MYPLUGIN_MENU_MAIN_ADMIN", "condition": "IS_ADMIN", "action": "SHOW_ADMIN_MENU", "restriction": "ADMIN" },
        {
          "variants": [
            { "name": "MYPLUGIN_MENU_MAIN_SPECTATE", "condition": "!IS_SPECTATOR", "action": "JOIN_SPECTATE" },
            { "name": "MYPLUGIN_MENU_MAIN_JOIN", "condition": "IS_SPECTATOR", "action": "JOIN_TEAM" }
          ]
        }
      ]
    },
    "LIST_SPECTATORS_MENU": {
      "title": "MYPLUGIN_MENU_SPECTATORS_TITLE",
      "activeOn": "IS_ROUND_RUNNING",
      "filters": [{ "condition": "IS_SPECTATOR", "message": "MYPLUGIN_CHAT_NO_SPECTATORS" }],
      "view": { "name": "%name%", "action": "SWAP_WITH_SPECTATOR" }
    }
  }
}
```

```ini
; configs/menu.ini - as menu_core reads it
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

### The fields

| YAML, JSON | INI | What it is |
| --- | --- | --- |
| `chatPrefix` | `[MAIN]` `PREFIX` | The chat prefix of Menu Core's messages. |
| `labels`: `exit`, `back`, `next`, `number`, `disabled`, `page`, `time` | `[MAIN]` `KEY = { ... }` | The words of the buttons, the page and the countdown. |
| `menus`: `{ NAME: menu }` | `[NAME]` | The menus; a name starting with `LIST_` is a list menu. |
| `title` | `TITLE` | The title; a menu has one. |
| `activeOn` | `ACTIVE_ON` | Conditions the menu opens only under. |
| `hideBack` · `hideExit` | `HIDE_BACK` · `HIDE_EXIT` | `true` leaves the button out. |
| `time` · `onTimeout` | `TIME` · `ON_TIMEOUT` | A countdown in seconds, and the actions run when it ends. |
| `locked` · `sharedTimer` | `LOCKED` · `GLOBAL` | Items cannot be chosen; one countdown for everyone. |
| `items` | `ITEMS` | An items menu's items. |
| `fixedItems` | `FIXED_ITEMS` | Items that keep their `slot`, 1–7, on every page. |
| `view` · `filters` | `VIEW` · `FILTER` | A list menu's row, and the filters its rows pass: `condition`, `message`. |

An item — in `items`, `fixedItems` or as the `view` — has a `name`, and `placeholder` (text after the name), `condition` (greyed out without it), `action`, `restriction` and its `message`, `spaceBefore` and `spaceAfter` (blank lines). `variants: [{ name, condition, action }, ...]` gives an item several faces, the first whose condition holds shown — the `A|B` of INI, which YAML and JSON read too.

A `condition`, `action`, `restriction`, `activeOn` or `onTimeout` is a name, several space-separated, or a list: `activeOn: [IS_ALIVE, "!IS_SPECTATOR"]`. In YAML, quote a value that starts with `!` or `%`.

- **Variants:** the first whose condition holds is shown.
- **Conditions:** `!NAME` turns one around; several names must all hold. `ADMIN` and `FLAG_<letters>` are answered from the player's access when nobody registered them; any other unknown condition does not hold.
- **Built-in actions:** `SHOW_<MENU>` opens that menu, `CLOSE_MENU` closes; an action line may list several.
- **Placeholders:** `%name%` (a list row's text), `%target%`, `%time%`, and any registered one.
- **List menus** draw their view per player, or per row of their list source, leaving out rows that fail a filter. With none left the menu does not open, and the player gets the filter's message.

> [!TIP]
> Colour codes in menus written for Pawn (`\y`, `\r`) still work, so an existing `menu.ini` can be used as it is.

### Checks

What does not fit a menu file is said in the server console with the file and the line — and the column in YAML and JSON — and left out; the rest of the menu is read.

- **When the file is read:** an unknown key, with the one it may be; a value of the wrong kind (`hideBack: yes` — YAML's `yes` is text, the field takes `true`); a menu without a title, an item without a name, `items` in a list menu, a slot outside 1–7.
- **On the server's first frame:** every condition, action, restriction and placeholder the file names that nobody registered — TypeScript plugins, Pawn plugins through the `mc_*` natives, or Menu Core itself. By then every plugin has run `plugin_init` and `plugin_cfg`, so a name a Pawn plugin registers after the file was read is not taken for a mistake. A file read later — `setConfigFile()` — is checked as it is read.

```
[MenuCore] addons/amxmodx/configs/menu.yaml:12:9: MAIN_MENU: the condition "IS_SPECTATR" is not registered - did you mean "IS_SPECTATOR"?
[MenuCore] addons/amxmodx/configs/menu.yaml:14:9: MAIN_MENU: SHOW_ADMN_MENU opens the menu "ADMN_MENU", which is not there - did you mean "ADMIN_MENU"?
```

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
