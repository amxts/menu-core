# Changelog

## v0.3.0

[compare changes](https://github.com/amxts/menu-core/compare/v0.2.1...v0.3.0)

### Summary

For amxts 0.3: needs `@amxts/core` 0.3 and `@amxts/config-core` 0.2 - `addActions` and `addPlaceholders` take several at once and `register` several names, which cross between plugins from 0.3 on. Pawn's `menu_core` files with an `[Основное]` section read as they do there.

### 🚀 Enhancements

- **menus:** Several menus, actions and placeholders at once ([8a9794c](https://github.com/amxts/menu-core/commit/8a9794c))
- **menus:** ADMIN and `ACCESS_ADMIN` built in ([5ef9c8a](https://github.com/amxts/menu-core/commit/5ef9c8a))

### 🩹 Fixes

- **menus:** The Pawn `menu_core`'s [Основное] is [MAIN] ([be951c2](https://github.com/amxts/menu-core/commit/be951c2))
- **menus:** Show the menu a player is on from its start ([c6afcaf](https://github.com/amxts/menu-core/commit/c6afcaf))

### 💅 Refactors

- `player.print`, not the free print ([2622715](https://github.com/amxts/menu-core/commit/2622715))

### 📖 Documentation

- A list menu's example that runs on every core ([ba519eb](https://github.com/amxts/menu-core/commit/ba519eb))

### ❤️ Contributors

- Ernest Manukyan ([@kukson777](https://github.com/kukson777))

## v0.2.1

[compare changes](https://github.com/amxts/menu-core/compare/v0.2.0...v0.2.1)

### Summary

Built for `@amxts/core` 0.2.2: the package's prebuilt plugin is compiled with that core, so a project on 0.2.2 takes it as it is instead of compiling the module on its first build. The module's API does not change.

### ⬆️ Upgrade guide

`npx amxts upgrade` in the project takes it with the core.

### 📦 Dependencies

| Package | Range |
| --- | --- |
| `@amxts/core` | `^0.2.0`, prebuilt for 0.2.2 |

### ❤️ Contributors

- Ernest Manukyan ([@kukson777](https://github.com/kukson777))

## v0.2.0

[compare changes](https://github.com/amxts/menu-core/compare/v0.1.0...v0.2.0)

### Summary

menu-core for amxts 0.2.0: every menu function takes the menu's context, items take one options object as the core's `Menu` does, and a menu stays open while its plugin reloads.

### ✨ Highlights

#### The menu's context

A title, `visible`, `enabled` and `onSelect` take one object, `{ player, target, row, menu }`:

```ts
const shop = menus.create("SHOP", { title: ({ player }) => `Shop - $${player.money}` });

shop.addItem({
	title: ({ player }) => `Heal (${player.health} HP)`,
	visible: ({ player }) => player.health < 100,
	onSelect: ({ player }) => {
		player.health = 100;
	},
});
```

In a list of players, `target` is the player of the row.

#### A menu kept through a reload

When the plugin that made a menu reloads - a save under `amxts dev`, `amxts_reload` - a player looking at the menu keeps it, on the same page, drawn from the new code. When the plugin is unloaded, its menus, items, placeholders and conditions go with it.

### ⚠️ Breaking changes

- Every function a menu takes gets the context object: `({ player }) => ...`, not `(player) => ...`.
- `addItem` takes one options object: `addItem({ title, onSelect })`, not `addItem("Title", { onSelect })`.
- Conditions registered by name keep their `(player, viewer, name)` arguments.

### ⬆️ Upgrade guide

`npx amxts upgrade` rewrites both: the functions to the context and `addItem` to its options. Files of menus (INI, YAML, JSON) do not change.

### 📦 Dependencies

| Package | From | To |
| --- | --- | --- |
| `@amxts/core` | `^0.1.0` | `^0.2.0` |
| `@amxts/config-core` | `^0.1.0` | `^0.1.1` |

### 🚀 Enhancements

- ⚠️  Every menu function takes the menu's context ([496431b](https://github.com/amxts/menu-core/commit/496431b))
- Keep a menu open through its plugin's reload ([1a3ab54](https://github.com/amxts/menu-core/commit/1a3ab54))

### 🩹 Fixes

- The plugin's version is the package's ([a646c2c](https://github.com/amxts/menu-core/commit/a646c2c))
- Drop what a stopped plugin gave the menus ([fa68648](https://github.com/amxts/menu-core/commit/fa68648))

### 💅 Refactors

- Import the core's API by its package name ([d838de0](https://github.com/amxts/menu-core/commit/d838de0))
- Command handlers take one object ([c6aa029](https://github.com/amxts/menu-core/commit/c6aa029))
- `server.players` over `Player.all` ([0a8c748](https://github.com/amxts/menu-core/commit/0a8c748))
- Admin right by its `lowerCamelCase` name ([13b2645](https://github.com/amxts/menu-core/commit/13b2645))
- Hear `putInServer` by its new name ([ac6243e](https://github.com/amxts/menu-core/commit/ac6243e))

### 📖 Documentation

- The player's money is `player.money` ([0e0f3ca](https://github.com/amxts/menu-core/commit/0e0f3ca))
- The Pawn natives without a plugin the reader never met ([d320b06](https://github.com/amxts/menu-core/commit/d320b06))
- The menu's context in the README ([ffe1920](https://github.com/amxts/menu-core/commit/ffe1920))
- The README without a status note ([ee841d7](https://github.com/amxts/menu-core/commit/ee841d7))

#### ⚠️ Breaking Changes

- ⚠️  Every menu function takes the menu's context ([496431b](https://github.com/amxts/menu-core/commit/496431b))

### ❤️ Contributors

- Ernest Manukyan ([@kukson777](https://github.com/kukson777))
