/**
 * Menu Core — an opinionated way to create menus: from an ini file or in code,
 * with conditions, placeholders and lists. How to use it: README.md.
 */
import { Access, accessOf, Forward, Player, clearInterval, print, server, setInterval } from "@amxts/core";
import { publicFor, showMenu } from "@amxts/core/kit";
import { GetLangTransKey, LookupLangKey, get_maxplayers, register_menucmd, register_menuid } from "~/natives";
import * as ini from "@amxts/config-core";
import { ActionHandler, ActionTest, ConditionFilter, ConditionTest, ListRow, ListSource, MenuCoreOptions, MenuEventType, MenuItemOptions, MenuKind, MenuOptions, MenuShowOptions, MenuText, PlaceholderValue, RestrictionTest, RowTest } from "./types";

import { ConditionEntry, ActionEntry, PlaceholderEntry, RestrictionEntry, ActionCheck, FilterEntry, SourceEntry, Viewer, Listing, Screen, Labels, MenuItem, Variant, addNamedFilter, stateOf, textOf } from "./internal";

export * from "./types";

export default defineModule<MenuCoreOptions>({
	meta: { name: "menu-core", configKey: "menus" },
	requires: ["@amxts/config-core"],
	defaults: { file: "menu", fallback: "" },
	setup(options) {
		setConfigFile(options.file, options.fallback);
	},
});

/**
 * A menu: read from menu.ini, or made with `create()`. The fields are what
 * menu.ini sets; the methods fill the menu, open it and count it down.
 *
 *     const shop = menus.create("SHOP", { title: "Shop" });
 *     shop.addItem("Heal", { onSelect: heal });
 *     shop.show(player);
 */
export class Menu {
	/** The menu's kind, one of "items" (a list of items) or "list" (a row per player, or per row of a list source). A name starting with LIST_ makes a list. */
	readonly kind: MenuKind;
	/** Hiding of the "Back" button: true leaves it out. */
	hideBack = false;
	/** Hiding of the "Exit" button: true leaves it out. */
	hideExit = false;
	/** A lock on the menu: while true, items cannot be chosen and no other menu replaces this one. */
	locked = false;
	/** One countdown for everyone looking at the menu (true), rather than one per player. */
	sharedTimer = false;
	/** Seconds on the countdown when the menu opens, e.g. 10; 0 for none. */
	time = 0;
	/** Action names run when the countdown ends, e.g. "CLOSE_MENU"; "" closes the menu. */
	onTimeout = "";
	/** Condition names the menu opens only under, space-separated, e.g. "IS_ALIVE !IS_SPECTATOR"; "" for always. */
	activeOn = "";
	/** Seconds left on the shared countdown; 0 while none runs. */
	countdown = 0;

	constructor(
		/** The menu's name - its section in menu.ini, e.g. "MAIN_MENU". */
		readonly name: string,
		/** The menu's title: the text - a lang key too - or a function that gives it for the player who looks. */
		public title: MenuText,
	) {
		this.kind = name.startsWith("LIST_") ? "list" : "items";
	}

	/**
	 * Adds an item: its text, or a function that gives it for the player -
	 * `target` is the row's in a list menu, else the menu's.
	 *
	 *     shop.addItem((player) => `Heal (${player.health} HP)`, { onSelect: heal });
	 */
	addItem(text: MenuText, options: MenuItemOptions = {}) {
		const item = itemOf(this, text, options, -1);
		const items = stateOf(this.name).items;
		const at = options.at ?? -1;
		if (at >= 0 && at < items.length) items.splice(at, 0, item);
		else items.push(item);
	}

	/** Adds an item that takes the same slot on every page: `slot` is its key, 1 to 7; the text as `addItem()` takes it. */
	addFixedItem(slot: number, text: MenuText, options: MenuItemOptions = {}) {
		const item = itemOf(this, text, options, slot - 1);
		stateOf(this.name).fixed.push(item);
	}

	/** Removes every item of the menu, fixed ones too. */
	clearItems() {
		const state = stateOf(this.name);
		state.items = [];
		state.fixed = [];
	}

	/** A filter of a list menu: rows `test` says no to are left out, and `message` is said when none is left. */
	addFilter(test: RowTest, message?: string) {
		stateOf(this.name).filters.push({ condition: "", test, message: message ?? "" });
	}

	/** A placeholder of this menu, for menu.ini and Pawn plugins: the text %name% stands for, before the ones registered with `addPlaceholder()`. In code the text is a function instead. */
	addPlaceholder(name: string, value: PlaceholderValue) {
		stateOf(this.name).placeholders.push({ name, value });
	}

	/** The source of this list menu's rows, instead of the players. */
	setListSource(rows: ListSource) {
		setListSource(this.name, rows);
	}

	/** Calls `listener` on this menu's events of `type`, one of "open", "close" or "show" (before it opens). */
	addEventListener(type: MenuEventType, listener: MenuListener) {
		listeners.push({ type, listener, menu: this.name });
	}

	/**
	 * Shows the menu to the player; false when it does not open - a "show"
	 * listener stopped it, it is not active, or the player's menu holds on.
	 */
	show(player: Player, options: MenuShowOptions = {}) {
		return show(player, this.name, options);
	}

	/** Draws the menu again for whoever looks at it; the number of players it was drawn for. */
	refresh() {
		return refresh(this.name);
	}

	/** Closes the menu for whoever looks at it. */
	close() {
		for (const player of lookingAt(this)) close(player);
	}

	/**
	 * Sets the shared countdown: starts it when none runs, or changes the
	 * seconds left - 0 stops it where it is. False when there is nothing to change.
	 */
	setTimer(seconds: number) {
		if (this.countdown == 0 && seconds > 0) {
			this.countdown = seconds;
			this.sharedTimer = true;
			startMenuTimer(this);
			refresh(this.name);
			return true;
		}

		if (this.countdown <= 0) return false;

		this.countdown = seconds;
		if (seconds <= 0) stopMenuTimer(this);
		else refresh(this.name);
		return true;
	}

	/** Stops the shared countdown and closes the menu for everyone looking at it. False when none ran. */
	cancelTimer() {
		if (this.countdown == 0) return false;
		stopMenuTimer(this);
		this.countdown = 0;
		this.close();
		return true;
	}
}

/** A menu event: the `player`, the `menu`, and on "close" whether its `timeout` ran out. */
export class MenuEvent {
	/** A mark of `preventDefault()`: true once it was called. */
	defaultPrevented = false;

	constructor(
		/** The player whose menu it is. */
		public player: Player,
		/** The menu the event is about. */
		public menu: Menu,
		/** On "close": true when the menu closed because its time ran out. */
		public timeout: boolean,
	) {}

