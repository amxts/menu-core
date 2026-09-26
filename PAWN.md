# Menu Core for Pawn plugins

[English](PAWN.md) | [Русский](PAWN.ru.md)

Menu Core serves the 29 natives of the original `menu_core.amxx` (`mc_register_action`, `mc_show_menu`, `mc_add_menu_item` and the rest) with the signatures of its `menu_core.inc`, so compiled `.amxx` plugins work unchanged. Replace `menu_core.amxx` with it: comment the old one out in `plugins.ini`.

Callbacks are named by their public function, and Menu Core calls them in the plugin that registered them.

The `include/menu_core.inc` shipped with the package differs from the original only in spelling, not in what a compiled plugin passes:

| Original | This package |
| --- | --- |
| `#define MP_LOCKED 0` … `MP_FILTER 7` | `enum MenuProperty { MP_LOCKED = 0, … }` |
| `property` in the three property natives | `MenuProperty:property` |
| `mc_get_menu_property_string(menuIdx, property, value[], len)` | `…, out[], len)` |
| `mc_add_list_text(Array:aItems, …)` | `mc_add_list_text(aItems, …)` |
| — | `mc_get_menu_text(id, out[], len)`: what the player's menu shows |

A plugin compiled against the new include gets a tag warning for a bare number where `MenuProperty:` is expected, and for an `Array:` passed to `mc_add_list_text`.

### Where it differs from the original `menu_core.amxx`

- No Pawn limits: names, titles and placeholders are as long as they are written, a menu keeps every item, the way back is as long as it gets, and a menu longer than 500 bytes is sent whole.
- `mc_get_menu_property_string(idx, MP_SECTION)` works; the original compared `MP_SECTION` (5) with 4.
- A condition filter applies wherever the condition is asked, as `menu_core.inc` says; the original applied it to restrictions only.
- A restriction's `message` is shown beside an item it greys out when the item has no message of its own; the original stored it and never showed it.
- Closing a menu because another opens over it tells the close callbacks its name; the original passed `""`.
- A locked menu greys out the items of any menu; the original greyed out only list rows.
- `mc_show_menu` of a section nobody registered reads it from the file.
- `isCritical` of `mc_register_action` is accepted and does nothing, as in the original.

