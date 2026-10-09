// Menu Core from TypeScript: the playground's plugins make their menus in
// code - a menu object with methods; a title, items and messages that are
// functions of the menu's context; items shown, greyed out and chosen by
// functions; a list menu with a filter and a listener of its own, and one with
// rows of its own; and a plugin that stops: a menu of it someone looks at
// stays open through a reload and closes after an unload.
import { describe, expect, setDefaultTimeout, test } from "bun:test";
import type { FakeServer } from "@amxts/core/test-utils";
import { setup } from "@amxts/core/test-utils";
import { menusOf } from "../testing";

setDefaultTimeout(240_000);

async function playground() {
	const server = await setup({ rootDir: "playground" });
	return { server, menus: menusOf(server) };
}

describe("an items menu", () => {
	test("text is a function of the player; visible leaves an item out, enabled greys it out with its message, onSelect runs", async () => {
		const { server, menus } = await playground();
		const alice = server.join("Alice", { health: 40 });

		alice.say("/shop");
		expect(menus.screen(alice)!.text).toBe("Shop for Alice\n\n\\y[1]\\w Heal (40 HP)\n\\y[2]\\w Armor\n\\d[3] Helmet\\y (50 HP needed)\n\n\\y[4]\\w Close\n\n\n\n\n\\y[0]\\w Exit");

		menus.press(alice, 1);
		expect(alice.health).toBe(100);
		expect(alice.chat).toContain("Healed");
		expect(menus.screen(alice)!.text).toBe("Shop for Alice\n\n\\y[1]\\w Armor\n\\y[2]\\w Helmet\n\n\\y[3]\\w Close\n\n\n\n\n\n\\y[0]\\w Exit");

		menus.press(alice, 1);
		expect(alice.armor).toBe(100);
		expect(menus.screen(alice)!.text).toContain("\\d[1] Armor\\y (100 already)");
		expect(menus.press(alice, 1)).toBe(false);

		menus.press(alice, 3);
		expect(menus.screen(alice)).toBe(null);
	});

	test("a list of requirements: the first that fails gives its message; one without a message has the item's", async () => {
		const { server, menus } = await playground();
		const bob = server.join("Bob", { health: 40, armor: 100 });

		bob.say("/shop");
		expect(menus.screen(bob)!.text).toContain("\\d[3] Helmet\\y (50 HP needed)");
		menus.press(bob, 1);
		expect(menus.screen(bob)!.text).toContain("\\d[2] Helmet\\y (full)");
		expect(menus.press(bob, 2)).toBe(false);
	});

	test("activeWhen: a menu that does not open for a dead player", async () => {
		const { server, menus } = await playground();
		const carol = server.join("Carol", { alive: false });

		carol.say("/shop");
		expect(menus.screen(carol)).toBe(null);
	});
});

describe("a list menu", () => {
	test("a row per player the filter keeps; the item gets the row's player as its target", async () => {
		const { server, menus } = await playground();
		const alice = server.join("Alice");
		const bob = server.join("Bob");
		server.join("Carol", { alive: false });

		alice.say("/greet");
		const text = menus.screen(alice)!.text;
		expect(text).toContain("\\y[1]\\w Bob (100 HP)");
		expect(text).not.toContain("Carol");
		expect(text).not.toContain("Alice");

		menus.press(alice, 1);
		expect(bob.chat).toContain("Alice says hello");
	});

	test("with no row left it does not open, and says the filter's message", async () => {
		const { server, menus } = await playground();
		const alice = server.join("Alice");

		alice.say("/greet");
		expect(menus.screen(alice)).toBe(null);
		expect(alice.chat).toContain("Nobody to greet");
	});

	test("a list source's rows: the item's functions get the row's number", async () => {
		const { server, menus } = await playground();
		const alice = server.join("Alice");

		alice.say("/maps");
		const text = menus.screen(alice)!.text;
		expect(text).toContain("\\y[1]\\w de_dust2");
		expect(text).toContain("\\y[3]\\w de_nuke");

		menus.press(alice, 2);
		expect(alice.chat).toContain("You vote for de_inferno");
	});

	test("the menu's own listener hears it close when the time runs out", async () => {
		const { server, menus } = await playground();
		const alice = server.join("Alice");
		server.join("Bob");

		alice.say("/greet");
		expect(menus.screen(alice)!.text).toContain("\\r10 \\wsec");
		server.advance(10_000);
		expect(menus.screen(alice)).toBe(null);
		expect(alice.chat).toContain("Too slow");
	});
});

