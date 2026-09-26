// Menu Core from TypeScript: the playground's plugins make their menus in
// code - a menu object with methods; a title, items and messages that are
// functions of the player; items shown, greyed out and chosen by functions; a
// list menu with a filter and a listener of its own.
import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { setup } from "@amxts/core/test-utils";
import { menusOf } from "../testing";

setDefaultTimeout(120_000);

async function playground() {
	const server = await setup({ rootDir: "playground" });
	return { server, menus: menusOf(server) };
}

describe("an items menu", () => {
	test("text is a function of the player; visible leaves an item out, enabled greys it out with its message, onSelect runs", async () => {
		const { server, menus } = await playground();
		const alice = server.join("Alice", { health: 40 });

		alice.say("/shop");
		expect(menus.screen(alice)!.text).toBe("Shop for Alice\n\n\\y[1]\\w Heal (40 HP)\n\\y[2]\\w Armor\n\n\\y[3]\\w Close\n\n\n\n\n\n\\y[0]\\w Exit");

		menus.press(alice, 1);
		expect(alice.health).toBe(100);
		expect(alice.chat).toContain("Healed");
		expect(menus.screen(alice)!.text).toBe("Shop for Alice\n\n\\y[1]\\w Armor\n\n\\y[2]\\w Close\n\n\n\n\n\n\n\\y[0]\\w Exit");

		menus.press(alice, 1);
		expect(alice.armor).toBe(100);
		expect(menus.screen(alice)!.text).toContain("\\d[1] Armor\\y (100 already)");
		expect(menus.press(alice, 1)).toBe(false);

		menus.press(alice, 2);
		expect(menus.screen(alice)).toBe(null);
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