	/** On "show": keeps the menu from opening. */
	preventDefault() {
		this.defaultPrevented = true;
	}
}

/** A listener of menu events, as `addEventListener()` calls it. */
export type MenuListener = (event: MenuEvent) => void;

interface ListenerEntry {
	type: MenuEventType;
	listener: MenuListener;
	/** The menu it listens to, by name; "" for every one. */
	menu: string;
}

const DEFAULTS: Labels = {
	exit: "Exit",
	back: "Back",
	next: "Next",
	number: "!y[%d]!w",
	disabled: "!d[%d]",
	page: "!y[!r%d!y | !y%d!y]",
	time: "Time left !y[!r%d !wsec!y]",
	prefix: "!g[MenuCore]!y",
};

/** Items a page; 8 and 9 turn pages, 0 closes. */
const PAGE_SLOTS = 7;
/** A menu that opens a menu that opens a menu ... stops here. */
const MAX_DEPTH = 5;
const ALL_KEYS = 1023;
const ADMIN_ACCESS: Access[] = ["Ban", "Rcon", "Admin", "Menu"];
const KEY_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
/** What an item's `enabled` saying no is called where a restriction's name would be. */
const NOT_ENABLED = "!ENABLED";

const menus: Menu[] = [];
const menuByName = new Map<string, Menu>();
const viewers = new Map<number, Viewer>();
/** The shared countdown's timer of each menu that has one running, by name. */
const menuTimers = new Map<string, number>();

const conditions: ConditionEntry[] = [];
const actions: ActionEntry[] = [];
const placeholders: PlaceholderEntry[] = [];
const restrictions: RestrictionEntry[] = [];
const actionChecks: ActionCheck[] = [];
const conditionFilters: FilterEntry[] = [];
const sources: SourceEntry[] = [];
const listeners: ListenerEntry[] = [];

const labels: Labels = {
	exit: DEFAULTS.exit,
	back: DEFAULTS.back,
	next: DEFAULTS.next,
	number: DEFAULTS.number,
	disabled: DEFAULTS.disabled,
	page: DEFAULTS.page,
	time: DEFAULTS.time,
	prefix: DEFAULTS.prefix,
};

const timerExpired = new Forward<string>("mc_menu_timer_expired");

let configFile = "menu";
let fallbackFile = "";
let config: ini.Config | null = null;
let started = false;
/** Menus made before plugin_init: their keys are registered then. */
const waiting: Menu[] = [];
let selectCount = 0;

server.addEventListener("init", () => {
	started = true;
	for (const menu of waiting) listenForKeys(menu);
	waiting.length = 0;
});

server.addEventListener("putinserver", (event) => {
	const viewer = viewerOf(event.player.id);
	stopPlayerTimer(viewer);
	viewer.menu = "";
	viewer.history = [];
	viewer.page = 0;
	viewer.locked = false;
});

server.addEventListener("disconnected", (event) => {
	close(event.player);
	viewerOf(event.player.id).history = [];
});

/**
 * Sets the file menus are read from, under configs/ and without ".ini"; read
 * when a menu is first asked for. `fallback` is read instead when `file` has no sections.
 */
export function setConfigFile(file: string, fallback?: string) {
	configFile = file;
	fallbackFile = fallback ?? "";
	config = null;
}

/** A menu by its name; null when there is none - `register()` reads one from the file. */
export function find(name: string) {
	if (!menuByName.has(name)) return null;
	return menuByName.get(name);
}

/** A menu's number among all of them - the one Pawn plugins know it by; -1 for none. */
export function indexOf(menu: Menu | null) {
	return menu != null ? menus.indexOf(menu) : -1;
}

/** The menu with that number among all of them - the reverse of `indexOf()`; null when there is none. */
export function menuAt(index: number) {
	if (index < 0 || index >= menus.length) return null;
	return menus[index];
}

/** The menu of the file's [name] section, read now if it is not yet; null when there is no such section or no items in it. */
export function register(name: string) {
	const known = find(name);
	if (known != null) return known;
	if (name.toUpperCase() == "MAIN") return null;

	const section = ini.section(loadedConfig(), name);
	if (section == null) return null;
	const title = ini.getValue(section, "TITLE");
	if (title == null) return null;

	const menu = new Menu(name, title);
	readOptions(menu, section);
	if (menu.kind == "list") readList(menu, section);
	else readRows(menu, section, "ITEMS");
	readFixed(menu, section);

	const state = stateOf(name);

	if (state.items.length + state.fixed.length == 0) {
		console.error(`[MenuSystem] ERROR: No items found for menu section '${name}'`);
		return null;
	}

	return add(menu);
}

/**
 * A menu made in code - or the one of that name already there, as it is. A
 * name starting with LIST_ makes a list menu.
 */
export function create(name: string, options: MenuOptions = {}) {
	const known = find(name);
	if (known != null) return known;

	const menu = new Menu(name, name);
	const title = options.title;
	if (title != null) menu.title = title;
	menu.time = options.time ?? 0;
	menu.hideBack = options.hideBack ?? false;
	menu.hideExit = options.hideExit ?? false;
	menu.locked = options.locked ?? false;
	const activeWhen = options.activeWhen;
	if (activeWhen != null) stateOf(name).activeWhen = activeWhen;
	return add(menu);
}

/** The item addItem and addFixedItem add: in `slot`, -1 for the flow. */
function itemOf(menu: Menu, text: MenuText, options: MenuItemOptions, slot: number) {
	const { placeholder = "", condition = "", restriction = "", restrictionMessage = "", spaceBefore = 0, spaceAfter = 0 } = options;
	const item = makeItem(text, placeholder, condition, actionOf(menu, options), restriction, restrictionMessage, slot);
	const visible = options.visible;
	const enabled = options.enabled;
	const message = options.message;
	if (visible != null) item.visible = visible;
	if (enabled != null) item.enabled = enabled;
	if (message != null) item.message = message;
	item.spaceBefore = spaceBefore;
	item.spaceAfter = spaceAfter;
	return item;
}

/** Registers a condition by name, for menu.ini and Pawn plugins; the first one registered under a name is the one asked. */
export function addCondition(name: string, test: ConditionTest) {
	conditions.push({ name, test });
	return conditions.length - 1;
}

/** Registers an action by name, for menu.ini and Pawn plugins; SHOW_<MENU> and CLOSE_MENU are built in. */
export function addAction(name: string, run: ActionHandler) {
	actions.push({ name, run });
	return actions.length - 1;
}

