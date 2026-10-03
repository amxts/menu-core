<div align="center">

<img src="assets/logo.svg" width="96" alt="Menu Core">

# Menu Core

*An opinionated way to create menus*

[![amxts module](https://img.shields.io/badge/amxts-module-3178c6?style=flat-square)](https://amxts.github.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Menus in a file](#menus-in-a-file) • [Pawn plugins](#pawn-plugins) • [Testing](#testing)

**English** | [Русский](README.ru.md)

</div>

Describe a menu once, in a file — INI, YAML or JSON — or in code, and Menu Core handles the rest: pages, keys, the way back, countdowns, and items that appear, disappear or grey out depending on who is looking.

## Features

- **Menus from a file or from code.** Admins edit `menu.ini`, `menu.yaml` or `menu.json` without touching a plugin; plugins add their own items at run time.
- **Mistakes said where they are.** An unknown key, a value of the wrong kind, a condition or an action nobody registered: the server console says so, with the file and the line.
- **Shown, and chosen.** An item says when it is shown at all (`visible`) and when it can be chosen (`enabled`): greyed out, with the message of the first requirement that fails beside it.
- **Text that follows the player.** A title, an item or a message can be a function — ``({ player }) => `Heal (${player.health} HP)` `` — read each time the menu is drawn; in `menu.ini`, `%hp%`-style placeholders do the same.
- **List menus.** A row per player or per item of your own list, with filters and a message when nothing is left.
- **Variants.** One item, several faces: the first variant whose `when` holds is shown.
- **Countdowns and locks.** Timed menus, one timer per player or one for everyone, and menus that cannot be closed or replaced.
- **One instance per server.** Every plugin, TypeScript or Pawn, fills and opens the same menus.
- **No length limits.** Long names, many items, Cyrillic menus over 500 bytes.

## Installation

```bash
npx amxts module add menu-core
```

It installs the package and [Config Core](https://github.com/amxts/config-core), which Menu Core reads its menus through, and adds both to `modules` in your project's `amxts.config.ts`. The module's options go beside it, under `menus`:

```ts
export default defineConfig({
	modules: [
		"@amxts/menu-core",
		"@amxts/config-core", // needed by menu-core
	],
	menus: {
		file: "myserver/menu",   // configs/myserver/menu.ini, .yaml, .yml, .json or .jsonc
		fallback: "menu",        // configs/menu.* when the first one is empty
	},
});
```

The build loads Config Core first. A config that lists only Menu Core builds the same: the build brings Config Core along.

| Option | Default | What it does |
| --- | --- | --- |
| `file` | `"menu"` | The menu file under `configs/`; without an extension, the first of `.ini`, `.yaml`, `.yml`, `.json` and `.jsonc` that is there. |
| `fallback` | `""` | Read instead when `file` is empty or not there; `""` is none. |

## Usage

A plugin uses the module as `menus`, without an import line: the build adds the import to the plugins that use it, and builds the module only when some plugin does.

```ts
const shop = menus.create("SHOP", { title: ({ player }) => `Shop for ${player.name}` });

shop.addItem({
	title: ({ player }) => `Heal (${player.health} HP)`,
	visible: ({ player }) => player.health < 100,
	onSelect: ({ player }) => {
		player.health = 100;
	},
});
shop.addItem({
	title: "Buy AWP",
	// Greyed out while one says no: the first that does gives its message.
	enabled: [
		{ when: ({ player }) => player.isAlive, message: "Only while alive" },
		{ when: ({ player }) => player.money >= 4750, message: ({ player }) => `Need $${4750 - player.money} more` },
	],
	onSelect: ({ player }) => {
		player.money = player.money - 4750;
		player.give("weapon_awp");
	},
});
shop.addItem({
	title: "Reset score",
	enabled: ({ player }) => player.frags != 0,
	message: "(already 0)",
	onSelect: ({ player }) => {
		player.frags = 0;
	},
});
shop.addItem({ title: "Close", action: "CLOSE_MENU", spaceBefore: 1 });

server.addCommand("/shop", ({ player }) => shop.show(player));
```

Every function of a menu — a title, `visible`, `enabled`, `onSelect` — gets one object, the menu's context:

- `player` — the player the menu is shown to: who looks at it, and who chooses;
- `target` — the player the menu is about: the row's in a list menu, the one `show(player, { target })` was given otherwise, and `player` himself when there is none;
- `row` — the row's number in a list menu, as `listRow()` gave it: an entity, an index of your own list — or a player's `id` in a list of players;
- `menu` — the menu.

A list menu (its name starts with `LIST_`) has a row per player, drawn with its first item:

```ts
const kick = menus.create("LIST_KICK", { title: "Kick a player" });
kick.addFilter(({ player, target }) => target.id != player.id, "Nobody to kick");
kick.addItem({
	title: ({ target }) => target.name,
	onSelect: ({ player, target }) => target.kick(`Kicked by ${player.name}`),
});
```

Or a row per item of a list of your own, `menu.setListSource(rows)`:

```ts
const maps = ["de_dust2", "de_inferno", "de_nuke"];

const vote = menus.create("LIST_MAPS", { title: "Next map" });
vote.setListSource(() => maps.map((map, index) => menus.listRow(index, map)));
vote.addItem({
	title: ({ row }) => maps[row],
	onSelect: ({ player, row }) => print(0, `${player.name} votes for ${maps[row]}`),
});
```

Text — a title, an item, a message — is the text itself or a function that gives it for the context. A plain string that is a lang key is translated for the player.

An item says when it is shown and when it can be chosen:

- `visible` — is it shown at all; while it says no, the item is left out and takes no slot.
- `enabled` — can it be chosen; while it says no, the item is greyed out with `message` beside it. Or a list of requirements, `{ when, message }` each: the first that fails gives its message, and one without a message of its own has the item's.

In code a requirement is a function. Names — `IS_ALIVE`, `FLAG_d`, a restriction a plugin registered — are for menu files, which cannot hold a function.

Keys: **1–7** choose, **8** is the next page, **9** the previous page or back to the menu this one was opened from, **0** closes.

Text colours are written as tags, the same letters as in chat: `!y` yellow, `!r` red, `!d` grey, `!w` white, `!R` aligns right. Chat's own `!g`, `!b` and `!t` are dropped from a menu.

### API

A menu is an object: `menus.create()` makes one, and its methods fill and open it.

| Method | What it does |
| --- | --- |
| `menu.addItem(item)` | Adds an item: `title` — the text, or a function of the context — and `onSelect`, `visible` (left out while it says no), `enabled` (greyed out while it says no — a test, or a list of `{ when, message }`), `message`, `at`, `spaceBefore`, `spaceAfter`; and for menus that name what plugins register, `action` and `placeholder`. |
| `menu.addFixedItem(slot, item)` | An item that keeps slot 1–7 on every page. |
| `menu.addFilter(test, message?)` | A list menu leaves out the rows `test` says no to; `target` is the row's player. |
| `menu.setListSource(rows)` | A list menu's own rows: `listRow(row, text)`, `textRow(text)`. |
| `menu.addEventListener("open" \| "close" \| "show", listener)` | This menu's events; `"show"` comes before it opens, `event.preventDefault()` stops it. |
| `menu.show(player, options?)` | Opens the menu; `false` when it does not open. Options: `time`, `target`, `resetHistory`, `force`, `skipHistory`. |
| `menu.refresh()` · `menu.close()` · `menu.clearItems()` | Redraw it or close it for whoever looks at it; remove its items. |
| `menu.runActions(player, line, target?)` | Runs an action line — `"GIVE_HP CLOSE_MENU"` — as a choice in the menu does. |
| `menu.setTimer(seconds)` · `menu.cancelTimer()` | The countdown everyone looking at it shares. |

Its fields — `title`, `time`, `hideBack`, `hideExit`, `locked`, `sharedTimer` — are set directly; `name`, `kind` and `countdown` are read.

| Function | What it does |
| --- | --- |
| `create(name, options?)` | A menu in code, or the existing one with that name. A name starting with `LIST_` makes a list menu. Options: `title` (text or a function), `time`, `hideBack`, `hideExit`, `locked`, `activeWhen`. |
| `find(name)` · `register(name)` | A menu by its name; `register` reads it from the file ahead of time. |
| `show(player, name, options?)` · `close(player)` · `activeMenu(player)` · `lock(player)` | The player's menu, whichever it is. |
| `addCondition(name, test)` · `addAction(name, handler)` · `addPlaceholder(name, value)` · `addRestriction(name, test, message?)` | What menu files and Pawn plugins name, answered by functions — `%name%` in their text is a placeholder. An action, a placeholder and a restriction get the menu's context and the `name` they are asked by; a condition, `(player, viewer, name)`, is asked of the row's player in a list menu. A restriction's `message` is said beside an item it greys out, unless the item or the requirement has its own. `menu.addPlaceholder(name, value)` gives one to a single menu. |
| `setListSource(name, rows)` · `refresh("A B")` · `conditionChanged(name)` · `addEventListener(type, listener)` | The same for menus by name, and every menu's events. |

## Menus in a file

A menu is read from the file the first time it is asked for: by `register(name)`, or by `show` of a name Menu Core does not know yet. The file is INI, YAML or JSON: `menus: { file: "menu" }` reads the first of `menu.ini`, `menu.yaml`, `menu.yml`, `menu.json` and `menu.jsonc` that is there, and a menu means the same in each of them — except that INI cannot hide an item ([INI's columns](#inis-columns)).

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
        visible: IS_ADMIN                  # left out for everyone else
        enabled: FLAG_d                    # greyed out, the message beside it
        message: MYPLUGIN_MENU_NEEDS_FLAG_D
        action: SHOW_ADMIN_MENU
      - name: MYPLUGIN_MENU_MAIN_AWP
        enabled:                           # the first that fails gives its message
          - when: VIP
            message: MYPLUGIN_MENU_VIP_ONLY
          - when: LEVEL:5
            message: MYPLUGIN_MENU_LEVEL_5
        action: BUY_AWP
      - variants:                          # the first whose "when" holds is shown
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
	; name | placeholder | condition | action | restriction | message | spacing
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
| `hideBack` · `hideExit` | `HIDE_BACK` · `HIDE_EXIT` | `true` (INI: `YES`) leaves the button out. |
| `time` · `onTimeout` | `TIME` · `ON_TIMEOUT` | A countdown in seconds, and the actions run when it ends. |
| `locked` · `sharedTimer` | `LOCKED` · `GLOBAL` | Items cannot be chosen; one countdown for everyone. |
| `items` | `ITEMS` | An items menu's items. |
| `fixedItems` | `FIXED_ITEMS` | Items that keep their `slot`, 1–7, on every page. |
| `view` · `filters` | `VIEW` · `FILTER` | A list menu's row, and the filters its rows pass: `when`, `message`. |

An item — in `items`, `fixedItems` or as the `view` — has a `name`, and:

| Key | What it is |
| --- | --- |
| `placeholder` | Text after the name, placeholders and all: `"%hp%"`. |
| `action` | The actions run when it is chosen. |
| `visible` | Names it is shown under; while they do not hold, it is left out and takes no slot (a fixed item leaves its slot blank). Not in a `view`: a list menu leaves rows out with `filters`. |
| `enabled` | Names it can be chosen under, with `message` beside it while they do not hold — or a list of requirements, each a line of names or `{ when, message }`: the first that fails gives its message. |
| `message` | The text beside it while a requirement without a message of its own greys it out. |
| `spaceBefore` · `spaceAfter` | Blank lines before and after it. |
| `variants` | Several faces, `[{ name, when, action }, ...]`: the first whose `when` holds is shown; a variant without `when` always holds, and when none does, the first is shown greyed out. |

The message beside a greyed-out item goes from general to specific: the one a restriction was registered with (`addRestriction(name, test, message)`), the item's `message`, the requirement's own. Each is text or a lang key.

A `visible`, `when`, `enabled`, `activeOn`, `action` or `onTimeout` is a name, several space-separated, or a list: `activeOn: [IS_ALIVE, "!IS_SPECTATOR"]`. In YAML, quote a value that starts with `!` or `%`.

- **Names** in `visible`, `enabled` and `when` — a restriction a plugin registered, a condition, or else the `"*"` restriction's. `!NAME` turns one around; several must all hold. `NAME:param` hands the restriction's test the whole token and takes the rest of the line with it: `VIP:Only for VIP` is one name, so write it last. An unknown name does not hold.
- **Conditions:** `activeOn` names conditions only. These are built in, answered by Menu Core while no plugin registers the name (a plugin that does answers instead):

  | Condition | Holds when the player |
  | --- | --- |
  | `IS_ALIVE` · `IS_DEAD` | is alive · is not (a spectator too) |
  | `TEAM_CT` · `TEAM_TERRORIST` · `TEAM_SPECTATOR` · `TEAM_UNASSIGNED` | is in that team |
  | `IS_BOT` | is a bot |
  | `IS_ADMIN` | has any access but a plain user's `z` — AMX Mod X's `is_user_admin` |
  | `FLAG_<letters>` | has any of those `users.ini` letters: `FLAG_ab` |

  In a list menu, a condition of the view or a filter is asked of the row's player, and a restriction gets the row as its target. The names are case-insensitive.
- **Built-in actions:** `SHOW_<MENU>` opens that menu, `CLOSE_MENU` closes; an action line may list several.
- **Placeholders:** `%name%` (a list row's text), `%target%`, `%time%`, and any registered one.
- **List menus** draw their view per player, or per row of their list source, leaving out rows that fail a filter. With none left the menu does not open, and the player gets the filter's message.

> [!WARNING]
> **In a menu file:**
>
> - **Flags** of an INI menu — `HIDE_BACK`, `HIDE_EXIT`, `LOCKED`, `GLOBAL` — are `YES` or `NO`: `true`, `1` or `yes` is warned of, with the word to write, and is `NO`. In YAML `yes` is text: a flag there is `true` or `false`.
> - **Text with spaces** in an INI menu is quoted: `TITLE = "Main menu"`. Unquoted, only its first word is read.
> - **An item's name in YAML or JSON is not split on `|`:** its faces are written with `variants`.
> - **Colours** are tags in a menu file too: `!y`, `!r`, `!d`, `!w`, `!R`. Pawn's codes (`\y`, `\r`) are warned of, with the tag to write, and left out. Text from Pawn — a Pawn plugin's items and titles, a lang dictionary — keeps its codes, and Menu Core reads them as the tags.
> - **`%time%` and `%target%` are lower case:** `%TIME%` and `%s` are left as written.
> - **`ADMIN` and `ACCESS_ADMIN` are not built in:** a plugin registers them, or the file writes `IS_ADMIN` (any admin) or `FLAG_<letters>` (`FLAG_d`).

### INI's columns

INI is the format Pawn plugins read too, so its columns are fixed. An item's row is `name | placeholder | condition | action | restriction | message | spacing`:

| INI | YAML, JSON |
| --- | --- |
| `"A\|B"` names, `"C1\|C2"` conditions, `"X\|Y"` actions | `variants: [{ name: A, when: C1, action: X }, { name: B, when: C2, action: Y }]` |
| a condition, one variant | `enabled: C` — greyed out without a reason |
| a restriction and a message | `enabled: R`, `message: M` — greyed out with the message |
| `"NAME:message\|NAME2:message"` | `enabled: [{ when: NAME, message: ... }, { when: NAME2, message: ... }]` |
| — | `visible` — INI has nothing that hides an item |

A condition column asks conditions only, and a restriction column asks restrictions first, then conditions. The `mc_*` natives add items the same way.

> [!TIP]
> A `menu.ini` written for Pawn colours its text with codes (`\y`, `\r`). The package's script rewrites them as tags, in INI, YAML and JSON: `bun node_modules/@amxts/menu-core/scripts/menu-colors.ts configs/menu.ini` (`--dry-run` says what it would change).

### Checks

What does not fit a menu file is said in the server console with the file and the line — and the column in YAML and JSON — and left out; the rest of the menu is read.

- **When the file is read:** an unknown key, with the one it may be — `visible` or `enabled` for an item's `condition` or `restriction`, `when` for a variant's or a filter's `condition`; a value of the wrong kind (`hideBack: yes` — YAML's `yes` is text, the field takes `true`; `HIDE_BACK = 1` — an INI flag is `YES` or `NO`); a colour code (`\y`) where a menu file writes the tag, with the tag to write — the code is left out; a menu without a title, a menu with no items at all, an item without a name, `items` in a list menu, a slot outside 1–7. An item with no action is noted, not warned of: choosing it does nothing. An empty block, `ITEMS = { }`, is fine.
- **On the server's first frame:** every name, action and placeholder the file uses that nobody registered — TypeScript plugins, Pawn plugins through the `mc_*` natives, or Menu Core itself. By then every plugin has run `plugin_init` and `plugin_cfg`, so a name a Pawn plugin registers after the file was read is not taken for a mistake. A file read later — `setConfigFile()` — is checked as it is read. Then too, a line of names that says less than it seems: a name listed twice, case aside (`IS_ADMIN is listed more than once`), a name and its opposite (`IS_ALIVE and !IS_ALIVE together can never hold`) — each requirement, and each variant, on its own.

```
[MenuCore] addons/amxmodx/configs/menu.yaml:12:9: MAIN_MENU: the condition "IS_SPECTATR" is not registered - did you mean "IS_SPECTATOR"?
[MenuCore] addons/amxmodx/configs/menu.yaml:14:9: MAIN_MENU: SHOW_ADMN_MENU opens the menu "ADMN_MENU", which is not there - did you mean "ADMIN_MENU"?
```

### In the editor

The amxts extension for VS Code checks a menu file as you type — the same checks, in the same words — and completes the keys and the names your plugins register (TypeScript, Pawn and installed modules), with hover and go to definition to the registration. A name added in a plugin is offered in the menu file at once, before the plugin is saved. It is installed from its `.vsix`, with `code --install-extension amxts-vscode-<version>.vsix`.

> [!WARNING]
> The extension knows only names written as a string in the workspace: `menus.addAction(name, ...)` with the name in a variable, and a name only a Pawn plugin on the server registers, are a warning in the editor. The server's check on its first frame is the one that counts.

## Pawn plugins

A Pawn plugin makes, fills and shows menus through Menu Core too, with its 30 natives whose names start with `mc_`: `mc_register_action`, `mc_show_menu`, `mc_add_menu_item` and the rest. The package ships their include in `include/`:

```pawn
#include <menu_core>
```

A Pawn plugin already compiled against this include works as it is, with nothing to rebuild.

Only one plugin on a server can give these natives: if another Pawn plugin in `plugins.ini` registers `mc_*` natives too, comment it out.

Menu Core runs on the server as one of the project's plugins. When no TypeScript plugin of the project uses it, keep it in the build for the Pawn plugins: `pawn: ["@amxts/menu-core"]` in `amxts.config.ts`. Every native with its signature: [PAWN.md](PAWN.md).

## Testing

Menu Core ships a test kit for the amxts fake server: `setup()` from `@amxts/core/test-utils` installs it, and `menusOf(server)` gives what the player's menu shows, the keys he presses, fake Pawn plugins and a dictionary:

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

test("an item runs the action a Pawn plugin registered", async () => {
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
	expect(menus.screen(player)?.text).toContain("Reset score");   // what the player sees

	menus.press(player, 1);
	expect(calls).toEqual(["RESET_SCORE"]);
});
```

The module's own tests are in `test/` (`npm test`); `playground/` is a project with Menu Core in it, which they load too.
