// The same menus in menu.ini, menu.yaml and menu.json: what a player sees and
// what his keys do is the same whichever file the server has. Then the
// checks a menu file gets, in any format: keys and values that do not fit
// when it is read, names nobody registered once every plugin has started.
import type { PawnArray } from "../testing";
import { readFileSync } from "node:fs";
import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { setup } from "@amxts/core/test-utils";
import { menusOf } from "../testing";

setDefaultTimeout(120_000);

const CONFIGS = "addons/amxmodx/configs";
const FORMATS = ["menu.ini", "menu.yaml", "menu.json"];

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");

/** Menu Core with these files under configs/. */
async function boot(files: Record<string, string>) {
	const inConfigs = Object.fromEntries(Object.entries(files).map(([path, text]) => [`${CONFIGS}/${path}`, text]));
	const server = await setup({ files: inConfigs });
	const warnings = () => server.log.split("\n").filter(line => line.startsWith("warning: [MenuCore]")).map(line => line.slice("warning: [MenuCore] ".length));
	return { server, menus: menusOf(server), warnings };
}

/** The sample menus from one of the files, their names answered by a fake Pawn plugin. */
async function sample(file: string, answers: { spectators?: number[]; admins?: number[] } = {}) {
	const { server, menus, warnings } = await boot({ [file]: fixture(file) });
	const calls: string[] = [];
	const plugin = menus.pawnPlugin("myplugin.amxx", {
		IsSpectator: (id: number) => (answers.spectators ?? []).includes(id),
		IsAdmin: (id: number) => (answers.admins ?? []).includes(id),
		OnAction: (id: number, action: string) => { calls.push(`${id} ${action}`); },
		OnList: (id: number, target: number) => { calls.push(`${id} -> ${target}`); },
		DmStatus: (_id: number, _target: number, value: PawnArray) => { value.set("ON"); },
	});
	for (const section of ["MAIN_MENU", "ADMIN_MENU", "SETTINGS_MENU", "LIST_PLAYERS", "LIST_SPECTATORS"]) plugin.native("mc_register_menu", section);
	plugin.native("mc_register_condition", "IS_SPECTATOR", "IsSpectator");
	plugin.native("mc_register_condition", "IS_ADMIN", "IsAdmin");
	for (const action of ["RESET_SCORE", "JOIN_SPECTATE", "JOIN_TEAM", "TOGGLE_DM"]) plugin.native("mc_register_action", action, "OnAction");
	plugin.native("mc_register_action", "PLAYER_ACTION", "OnList");
	plugin.native("mc_register_placeholder", "dm_status", "DmStatus");
	return { server, menus, plugin, calls, warnings };
}

describe.each(FORMATS)("the sample menus from %s", (file) => {
	test("an items menu: [MAIN]'s words, a greyed item, a blank line, variants", async () => {
		const { server, menus, plugin, calls } = await sample(file, { spectators: [2] });
		menus.translate({ MY_MENU_EXIT: "Exit!", MY_MENU_MAIN_TITLE: "Main" });
		const alice = server.join("Alice");
		const spectator = server.join("Spec");
		expect(plugin.native("mc_show_menu", alice.id, "MAIN_MENU")).toBe(1);
		expect(menus.screen(alice)).toEqual({
			title: "MAIN_MENU",
			keys: [1, 3, 4, 0],
			text: "Main\n\n\\y[1]\\w MY_MENU_RESET_SCORE\n\\d[2] MY_MENU_ADMIN\n\\y[3]\\w MY_MENU_SETTINGS\n\n\\y[4]\\w MY_MENU_SPECTATE\n\n\n\n\n\\y[0]\\w Exit!",
		});

		plugin.native("mc_show_menu", spectator.id, "MAIN_MENU");
		expect(menus.screen(spectator)!.text).toContain("\\y[4]\\w MY_MENU_JOIN");
		menus.press(spectator, 4);
		menus.press(alice, 4);
		expect(calls).toEqual([`${spectator.id} JOIN_TEAM`, `${alice.id} JOIN_SPECTATE`]);
	});

	test("SHOW_<MENU>, ACTIVE_ON, a placeholder, Back, and HIDE_BACK", async () => {
		const { server, menus, plugin } = await sample(file, { admins: [1] });
		const admin = server.join("Admin", { flags: "d" });
		const player = server.join("Player");
		expect(plugin.native("mc_show_menu", player.id, "ADMIN_MENU")).toBe(0);

		plugin.native("mc_show_menu", admin.id, "MAIN_MENU");
		menus.press(admin, 2);
		const screen = menus.screen(admin)!;
		expect(screen.title).toBe("ADMIN_MENU");
		expect(screen.text).toContain("\\y[1]\\w MY_MENU_DM_MODE ON");
		expect(screen.text).toContain("\\y[2]\\w MY_MENU_SOLO_MODE %solo_status%");
		expect(screen.text).toContain("\\y[9]\\w Back");
		menus.press(admin, 9);
		expect(menus.screen(admin)!.text).not.toContain("Back");
	});

	test("list menus: a row per player, the action gets the row; a filter nobody passes says why", async () => {
		const { server, menus, plugin, calls } = await sample(file);
		const alice = server.join("Alice");
		const bob = server.join("Bob");
		plugin.native("mc_show_menu", alice.id, "LIST_PLAYERS");
		expect(menus.screen(alice)!.text).toBe("MY_MENU_PLAYERS_TITLE\n\n\\y[1]\\w Alice\n\\y[2]\\w Bob\n\n\n\n\n\n\n\\y[0]\\w Exit");
		menus.press(alice, 2);
		expect(calls).toEqual([`${alice.id} -> ${bob.id}`]);

		menus.translate({ MY_CHAT_PREFIX: "[Server]" });
		expect(plugin.native("mc_show_menu", alice.id, "LIST_SPECTATORS")).toBe(0);
		expect(alice.chat).toContain("[Server] MY_CHAT_NO_SPECTATORS");
	});

	test("the names the file uses are checked on the first frame: only the ones nobody registered", async () => {
		const { server, warnings } = await sample(file);
		expect(warnings()).toEqual([]);
		server.advance(0);
		const text = fixture(file);
		// Where a key's value is written: the key's line and column; an INI row's line.
		const where = (key: string, value: string) => {
			const needle = file.endsWith(".ini") ? `"${value}"` : [`"${key}": "${value}"`, `${key}: ${value}`, `${key}: "${value}"`].find(each => text.includes(each))!;
			const before = text.slice(0, text.indexOf(needle)).split("\n");
			const line = `${CONFIGS}/${file}:${before.length}`;
			return file.endsWith(".ini") ? line : `${line}:${before.at(-1)!.length + 1}`;
		};
		expect(warnings().sort()).toEqual([
			`${where("placeholder", "%solo_status%")}: ADMIN_MENU: the placeholder %solo_status% is not registered`,
			`${where("action", "TOGGLE_SOLO")}: ADMIN_MENU: the action "TOGGLE_SOLO" is not registered`,
			`${where("action", "TOGGLE_HIDE_KNIFE")}: SETTINGS_MENU: the action "TOGGLE_HIDE_KNIFE" is not registered`,
			`${where("action", "INPUT_FOV")}: SETTINGS_MENU: the action "INPUT_FOV" is not registered`,
			`${where("action", "SWAP")}: LIST_SPECTATORS: the action "SWAP" is not registered`,
		].sort());
	});
});