/** Registers a placeholder for menu.ini and Pawn plugins: the text %name% stands for in titles and items. A name registered twice keeps the first. In code the text is a function instead. */
export function addPlaceholder(name: string, value: PlaceholderValue) {
	const known = placeholders.findIndex(entry => entry.name == name);
	if (known >= 0) return known;
	placeholders.push({ name, value });
	return placeholders.length - 1;
}

/** Registers a restriction by name, for items to name; "*" answers for every name nothing else does. */
export function addRestriction(name: string, test: RestrictionTest, message?: string) {
	restrictions.push({ name, test, message: message ?? "" });
	return restrictions.length - 1;
}

/** Greys out items with `action` in `menu` while `test` says no; "" for either means every one. */
export function addActionCheck(menu: string, action: string, test: ActionTest) {
	actionChecks.push({ menu, action, test });
	return actionChecks.length - 1;
}

/** Registers a filter over the condition `name`, whoever registered it: it gets the condition's value and returns the one to use. */
export function addConditionFilter(name: string, filter: ConditionFilter) {
	conditionFilters.push({ name, filter });
	return conditionFilters.length - 1;
}

/** Sets the source of the rows of the list menu of that name, instead of the players; a second source replaces the first. */
export function setListSource(menu: string, rows: ListSource) {
	const known = sources.findIndex(source => source.menu == menu);

	if (known >= 0) {
		sources[known].rows = rows;
		return known;
	}

	sources.push({ menu, rows });
	return sources.length - 1;
}

/** Calls `listener` on every menu event of `type`, one of "open", "close" or "show" (before a menu opens). */
export function addEventListener(type: MenuEventType, listener: MenuListener) {
	listeners.push({ type, listener, menu: "" });
	return listeners.length - 1;
}

/** A row for a list source: its target, text, and optionally an action, a restriction and its message. */
export function listRow(target: number, text: string, action?: string, restriction?: string, restrictionMessage?: string) {
	const row: ListRow = { kind: "item", target, text, action: action ?? "", restriction: restriction ?? "", restrictionMessage: restrictionMessage ?? "" };
	return row;
}

/** A line of text among a list source's rows; `centered` pads it to the middle of the menu. */
export function textRow(text: string, centered = false) {
	const pad = centered ? Math.floor((42 - text.length) / 2) : 0;
	const row: ListRow = { kind: "text", target: -2, text: " ".repeat(pad > 0 ? pad : 0) + text, action: "", restriction: "", restrictionMessage: "" };
	return row;
}

/**
 * Shows the menu of that name - one made in code, or one of the file;
 * false when it does not open: no such menu, a "show" listener stopped it,
 * it is not active, or the player's menu holds on.
 */
export function show(player: Player, name: string, options: MenuShowOptions = {}) {
	if (!player.isConnected) return false;
	const viewer = viewerOf(player.id);
	viewer.target = options.target ?? 0;

	const menu = menuNamed(name);
	if (menu == null) return false;
	if (!allowed(player, menu)) return false;

	const current = viewer.menu.length > 0 ? find(viewer.menu) : null;

	if (current != null && current != menu) {
		if (!options.force && (viewer.timer > 0 || viewer.locked)) return false;
		stopPlayerTimer(viewer);
		viewer.timer = 0;
		dispatch("close", player, current, false);
	}

	if (options.resetHistory) {
		viewer.history = [];
		viewer.menu = "";
	}

	if (!opensFor(player, menu)) {
		close(player);
		return false;
	}

	if (viewer.depth >= MAX_DEPTH) return false;
	viewer.depth++;
	const shown = draw(player, viewer, menu, options);
	viewer.depth--;
	return shown;
}

/** Closes the player's menu; `timeout` tells the "close" listeners the time ran out. */
export function close(player: Player, timeout = false) {
	const viewer = viewerOf(player.id);
	const menu = viewer.menu.length > 0 ? find(viewer.menu) : null;
	if (menu == null) return;

	stopPlayerTimer(viewer);
	viewer.timer = 0;
	viewer.locked = false;
	viewer.menu = "";
	viewer.page = 0;
	viewer.target = 0;
	viewer.history = [];

	showMenu(player.id, 0, "\n", "");
	dispatch("close", player, menu, timeout);
}

/** Draws the menus again for whoever looks at them; `names` are space-separated. The number of players they were drawn for. */
export function refresh(names: string) {
	let count = 0;
	for (const name of words(names)) {
		const menu = find(name);
		if (menu == null) continue;
		for (const player of lookingAt(menu)) {
			if (show(player, name, { target: viewerOf(player.id).target })) count++;
		}
	}
	return count;
}

/** Tells the menus a condition's value changed: the menus drawn with it are drawn again. */
export function conditionChanged(name: string) {
	const using = menus.filter(menu => usesCondition(menu, name)).map(menu => menu.name);
	if (using.length > 0) refresh(using.join(" "));
}

/** The menu the player looks at, or null. */
export function activeMenu(player: Player) {
	const viewer = viewerOf(player.id);
	return viewer.menu.length > 0 ? find(viewer.menu) : null;
}

/** The text of the player's menu, as it was last drawn; "" when none is open. */
export function shownText(player: Player) {
	const viewer = viewerOf(player.id);
	return viewer.menu.length > 0 ? viewer.text : "";
}

/** Locks the player's menu: no item can be chosen and no other menu replaces it until it is unlocked or closed. */
export function lock(player: Player, locked = true) {
	viewerOf(player.id).locked = locked;
}

/** Whether the player's menu is locked - see `lock()`. */
export function isLocked(player: Player) {
	return viewerOf(player.id).locked;
}

/** Sets the page the player's menu is drawn at next, from 0. */
export function setPage(player: Player, page: number) {
	viewerOf(player.id).page = page;
}

/** Whether an action of that name is registered. */
export function hasAction(name: string) {
	return actionNamed(name) != null;
}

/** Runs an action line: space-separated action names, CLOSE_MENU and SHOW_<MENU> among them. */
export function runActions(player: Player, line: string, target = 0) {
	for (const name of words(line)) {
		if (name == "CLOSE_MENU") {
			close(player);
			continue;
		}

		if (name.startsWith("SHOW_")) {
			show(player, name.slice(5), { time: 0, force: true });
			continue;
		}

		const action = actionNamed(name);
		if (action != null) action.run(player, target, name);
	}
}

function loadedConfig() {
	const loaded = config;
	if (loaded != null) return loaded;
	let read = ini.load(configFile);
	if (read.sections.length == 0 && fallbackFile.length > 0) read = ini.load(fallbackFile);
	config = read;
	readLabels(read);
	return read;
}

