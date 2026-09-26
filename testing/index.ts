// Menu Core's test kit: the fake server's side of menus - what show_menu
// puts on a player's screen, the keys he presses, and Pawn plugins that Menu
// Core calls back through callfunc. The fake server installs it before Menu
// Core's plugin loads (package.json, "amxts".testing); a test reaches it with
// menusOf(server):
//
//   import { setup } from "@amxts/core/test-utils";
//   import { menusOf } from "@amxts/menu-core/testing";
//
//   const server = await setup();
//   const menus = menusOf(server);
//   const admin = menus.pawnPlugin("admin.amxx", {
//     IsAdmin: (id: number) => id === 1,
//     OnKick: (id: number, target: number) => kicked.push(target),
//   });
//   admin.native("mc_register_action", "KICK", "OnKick");
//   const alice = server.join("Alice");
//   admin.native("mc_show_menu", alice.id, "ADMIN_MENU");
//   menus.screen(alice)?.text;                           // what he sees
//   menus.press(alice, 1);                               // key 1
//
// callfunc is played the way the amxts module and AMX Mod X play it: the host
// plugin's heap is a map of cells here; a public of the host (a TypeScript
// plugin's publicFor) gets its strings and arrays as addresses on it, and the
// module's callfunc_buffer copies an array back into the plugin after
// callfunc_end.
import type { ArgValue, FakePlayer, FakeServer, Memory, Native, NativeCall, NativeResult, PluginInstance } from "@amxts/core/test-utils";
import { defineTestKit } from "@amxts/core/test-utils";

/** The host plugin's id: what caller() is for a TypeScript plugin calling a native. */
export const HOST_PLUGIN = 0;

/** What a player's screen shows. */
export interface MenuScreen {
	text: string;
	/** Keys that answer: 1-9 and 0. */
	keys: number[];
	/** The title show_menu was given - the menu's name. */
	title: string;
}

/** An array a Pawn public was handed: its cells, and as text. */
export class PawnArray {
	constructor(public cells: number[]) {}

	get text(): string {
		const end = this.cells.indexOf(0);
		return new TextDecoder().decode(Uint8Array.from(this.cells.slice(0, end < 0 ? this.cells.length : end).map(c => c & 0xFF)));
	}

	/** Fills it as formatex(value, charsmax(value), ...) would. */
	set(text: string): void {
		const bytes = [...new TextEncoder().encode(text)].slice(0, this.cells.length - 1);
		for (const [i, b] of bytes.entries()) this.cells[i] = b;
		this.cells[bytes.length] = 0;
	}
}

// A test's Pawn public takes numbers, strings and PawnArrays, whatever it declares.
type PawnPublic = (...args: any[]) => number | boolean | void;

/** A Pawn plugin in a test: its publics, and natives called on its behalf. */
export class FakePawnPlugin {
	constructor(readonly kit: MenuKit, readonly id: number, readonly file: string, readonly publics: Record<string, PawnPublic>) {}

	/** An exported native, called as this plugin: caller() is its id. */
	native(name: string, ...args: ArgValue[]): NativeResult {
		return this.kit.as(this.id, () => this.kit.server.native(name, ...args));
	}
}

interface IntParam { kind: "int"; value: number }
interface CellsParam { kind: "string" | "array"; cells: number[]; from: number; copyback: boolean; at: number; into?: { memory: Memory; pointer: number } }
type Param = IntParam | CellsParam;

interface Pending {
	plugin: number;
	func: number;
	params: Param[];
}

/** Where the host heap starts: an address like any other in the AMX's data. */
const HEAP_BASE = 0x4000;
/** Function ids of host publics (__amxts_cb<n>) - distinct from a fake plugin's. */
const HOST_FUNCS = 100000;

const kits = new WeakMap<FakeServer, MenuKit>();

export class MenuKit {
	/** The dictionary GetLangTransKey and LookupLangKey answer from: key -> text. */
	readonly dictionary = new Map<string, string>();
	readonly plugins: FakePawnPlugin[] = [];
	/** Who is calling a native right now; the host unless a FakePawnPlugin is. */
	caller = HOST_PLUGIN;

	readonly heap = new Map<number, number>();
	hea = HEAP_BASE;
	pending: Pending | null = null;

