// Menu Core on the fake server, driven the way Pawn plugins drive it: the
// mc_* natives, a menu.ini, a player looking at the menus and pressing keys,
// and the callbacks Menu Core makes into Pawn plugins. What a menu should
// look like comes from menu_core.sma 1.6.2. The Pawn plugins here are fake
// ones from Menu Core's test kit: their publics are JavaScript, called through
// callfunc the way AMX Mod X calls them.
import type { PawnArray } from "../testing";
import { readFileSync } from "node:fs";
import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { setup } from "@amxts/core/test-utils";
import { menusOf } from "../testing";

setDefaultTimeout(120_000);

const CONFIGS = "addons/amxmodx/configs";

const MP_LOCKED = 0;
const MP_HIDE_BACK = 3;
const MP_HIDE_EXIT = 4;
const MP_SECTION = 5;
const MP_ON_TIMEOUT = 5;
const MP_ACTIVE_ON = 6;
const MP_FILTER = 7;

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");

/** Config Core and Menu Core on a server, with this menu.ini. */
async function boot(menu = fixture("menu.ini")) {
	const server = await setup({ files: { [`${CONFIGS}/menu.ini`]: menu } });
	return { server, menus: menusOf(server) };
}

/** The sample menus, with the conditions and actions they name answered by a fake Pawn plugin. */
async function sample(answers: { spectators?: number[]; admins?: number[] } = {}) {
	const { server, menus } = await boot();
	const calls: string[] = [];
	const plugin = menus.pawnPlugin("myplugin.amxx", {
		IsSpectator: (id: number) => (answers.spectators ?? []).includes(id),
		IsAdmin: (id: number) => (answers.admins ?? []).includes(id),
		OnAction: (id: number, action: string) => { calls.push(`${id} ${action}`); },
		OnList: (id: number, target: number) => { calls.push(`${id} -> ${target}`); },
		DmStatus: (id: number, target: number, value: PawnArray, len: number) => { value.set(`ON (${len})`); },
	});
	for (const section of ["MAIN_MENU", "ADMIN_MENU", "SETTINGS_MENU", "LIST_PLAYERS", "LIST_SPECTATORS"]) {
		plugin.native("mc_register_menu", section);
	}
	plugin.native("mc_register_condition", "IS_SPECTATOR", "IsSpectator");
	plugin.native("mc_register_condition", "IS_ADMIN", "IsAdmin");
	for (const action of ["RESET_SCORE", "JOIN_SPECTATE", "JOIN_TEAM", "TOGGLE_DM"]) plugin.native("mc_register_action", action, "OnAction");
	plugin.native("mc_register_action", "PLAYER_ACTION", "OnList");
	plugin.native("mc_register_placeholder", "dm_status", "DmStatus");
	return { server, menus, plugin, calls };
}

