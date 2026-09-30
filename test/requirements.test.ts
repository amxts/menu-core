// When an item is shown and when it can be chosen, in a menu file: `visible`
// leaves an item out, and it takes no slot; `enabled` greys it out, and the
// first requirement that fails gives its message - its own, else the item's,
// else the one its restriction was registered with; `when` picks a variant.
// INI says the same with its columns - a condition greys out without a
// reason, a restriction with the message column - but cannot hide an item.
import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { setup } from "@amxts/core/test-utils";
import { menusOf } from "../testing";

setDefaultTimeout(120_000);

const CONFIGS = "addons/amxmodx/configs";

/** A shop in YAML: every way an item says when it is shown and when it can be chosen. */
const YAML = [
	"menus:",
	"  SHOP:",
	"    title: Shop",
	"    items:",
	"      - name: Heal",
	"        visible: IS_ALIVE",
	"        action: RUN",
	"      - name: AWP",
	"        enabled:",
	"          - when: LEVEL:5",
	"            message: Level 5 needed",
	"          - when: MONEY:4750",
	"            message: Not enough money",
	"        action: RUN",
	"      - name: Item's",
	"        enabled: [VIP]",
	"        message: Item message",
	"        action: RUN",
	"      - name: Own",
	"        enabled: [{ when: VIP, message: Own message }]",
	"        message: Item message",
	"        action: RUN",
	"      - name: Registered",
	"        enabled: VIP",
	"        action: RUN",
	"      - name: Silent",
	"        enabled: IS_BOT",
	"        action: RUN",
	"      - variants:",
	"          - { name: Join, when: TEAM_SPECTATOR, action: RUN }",
	"          - { name: Spectate, action: RUN }",
	"",
].join("\n");

/** The same shop in JSON. */
const JSON_TEXT = JSON.stringify({
	menus: {
		SHOP: {
			title: "Shop",
			items: [
				{ name: "Heal", visible: "IS_ALIVE", action: "RUN" },
				{ name: "AWP", enabled: [{ when: "LEVEL:5", message: "Level 5 needed" }, { when: "MONEY:4750", message: "Not enough money" }], action: "RUN" },
				{ name: "Item's", enabled: ["VIP"], message: "Item message", action: "RUN" },
				{ name: "Own", enabled: [{ when: "VIP", message: "Own message" }], message: "Item message", action: "RUN" },
				{ name: "Registered", enabled: "VIP", action: "RUN" },
				{ name: "Silent", enabled: "IS_BOT", action: "RUN" },
				{ variants: [{ name: "Join", when: "TEAM_SPECTATOR", action: "RUN" }, { name: "Spectate", action: "RUN" }] },
			],
		},
	},
}, null, 2);

/** Menu Core with the file, its names answered by a fake Pawn plugin: a player's level and money by id. */
async function boot(file: string, text: string, answers: { levels?: Record<number, number>; money?: Record<number, number> } = {}) {
	const server = await setup({ files: { [`${CONFIGS}/${file}`]: text } });
	const menus = menusOf(server);
	const chosen: number[] = [];
	const param = (name: string) => Number(name.slice(name.indexOf(":") + 1));
	const plugin = menus.pawnPlugin("myplugin.amxx", {
		Level: (id: number, name: string) => (answers.levels?.[id] ?? 0) >= param(name),
		Money: (id: number, name: string) => (answers.money?.[id] ?? 0) >= param(name),
		No: () => false,
		Run: (id: number) => { chosen.push(id); },
	});
	plugin.native("mc_register_restriction", "LEVEL", "Level");
	plugin.native("mc_register_restriction", "MONEY", "Money");
	plugin.native("mc_register_restriction", "VIP", "No", "VIP members only");
	plugin.native("mc_register_action", "RUN", "Run");
	const warnings = () => server.log.split("\n").filter(line => line.startsWith("warning: [MenuCore]"));
	return { server, menus, plugin, chosen, warnings };
}

describe.each([["menu.yaml", YAML], ["menu.json", JSON_TEXT]])("%s", (file, text) => {
	test("visible leaves an item out, and it takes no slot", async () => {
		const { server, menus, plugin, warnings } = await boot(file, text);
		const alive = server.join("Alive");
		const dead = server.join("Dead", { alive: false });
		plugin.native("mc_show_menu", alive.id, "SHOP");
		plugin.native("mc_show_menu", dead.id, "SHOP");
		server.advance(0);
		expect(warnings()).toEqual([]);
		expect(menus.screen(alive)!.text).toStartWith("Shop\n\n\\y[1]\\w Heal\n\\d[2] AWP");
		expect(menus.screen(dead)!.text).toStartWith("Shop\n\n\\d[1] AWP");
	});

	test("enabled: the first requirement that fails gives its message - its own, the item's, the registered one; with none, no reason", async () => {
		const { server, menus, plugin } = await boot(file, text);
		const alice = server.join("Alice");
		plugin.native("mc_show_menu", alice.id, "SHOP");
		expect(menus.screen(alice)!.text).toBe([
			"Shop",
			"",
			"\\y[1]\\w Heal",
			"\\d[2] AWP\\y Level 5 needed",
			"\\d[3] Item's\\y Item message",
			"\\d[4] Own\\y Own message",
			"\\d[5] Registered\\y VIP members only",
			"\\d[6] Silent",
			"\\y[7]\\w Spectate",
			"",
			"\\y[0]\\w Exit",
		].join("\n"));
		expect(menus.press(alice, 2)).toBe(false);
	});

	test("the requirements are asked in order: past the first, the second gives its message; past both, the item can be chosen", async () => {
		const levels: Record<number, number> = {};
		const money: Record<number, number> = {};
		const { server, menus, plugin, chosen } = await boot(file, text, { levels, money });
		const alice = server.join("Alice");
		levels[alice.id] = 5;
		plugin.native("mc_show_menu", alice.id, "SHOP");
		expect(menus.screen(alice)!.text).toContain("\\d[2] AWP\\y Not enough money");

		money[alice.id] = 5000;
		plugin.native("mc_refresh_menu", "SHOP");
		expect(menus.screen(alice)!.text).toContain("\\y[2]\\w AWP");
		menus.press(alice, 2);
		expect(chosen).toEqual([alice.id]);
	});

	test("when picks the variant: the first whose names hold", async () => {
		const { server, menus, plugin } = await boot(file, text);
		const spectator = server.join("Spec", { team: "SPECTATOR", alive: false });
		plugin.native("mc_show_menu", spectator.id, "SHOP");
		expect(menus.screen(spectator)!.text).toContain("\\y[6]\\w Join");
	});
});

