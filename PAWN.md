# Menu Core for Pawn plugins

[English](PAWN.md) | [Русский](PAWN.ru.md)

Menu Core serves the 30 natives of `menu_core.inc` (`mc_register_action`, `mc_show_menu`, `mc_add_menu_item` and the rest) with their signatures, so compiled `.amxx` plugins work unchanged.

Pawn plugins write `#include <menu_core>`; the package ships `include/menu_core.inc`. Only one plugin on a server can give these natives: if another Pawn plugin in `plugins.ini` registers `mc_*` natives too, comment it out.

Callbacks are named by their public function, and Menu Core calls them in the plugin that registered them.

The package's `include/menu_core.inc` declares:

- the menu properties as `enum MenuProperty { MP_LOCKED = 0, … MP_FILTER }`, which the three property natives take as `MenuProperty:property`;
- `mc_add_list_text(aItems, …)`, without the `Array:` tag;
- `mc_get_menu_text(id, out[], len)`: what the player's menu shows.

A plugin compiled against it gets a tag warning for a bare number where `MenuProperty:` is expected, and for an `Array:` passed to `mc_add_list_text`. The values a compiled plugin passes are the same either way.

### How the natives behave

- No Pawn limits: names, titles and placeholders are as long as they are written, a menu keeps every item, the way back is as long as it gets, and a menu longer than 500 bytes is sent whole.
- `mc_get_menu_property_string(idx, MP_SECTION)` gives the menu's section.
- A condition filter applies wherever the condition is asked.
- A restriction's `message` is shown beside an item it greys out when the item has no message of its own.
- `IS_ALIVE`, `IS_DEAD`, `TEAM_<team>`, `IS_BOT`, `IS_ADMIN` and `FLAG_<letters>` are built-in conditions, answered while no plugin registers the name. A plugin that registers one of them answers instead.
- `ADMIN` and `ACCESS_ADMIN` are not built in: they are names like any other, and a menu that uses them needs a plugin that registers them (`mc_register_condition`, `mc_register_restriction`). Otherwise the check says the name is not registered and suggests `IS_ADMIN`. Without a plugin, write `IS_ADMIN` (any admin) or `FLAG_<letters>` (`FLAG_dluy`: ban, rcon, admin or menu access).
- A restriction `NAME:text` takes the rest of the line, spaces and all, as its text; names before it are restrictions of their own.
- Closing a menu because another opens over it tells the close callbacks its name.
- A locked menu greys out the items of any menu, not only list rows.
- `mc_show_menu` of a section nobody registered reads it from the file.
- `isCritical` of `mc_register_action` is accepted and does nothing.

- The menu file writes colours as tags (`!y`, `!r`, `!d`, `!w`, `!R`); a code there is warned of and left out. What a Pawn plugin gives — a native's title, item, placeholder value, list row or message — and the lang dictionaries keep their codes, read as the tags; `mc_get_menu_text` gives the text with codes.
- A flag of the menu file — `HIDE_BACK`, `HIDE_EXIT`, `LOCKED`, `GLOBAL` — is `YES` or `NO`; `true` or a number is warned of, with the word to write, and is `NO`.
- The placeholders are `%target%` and `%time%`; `%s` and `%TIME%` are left as written.