function readLabels(file: ini.Config) {
	const main = ini.section(file, "MAIN");
	if (main == null) return;
	labels.exit = valueOr(main, "KEY/EXIT", labels.exit);
	labels.back = valueOr(main, "KEY/BACK", labels.back);
	labels.next = valueOr(main, "KEY/NEXT", labels.next);
	labels.number = valueOr(main, "KEY/NUMBER", labels.number);
	labels.disabled = valueOr(main, "KEY/DISABLED", labels.disabled);
	labels.page = valueOr(main, "KEY/PAGE", labels.page);
	labels.time = valueOr(main, "KEY/TIME", labels.time);
	labels.prefix = valueOr(main, "PREFIX", labels.prefix);
}

function valueOr(section: ini.Section, path: string, fallback: string) {
	return ini.getValueByPath(section, path) ?? fallback;
}

/** YES, true, or a number other than 0. */
function flag(section: ini.Section, key: string) {
	const value = ini.getValue(section, key);
	if (value == null) return false;
	const lower = value.toLowerCase();
	return toInt(value) != 0 || lower == "true" || lower == "yes";
}

function toInt(text: string) {
	const value = parseInt(text, 10);
	return isNaN(value) ? 0 : value;
}

function readOptions(menu: Menu, section: ini.Section) {
	const activeOn: string[] = [];
	for (let i = 0; i < ini.size(section, "ACTIVE_ON"); i++) {
		const word = ini.getValue(section, "ACTIVE_ON", i);
		if (word != null) activeOn.push(word);
	}
	menu.activeOn = activeOn.join(" ");

	menu.hideBack = flag(section, "HIDE_BACK");
	menu.hideExit = flag(section, "HIDE_EXIT");
	menu.locked = flag(section, "LOCKED");
	menu.sharedTimer = flag(section, "GLOBAL");
	const time = ini.getValue(section, "TIME");
	if (time != null) menu.time = toInt(time);
	const onTimeout = ini.getValue(section, "ON_TIMEOUT");
	if (onTimeout != null) menu.onTimeout = onTimeout;
}

/** The rows of a block, each as its columns. */
function blockRows(section: ini.Section, key: string) {
	const rows: string[][] = [];
	for (let line = 0; line < ini.size(section, key); line++) {
		const values = ini.getValues(section, key, 0, line);
		if (values != null) rows.push(values);
	}
	return rows;
}

function column(row: string[], index: number) {
	return index < row.length ? row[index] : "";
}

/** ITEMS: name, placeholder, condition, action, restriction, message, spacing. */
function readRows(menu: Menu, section: ini.Section, key: string) {
	for (const row of blockRows(section, key)) {
		if (!hasText(column(row, 0))) continue;
		const item = makeItem(column(row, 0), column(row, 1), column(row, 2), column(row, 3), column(row, 4), column(row, 5), -1);
		setSpacing(item, column(row, 6));
		stateOf(menu.name).items.push(item);
	}
}

/** FILTER rows (condition, message) and the VIEW template (name, condition, action, restriction, message). */
function readList(menu: Menu, section: ini.Section) {
	for (const row of blockRows(section, "FILTER")) addNamedFilter(menu.name, column(row, 0), column(row, 1));

	const views = blockRows(section, "VIEW");
	if (views.length == 0) return;
	const view = views[0];
	if (!hasText(column(view, 0))) return;
	const item = makeItem(column(view, 0), "", column(view, 1), column(view, 2), column(view, 3), column(view, 4), -1);
	stateOf(menu.name).items.push(item);
}

/** FIXED_ITEMS: slot, name, placeholder, condition, action, restriction, message, spacing. */
function readFixed(menu: Menu, section: ini.Section) {
	for (const row of blockRows(section, "FIXED_ITEMS")) {
		if (!hasText(column(row, 1))) continue;
		const item = makeItem(column(row, 1), column(row, 2), column(row, 3), column(row, 4), column(row, 5), column(row, 6), toInt(column(row, 0)) - 1);
		setSpacing(item, column(row, 7));
		stateOf(menu.name).fixed.push(item);
	}
}

/** "2" is two blank lines after the item; "1 2" one before and two after. */
function setSpacing(item: MenuItem, spacing: string) {
	const parts = words(spacing);

	if (parts.length == 1) {
		item.spaceAfter = toInt(parts[0]);
		return;
	}

	item.spaceBefore = parts.length > 0 ? toInt(parts[0]) : 0;
	item.spaceAfter = parts.length > 1 ? toInt(parts[1]) : 0;
}

function add(menu: Menu) {
	menus.push(menu);
	menuByName.set(menu.name, menu);
	if (started) listenForKeys(menu);
	else waiting.push(menu);
	return menu;
}

/** The menu's keys come to pressed(); a reload keeps the registration it had. */
function listenForKeys(menu: Menu) {
	const name = publicFor(onMenuKey, `menu-core:${menu.name}`);
	if (name.length > 0) register_menucmd(register_menuid(menu.name), ALL_KEYS, name);
}

function onMenuKey(id: number, key: number) {
	const player = new Player(id);
	pressed(player, key);
}

function actionOf(menu: Menu, options: MenuItemOptions) {
	const handler = options.onSelect;
	if (handler == null) return options.action ?? "";
	selectCount++;
	const name = `${menu.name}#${selectCount}`;
	addAction(name, handler);
	return name;
}

function pieces(text: string) {
	return text.split("|").map(part => part.trim()).filter(part => part.length > 0);
}

function at(list: string[], index: number) {
	return index >= 0 && index < list.length ? list[index] : "";
}

/**
 * "A|B" names with "C1|C2" conditions and "X|Y" actions: a variant each.
 * One name serves every action; one action serves every name.
 */
function variantsOf(name: string, condition: string, action: string) {
	const names = pieces(name);
	const conditionList = pieces(condition);
	const actionList = pieces(action);

	let count = 0;
	if (actionList.length <= 1) count = Math.max(names.length, conditionList.length);
	else if (names.length == 1) count = actionList.length;
	else count = Math.min(names.length, actionList.length);
	if (count == 0) count = names.length;

	const variants: Variant[] = [];
	for (let i = 0; i < count; i++) {
		variants.push({
			name: at(names, names.length == 1 ? 0 : i),
			condition: at(conditionList, i),
			action: at(actionList, actionList.length == 1 ? 0 : i),
		});
	}
	return variants;
}

function makeItem(label: MenuText, placeholder: string, condition: string, action: string, restriction: string, message: string, slot: number) {
	const item: MenuItem = { label, condition, action, placeholder, restriction, restrictionMessage: message, visible: null, enabled: null, message: null, spaceBefore: 0, spaceAfter: 0, slot };
	return item;
}