	readonly menuIds = new Map<string, number>();
	readonly menuCommands = new Map<number, string[]>();
	readonly screens = new Map<number, MenuScreen>();
	/** ShowMenu messages marked "more", waiting for the rest. */
	readonly chunks = new Map<number, string>();

	constructor(readonly server: FakeServer) {}

	/** A Pawn plugin whose publics menu_core may call. */
	pawnPlugin(file: string, publics: Record<string, PawnPublic>): FakePawnPlugin {
		const plugin = new FakePawnPlugin(this, this.plugins.length + 1, file, publics);
		this.plugins.push(plugin);
		return plugin;
	}

	/** Translations, as a dictionary file registers them. */
	translate(entries: Record<string, string>): void {
		for (const [key, text] of Object.entries(entries)) this.dictionary.set(key, text);
	}

	/** What the player sees; null when no menu is up. */
	screen(player: FakePlayer): MenuScreen | null {
		const shown = this.screens.get(player.id);
		return shown && shown.keys.length > 0 ? shown : null;
	}

	/** Presses a key, 1-9 or 0. False when the menu does not take it - it is not on the screen. */
	press(player: FakePlayer, key: number): boolean {
		const shown = this.screens.get(player.id);
		if (!shown || !shown.keys.includes(key)) return false;
		const index = key === 0 ? 9 : key - 1;
		for (const name of this.menuCommands.get(this.menuIds.get(shown.title) ?? -1) ?? []) {
			const slot = this.server.slotByPublic(name);
			this.server.withCallArgs([player.id, index], () => this.server.call(slot, [player.id, index], slot.fallback));
		}
		return true;
	}

	/** `body` with caller() answering `id`. */
	as<T>(id: number, body: () => T): T {
		const previous = this.caller;
		this.caller = id;
		try {
			return body();
		} finally {
			this.caller = previous;
		}
	}

	/** An item for a list data source's Array:, as a Pawn plugin fills one: 289 cells. */
	pushRow(handle: number, row: { target: number; action?: string; text: string; restriction?: string; message?: string }): void {
		const cells = [row.target, ...field(row.action ?? "", 64), ...field(row.text, 64), ...field(row.restriction ?? "", 32), ...field(row.message ?? "", 128)];
		this.server.cellArrays.get(handle)?.items.push(cells);
	}

	heapCells(at: number, count: number): number[] {
		return Array.from({ length: count }, (_, i) => this.heap.get(at + i * 4) ?? 0);
	}

	writeHeap(at: number, cells: number[]): void {
		cells.forEach((cell, i) => this.heap.set(at + i * 4, cell));
	}
}

function field(text: string, cells: number): number[] {
	const bytes = [...new TextEncoder().encode(text)].slice(0, cells - 1);
	return [...bytes, ...Array.from<number>({ length: cells - bytes.length }).fill(0)];
}

/** A Pawn string as the module copies it: up to 511 cells, then the zero. */
function stringCells(memory: Memory, at: number): number[] {
	if (!at) return [0];

	const cells: number[] = [];
	for (let i = 0; i < 511; i++) {
		const cell = memory.cell(at + i * 4);
		if (cell === 0) break;
		cells.push(cell);
	}
	return [...cells, 0];
}

function textOf(cells: number[]): string {
	return new PawnArray(cells).text;
}

/** The kit of the server a native runs on. */
function kitOf(call: NativeCall): MenuKit {
	return menusOf(call.server);
}

/** callfunc's push: onto the host heap for this native's length, and remembered. */
function pushCells(call: NativeCall, kind: "string" | "array", pointer: number, size: number, copyback: number): number {
	const kit = kitOf(call);
	if (!kit.pending) return 0;
	const at = kit.hea;
	const copied = stringCells(call.memory, pointer);
	kit.writeHeap(at, [...copied, 0]);
	const cells = kind === "array" ? kit.heapCells(at, size) : copied;
	kit.pending.params.push({ kind, cells, from: at, copyback: copyback !== 0, at: 0 });
	return 1;
}

