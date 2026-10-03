/**
 * Menu Core — an opinionated way to create menus: from a menu file (INI, YAML
 * or JSON) or in code, with conditions, placeholders and lists. How to use it:
 * README.md.
 */
import { setConfigFile } from "./menus";
import { MenuCoreOptions } from "./types";

export * from "./menus";
export * from "./types";

export default defineModule<MenuCoreOptions>({
	meta: { name: "menu-core", configKey: "menus" },
	requires: ["@amxts/config-core"],
	imports: [{ from: "@amxts/menu-core", as: "menus" }],
	defaults: { file: "menu", fallback: "" },
	setup(options) {
		setConfigFile(options.file, options.fallback);
	},
});