/** Whether a menu.ini item name gives an item - e.g. "A|B" gives two variants; "" and "|" give none. */
export function hasText(name: string) {
	return pieces(name).length > 0;
}

/** The item's variants for the player: its text read now, "A|B" split, with the conditions and actions. */
function variantsFor(item: MenuItem, player: Player, target: number) {
	const variants = variantsOf(textOf(item.label, player, target), item.condition, item.action);
	if (variants.length == 0) variants.push({ name: "", condition: "", action: pieces(item.action).length > 0 ? pieces(item.action)[0] : "" });
	return variants;
}

/** Whether a condition line of the menu - ACTIVE_ON, a filter, an item's - names `name`. */
function usesCondition(menu: Menu, name: string) {
	const state = stateOf(menu.name);
	const lines = [menu.activeOn];
	for (const filter of state.filters) lines.push(filter.condition);
	for (const item of state.items.concat(state.fixed)) {
		for (const condition of pieces(item.condition)) lines.push(condition);
	}
	return lines.some(line => words(line).some(token => (token.startsWith("!") ? token.slice(1) : token) == name));
}

function viewerOf(id: number) {
	if (!viewers.has(id)) {
		const made: Viewer = { menu: "", page: 0, target: 0, history: [], slots: [], rows: 0, text: "", locked: false, timer: 0, ticker: 0, depth: 0 };
		viewers.set(id, made);
	}

	return viewers.get(id);
}

function menuNamed(name: string) {
	return find(name) ?? register(name);
}

function lookingAt(menu: Menu) {
	return Player.all().filter(player => viewerOf(player.id).menu == menu.name);
}

function words(text: string) {
	return text.split(" ").map(word => word.trim()).filter(word => word.length > 0);
}

function perPage(menu: Menu) {
	return Math.max(1, PAGE_SLOTS - stateOf(menu.name).fixed.length);
}

function historyIndex(viewer: Viewer, menu: Menu) {
	return viewer.history.findIndex(step => step.menu == menu.name);
}

/** Whether the menu opens for the player: its ACTIVE_ON holds, and its activeWhen says yes. */
function opensFor(player: Player, menu: Menu) {
	if (menu.activeOn.length > 0 && !check(player.id, player.id, menu.activeOn, false)) return false;
	const test = stateOf(menu.name).activeWhen;
	return test == null || test(player);
}

/** The items of an items menu the player is shown: those whose `visible` does not say no. */
function shownItems(player: Player, viewer: Viewer, menu: Menu) {
	return stateOf(menu.name).items.filter(item => isVisible(item, player, viewer.target));
}

function isVisible(item: MenuItem, player: Player, target: number) {
	const test = item.visible;
	return test == null || test(player, target);
}

function draw(player: Player, viewer: Viewer, menu: Menu, options: MenuShowOptions) {
	const id = player.id;
	const previous = viewer.menu.length > 0 ? find(viewer.menu) : null;
	const previousPage = viewer.page;
	const returning = previous == menu;

	// Back to a menu on the way back: the way back is cut there.
	const back = historyIndex(viewer, menu);

	if (back >= 0) {
		viewer.page = viewer.history[back].page;
		viewer.history = viewer.history.slice(0, back);
	}

	let remember = !returning && previous != null && !options.skipHistory && back < 0;
	if (remember && previous != null && previous.name.toUpperCase().includes("CONFIRM")) remember = false;

	// Left out, or -1: the countdown running goes on, or the menu's own starts.
	const asked = options.time ?? -1;
	if (asked != -1) stopPlayerTimer(viewer);
	dispatch("open", player, menu, false);
	if (!returning) viewer.locked = menu.locked;

	let timer = asked == -1 ? 0 : asked;
	if (asked == -1) timer = menu.countdown > 0 ? menu.countdown : viewer.timer;
	if (timer <= 0) timer = menu.time;

	if (!returning && !options.skipHistory && back < 0) viewer.page = 0;

	const listing = menu.kind == "list" ? listOf(player, menu) : noListing();
	const items = menu.kind == "list" ? noItems() : shownItems(player, viewer, menu);
	const total = menu.kind == "list" ? listing.count : items.length;

	if (menu.kind == "list" && total == 0 && stateOf(menu.name).filters.length > 0) {
		sayEmpty(player, menu);
		return false;
	}

	const pages = Math.max(1, Math.ceil(total / perPage(menu)));
	const page = Math.max(0, Math.min(viewer.page, pages - 1));
	viewer.page = page;
	viewer.rows = total;

	if (timer > 0) startCountdown(viewer, id, menu, timer, asked);

	const screen: Screen = { text: header(id, viewer, menu, timer, page, pages), keys: [], slots: [] };
	for (let slot = 0; slot < PAGE_SLOTS; slot++) screen.slots.push({ action: "", target: 0 });

	if (menu.kind == "list") drawList(screen, player, viewer, menu, listing, page);
	else drawItems(screen, player, viewer, menu, items, page);

	const canGoBack = viewer.history.length > 0 || remember;

	if (pages > 1) {
		screen.text += "\n";
		if (page < pages - 1) addNavigation(screen, id, 8, ui(id, labels.next, DEFAULTS.next));
		else screen.text += "\n";
		if (page > 0 || (canGoBack && !menu.hideBack)) addNavigation(screen, id, 9, ui(id, labels.back, DEFAULTS.back));
		else screen.text += "\n";
	} else if (canGoBack && !menu.hideBack && menu.countdown == 0) {
		screen.text += "\n";
		addNavigation(screen, id, 9, ui(id, labels.back, DEFAULTS.back));
	}

	if (menu.countdown == 0 && !menu.hideExit) {
		screen.text += `\n${itemLabel(id, 0, ui(id, labels.exit, DEFAULTS.exit), false)}`;
		screen.keys.push(0);
	}
	// A locked menu with nothing to press still has to be a menu the client shows.
	if (viewer.locked && screen.keys.length == 0) screen.keys.push(0);

	if (remember && previous != null) viewer.history.push({ menu: previous.name, page: previousPage });
	viewer.menu = menu.name;
	viewer.slots = screen.slots;
	viewer.text = screen.text;
	showMenu(id, keyMask(screen.keys), screen.text, menu.name);
	return true;
}

function noListing() {
	const listing: Listing = { rows: [], fromSource: false, count: 0 };
	return listing;
}

function noItems() {
	const items: MenuItem[] = [];
	return items;
}