describe("the config", () => {
	test("the sample menu.ini: sections are menus, MAIN and the missing ones are not", async () => {
		const { menus } = await boot();
		const plugin = menus.pawnPlugin("a.amxx", {});
		expect(plugin.native("mc_register_menu", "MAIN_MENU")).toBe(0);
		expect(plugin.native("mc_register_menu", "ADMIN_MENU")).toBe(1);
		expect(plugin.native("mc_register_menu", "MAIN_MENU")).toBe(0);
		expect(plugin.native("mc_register_menu", "MAIN")).toBe(-1);
		expect(plugin.native("mc_register_menu", "NO_SUCH_MENU")).toBe(-1);
		expect(plugin.native("mc_register_menu", "LIST_SPECTATORS")).toBe(2);

		expect(plugin.native("mc_get_menu_property_string", 2, MP_SECTION)).toBe("LIST_SPECTATORS");
		expect(plugin.native("mc_get_menu_property_string", 2, 4)).toBe("LIST_SPECTATORS");
		expect(plugin.native("mc_get_menu_property_string", 2, MP_LOCKED)).toBe("");
		expect(plugin.native("mc_get_menu_property_string", 9, MP_SECTION)).toBe("");
	});

	test("a section without TITLE or without items is not a menu", async () => {
		const { menus } = await boot("[NO_TITLE]\nITEMS = {\n\t\"A\"\n}\n[EMPTY]\nTITLE = T\n");
		const plugin = menus.pawnPlugin("a.amxx", {});
		expect(plugin.native("mc_register_menu", "NO_TITLE")).toBe(-1);
		expect(plugin.native("mc_register_menu", "EMPTY")).toBe(-1);
	});

	test("[MAIN] labels: translated when a dictionary has the key, the built-in default when not", async () => {
		const { server, menus, plugin } = await sample();
		menus.translate({ MY_MENU_EXIT: "Выход", MY_MENU_NUMBER: "\\r%d.\\w", MY_MENU_MAIN_TITLE: "Главное меню" });
		const alice = server.join("Alice");
		plugin.native("mc_show_menu", alice.id, "MAIN_MENU");
		const text = menus.screen(alice)!.text;
		expect(text.startsWith("Главное меню\n\n\\r1.\\w MY_MENU_RESET_SCORE\n")).toBe(true);
		expect(text).toContain("\\d[2] MY_MENU_ADMIN"); // DISABLED: no such key - the default
		expect(text.endsWith("\n\\r0.\\w Выход")).toBe(true);
	});

	// Kept beside menu.ini for what that file does not have: rows that
	// leave out the spacing column, [MAIN] missing (its labels are the
	// defaults), and ACTIVE_ON answered from the admin's flags, no plugin
	// registering the condition.
	test("surf's menu.ini: rows of six columns, spacing, ACCESS_ADMIN from the admin's flags", async () => {
		const { server, menus } = await boot(fixture("surf-menu.ini"));
		const plugin = menus.pawnPlugin("surf.amxx", {});
		expect(plugin.native("mc_register_menu", "ZONE_ADMIN_MENU")).toBe(0);

		const player = server.join("Player");
		expect(plugin.native("mc_show_menu", player.id, "ZONE_ADMIN_MENU")).toBe(0); // ACTIVE_ON = ACCESS_ADMIN

		const admin = server.join("Admin", { flags: "l" }); // rcon
		expect(plugin.native("mc_show_menu", admin.id, "ZONE_ADMIN_MENU")).toBe(1);
		const { text, keys } = menus.screen(admin)!;
		expect(text).toContain("\\y[1]\\w SC_ZONE_ITEM_NAME %zone_name%\n\n\\y[2]\\w SC_ZONE_ITEM_POINT_A");
		expect(text).toContain("\\d[6] SC_ZONE_ITEM_SETTINGS"); // HAS_SELECTED_ZONE: nobody registered it
		expect(keys).toEqual([1, 2, 3, 4, 5, 7, 0]);
	});
});