/** callfunc_end on a public of the host plugin: its arrays go onto the host heap, and it runs as a callback. */
function endOnHost(kit: MenuKit, pending: Pending): number {
	const slot = kit.server.slots[pending.func - HOST_FUNCS];
	if (!slot) return 0;
	const mark = kit.hea;
	for (const param of [...pending.params].reverse()) {
		if (param.kind === "int") continue;
		param.at = kit.hea;
		kit.writeHeap(param.at, param.cells);
		kit.hea += param.cells.length * 4;
	}
	const args = pending.params.map(p => p.kind === "int" ? p.value : p.at);
	try {
		return kit.server.withCallArgs(args, () => kit.server.call(slot, args.slice(0, 4), slot.fallback));
	} finally {
		for (const param of pending.params) {
			if (param.kind === "int" || !param.copyback) continue;
			const cells = kit.heapCells(param.at, param.cells.length);
			if (param.into) cells.forEach((cell, i) => param.into!.memory.setCell(param.into!.pointer + i * 4, cell));
			else kit.writeHeap(param.from, cells);
		}
		kit.hea = mark;
	}
}

/** callfunc_end on a fake Pawn plugin's public. */
function endOnPlugin(kit: MenuKit, pending: Pending): number {
	const plugin = kit.plugins.find(p => p.id === pending.plugin);
	const name = plugin ? Object.keys(plugin.publics)[pending.func] : undefined;
	if (!plugin || name === undefined) return 0;

	const args = pending.params.map(p => p.kind === "int" ? p.value : p.kind === "string" ? textOf(p.cells) : new PawnArray([...p.cells]));
	const result = kit.as(plugin.id, () => plugin.publics[name](...args));
	pending.params.forEach((param, i) => {
		if (param.kind !== "array" || !param.copyback) return;
		const cells = (args[i] as PawnArray).cells;
		if (param.into) cells.forEach((cell, k) => param.into!.memory.setCell(param.into!.pointer + k * 4, cell));
		else kit.writeHeap(param.from, cells);
	});
	return typeof result === "boolean" ? +result : typeof result === "number" ? result | 0 : 0;
}

const MENU_NATIVES: Record<string, Native> = {
	register_menuid: (c, [name]) => {
		const kit = kitOf(c);
		const title = c.memory.text(name);
		if (!kit.menuIds.has(title)) kit.menuIds.set(title, kit.menuIds.size + 1);
		return kit.menuIds.get(title);
	},
	register_menucmd: (c, [menuId, _keys, fn]) => {
		const kit = kitOf(c);
		const list = kit.menuCommands.get(menuId) ?? [];
		list.push(c.memory.text(fn));
		kit.menuCommands.set(menuId, list);
		return 1;
	},
	show_menu: (c, [id, keys, text, _time, title]) => {
		const kit = kitOf(c);
		const head = kit.chunks.get(id) ?? "";
		kit.chunks.delete(id);
		const pressable = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].filter(key => keys & (1 << (key === 0 ? 9 : key - 1)));
		kit.screens.set(id, { text: head + c.memory.text(text), keys: pressable, title: c.memory.text(title) });
		return 1;
	},

	GetLangTransKey: (c, [key]) => {
		const kit = kitOf(c);
		const index = [...kit.dictionary.keys()].indexOf(c.memory.text(key));
		return index;
	},
	LookupLangKey: (c, [out, size, key]) => {
		const text = kitOf(c).dictionary.get(c.memory.text(key)) ?? "";
		return c.memory.setText(out, size, text);
	},

	get_func_id: (c, [name, pluginId]) => {
		const kit = kitOf(c);
		const text = c.memory.text(name);
		if (pluginId === -1 || pluginId === HOST_PLUGIN) {
			const match = text.match(/^__amxts_cb(\d+)$/);
			return match && kit.server.slots[Number(match[1])] ? HOST_FUNCS + Number(match[1]) : -1;
		}
		const plugin = kit.plugins.find(p => p.id === pluginId);
		return plugin ? Object.keys(plugin.publics).indexOf(text) : -1;
	},
	callfunc_begin_i: (c, [func, plugin]) => {
		const kit = kitOf(c);
		const target = plugin === -1 ? HOST_PLUGIN : plugin;
		if (func < 0) return -2;
		kit.pending = { plugin: target, func, params: [] };
		return 1;
	},
	callfunc_push_int: (c, [value]) => {
		kitOf(c).pending?.params.push({ kind: "int", value });
		return 1;
	},
	callfunc_push_str: (c, [text, copyback]) => pushCells(c, "string", text, 0, copyback),
	callfunc_push_array: (c, [array, size, copyback]) => pushCells(c, "array", array, size, copyback),
	callfunc_end: (c) => {
		const kit = kitOf(c);
		const pending = kit.pending;
		kit.pending = null;
		if (!pending) return 0;
		return pending.plugin === HOST_PLUGIN ? endOnHost(kit, pending) : endOnPlugin(kit, pending);
	},
};