function startCountdown(viewer: Viewer, id: number, menu: Menu, timer: number, asked: number) {
	if (menu.sharedTimer) {
		if (menu.countdown == 0 && asked != -1) {
			menu.countdown = timer;
			startMenuTimer(menu);
		}

		return;
	}

	if (asked < 0) return;
	viewer.timer = timer;
	startPlayerTimer(viewer, id);
}

function header(id: number, viewer: Viewer, menu: Menu, timer: number, page: number, pages: number) {
	const player = new Player(id);
	const title = translate(id, textOf(menu.title, player, viewer.target));
	const timed = title.includes("%time%") || title.includes("%TIME%");
	let text = fill(id, viewer.target, title, "", menu);
	if (pages > 1) text += ` ${numbered(ui(id, labels.page, DEFAULTS.page), [page + 1, pages])}`;
	text += "\n";
	if (timer > 0 && !timed) text += `${numbered(ui(id, labels.time, DEFAULTS.time), [timer])}\n`;
	return `${text}\n`;
}

/** Key 1-9 and 0 as show_menu's bits: 1 is the lowest, 0 the tenth. */
function keyMask(keys: number[]) {
	let mask = 0;
	for (const key of keys) mask += 2 ** ((key + 9) % 10);
	return mask;
}

/** "%d" in a label, filled in order. */
function numbered(format: string, values: number[]) {
	let text = format;
	for (const value of values) text = text.replace("%d", `${value}`);
	return text;
}

function itemLabel(id: number, key: number, text: string, disabled: boolean) {
	const format = disabled ? ui(id, labels.disabled, DEFAULTS.disabled) : ui(id, labels.number, DEFAULTS.number);
	return `${numbered(format, [key])} ${translate(id, text)}`;
}

function addNavigation(screen: Screen, id: number, key: number, text: string) {
	screen.text += `${itemLabel(id, key, text, false)}\n`;
	screen.keys.push(key);
}

function addLine(screen: Screen, id: number, slot: number, text: string, enabled: boolean, reason: string) {
	const shown = reason.length > 0 ? `${text}!y${reason}` : text;
	screen.text += `${itemLabel(id, slot + 1, shown, !enabled)}\n`;
	if (enabled) screen.keys.push(slot + 1);
}

function fixedAt(menu: Menu, slot: number) {
	return stateOf(menu.name).fixed.find(item => item.slot == slot);
}

/** The first of the variants whose condition holds; -1 when none does. */
function variantFor(variants: Variant[], player: number, viewer: number) {
	return variants.findIndex(variant => variant.condition.length == 0 || check(player, viewer, variant.condition, false));
}

/** NOT_ENABLED when the item's own `enabled` says no; "" otherwise. */
function notEnabled(item: MenuItem, player: Player, target: number) {
	const test = item.enabled;
	return test != null && !test(player, target) ? NOT_ENABLED : "";
}

/** An item of an items menu, or a fixed one: its conditions and restrictions are the viewer's own. */
function drawItem(screen: Screen, player: Player, viewer: Viewer, menu: Menu, item: MenuItem, slot: number, target: number) {
	const id = player.id;
	screen.text += "\n".repeat(item.spaceBefore);

	const variants = variantsFor(item, player, viewer.target);
	const found = variantFor(variants, id, id);
	const variant = variants[Math.max(0, found)];
	const name = translate(id, variant.name);
	const text = fill(id, target, item.placeholder.length > 0 ? `${name} ${item.placeholder}` : name, "", menu);

	let failed = restrictionFailure(id, id, item.restriction);
	if (found >= 0 && failed.length == 0) failed = notEnabled(item, player, viewer.target);
	if (found >= 0 && failed.length == 0 && !actionAllowed(id, menu.name, variant.action)) failed = "ACTION_CONDITION";

	const enabled = found >= 0 && failed.length == 0 && !viewer.locked;
	addLine(screen, id, slot, text, enabled, failed.length > 0 ? reasonFor(item, failed, player, viewer.target) : "");
	if (enabled) screen.slots[slot] = { action: variant.action, target: viewer.target };

	screen.text += "\n".repeat(item.spaceAfter);
}

function drawItems(screen: Screen, player: Player, viewer: Viewer, menu: Menu, items: MenuItem[], page: number) {
	let next = page * perPage(menu);
	for (let slot = 0; slot < PAGE_SLOTS; slot++) {
		const fixed = fixedAt(menu, slot);

		if (fixed != null) {
			if (isVisible(fixed, player, viewer.target)) drawItem(screen, player, viewer, menu, fixed, slot, 0);
			else screen.text += "\n";
			continue;
		}

		if (next >= items.length) {
			screen.text += "\n";
			continue;
		}

		drawItem(screen, player, viewer, menu, items[next], slot, 0);
		next++;
	}
}

function drawList(screen: Screen, player: Player, viewer: Viewer, menu: Menu, listing: Listing, page: number) {
	const items = stateOf(menu.name).items;
	const template = items.length > 0 ? items[0] : null;
	const rows = listing.rows;
	const start = page * perPage(menu);
	let drawn = 0;

	for (let slot = 0; slot < PAGE_SLOTS; slot++) {
		const fixed = fixedAt(menu, slot);

		if (fixed != null) {
			if (isVisible(fixed, player, viewer.target)) drawItem(screen, player, viewer, menu, fixed, slot, viewer.target);
			else screen.text += "\n";
			continue;
		}

		// Text lines take no slot: they are drawn before the row that follows them.
		while (start + drawn < rows.length && rows[start + drawn].kind == "text") {
			screen.text += `${rows[start + drawn].text}\n`;
			drawn++;
		}

		const index = start + drawn;

		if (template == null || index >= rows.length) {
			if (!listing.fromSource) screen.text += "\n";
			continue;
		}

		drawn++;
		drawRow(screen, player, viewer, menu, template, rows[index], slot);
	}
}

function drawRow(screen: Screen, player: Player, viewer: Viewer, menu: Menu, template: MenuItem, row: ListRow, slot: number) {
	const id = player.id;
	const variants = variantsFor(template, player, row.target);
	const found = variantFor(variants, row.target, id);
	const variant = variants[Math.max(0, found)];
	const text = fill(id, row.target, variant.name, row.text, menu);

	let failed = "";
	if (row.restriction.length > 0 && !check(id, row.target, row.restriction, true)) failed = row.restriction;
	if (failed.length == 0) failed = restrictionFailure(id, row.target, template.restriction);
	if (found >= 0 && failed.length == 0) failed = notEnabled(template, player, row.target);
	if (found >= 0 && failed.length == 0 && !actionAllowed(id, menu.name, variant.action)) failed = "ACTION_CONDITION";

	const enabled = found >= 0 && failed.length == 0 && !viewer.locked;
	let reason = "";
	if (!enabled) reason = row.restrictionMessage.length > 0 ? ` ${row.restrictionMessage}` : reasonFor(template, failed, player, row.target);
	addLine(screen, id, slot, text, enabled, reason);
	if (!enabled) return;

	// A row's own action wins when it is one this menu can run.
	const own = row.action;
	const usable = own.length > 0 && (hasAction(own) || own == "CLOSE_MENU" || own.startsWith("SHOW_"));
	screen.slots[slot] = { action: usable ? own : variant.action, target: row.target };
}