describe("an items menu", () => {
	test("drawn as menu_core draws it: numbers, a greyed item, blank slots, Exit", async () => {
		const { server, menus, plugin } = await sample();
		const alice = server.join("Alice");
		expect(plugin.native("mc_show_menu", alice.id, "MAIN_MENU")).toBe(1);
		expect(menus.screen(alice)).toEqual({
			title: "MAIN_MENU",
			keys: [1, 3, 4, 0],
			text: [
				"MY_MENU_MAIN_TITLE",
				"",
				"\\y[1]\\w MY_MENU_RESET_SCORE",
				"\\d[2] MY_MENU_ADMIN", // IS_ADMIN does not hold
				"\\y[3]\\w MY_MENU_SETTINGS",
				"", // its spacing: "1"
				"\\y[4]\\w MY_MENU_SPECTATE",
				"",
				"",
				"",
				"", // slots 5-7, and before Exit
				"\\y[0]\\w Exit",
			].join("\n"),
		});
	});

	test("a key runs the action - an items menu hands it the action name - and the menu is drawn again", async () => {
		const { server, menus, plugin, calls } = await sample();
		const alice = server.join("Alice");
		plugin.native("mc_show_menu", alice.id, "MAIN_MENU");
		expect(menus.press(alice, 1)).toBe(true);
		expect(calls).toEqual([`${alice.id} RESET_SCORE`]);
		expect(menus.screen(alice)?.title).toBe("MAIN_MENU");
		expect(menus.press(alice, 2)).toBe(false); // greyed out: not a key of the menu
	});

	test("variants: the first whose condition holds is shown, and its action runs", async () => {
		const { server, menus, plugin, calls } = await sample({ spectators: [1] });
		const spectator = server.join("Spec");
		plugin.native("mc_show_menu", spectator.id, "MAIN_MENU");
		expect(menus.screen(spectator)!.text).toContain("\\y[4]\\w MY_MENU_JOIN");
		menus.press(spectator, 4);
		expect(calls).toEqual([`${spectator.id} JOIN_TEAM`]);
	});

	test("SHOW_<MENU> opens the next menu, 9 goes back, 0 closes; a placeholder is filled by its Pawn public", async () => {
		const { server, menus, plugin } = await sample({ admins: [1] });
		const closed: string[] = [];
		const watcher = menus.pawnPlugin("watcher.amxx", { OnClose: (id: number, section: string, timeout: number) => {
			closed.push(`${section} ${timeout}`);
		} });
		watcher.native("mc_register_menu_close_callback", "OnClose");

		const admin = server.join("Admin", { flags: "d" });
		plugin.native("mc_show_menu", admin.id, "MAIN_MENU");
		menus.press(admin, 2);

		const screen = menus.screen(admin)!;
		expect(screen.title).toBe("ADMIN_MENU");
		expect(screen.text).toContain("\\y[1]\\w MY_MENU_DM_MODE ON (255)");
		expect(screen.text).toContain("\\y[2]\\w MY_MENU_SOLO_MODE %solo_status%"); // nobody registered it
		expect(screen.text).toContain("\\y[9]\\w Back");
		expect(closed).toEqual(["MAIN_MENU 0"]); // one menu opening over another closes it

		menus.press(admin, 9);
		expect(menus.screen(admin)?.title).toBe("MAIN_MENU");
		expect(menus.screen(admin)!.text).not.toContain("Back"); // HIDE_BACK = YES

		menus.press(admin, 0);
		expect(menus.screen(admin)).toBe(null);
		expect(closed.at(-1)).toBe("MAIN_MENU 0");
	});

	test("items made by natives: a place, blank lines, a fixed slot, clearing", async () => {
		const { server, menus } = await boot();
		const plugin = menus.pawnPlugin("a.amxx", {});
		expect(plugin.native("mc_create_menu", "MADE", "Made")).toBe(1);
		expect(plugin.native("mc_create_menu", "MADE", "Again")).toBe(0);
		expect(plugin.native("mc_add_menu_item", "MADE", "Second")).toBe(1);
		expect(plugin.native("mc_add_menu_item", "MADE", "First", "", "", "", "", "", 0, 0, 1)).toBe(1);
		expect(plugin.native("mc_add_fixed_menu_item", "MADE", 3, "Fixed")).toBe(1);
		expect(plugin.native("mc_add_menu_item", "MADE", "")).toBe(0);
		expect(plugin.native("mc_add_menu_item", "NONE", "x")).toBe(0);

		const alice = server.join("Alice");
		plugin.native("mc_show_menu", alice.id, "MADE");
		expect(menus.screen(alice)!.text).toBe("Made\n\n\\y[1]\\w First\n\n\\y[2]\\w Second\n\\y[3]\\w Fixed\n\n\n\n\n\n\\y[0]\\w Exit");

		expect(plugin.native("mc_clear_menu_items", "MADE")).toBe(1);
		expect(plugin.native("mc_clear_menu_items", "NONE")).toBe(0);
		plugin.native("mc_refresh_menu", "MADE");
		expect(menus.screen(alice)!.keys).toEqual([0]);
	});

	test("restrictions: their own, \"*\", an action condition; the message beside the greyed item", async () => {
		const { server, menus } = await boot();
		const plugin = menus.pawnPlugin("a.amxx", {
			Vip: () => false,
			Any: (id: number, name: string) => name === "LEVEL:5",
			NoReset: (id: number, section: string, action: string) => !(section === "R" && action === "RESET"),
		});
		plugin.native("mc_create_menu", "R", "R");
		plugin.native("mc_add_menu_item", "R", "Vip", "", "", "", "VIP", "VIP:только VIP|X:нет");
		plugin.native("mc_add_menu_item", "R", "Level5", "", "", "", "LEVEL:5");
		plugin.native("mc_add_menu_item", "R", "Level6", "", "", "", "LEVEL:6", "уровень мал");
		plugin.native("mc_add_menu_item", "R", "Reset", "", "", "RESET", "", "ACTION_CONDITION:не сейчас");
		plugin.native("mc_register_restriction", "VIP", "Vip");
		plugin.native("mc_register_restriction", "*", "Any");
		plugin.native("mc_register_action_condition", "", "RESET", "NoReset");

		const alice = server.join("Alice");
		plugin.native("mc_show_menu", alice.id, "R");
		const text = menus.screen(alice)!.text;
		expect(text).toContain("\\d[1] Vip\\y только VIP");
		expect(text).toContain("\\y[2]\\w Level5");
		expect(text).toContain("\\d[3] Level6\\y уровень мал");
		expect(text).toContain("\\d[4] Reset\\y не сейчас");
	});

	test("a condition filter has the last say on a condition another plugin registered", async () => {
		const { server, menus, plugin } = await sample({ admins: [1] });
		const mix = menus.pawnPlugin("mix.amxx", { NoAdmins: () => false });
		mix.native("mc_register_condition_filter", "IS_ADMIN", "NoAdmins");
		const admin = server.join("Admin", { flags: "d" });
		plugin.native("mc_show_menu", admin.id, "MAIN_MENU");
		expect(menus.screen(admin)!.text).toContain("\\d[2] MY_MENU_ADMIN");
	});
});