describe("INI's columns", () => {
	const INI = [
		"[SHOP]",
		"TITLE = Shop",
		"ITEMS = {",
		"\t\"AWP\" \"\" \"\" \"RUN\" \"LEVEL:5\" \"Level 5 needed\"",
		"\t\"Registered\" \"\" \"\" \"RUN\" \"VIP\" \"\"",
		"\t\"Silent\" \"\" \"IS_BOT\" \"RUN\" \"\" \"\"",
		"\t\"Join|Spectate\" \"\" \"TEAM_SPECTATOR|\" \"RUN\" \"\" \"\"",
		"}",
		"",
	].join("\n");
	const SAME = [
		"menus:",
		"  SHOP:",
		"    title: Shop",
		"    items:",
		"      - { name: AWP, enabled: LEVEL:5, message: Level 5 needed, action: RUN }",
		"      - { name: Registered, enabled: VIP, action: RUN }",
		"      - { name: Silent, enabled: IS_BOT, action: RUN }",
		"      - variants:",
		"          - { name: Join, when: TEAM_SPECTATOR, action: RUN }",
		"          - { name: Spectate, action: RUN }",
		"",
	].join("\n");

	test("a condition greys out without a reason, a restriction with the message column - as enabled does in YAML", async () => {
		const screens: string[] = [];
		for (const [file, text] of [["menu.ini", INI], ["menu.yaml", SAME]]) {
			const { server, menus, plugin } = await boot(file, text);
			const alice = server.join("Alice");
			const spectator = server.join("Spec", { team: "SPECTATOR" });
			plugin.native("mc_show_menu", alice.id, "SHOP");
			plugin.native("mc_show_menu", spectator.id, "SHOP");
			screens.push(`${menus.screen(alice)!.text}\n---\n${menus.screen(spectator)!.text}`);
		}
		expect(screens[0]).toBe(screens[1]);
		expect(screens[0]).toStartWith("Shop\n\n\\d[1] AWP\\y Level 5 needed\n\\d[2] Registered\\y VIP members only\n\\d[3] Silent\n\\y[4]\\w Spectate\n");
		expect(screens[0]).toContain("\\y[4]\\w Join");
	});
});

describe("the keys a menu file had for it", () => {
	test("condition, restriction and a variant's or a filter's condition are unknown keys, with the one to write", async () => {
		const yaml = [
			"menus:",
			"  M:",
			"    title: M",
			"    items:",
			"      - { name: a, condition: IS_ALIVE, restriction: VIP, action: RUN }",
			"      - variants: [{ name: b, condition: IS_ALIVE, action: RUN }]",
			"      - { name: c, enabled: [{ condition: VIP, message: x }], action: RUN }",
			"  LIST_X:",
			"    title: X",
			"    filters: [{ condition: IS_ALIVE }]",
			"    view: { name: \"%name%\", condition: IS_ALIVE, visible: IS_ALIVE }",
			"",
		].join("\n");
		const { plugin, warnings } = await boot("menu.yaml", yaml);
		plugin.native("mc_register_menu", "M");
		const at = (line: number, column: number) => `warning: [MenuCore] ${CONFIGS}/menu.yaml:${line}:${column}`;
		expect(warnings()).toEqual([
			`${at(5, 20)}: unknown key "condition" in an item - did you mean "visible" or "enabled"?`,
			`${at(5, 41)}: unknown key "restriction" in an item - did you mean "enabled"?`,
			`${at(6, 31)}: unknown key "condition" in a variant - did you mean "when"?`,
			`${at(7, 32)}: unknown key "condition" in a requirement - did you mean "when"?`,
			`${at(7, 30)}: a requirement without "when"`,
			`${at(11, 29)}: unknown key "condition" in the view - did you mean "enabled"?`,
			`${at(11, 50)}: unknown key "visible" in the view`,
			`${at(10, 17)}: unknown key "condition" in a filter - did you mean "when"?`,
			`${at(10, 15)}: a filter without "when"`,
		]);
	});

	test("enabled of the wrong kind, a requirement that is neither a name nor an object", async () => {
		const yaml = "menus:\n  M:\n    title: M\n    items:\n      - { name: a, enabled: 5, action: RUN }\n      - { name: b, enabled: [true], action: RUN }\n";
		const { plugin, warnings } = await boot("menu.yaml", yaml);
		plugin.native("mc_register_menu", "M");
		expect(warnings()).toEqual([
			`warning: [MenuCore] ${CONFIGS}/menu.yaml:5:20: "enabled" is a name, a list of names or a list of { when, message }, not a number`,
			`warning: [MenuCore] ${CONFIGS}/menu.yaml:6:30: a requirement is a name or { when: ..., message: ... }, not true or false`,
		]);
	});
});
