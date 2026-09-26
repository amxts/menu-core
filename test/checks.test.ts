// What Menu Core says about a menu file, in any format: a key it does not
// know, a value of the wrong kind - when the file is read - and a name nobody
// registered, checked on the first frame, once every plugin, Pawn ones
// included, has registered its own. Each with the file and the line.
import { readFileSync } from "node:fs";
import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { setup } from "@amxts/core/test-utils";
import { menusOf } from "../testing";

setDefaultTimeout(120_000);

const CONFIGS = "addons/amxmodx/configs";

async function boot(files: Record<string, string>) {
	const inConfigs = Object.fromEntries(Object.entries(files).map(([path, text]) => [`${CONFIGS}/${path}`, text]));
	const server = await setup({ files: inConfigs });
	const menus = menusOf(server);
	const plugin = menus.pawnPlugin("myplugin.amxx", { Yes: () => true, Run: () => {} });
	const warnings = () => server.log.split("\n").filter(line => line.startsWith("warning: [MenuCore]")).map(line => line.slice("warning: [MenuCore] ".length));
	const errors = () => server.log.split("\n").filter(line => line.startsWith("error:"));
	return { server, menus, plugin, warnings, errors };
}

describe("the shape of a YAML or JSON menu file", () => {
	const YAML = [
		"chatPrefix: \"[Srv]\"",
		"lables: {}",
		"labels:",
		"  exit: Close",
		"  nxt: Next",
		"menus:",
		"  MAIN_MENU:",
		"    titel: Main",
		"    title: Main",
		"    hideBack: yes",
		"    time: soon",
		"    items:",
		"      - name: One",
		"        acton: RUN",
		"      - condition: IS_ALIVE",
		"      - name: [a, b]",
		"      - variants:",
		"          - name: A",
		"          - condition: X",
		"        name: B",
		"    view: { name: x }",
		"    fixedItems:",
		"      - { slot: 9, name: Nine }",
		"      - { slot: 7, name: Seven }",
		"  LIST_X:",
		"    title: List",
		"    items: []",
		"    filters: IS_ALIVE",
		"    view: { name: \"%name%\", placeholder: p }",
		"  NO_TITLE:",
		"    items: [{ name: a }]",
		"  NOT_A_MENU: 5",
		"",
	].join("\n");

	test("an unknown key with the one it may be, a value of the wrong kind, what a menu of its kind does not read", async () => {
		const { plugin, warnings } = await boot({ "menu.yaml": YAML });
		expect(plugin.native("mc_register_menu", "MAIN_MENU")).toBe(0);
		const at = (line: number, column: number) => `${CONFIGS}/menu.yaml:${line}:${column}`;
		expect(warnings()).toEqual([
			`${at(2, 1)}: unknown key "lables" in the menu file - did you mean "labels"?`,
			`${at(5, 3)}: unknown key "nxt" in "labels" - did you mean "next"?`,
			`${at(8, 5)}: unknown key "titel" in the menu "MAIN_MENU" - did you mean "title"?`,
			`${at(10, 5)}: "hideBack" is true or false, not text`,
			`${at(11, 5)}: "time" is a number, not text`,
			`${at(21, 5)}: "view" is for a list menu, whose name starts with LIST_`,
			`${at(14, 9)}: unknown key "acton" in an item - did you mean "action"?`,
			`${at(15, 9)}: an item without a name`,
			`${at(16, 9)}: "name" is text, not a list`,
			`${at(16, 9)}: an item without a name`,
			`${at(17, 9)}: an item with variants takes its name, condition and action from them`,
			`${at(19, 13)}: a variant without a name`,
			`${at(23, 9)}: "slot" is the item's key, 1 to 7`,
			`${at(27, 5)}: a list menu draws its rows with "view" - "items" is not read`,
			`${at(29, 29)}: unknown key "placeholder" in the view`,
			`${at(28, 5)}: "filters" is a list, not text`,
			`${at(30, 3)}: the menu "NO_TITLE" has no title`,
			`${at(32, 3)}: the menu "NOT_A_MENU" is an object: { title: ..., items: [...] }, not a number`,
		]);
	});

	test("the menu as it was read past what does not fit: the item with variants, the fixed item in its slot", async () => {
		const { server, menus, plugin } = await boot({ "menu.yaml": YAML });
		const alice = server.join("Alice");
		plugin.native("mc_show_menu", alice.id, "MAIN_MENU");
		expect(menus.screen(alice)!.text).toBe("Main\n\n\\y[1]\\w One\n\\y[2]\\w A\n\n\n\n\n\\y[7]\\w Seven\n\n\\y[0]\\w Close");
	});

	test("JSON is checked the same way", async () => {
		const { plugin, warnings } = await boot({ "menu.json": "{\n  \"menus\": {\n    \"M\": { \"title\": \"M\", \"locked\": 1, \"items\": [{ \"name\": \"a\", \"spaceAfter\": \"2\" }] }\n  }\n}\n" });
		plugin.native("mc_register_menu", "M");
		expect(warnings()).toEqual([
			`${CONFIGS}/menu.json:3:26: "locked" is true or false, not a number`,
			`${CONFIGS}/menu.json:3:64: "spaceAfter" is a number, not text`,
		]);
	});
});