describe("a list menu", () => {
	test("a row per player, seven a page: Next, Back, and the action gets the row's player", async () => {
		const { server, menus, plugin, calls } = await sample();
		const players = Array.from({ length: 10 }, (_, i) => server.join(`P${i + 1}`));
		const viewer = players[0];
		plugin.native("mc_show_menu", viewer.id, "LIST_PLAYERS");

		let screen = menus.screen(viewer)!;
		expect(screen.text.startsWith("MY_MENU_PLAYERS_TITLE \\y[\\r1\\y | \\y2\\y]\n\n\\y[1]\\w P1\n")).toBe(true);
		expect(screen.text).toContain("\\y[7]\\w P7\n\n\\y[8]\\w Next\n\n\n\\y[0]\\w Exit");
		expect(screen.keys).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);

		menus.press(viewer, 8);
		screen = menus.screen(viewer)!;
		expect(screen.text).toContain("\\y[\\r2\\y | \\y2\\y]");
		expect(screen.text).toContain("\\y[1]\\w P8\n\\y[2]\\w P9\n\\y[3]\\w P10\n");
		expect(screen.keys).toEqual([1, 2, 3, 9, 0]);

		menus.press(viewer, 2);
		expect(calls).toEqual([`${viewer.id} -> ${players[8].id}`]);

		menus.press(viewer, 9);
		expect(menus.screen(viewer)!.text).toContain("\\y[1]\\w P1");
	});

	test("filters leave rows out; with none left the menu does not open and the player is told why", async () => {
		const { server, menus, plugin } = await sample();
		const replace = menus.pawnPlugin("replace.amxx", { CanReplace: () => true });
		replace.native("mc_register_condition", "CAN_REPLACE", "CanReplace");
		const alice = server.join("Alice");

		expect(plugin.native("mc_show_menu", alice.id, "LIST_SPECTATORS")).toBe(0);
		expect(menus.screen(alice)).toBe(null);
		expect(alice.chat).toContain("[MenuCore]");
		expect(alice.chat).toContain("MY_CHAT_NO_SPECTATORS");
	});

	test("a data source: its rows, text lines, a row's own action and message, a fixed item", async () => {
		const { server, menus } = await boot();
		const chosen: string[] = [];
		const plugin = menus.pawnPlugin("shop.amxx", {
			Rows: (id: number, items: number) => {
				plugin.native("mc_add_list_text", items, "Оружие", true);
				menus.pushRow(items, { target: 28, text: "AK-47" });
				menus.pushRow(items, { target: 22, text: "M4A1", restriction: "VIP", message: "только VIP" });
				menus.pushRow(items, { target: 3, text: "Scout", action: "SPECIAL" });
				return 1;
			},
			Buy: (id: number, target: number) => { chosen.push(`buy ${target}`); },
			Special: (id: number, target: number) => { chosen.push(`special ${target}`); },
			Refund: (id: number, target: number) => { chosen.push(`refund ${target}`); },
			Vip: () => false,
		});
		plugin.native("mc_create_menu", "LIST_SHOP", "Магазин");
		plugin.native("mc_add_menu_item", "LIST_SHOP", "%name%", "", "", "BUY");
		plugin.native("mc_add_fixed_menu_item", "LIST_SHOP", 7, "Вернуть", "", "REFUND");
		plugin.native("mc_register_list_data_source", "LIST_SHOP", "Rows");
		plugin.native("mc_register_action", "BUY", "Buy");
		plugin.native("mc_register_action", "SPECIAL", "Special");
		plugin.native("mc_register_action", "REFUND", "Refund");
		plugin.native("mc_register_restriction", "VIP", "Vip");

		const alice = server.join("Alice");
		expect(plugin.native("mc_show_menu", alice.id, "LIST_SHOP", -1, 5)).toBe(1);
		expect(menus.screen(alice)!.text).toBe([
			"Магазин",
			"",
			`${" ".repeat(18)}Оружие`,
			"\\y[1]\\w AK-47",
			"\\d[2] M4A1\\y только VIP",
			"\\y[3]\\w Scout",
			"\\y[7]\\w Вернуть",
			"",
			"\\y[0]\\w Exit",
		].join("\n"));

		menus.press(alice, 1);
		menus.press(alice, 3);
		menus.press(alice, 7);
		expect(chosen).toEqual(["buy 28", "special 3", "refund 5"]);
	});
});