/** The first restriction token that does not pass; "" when all do. */
function restrictionFailure(player: number, target: number, restriction: string) {
	return words(restriction).find(token => !check(player, target, token, true)) ?? "";
}

/**
 * " message" beside an item greyed out by `failed`: its own message when
 * `enabled` said no; else the one for the restriction from "NAME:message|...",
 * the one message there is, or the restriction's own.
 */
function reasonFor(item: MenuItem, failed: string, player: Player, target: number) {
	if (failed == NOT_ENABLED) return notEnabledReason(item, player, target);

	for (const pair of pieces(item.restrictionMessage)) {
		const colon = pair.indexOf(":");
		if (colon < 0) return ` ${pair}`;
		if (pair.slice(0, colon).trim() == failed) return ` ${pair.slice(colon + 1)}`;
	}
	const restriction = restrictionNamed(failed);
	return restriction != null && restriction.message.length > 0 ? ` ${restriction.message}` : "";
}

/** " message" of an item `enabled` greys out: its own message, read for the player now. */
function notEnabledReason(item: MenuItem, player: Player, target: number) {
	const message = item.message;
	if (message == null) return "";
	const text = textOf(message, player, target);
	return text.length > 0 ? ` ${text}` : "";
}

function listOf(viewer: Player, menu: Menu) {
	const listing = noListing();
	const source = sourceFor(menu.name);
	const given = source != null ? source.rows(viewer, menu.name) : null;

	if (given != null) {
		listing.fromSource = true;
		listing.rows = given.filter(row => row.kind == "text" || passesFilters(menu, row.target, viewer.id));
	} else if (stateOf(menu.name).items.length > 0) {
		listing.rows = Player.all()
			.filter(player => passesFilters(menu, player.id, viewer.id))
			.map(player => listRow(player.id, player.name));
	}

	listing.count = listing.rows.filter(row => row.kind == "item").length;
	return listing;
}

function passesFilters(menu: Menu, target: number, viewer: number) {
	return stateOf(menu.name).filters.every(filter => passesFilter(filter.condition, filter.test, target, viewer));
}

/** A filter by condition names, or by its test with the row's player and whoever looks. */
function passesFilter(condition: string, test: RowTest | null, target: number, viewer: number) {
	if (test == null) return check(target, viewer, condition, false);
	const row = new Player(target);
	const looking = new Player(viewer);
	return test(row, looking);
}

function sourceFor(menu: string) {
	const upper = menu.toUpperCase();
	return sources.find(source => source.menu.toUpperCase() == upper);
}

/** An empty list menu does not open: the player is told why - the filter nobody passes, or the first one. */
function sayEmpty(player: Player, menu: Menu) {
	const filters = stateOf(menu.name).filters;
	for (const filter of filters) {
		const passing = Player.all().some(target => passesFilter(filter.condition, filter.test, target.id, player.id));

		if (!passing && filter.message.length > 0) {
			say(player, filter.message);
			return;
		}
	}
	if (filters[0].message.length > 0) say(player, filters[0].message);
}

function say(player: Player, message: string) {
	print(player, `${ui(player.id, labels.prefix, DEFAULTS.prefix)} ${translate(player.id, message)}`);
}

function pressed(player: Player, key: number) {
	const viewer = viewerOf(player.id);
	const menu = viewer.menu.length > 0 ? find(viewer.menu) : null;
	if (menu == null) return;

	if (key == 7) {
		const pages = Math.max(1, Math.ceil(viewer.rows / perPage(menu)));
		if (viewer.page >= pages - 1) return;
		viewer.page++;
		show(player, menu.name, { skipHistory: true, target: viewer.target });
		return;
	}

	if (key == 9) {
		close(player);
		return;
	}

	if (key == 8) {
		goBack(player, viewer, menu);
		return;
	}

	if (key < 0 || key >= viewer.slots.length) return;

	const slot = viewer.slots[key];
	if (slot.action.length == 0) return;
	runActions(player, slot.action, slot.target);
	if (viewer.menu == menu.name) show(player, menu.name, { target: viewer.target });
}

function goBack(player: Player, viewer: Viewer, menu: Menu) {
	if (menu.countdown > 0) return;

	if (viewer.page > 0) {
		viewer.page--;
		show(player, menu.name, { skipHistory: true, target: viewer.target });
		return;
	}

	if (viewer.history.length > 0) {
		const step = viewer.history.pop();
		viewer.page = step.page;
		show(player, step.menu, { skipHistory: true });
		return;
	}

	if (!menu.hideBack) close(player);
}

function conditionNamed(name: string) {
	const upper = name.toUpperCase();
	return conditions.find(entry => entry.name.toUpperCase() == upper);
}

function actionNamed(name: string) {
	return actions.find(entry => entry.name == name);
}

function restrictionNamed(name: string) {
	const colon = name.indexOf(":");
	const upper = (colon < 0 ? name : name.slice(0, colon)).toUpperCase();
	return restrictions.find(entry => entry.name != "*" && entry.name.toUpperCase() == upper);
}

function wildcardRestriction() {
	return restrictions.find(entry => entry.name == "*");
}

/**
 * A condition line: space-separated names, all of which must hold; "!NAME"
 * turns one around. A restriction is looked for among restrictions, then "*",
 * then conditions. ADMIN and FLAG_<letters> are answered from the player's
 * access when nobody registered them.
 */
function check(player: number, viewer: number, line: string, restriction: boolean) {
	for (const token of words(line)) {
		const negate = token.startsWith("!");
		const name = negate ? token.slice(1) : token;
		const value = restriction ? passesRestriction(player, viewer, name) : holds(player, viewer, name);
		if (value < 0) return false;
		if ((value == 1) == negate) return false;
	}
	return true;
}

/** 1 holds, 0 does not, -1 nobody knows the name. */
function holds(id: number, viewerId: number, name: string) {
	const player = new Player(id);
	const viewer = new Player(viewerId);
	const entry = conditionNamed(name);
	if (entry != null) return filtered(player, viewer, name, entry.test(player, viewer, name)) ? 1 : 0;
	if (isAccessCondition(name)) return hasAccess(player, name) ? 1 : 0;
	return -1;
}