describe("the shape of an INI menu file", () => {
	test("an unknown key in any case, a flag or a time that is not one, a menu without TITLE, ITEMS of a list menu", async () => {
		const ini = [
			"[MAIN]",
			"PREFIX = X",
			"KEY = {",
			"\tEXT = Close",
			"}",
			"[MAIN_MENU]",
			"TITLE = Main",
			"Hide_Bak = YES",
			"HIDE_EXIT = maybe",
			"TIME = soon",
			"ITEMS = {",
			"\t\"One\" \"\" \"\" \"RUN\" \"\" \"\" \"\"",
			"}",
			"[NO_TITLE]",
			"ITEMS = {",
			"\t\"One\"",
			"}",
			"[LIST_X]",
			"TITLE = X",
			"ITEMS = {",
			"\t\"a\"",
			"}",
			"FIXED_ITEMS = {",
			"\t\"8\" \"Eight\"",
			"}",
			"[OTHER]",
			"SOMETHING = else",
			"",
		].join("\n");
		const { plugin, warnings } = await boot({ "menu.ini": ini });
		plugin.native("mc_register_menu", "MAIN_MENU");
		expect(warnings()).toEqual([
			`${CONFIGS}/menu.ini:4: unknown key "EXT" in KEY - did you mean "EXIT"?`,
			`${CONFIGS}/menu.ini:8: unknown key "Hide_Bak" in [MAIN_MENU] - did you mean "HIDE_BACK"?`,
			`${CONFIGS}/menu.ini:9: HIDE_EXIT is YES or NO, not "maybe"`,
			`${CONFIGS}/menu.ini:10: TIME is a number of seconds, not "soon"`,
			`${CONFIGS}/menu.ini:14: [NO_TITLE] has no TITLE, so it is not a menu`,
			`${CONFIGS}/menu.ini:20: a list menu draws its rows with VIEW - ITEMS is not read`,
			`${CONFIGS}/menu.ini:24: the slot of a fixed item is its key, 1 to 7, not "8"`,
		]);
	});
});