describe("a plugin that stops", () => {
	/** The playground's plugin of that file. */
	function pluginOf(server: FakeServer, file: string) {
		return server.plugins.find(plugin => plugin.source.endsWith(file))!;
	}

	/** How many times `part` is in `text`. */
	function count(text: string, part: string) {
		return text.split(part).length - 1;
	}

	test("reloaded, its menu stays open on the same page, drawn from the new load", async () => {
		const { server, menus } = await playground();
		const alice = server.join("Alice");
		const weapons = pluginOf(server, "weapons.ts");

		alice.say("/weapons");
		menus.press(alice, 8);
		const page = menus.screen(alice)!.text;
		expect(page).toContain("\\y[\\r2\\y | \\y2\\y]");
		expect(page).toContain("\\y[3]\\w Famas");

		server.unload(weapons);
		await server.load(weapons.source);
		server.advance(100);
		const text = menus.screen(alice)!.text;
		expect(text).toBe(page);
		expect(count(text, "Famas")).toBe(1);

		menus.press(alice, 3);
		expect(alice.chat).toContain("Bought Famas");
	});

	test("a key pressed before the next frame calls nothing", async () => {
		const { server, menus } = await playground();
		const alice = server.join("Alice");
		const weapons = pluginOf(server, "weapons.ts");

		alice.say("/weapons");
		server.unload(weapons);
		menus.press(alice, 1);
		expect(alice.chat).not.toContain("Bought");
		expect(menus.screen(alice)).not.toBe(null);
	});

	test("its countdown goes on through a reload", async () => {
		const { server, menus } = await playground();
		const alice = server.join("Alice");
		server.join("Bob");
		const players = pluginOf(server, "players.ts");

		alice.say("/greet");
		server.advance(3_000);
		expect(menus.screen(alice)!.text).toContain("\\r7 \\wsec");

		server.unload(players);
		await server.load(players.source);
		server.advance(100);
		expect(menus.screen(alice)!.text).toContain("\\r7 \\wsec");

		server.advance(7_000);
		expect(menus.screen(alice)).toBe(null);
		expect(alice.chat).toContain("Too slow");
	});

	test("unloaded, its menu closes on the next frame; loaded again, it makes the menu once and its functions are called in the new load", async () => {
		const { server, menus } = await playground();
		const alice = server.join("Alice", { health: 40 });
		const shop = pluginOf(server, "shop.ts");

		alice.say("/shop");
		expect(menus.screen(alice)).not.toBe(null);
		server.unload(shop);
		server.advance(100);
		expect(menus.screen(alice)).toBe(null);

		await server.load(shop.source);
		alice.say("/shop");
		expect(menus.screen(alice)!.text).toBe("Shop for Alice\n\n\\y[1]\\w Heal (40 HP)\n\\y[2]\\w Armor\n\\d[3] Helmet\\y (50 HP needed)\n\n\\y[4]\\w Close\n\n\n\n\n\\y[0]\\w Exit");
		menus.press(alice, 1);
		expect(alice.health).toBe(100);
		expect(alice.chat).toContain("Healed");
	});
});

describe("menus of the menu file, answered by name", () => {
	const MENU_INI = [
		"[Основное]",
		"KEY = {",
		"\tNUMBER = !r%d.",
		"}",
		"[CP_MENU]",
		"TITLE = Checkpoints",
		"ITEMS = {",
		"\t\"Save\" \"%saved%\" \"\" \"CP_SAVE\" \"\" \"\" \"\"",
		"\t\"Reset\" \"\" \"\" \"CP_RESET\" \"\" \"\" \"\"",
		"\t\"Where\" \"%menu%\" \"\" \"CP_WHERE\" \"\" \"\" \"\"",
		"}",
		"[CP_MORE]",
		"TITLE = More",
		"ITEMS = {",
		"\t\"Back\" \"\" \"\" \"SHOW_CP_MENU\" \"\" \"\" \"\"",
		"}",
		"[SETTINGS]",
		"SOUND = 1",
		"",
	].join("\r\n");

	async function checkpoints() {
		const server = await setup({ rootDir: "playground", files: { "addons/amxmodx/configs/menu.ini": MENU_INI } });
		return { server, menus: menusOf(server) };
	}

	test("several names, several actions and placeholders at once - of the player or of the context; the Pawn module's [Основное] is [MAIN]", async () => {
		const { server, menus } = await checkpoints();
		const alice = server.join("Alice");

		alice.say("/cp");
		expect(menus.screen(alice)!.text).toStartWith("Checkpoints\n\n\\r1. Save 0\n\\r2. Reset\n\\r3. Where CP_MENU\n");
		menus.press(alice, 1);
		alice.command("cp");
		expect(menus.screen(alice)!.text).toContain("\\r1. Save 1");
		menus.press(alice, 3);
		expect(alice.chat).toContain("You are in CP_MENU");
		alice.say("/cp");
		menus.press(alice, 2);
		alice.say("/cp");
		expect(menus.screen(alice)!.text).toContain("\\r1. Save 0");
	});

	test("a section that is no menu is said, not skipped quietly", async () => {
		const { server } = await checkpoints();
		expect(server.log).toContain("[SETTINGS] is not a menu: it has no TITLE, ITEMS or VIEW");
	});
});