/**
 * Menus and callfunc on this server: menu natives, fake Pawn plugins, a
 * dictionary. Before the plugins load - the fake server does it when Menu
 * Core's plugin loads, and setup() for every server; once per server.
 */
export function installMenus(server: FakeServer): MenuKit {
	const known = kits.get(server);
	if (known) return known;
	const kit = new MenuKit(server);
	kits.set(server, kit);

	// A ShowMenu message is a menu's text in pieces, the last one shown with show_menu.
	server.messageListeners.push((message) => {
		if (message.name !== "ShowMenu") return;
		const text = message.args.filter((arg): arg is string => typeof arg === "string").join("");
		kit.chunks.set(message.player, (kit.chunks.get(message.player) ?? "") + text);
	});

	for (const [name, native] of Object.entries(MENU_NATIVES)) server.defineNative(name, native);

	const bridge = server.bridge as Record<string, (...args: any[]) => any>;
	const argArray = bridge.arg_array;
	const argText = bridge.arg_text;
	const setArgText = bridge.set_arg_text;

	// A cell that is a number where an array is read is an address on the
	// host heap: a host public called through callfunc is handed those.
	bridge.arg_array = function (this: FakeServer, plugin: PluginInstance, index: number, out: number, count: number) {
		const value = this.callArgs?.[index];
		if (typeof value !== "number") return argArray.call(this, plugin, index, out, count);
		kit.heapCells(value, count).forEach((cell, i) => plugin.memory.setCell(out + i * 4, cell));
		return count;
	};
	bridge.arg_text = function (this: FakeServer, plugin: PluginInstance, index: number, out: number, max: number) {
		const value = this.callArgs?.[index];
		if (typeof value !== "number" || value < HEAP_BASE) return argText.call(this, plugin, index, out, max);
		return plugin.memory.setBytes(out, max, textOf(kit.heapCells(value, 512)));
	};
	bridge.set_arg_text = function (this: FakeServer, plugin: PluginInstance, index: number, text: number, max: number) {
		const value = this.callArgs?.[index];
		if (typeof value !== "number" || value < HEAP_BASE) return setArgText.call(this, plugin, index, text, max);
		const cells = field(plugin.memory.string(text), max + 1);
		kit.writeHeap(value, cells);
		return cells.indexOf(0);
	};
	bridge.caller = () => kit.caller;

	// The module's callfunc_text / callfunc_buffer / callfunc_finish: arguments
	// that stay until callfunc_end, an array copied back into the plugin.
	bridge.callfunc_text = function (this: FakeServer, plugin: PluginInstance, text: number) {
		if (!kit.pending) return 0;
		const cells = [...new TextEncoder().encode(plugin.memory.string(text)), 0];
		kit.pending.params.push({ kind: "string", cells, from: 0, copyback: false, at: 0 });
		return 1;
	};
	bridge.callfunc_buffer = function (this: FakeServer, plugin: PluginInstance, pointer: number, count: number) {
		if (!kit.pending) return 0;
		const cells = Array.from({ length: count }, (_, i) => plugin.memory.cell(pointer + i * 4));
		kit.pending.params.push({ kind: "array", cells, from: 0, copyback: true, at: 0, into: { memory: plugin.memory, pointer } });
		return 1;
	};
	bridge.callfunc_finish = function (this: FakeServer) {
		const pending = kit.pending;
		kit.pending = null;
		if (!pending) return 0;
		return pending.plugin === HOST_PLUGIN ? endOnHost(kit, pending) : endOnPlugin(kit, pending);
	};

	return kit;
}

/** The menus of a server Menu Core runs on - its test kit, installed before its plugin loaded. */
export function menusOf(server: FakeServer): MenuKit {
	const kit = kits.get(server);
	if (!kit) throw new Error("Menu Core's test kit is not on this server: load @amxts/menu-core (or call setup()) before asking for its menus");
	return kit;
}

export default defineTestKit({ install: installMenus });