describe("countdowns", () => {
	test("a player's own: counted down in the menu, and at 0 the ON_TIMEOUT action, then closed", async () => {
		const { server, menus, plugin, calls } = await sample();
		const closed: string[] = [];
		const watcher = menus.pawnPlugin("w.amxx", { OnClose: (id: number, section: string, timeout: number) => {
			closed.push(`${section} ${timeout}`);
		} });
		watcher.native("mc_register_menu_close_callback", "OnClose");
		plugin.native("mc_set_menu_property_string", "SETTINGS_MENU", MP_ON_TIMEOUT, "RESET_SCORE");

		const alice = server.join("Alice");
		plugin.native("mc_show_menu", alice.id, "SETTINGS_MENU", 3);
		expect(menus.screen(alice)!.text).toContain("MY_MENU_SETTINGS_TITLE\nTime left \\y[\\r3 \\wsec\\y]\n\n");

		server.advance(1000);
		expect(menus.screen(alice)!.text).toContain("\\r2 \\wsec");
		// Another menu does not replace it while it counts...
		expect(plugin.native("mc_show_menu", alice.id, "MAIN_MENU")).toBe(0);

		server.advance(2000);
		expect(calls).toEqual([`${alice.id} RESET_SCORE`]);
		expect(menus.screen(alice)).toBe(null);
		expect(closed).toEqual(["SETTINGS_MENU 1"]);
	});

	test("a shared one: mc_set_menu_timer, no Exit while it runs, mc_menu_timer_expired at the end", async () => {
		const { server, menus, plugin } = await sample();
		const alice = server.join("Alice");
		const bob = server.join("Bob");
		plugin.native("mc_show_menu", alice.id, "SETTINGS_MENU");
		plugin.native("mc_show_menu", bob.id, "SETTINGS_MENU");

		expect(plugin.native("mc_set_menu_timer", "SETTINGS_MENU", 2)).toBe(1);
		expect(menus.screen(bob)!.text).toContain("\\r2 \\wsec");
		expect(menus.screen(bob)!.keys).toEqual([1, 2]);

		server.advance(1000);
		expect(menus.screen(alice)!.text).toContain("\\r1 \\wsec");
		server.advance(1000);
		expect(server.forwards).toContainEqual({ name: "mc_menu_timer_expired", args: ["SETTINGS_MENU"] });
		expect(menus.screen(alice)).toBe(null);
		expect(menus.screen(bob)).toBe(null);
		expect(plugin.native("mc_cancel_menu_timer", "SETTINGS_MENU")).toBe(0);
	});

	test("mc_cancel_menu_timer closes the menu for everyone", async () => {
		const { server, menus, plugin } = await sample();
		const alice = server.join("Alice");
		plugin.native("mc_show_menu", alice.id, "SETTINGS_MENU");
		plugin.native("mc_set_menu_timer", "SETTINGS_MENU", 30);
		expect(plugin.native("mc_cancel_menu_timer", "SETTINGS_MENU")).toBe(1);
		expect(menus.screen(alice)).toBe(null);
	});
});