describe("names nobody registered", () => {
	const YAML = [
		"menus:",
		"  MAIN_MENU:",
		"    title: \"%who% menu\"",
		"    activeOn: [IS_ALIVE, \"!IS_SPECTATR\"]",
		"    items:",
		"      - { name: Admin, action: SHOW_ADMN_MENU, restriction: \"ADMIN VIP:5\" }",
		"      - { name: Flags, condition: FLAG_abc, action: [RUN, CLOSE_MENU, SHOW_CODE_MENU] }",
		"      - { name: \"%hp% HP\", action: RUN_AWAY, restriction: LEVEL }",
		"  ADMIN_MENU:",
		"    title: Admin",
		"    onTimeout: CLOSE_MENUU",
		"    items: [{ name: a }]",
		"",
	].join("\n");

	test("are checked on the first frame - a Pawn plugin that registers after the file is read is heard", async () => {
		const { server, plugin, warnings } = await boot({ "menu.yaml": YAML });
		plugin.native("mc_register_menu", "MAIN_MENU");
		plugin.native("mc_register_condition", "IS_ALIVE", "Yes");
		plugin.native("mc_register_condition", "IS_SPECTATOR", "Yes");
		plugin.native("mc_register_action", "RUN", "Run");
		plugin.native("mc_register_placeholder", "hp", "Run");
		plugin.native("mc_create_menu", "CODE_MENU", "Code");
		expect(warnings()).toEqual([]);

		server.advance(0);
		const at = (line: number, column: number) => `${CONFIGS}/menu.yaml:${line}:${column}`;
		expect(warnings()).toEqual([
			`${at(3, 5)}: MAIN_MENU: the placeholder %who% is not registered`,
			`${at(4, 5)}: MAIN_MENU: the condition "IS_SPECTATR" is not registered - did you mean "IS_SPECTATOR"?`,
			`${at(6, 24)}: MAIN_MENU: SHOW_ADMN_MENU opens the menu "ADMN_MENU", which is not there - did you mean "ADMIN_MENU"?`,
			`${at(6, 48)}: MAIN_MENU: the restriction "VIP" is not registered`,
			`${at(8, 28)}: MAIN_MENU: the action "RUN_AWAY" is not registered`,
			`${at(8, 46)}: MAIN_MENU: the restriction "LEVEL" is not registered`,
			`${at(11, 5)}: ADMIN_MENU: the action "CLOSE_MENUU" is not registered - did you mean "CLOSE_MENU"?`,
		]);
	});

	test("a restriction \"*\" answers for every restriction", async () => {
		const { server, plugin, warnings } = await boot({ "menu.yaml": "menus:\n  M:\n    title: M\n    items: [{ name: a, restriction: [VIP, \"LEVEL:5\"] }]\n" });
		plugin.native("mc_register_restriction", "*", "Yes");
		server.advance(0);
		expect(warnings()).toEqual([]);
	});

	test("without a menu file there is nothing to say; with two, the first in order is read and the other named", async () => {
		const none = await boot({});
		none.server.advance(0);
		expect(none.warnings()).toEqual([]);

		const two = await boot({ "menu.ini": "[M]\nTITLE = INI\nITEMS = {\n\t\"a\"\n}\n", "menu.yaml": "menus:\n  M: { title: YAML, items: [{ name: a }] }\n" });
		const alice = two.server.join("Alice");
		two.plugin.native("mc_show_menu", alice.id, "M");
		expect(two.menus.screen(alice)!.text.startsWith("INI\n")).toBe(true);
		expect(two.errors()).toEqual([`error: [ConfigCore] ${CONFIGS}/menu: menu.ini, menu.yaml are all there - menu.ini is read; keep one of them`]);
	});
});

describe("the README's menu file", () => {
	const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8").replaceAll("\r\n", "\n");
	const section = readme.slice(readme.indexOf("## Menus in a file"));
	const block = (language: string) => section.slice(section.indexOf(`\`\`\`${language}\n`) + language.length + 4, section.indexOf("```", section.indexOf(`\`\`\`${language}\n`) + 3));

	test.each([["menu.yaml", "yaml"], ["menu.json", "jsonc"], ["menu.ini", "ini"]])("%s: read without a word, drawn as the others", async (file, language) => {
		const { server, menus, plugin, warnings } = await boot({ [file]: block(language) });
		for (const name of ["IS_ADMIN", "IS_SPECTATOR", "IS_ROUND_RUNNING"]) plugin.native("mc_register_condition", name, "Yes");
		for (const name of ["JOIN_SPECTATE", "JOIN_TEAM", "SWAP_WITH_SPECTATOR"]) plugin.native("mc_register_action", name, "Run");
		plugin.native("mc_create_menu", "ADMIN_MENU", "Admin");
		const alice = server.join("Alice", { flags: "d" });
		plugin.native("mc_show_menu", alice.id, "MAIN_MENU");
		server.advance(0);
		expect(warnings()).toEqual([]);
		expect(menus.screen(alice)!.text).toBe("MYPLUGIN_MENU_MAIN_TITLE\n\n\\y[1]\\w MYPLUGIN_MENU_MAIN_ADMIN\n\\y[2]\\w MYPLUGIN_MENU_MAIN_JOIN\n\n\n\n\n\n\n\\y[0]\\w Exit");
	});
});