function passesRestriction(id: number, target: number, name: string) {
	const player = new Player(id);
	const entry = restrictionNamed(name);
	if (entry != null) return entry.test(player, name, target) ? 1 : 0;
	const wildcard = wildcardRestriction();
	if (wildcard != null) return wildcard.test(player, name, target) ? 1 : 0;
	const known = holds(id, target, name);
	return known < 0 ? 0 : known;
}

function filtered(player: Player, viewer: Player, name: string, value: boolean) {
	let result = value;
	const upper = name.toUpperCase();
	for (const entry of conditionFilters) {
		if (entry.name.toUpperCase() == upper) result = entry.filter(player, viewer, name, result);
	}
	return result;
}

function isAccessCondition(name: string) {
	const upper = name.toUpperCase();
	return upper == "ADMIN" || upper == "ACCESS_ADMIN" || upper.startsWith("FLAG_");
}

/** ADMIN: ban, rcon, admin or menu access. FLAG_abc: any of those users.ini letters. */
function hasAccess(player: Player, name: string) {
	const access = player.access;
	const upper = name.toUpperCase();
	const wanted = upper == "ADMIN" || upper == "ACCESS_ADMIN" ? ADMIN_ACCESS : accessOf(name.slice(5));
	return wanted.some(each => access.includes(each));
}

function actionAllowed(id: number, menu: string, action: string) {
	if (action.length == 0) return true;
	const player = new Player(id);
	for (const entry of actionChecks) {
		if (entry.menu.length > 0 && entry.menu != menu) continue;
		if (entry.action.length > 0 && entry.action != action) continue;
		if (!entry.test(player, menu, action)) return false;
	}
	return true;
}

/** Whether a listener hears an event: of its type, and of its menu when it has one. */
function hears(entry: ListenerEntry, type: MenuEventType, menu: Menu) {
	return entry.type == type && (entry.menu.length == 0 || entry.menu == menu.name);
}

function allowed(player: Player, menu: Menu) {
	const event = new MenuEvent(player, menu, false);
	for (const entry of listeners) {
		if (hears(entry, "show", menu)) entry.listener(event);
		if (event.defaultPrevented) return false;
	}
	return true;
}

function dispatch(type: MenuEventType, player: Player, menu: Menu, timeout: boolean) {
	const event = new MenuEvent(player, menu, timeout);
	for (const entry of listeners) {
		if (hears(entry, type, menu)) entry.listener(event);
	}
}

function isLangKey(text: string) {
	return text.length > 0 && GetLangTransKey(text) != -1;
}

/** A lang key's translation for the player; any other text as it is. */
function translate(id: number, text: string) {
	if (!isLangKey(text)) return text;
	const found = LookupLangKey(text, id);
	return found.length > 0 ? found : text;
}

function looksLikeKey(text: string) {
	if (text.length == 0) return false;
	for (const letter of text.split("")) {
		if (!KEY_LETTERS.includes(letter)) return false;
	}
	return true;
}

/** A label from [MAIN]: its translation, the default when it names a key nobody loaded, else the text. */
function ui(id: number, key: string, fallback: string) {
	if (isLangKey(key)) {
		const found = LookupLangKey(key, id);
		return found.length > 0 ? found : fallback;
	}

	return looksLikeKey(key) ? fallback : key;
}

function secondsLeft(id: number, menu: Menu) {
	const viewer = viewerOf(id);
	return viewer.timer > 0 ? viewer.timer : menu.countdown;
}

/**
 * The text with its placeholders filled: %name% from `name`, the menu's own
 * placeholders, then the registered ones, %time%, and %target% (or %s) as the
 * target's name.
 */
function fill(id: number, target: number, input: string, name: string, menu: Menu) {
	let text = translate(id, input);
	if (!text.includes("%")) return text;

	if (name.length > 0 && text.includes("%name%")) text = text.replaceAll("%name%", translate(id, name));

	const player = new Player(id);
	for (const entry of stateOf(menu.name).placeholders.concat(placeholders)) {
		const tag = `%${entry.name}%`;
		if (text.includes(tag)) text = text.replaceAll(tag, entry.value(player, target, entry.name));
	}

	if (text.includes("%time%") || text.includes("%TIME%")) {
		const left = `${secondsLeft(id, menu)}`;
		text = text.replaceAll("%time%", left).replaceAll("%TIME%", left);
	}

	if (target > 0 && target <= get_maxplayers() && (text.includes("%target%") || text.includes("%s"))) {
		const targetPlayer = new Player(target);
		text = text.replaceAll("%target%", targetPlayer.name).replaceAll("%s", targetPlayer.name);
	}

	return text;
}

function startPlayerTimer(viewer: Viewer, id: number) {
	if (viewer.ticker != 0) return;
	viewer.ticker = setInterval(() => onPlayerSecond(viewer, id), 1000);
}

function stopPlayerTimer(viewer: Viewer) {
	if (viewer.ticker == 0) return;
	clearInterval(viewer.ticker);
	viewer.ticker = 0;
}

function onPlayerSecond(viewer: Viewer, id: number) {
	const player = new Player(id);

	if (!player.isConnected || viewer.timer <= 0) {
		stopPlayerTimer(viewer);
		return;
	}

	viewer.timer--;
	const menu = viewer.menu.length > 0 ? find(viewer.menu) : null;

	if (viewer.timer > 0) {
		if (menu != null) show(player, menu.name, { target: viewer.target, skipHistory: true });
		return;
	}

	stopPlayerTimer(viewer);
	if (menu == null) return;
	if (menu.onTimeout.length > 0) runActions(player, menu.onTimeout, viewer.target);
	if (player.isConnected && viewer.menu == menu.name) close(player, true);
}

function startMenuTimer(menu: Menu) {
	if (menuTimers.has(menu.name)) return;
	menuTimers.set(menu.name, setInterval(() => onMenuSecond(menu), 1000));
}

function stopMenuTimer(menu: Menu) {
	if (!menuTimers.has(menu.name)) return;
	clearInterval(menuTimers.get(menu.name));
	menuTimers.delete(menu.name);
}

function onMenuSecond(menu: Menu) {
	if (menu.countdown <= 0) {
		stopMenuTimer(menu);
		return;
	}

	menu.countdown--;

	if (menu.countdown > 0) {
		refresh(menu.name);
		return;
	}

	stopMenuTimer(menu);
	timerExpired.emit(menu.name);
	for (const player of lookingAt(menu)) {
		if (menu.onTimeout.length > 0) runActions(player, menu.onTimeout, viewerOf(player.id).target);
		else close(player, true);
	}
}