describe("the rest of the natives", () => {
	test("open callbacks, a show filter that says no", async () => {
		const { server, menus, plugin } = await sample();
		const opened: string[] = [];
		let allow = true;
		const gate = menus.pawnPlugin("license.amxx", {
			OnOpen: (id: number, section: string) => { opened.push(section); },
			Gate: () => allow,
		});
		gate.native("mc_register_menu_open_callback", "OnOpen");
		gate.native("mc_register_show_filter", "Gate");
		const alice = server.join("Alice");

		expect(plugin.native("mc_show_menu", alice.id, "MAIN_MENU")).toBe(1);
		allow = false;
		expect(plugin.native("mc_show_menu", alice.id, "SETTINGS_MENU")).toBe(0);
		expect(opened).toEqual(["MAIN_MENU"]);
		expect(menus.screen(alice)?.title).toBe("MAIN_MENU");
	});

	test("the active menu, hiding it, a lock, the page", async () => {
		const { server, menus, plugin } = await sample();
		const alice = server.join("Alice");
		expect(plugin.native("mc_get_active_menu", alice.id)).toBe(-1);
		plugin.native("mc_show_menu", alice.id, "MAIN_MENU");
		expect(plugin.native("mc_get_active_menu", alice.id)).toBe(0);
		expect(plugin.native("mc_get_active_menu", 30)).toBe(-1);

		plugin.native("mc_lock_menu", alice.id);
		expect(plugin.native("mc_is_menu_locked", alice.id)).toBe(true);
		plugin.native("mc_refresh_menu", "MAIN_MENU");
		expect(menus.screen(alice)!.keys).toEqual([0]); // nothing to choose
		expect(plugin.native("mc_show_menu", alice.id, "SETTINGS_MENU")).toBe(0);
		expect(plugin.native("mc_show_menu", alice.id, "SETTINGS_MENU", -1, 0, false, true)).toBe(1); // forceOpen
		expect(plugin.native("mc_is_menu_locked", alice.id)).toBe(false);

		plugin.native("mc_hide_menu", alice.id);
		expect(menus.screen(alice)).toBe(null);
		expect(plugin.native("mc_get_active_menu", alice.id)).toBe(-1);

		const players = Array.from({ length: 9 }, (_, i) => server.join(`P${i}`));
		plugin.native("mc_show_menu", alice.id, "LIST_PLAYERS");
		plugin.native("mc_set_menu_page", alice.id, 1);
		plugin.native("mc_refresh_menu", "LIST_PLAYERS");
		expect(menus.screen(alice)!.text).toContain(`\\y[1]\\w ${players[6].name}`);
	});

	test("menu properties: hidden buttons, ACTIVE_ON, a filter added in code", async () => {
		const { server, menus, plugin } = await sample();
		const alice = server.join("Alice");
		expect(plugin.native("mc_set_menu_property", "MAIN_MENU", MP_HIDE_EXIT, 1)).toBe(1);
		expect(plugin.native("mc_set_menu_property", "MAIN_MENU", 9, 1)).toBe(0);
		expect(plugin.native("mc_set_menu_property", "NONE", MP_HIDE_BACK, 1)).toBe(0);
		plugin.native("mc_show_menu", alice.id, "MAIN_MENU");
		expect(menus.screen(alice)!.keys).toEqual([1, 3, 4]);

		expect(plugin.native("mc_set_menu_property_string", "SETTINGS_MENU", MP_ACTIVE_ON, "IS_ADMIN")).toBe(1);
		expect(plugin.native("mc_show_menu", alice.id, "SETTINGS_MENU")).toBe(0);

		expect(plugin.native("mc_set_menu_property_string", "LIST_PLAYERS", MP_FILTER, "IS_SPECTATOR | NOBODY_WATCHES")).toBe(1);
		expect(plugin.native("mc_show_menu", alice.id, "LIST_PLAYERS")).toBe(0);
		expect(alice.chat).toContain("NOBODY_WATCHES");
	});

	test("mc_notify_condition_changed draws again the menus that use it; mc_refresh_menu counts", async () => {
		const admins: number[] = [];
		const { server, menus, plugin } = await sample({ admins });
		const alice = server.join("Alice", { flags: "d" });
		const bob = server.join("Bob");
		plugin.native("mc_show_menu", alice.id, "MAIN_MENU");
		plugin.native("mc_show_menu", bob.id, "MAIN_MENU");
		expect(menus.screen(alice)!.text).toContain("\\d[2]");

		admins.push(alice.id);
		plugin.native("mc_notify_condition_changed", "IS_ADMIN");
		expect(menus.screen(alice)!.text).toContain("\\y[2]\\w MY_MENU_ADMIN");
		expect(plugin.native("mc_refresh_menu", "MAIN_MENU SETTINGS_MENU")).toBe(2);
	});
});

describe("text", () => {
	test("a menu over 500 bytes reaches the player whole: ShowMenu pieces, then show_menu", async () => {
		const { server, menus } = await boot();
		const plugin = menus.pawnPlugin("a.amxx", {});
		const title = "Очень длинное меню для проверки";
		plugin.native("mc_create_menu", "LONG", title);
		for (let i = 1; i <= 7; i++) plugin.native("mc_add_menu_item", "LONG", `Пункт номер ${i} - довольно длинное название`);
		const alice = server.join("Alice");
		plugin.native("mc_show_menu", alice.id, "LONG");

		const text = menus.screen(alice)!.text;
		expect(new TextEncoder().encode(text).length).toBeGreaterThan(500);
		expect(text.startsWith(`${title}\n\n\\y[1]\\w Пункт номер 1`)).toBe(true);
		expect(text).toContain("\\y[7]\\w Пункт номер 7 - довольно длинное название\n");
		expect(text.endsWith("\\y[0]\\w Exit")).toBe(true);
		expect(menus.screen(alice)!.title).toBe("LONG");
	});

	test("%name%, %target% and %time%", async () => {
		const { server, menus } = await boot();
		const plugin = menus.pawnPlugin("a.amxx", {});
		plugin.native("mc_create_menu", "TARGET", "About %target%, %time% s");
		plugin.native("mc_add_menu_item", "TARGET", "Kick %s");
		const alice = server.join("Alice");
		const bob = server.join("Bob");
		plugin.native("mc_show_menu", alice.id, "TARGET", 10, bob.id);
		const text = menus.screen(alice)!.text;
		expect(text.startsWith("About Bob, 10 s\n\n")).toBe(true);
		expect(text).toContain("\\y[1]\\w Kick %s"); // an items menu fills its items for no target
	});
});
