/**
 * Menu Core's menus: the Menu object, the functions of the module, and how a
 * menu is drawn and chosen from.
 */
import { accessOf, Forward, Player, clearInterval, lang, print, server, setInterval, setTimeout } from "@amxts/core";
import { callingPlugin, onPluginStop, publicFor, showMenu } from "@amxts/core/kit";
import { GetLangTransKey, get_maxplayers, register_menucmd, register_menuid } from "@amxts/core/natives";
import { ActionHandler, ActionTest, ConditionFilter, ConditionTest, ListRow, ListSource, MenuContext, MenuEventType, MenuItemOptions, MenuKind, MenuOptions, MenuShowOptions, NamedContext, PlaceholderValue, RestrictionTest, RowTest } from "./types";

import { ConditionEntry, ActionEntry, PlaceholderEntry, RestrictionEntry, ActionCheck, FilterEntry, SourceEntry, Viewer, Listing, ListFilter, Screen, Labels, Check, MenuItem, Variant, ItemSpec, MenuFile, NameKind, NameUse, RequirementSpec, addNamedFilter, blankItem, checksOf, forgetState, iniItem, insertItem, stateOf, textOf } from "./internal";
import { readMenuFile, suggestion, warn } from "./menu-file";

/**
 * A menu: read from a menu file, or made with `create()`. The fields are what
 * the file sets; the methods fill the menu, open it and count it down.
 *
 *     const shop = menus.create("SHOP", { title: "Shop" });
 *     shop.addItem({ title: "Heal", onSelect: ({ player }) => heal(player) });
 *     shop.show(player);
 */
export class Menu {
	/** The menu's kind, one of `"items"` (a list of items) or `"list"` (a row per player, or per row of a list source). A name starting with `LIST_` makes a list. */
	readonly kind: MenuKind;
	/** Hiding of the `"Back"` button: `true` leaves it out. */
	hideBack = false;
	/** Hiding of the `"Exit"` button: `true` leaves it out. */
	hideExit = false;
	/** A lock on the menu: while `true`, items cannot be chosen and no other menu replaces this one. */
	locked = false;
	/** One countdown for everyone looking at the menu (`true`), rather than one per player. */
	sharedTimer = false;
	/** Seconds on the countdown when the menu opens, e.g. `10`; `0` for none. */
	time = 0;
	/** Action names run when the countdown ends, e.g. `"CLOSE_MENU"`; `""` closes the menu. */
	onTimeout = "";
	/** Condition names the menu opens only under, space-separated, e.g. `"IS_ALIVE !IS_SPECTATOR"`; `""` for always. */
	activeOn = "";
	/** Seconds left on the shared countdown; `0` while none runs. */
	countdown = 0;

	constructor(
		/** The menu's name - its name in the menu file, e.g. `"MAIN_MENU"`. */
		readonly name: string,
		/** The menu's title: the text - a lang key too - or a function that gives it for the menu's context. */
		// Written out, not MenuText: the compiler does not take an alias that reaches itself through the context's menu.
		public title: string | ((context: MenuContext) => string),
	) {
		this.kind = name.startsWith("LIST_") ? "list" : "items";
	}

	/**
	 * Adds an item: its title, when it is shown and can be chosen, and what
	 * choosing it does - each a function of the menu's context where it
	 * depends on who looks.
	 *
	 *     shop.addItem({
	 *         title: ({ player }) => `Heal (${player.health} HP)`,
	 *         visible: ({ player }) => player.isAlive,
	 *         onSelect: ({ player }) => {
	 *             player.health = 100;
	 *         },
	 *     });
	 */
	addItem(item: MenuItemOptions) {
		insertItem(this.name, itemOf(this, item, -1), item.at ?? -1);
	}

	/** Adds an item that takes the same slot on every page: `slot` is its key, `1` to `7`; the item as `addItem()` takes it. */
	addFixedItem(slot: number, item: MenuItemOptions) {
		stateOf(this.name).fixed.push(itemOf(this, item, slot - 1));
	}

	/** Removes every item of the menu, fixed ones too. */
	clearItems() {
		const state = stateOf(this.name);
		state.items = [];
		state.fixed = [];
	}

	/** A filter of a list menu: rows `test` says no to are left out - `target` is the row's player - and `message` is said when none is left. */
	addFilter(test: RowTest, message?: string) {
		stateOf(this.name).filters.push({ condition: "", when: "", test, message: message ?? "", from: callingPlugin() });
	}

	/** A placeholder of this menu, for menu files and Pawn plugins: the text `%name%` stands for, before the ones registered with `addPlaceholder()`. In code the text is a function instead. */
	addPlaceholder(name: string, value: PlaceholderValue) {
		stateOf(this.name).placeholders.push({ name, value, from: callingPlugin() });
	}

	/** The source of this list menu's rows, instead of the players. */
	setListSource(rows: ListSource) {
		setListSource(this.name, rows);
	}

	/** Calls `listener` on this menu's events of `type`, one of `"open"`, `"close"` or `"show"` (before it opens). */
	addEventListener(type: MenuEventType, listener: MenuListener) {
		listeners.push({ type, listener, menu: this.name, from: callingPlugin() });
	}

	/**
	 * Shows the menu to the player; `false` when it does not open - a `"show"`
	 * listener stopped it, it is not active, or the player's menu holds on.
	 */
	show(player: Player, options: MenuShowOptions = {}) {
		return show(player, this.name, options);
	}

	/** Runs an action line as a choice in this menu does: space-separated action names, `CLOSE_MENU` and `SHOW_<MENU>` among them; `target` is the player it is about. */
	runActions(player: Player, line: string, target?: Player) {
		run(player, line, target?.id ?? 0, this);
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
	 * seconds left - `0` stops it where it is. `false` when there is nothing to change.
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

	/** Stops the shared countdown and closes the menu for everyone looking at it. `false` when none ran. */
	cancelTimer() {
		if (this.countdown == 0) return false;
		stopMenuTimer(this);
		this.countdown = 0;
		this.close();
		return true;
	}
}

/** A menu event: the `player`, the `menu`, and on `"close"` whether its `timeout` ran out. */
export class MenuEvent {
	/** A mark of `preventDefault()`: `true` once it was called. */
	defaultPrevented = false;

	constructor(
		/** The player whose menu it is. */
		public player: Player,
		/** The menu the event is about. */
		public menu: Menu,
		/** On `"close"`: `true` when the menu closed because its time ran out. */
		public timeout: boolean,
	) {}

	/** On `"show"`: keeps the menu from opening. */
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
	/** The plugin that added it, as `callingPlugin()` numbers it. */
	from: number;
}

/** A menu whose plugin stopped while someone looked at it, until the next frame tells whether one of its name was made again. */
interface LeftMenu {
	menu: Menu;
	/** Seconds left on its shared countdown; 0 for none. */
	countdown: number;
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
/** The conditions Menu Core answers itself while nobody registered them - TEAM_<team> and FLAG_<letters> besides. */
const BUILT_IN_CONDITIONS = ["IS_ALIVE", "IS_DEAD", "IS_BOT", "IS_ADMIN"];
/** The teams of TEAM_<team>: the names of `player.team`. */
const TEAMS = ["CT", "TERRORIST", "SPECTATOR", "UNASSIGNED"];
const KEY_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";

/** Every menu by its number, which Pawn plugins know it by: a menu that went keeps it, for one of its name to take again. */
const menus: Menu[] = [];
const menuByName = new Map<string, Menu>();
/** The menus whose keys come to pressed(), by name: registered once, since AMX Mod X cannot take a registration back. */
const listening = new Set<string>();
const viewers = new Map<number, Viewer>();
/** The shared countdown's timer of each menu that has one running, by name. */
const menuTimers = new Map<string, number>();
let left: LeftMenu[] = [];

let conditions: ConditionEntry[] = [];
let actions: ActionEntry[] = [];
let placeholders: PlaceholderEntry[] = [];
let restrictions: RestrictionEntry[] = [];
let actionChecks: ActionCheck[] = [];
let conditionFilters: FilterEntry[] = [];
let sources: SourceEntry[] = [];
let listeners: ListenerEntry[] = [];

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
let menuFile: MenuFile | null = null;
let started = false;
/** Whether the names a menu file uses are checked as it is read: once every plugin has registered its own. */
let checking = false;
/** Menus made before plugin_init: their keys are registered then. */
const waiting: Menu[] = [];
let selectCount = 0;
/** The placeholders every menu has. */
const BUILT_IN_PLACEHOLDERS = ["name", "target", "time"];

server.addEventListener("init", () => {
	started = true;
	for (const menu of waiting) listenForKeys(menu);
	waiting.length = 0;
	// Plugins register their conditions and actions in plugin_init and
	// plugin_cfg - Pawn ones too, after this - and the first frame comes after
	// every one of them.
	setTimeout(startChecking);
});

server.addEventListener("putInServer", (event) => {
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

onPluginStop(forget);

/**
 * Sets the file menus are read from, under `configs/`: without an extension,
 * the first of `.ini`, `.yaml`, `.yml`, `.json` and `.jsonc` that is there. Read when
 * a menu is first asked for; `fallback` is read instead when `file` is empty.
 */
export function setConfigFile(file: string, fallback?: string) {
	configFile = file;
	fallbackFile = fallback ?? "";
	menuFile = null;
}

/** A menu by its name; `null` when there is none - `register()` reads one from the file. */
export function find(name: string) {
	if (!menuByName.has(name)) return null;
	return menuByName.get(name);
}

/** A menu's number among all of them - the one Pawn plugins know it by; `-1` for none. */
export function indexOf(menu: Menu | null) {
	return menu != null ? menus.indexOf(menu) : -1;
}

/** The menu with that number among all of them - the reverse of `indexOf()`; `null` when there is none. */
export function menuAt(index: number) {
	if (index < 0 || index >= menus.length) return null;
	return find(menus[index].name);
}

/** The menu of that name in the menu file, read now if it is not yet; `null` when the file has no such menu, or no items in it. */
export function register(name: string) {
	const known = find(name);
	if (known != null) return known;
	const spec = loadedFile().menus.find(each => each.name == name);
	if (spec == null) return null;

	const menu = new Menu(name, spec.title);
	menu.activeOn = spec.activeOn;
	menu.hideBack = spec.hideBack;
	menu.hideExit = spec.hideExit;
	menu.locked = spec.locked;
	menu.sharedTimer = spec.sharedTimer;
	menu.time = spec.time;
	menu.onTimeout = spec.onTimeout;

	const state = stateOf(name);
	for (const item of spec.items) state.items.push(itemOfSpec(item));
	for (const item of spec.fixed) state.fixed.push(itemOfSpec(item));
	for (const filter of spec.filters) {
		if (filter.when.length > 0) state.filters.push({ condition: "", when: filter.when, test: null, message: filter.message, from: 0 });
		else addNamedFilter(name, filter.condition, filter.message);
	}

	return add(menu);
}

/**
 * A menu made in code - or the one of that name already there, as it is. A
 * name starting with `LIST_` makes a list menu.
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
	const state = stateOf(name);
	state.from = callingPlugin();
	const activeWhen = options.activeWhen;
	if (activeWhen != null) state.activeWhen = activeWhen;
	return add(menu);
}

/** The item addItem and addFixedItem add: in `slot`, -1 for the flow. */
function itemOf(menu: Menu, options: MenuItemOptions, slot: number) {
	const { placeholder = "", spaceBefore = 0, spaceAfter = 0 } = options;
	const item = blankItem(options.title, actionOf(menu, options), slot);
	item.from = callingPlugin();
	item.placeholder = placeholder;
	const visible = options.visible;
	const enabled = options.enabled;
	const message = options.message;
	if (visible != null) item.visible = { test: visible, when: "", message: null };
	if (enabled != null) item.enabled = checksOf(enabled);
	if (message != null) item.message = message;
	item.spaceBefore = spaceBefore;
	item.spaceAfter = spaceAfter;
	return item;
}

/** Registers a condition by name, for menu files and Pawn plugins; the first one registered under a name is the one asked - a built-in one (`IS_ALIVE`, `TEAM_CT`, ...) too. */
export function addCondition(name: string, test: ConditionTest) {
	conditions.push({ name, test, from: callingPlugin() });
	return conditions.length - 1;
}

/** Registers an action by name, for menu files and Pawn plugins; `SHOW_<MENU>` and `CLOSE_MENU` are built in. */
export function addAction(name: string, run: ActionHandler) {
	actions.push({ name, run, from: callingPlugin() });
	return actions.length - 1;
}

/** Registers a placeholder for menu files and Pawn plugins: the text `%name%` stands for in titles and items. A name registered twice keeps the first. In code the text is a function instead. */
export function addPlaceholder(name: string, value: PlaceholderValue) {
	const known = placeholders.findIndex(entry => entry.name == name);
	if (known >= 0) return known;
	placeholders.push({ name, value, from: callingPlugin() });
	return placeholders.length - 1;
}

/** Registers a restriction by name, for menu files to name in `enabled` and `when`: `message` is said beside an item it greys out, unless the item or the requirement has its own; `"*"` answers for every name nothing else does. */
export function addRestriction(name: string, test: RestrictionTest, message?: string) {
	restrictions.push({ name, test, message: message ?? "", from: callingPlugin() });
	return restrictions.length - 1;
}

/** Greys out items with `action` in `menu` while `test` says no; `""` for either means every one. */
export function addActionCheck(menu: string, action: string, test: ActionTest) {
	actionChecks.push({ menu, action, test, from: callingPlugin() });
	return actionChecks.length - 1;
}

/** Registers a filter over the condition `name`, whoever registered it: it gets the condition's value and returns the one to use. */
export function addConditionFilter(name: string, filter: ConditionFilter) {
	conditionFilters.push({ name, filter, from: callingPlugin() });
	return conditionFilters.length - 1;
}

/** Sets the source of the rows of the list menu of that name, instead of the players; a second source replaces the first. */
export function setListSource(menu: string, rows: ListSource) {
	const upper = menu.toUpperCase();
	const known = sources.findIndex(source => source.menu == upper);

	if (known >= 0) {
		sources[known] = { menu: upper, rows, from: callingPlugin() };
		return known;
	}

	sources.push({ menu: upper, rows, from: callingPlugin() });
	return sources.length - 1;
}

/** Calls `listener` on every menu event of `type`, one of `"open"`, `"close"` or `"show"` (before a menu opens). */
export function addEventListener(type: MenuEventType, listener: MenuListener) {
	listeners.push({ type, listener, menu: "", from: callingPlugin() });
	return listeners.length - 1;
}

/** A row for a list source: its number - `row` of the context its item's functions get - its text, and optionally an action, a restriction and its message. */
export function listRow(target: number, text: string, action?: string, restriction?: string, restrictionMessage?: string) {
	const row: ListRow = { kind: "item", target, text, action: action ?? "", restriction: restriction ?? "", restrictionMessage: restrictionMessage ?? "" };
	return row;
}

/** A line of text among a list source's rows; `centered` pads it to the middle of the menu. */
export function textRow(text: string, centered = false) {
	const pad = centered ? Math.floor((42 - text.length) / 2) : 0;
	const row: ListRow = { kind: "text", target: 0, text: " ".repeat(pad > 0 ? pad : 0) + text, action: "", restriction: "", restrictionMessage: "" };
	return row;
}

/**
 * Shows the menu of that name - one made in code, or one of the file;
 * `false` when it does not open: no such menu, a `"show"` listener stopped it,
 * it is not active, or the player's menu holds on.
 */
export function show(player: Player, name: string, options: MenuShowOptions = {}) {
	return open(player, name, options, options.target?.id ?? 0);
}

/** Shows a menu about `target`, a number: a player's `id`, or what a Pawn plugin gave - `0` for none. */
function open(player: Player, name: string, options: MenuShowOptions, target: number) {
	if (!player.isConnected) return false;
	const viewer = viewerOf(player.id);
	const menu = menuNamed(name);
	if (menu == null) return false;
	if (!allowed(player, menu)) return false;

	const current = menuOf(viewer);

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

	if (!opensFor(player, menu, target)) {
		close(player);
		return false;
	}

	if (viewer.depth >= MAX_DEPTH) return false;
	viewer.depth++;
	const shown = draw(player, viewer, menu, options, target);
	viewer.depth--;
	return shown;
}

/** Closes the player's menu; `timeout` tells the `"close"` listeners the time ran out. */
export function close(player: Player, timeout = false) {
	const viewer = viewerOf(player.id);
	const menu = menuOf(viewer);
	if (menu != null) shut(player, viewer, menu, timeout);
}

/** Takes the viewer's menu off his screen and tells its `"close"` listeners. */
function shut(player: Player, viewer: Viewer, menu: Menu, timeout: boolean) {
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
		if (menu != null) count += refreshMenu(menu);
	}
	return count;
}

/** Draws a menu again for whoever looks at it. The number of players it was drawn for. */
function refreshMenu(menu: Menu) {
	let count = 0;
	for (const player of lookingAt(menu)) {
		if (open(player, menu.name, {}, viewerOf(player.id).target)) count++;
	}
	return count;
}

/** Tells the menus a condition's value changed: the menus drawn with it are drawn again. */
export function conditionChanged(name: string) {
	for (const menu of menus.filter(each => usesCondition(each, name))) refreshMenu(menu);
}

/** The menu the player looks at, or `null`. */
export function activeMenu(player: Player) {
	return menuOf(viewerOf(player.id));
}

/** The text of the player's menu, as it was last drawn; `""` when none is open. */
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

/** Sets the page the player's menu is drawn at next, from `0`. */
export function setPage(player: Player, page: number) {
	viewerOf(player.id).page = page;
}

/** Whether an action of that name is registered. */
export function hasAction(name: string) {
	return actionNamed(name) != null;
}

/** Runs an action line for a choice in `menu`: space-separated action names, `CLOSE_MENU` and `SHOW_<MENU>` among them. */
function run(player: Player, line: string, target: number, menu: Menu) {
	for (const name of words(line)) {
		if (name == "CLOSE_MENU") {
			close(player);
			continue;
		}

		if (name.startsWith("SHOW_")) {
			open(player, name.slice(5), { time: 0, force: true }, 0);
			continue;
		}

		const action = actionNamed(name);
		if (action != null) action.run(namedContextOf(player, target, menu, name));
	}
}

/** The context a menu's functions get, about `target` - a player's `id`, a row's number, `0` for none. */
function contextOf(player: Player, target: number, menu: Menu) {
	const context: MenuContext = { player, target: playerOr(target, player), row: target, menu };
	return context;
}

/** The context a function registered by name gets: the menu's, and the name it is asked by. */
function namedContextOf(player: Player, target: number, menu: Menu, name: string) {
	const context: NamedContext = { player, target: playerOr(target, player), row: target, menu, name };
	return context;
}

/** The player a target numbers; `fallback` for none. */
function playerOr(target: number, fallback: Player) {
	return target > 0 ? new Player(target) : fallback;
}

/** The menu file, read when a menu is first asked for; the fallback file instead when it has nothing in it. */
function loadedFile() {
	const known = menuFile;
	if (known != null) return known;
	let read = readMenuFile(configFile);
	if (read.empty && fallbackFile.length > 0) read = readMenuFile(fallbackFile);
	menuFile = read;
	setLabels(read.labels);
	if (checking) checkNames(read);
	return read;
}

/** The file's words; one it leaves out stays as it was. */
function setLabels(read: Labels) {
	if (read.exit.length > 0) labels.exit = read.exit;
	if (read.back.length > 0) labels.back = read.back;
	if (read.next.length > 0) labels.next = read.next;
	if (read.number.length > 0) labels.number = read.number;
	if (read.disabled.length > 0) labels.disabled = read.disabled;
	if (read.page.length > 0) labels.page = read.page;
	if (read.time.length > 0) labels.time = read.time;
	if (read.prefix.length > 0) labels.prefix = read.prefix;
}

function itemOfSpec(spec: ItemSpec) {
	const item = spec.ini ? iniItem(spec.name, spec.placeholder, spec.condition, spec.action, spec.restriction, spec.restrictionMessage, spec.slot) : blankItem(spec.name, spec.action, spec.slot);
	item.placeholder = spec.placeholder;
	if (spec.visible.length > 0) item.visible = { test: null, when: spec.visible, message: null };
	item.enabled = spec.enabled.map(checkOfSpec);
	if (spec.message.length > 0) item.message = spec.message;
	item.spaceBefore = spec.spaceBefore;
	item.spaceAfter = spec.spaceAfter;
	item.variants = spec.variants;
	return item;
}

/** A requirement of a menu file, as an item holds it: "" for a message is the item's. */
function checkOfSpec(requirement: RequirementSpec) {
	const check: Check = { test: null, when: requirement.when, message: null };
	if (requirement.message.length > 0) check.message = requirement.message;
	return check;
}

/** The first frame: every plugin has registered its names, so the menu file's are checked - now, and in every file read from now on. */
function startChecking() {
	checking = true;
	const known = menuFile;
	if (known != null) checkNames(known);
	else loadedFile();
}

/** Warns of each condition, action, restriction and placeholder a menu file names that nobody registered. */
function checkNames(file: MenuFile) {
	for (const menu of file.menus) {
		for (const use of menu.names) checkName(use, menu.name, file);
	}
}

function checkName(use: NameUse, menu: string, file: MenuFile) {
	if (use.kind == "placeholder") {
		const problem = unknownName(use, use.name, menu, file);
		if (problem.length > 0) warn(use.where, `${menu}: ${problem}`);
		return;
	}

	// A line of restrictions or requirements keeps NAME:param whole; an INI
	// item's conditions and actions are "A|B", a line a variant.
	const whole = use.kind == "restriction" || use.kind == "requirement";
	const lines = whole ? [restrictionTokens(use.name)] : (use.variants ? use.name.split("|") : [use.name]).map(words);
	for (const line of lines) {
		for (const token of line) {
			const problem = unknownName(use, bare(token), menu, file);
			if (problem.length > 0) warn(use.where, `${menu}: ${problem}`);
		}
	}
	for (const line of lines) {
		for (const problem of listProblems(use.kind, line)) warn(use.where, `${menu}: ${problem}`);
	}
}

/**
 * What is wrong with one line of names, a variant's own: a name listed twice,
 * and a name with its opposite - "IS_ALIVE !IS_ALIVE" can never hold.
 * Conditions and restrictions are compared case aside, actions as written.
 */
function listProblems(kind: NameKind, line: string[]) {
	const problems: string[] = [];
	const seen = new Map<string, string>();
	for (const token of line) {
		const negated = kind != "action" && token.startsWith("!");
		const name = negated ? token.slice(1) : token;
		const key = kind == "action" ? name : name.toUpperCase();
		const opposite = `${negated ? "" : "!"}${key}`;

		if (seen.has(opposite)) {
			problems.push(`${seen.get(opposite)} and ${token} together can never hold`);
			continue;
		}

		const own = `${negated ? "!" : ""}${key}`;

		if (seen.has(own)) problems.push(`${token} is listed more than once`);
		else seen.set(own, token);
	}
	return problems;
}

/** What is wrong with a name a menu file uses - "the action "X" is not registered" - or "" when nothing is. */
function unknownName(use: NameUse, name: string, menu: string, file: MenuFile) {
	if (use.kind == "condition") return knownCondition(name) ? "" : `the condition "${name}" is not registered${suggestion(name, conditionNames())}`;
	if (use.kind == "restriction") return unknownRequirement(name, "restriction");
	if (use.kind == "requirement") return unknownRequirement(name, "condition");
	if (use.kind == "action") return unknownAction(name, file);
	const own = stateOf(menu).placeholders.map(entry => entry.name);
	const all = BUILT_IN_PLACEHOLDERS.concat(own).concat(placeholders.map(entry => entry.name));
	return all.includes(name) ? "" : `the placeholder %${name}% is not registered${suggestion(name, all)}`;
}

function knownCondition(name: string) {
	return conditionNamed(name) != null || isBuiltInCondition(name);
}

function conditionNames() {
	const teams = TEAMS.map(team => `TEAM_${team}`);
	return conditions.map(entry => entry.name).concat(BUILT_IN_CONDITIONS).concat(teams);
}

/**
 * A name of a restriction line - asked among restrictions, then "*", then
 * conditions, see check() - or of a requirement line - YAML's and JSON's
 * `visible`, `enabled`, `when`, see answer() - that nothing answers. `what`
 * is what the message calls it.
 */
function unknownRequirement(token: string, what: string) {
	const name = nameOf(token);
	if (restrictionNamed(name) != null || wildcardRestriction() != null || knownCondition(name)) return "";
	const known = restrictions.map(entry => entry.name).concat(conditionNames());
	return `the ${what} "${name}" is not registered${suggestion(name, known)}`;
}

/** A token's name: "VIP" of "VIP:Only for VIP". */
function nameOf(token: string) {
	const colon = token.indexOf(":");
	return colon < 0 ? token : token.slice(0, colon);
}

function unknownAction(name: string, file: MenuFile) {
	if (name == "CLOSE_MENU" || actionNamed(name) != null) return "";
	const menuNames = file.menus.map(each => each.name).concat(menus.map(each => each.name));

	if (name.startsWith("SHOW_")) {
		const target = name.slice(5);
		if (menuNames.includes(target)) return "";
		return `${name} opens the menu "${target}", which is not there${suggestion(target, menuNames)}`;
	}

	// The actions items made in code were given ("SHOP#1") are no one's to name.
	const known = actions.map(entry => entry.name).filter(each => !each.includes("#")).concat(["CLOSE_MENU"]);
	return `the action "${name}" is not registered${suggestion(name, known)}`;
}

/** A menu among the others: at the number of one of its name that went, else after them. */
function add(menu: Menu) {
	const at = menus.findIndex(each => each.name == menu.name);
	if (at >= 0) menus[at] = menu;
	else menus.push(menu);
	menuByName.set(menu.name, menu);
	if (started) listenForKeys(menu);
	else waiting.push(menu);
	return menu;
}

/**
 * A plugin that called the module stopped: what it gave goes - the menus it
 * made, its items, filters and placeholders in the others, the names it
 * registered and its listeners. A reloaded plugin gives them again, and a
 * menu of it someone looks at stays open, drawn from the new load.
 */
function forget(plugin: number) {
	conditions = conditions.filter(entry => entry.from != plugin);
	actions = actions.filter(entry => entry.from != plugin);
	placeholders = placeholders.filter(entry => entry.from != plugin);
	restrictions = restrictions.filter(entry => entry.from != plugin);
	actionChecks = actionChecks.filter(entry => entry.from != plugin);
	conditionFilters = conditionFilters.filter(entry => entry.from != plugin);
	sources = sources.filter(entry => entry.from != plugin);
	listeners = listeners.filter(entry => entry.from != plugin);

	for (const menu of menus.filter(each => find(each.name) == each)) {
		if (stateOf(menu.name).from == plugin) drop(menu);
		else if (forgetIn(menu, plugin)) refreshMenu(menu);
	}
}

/**
 * A menu that went: its countdown stopped, its name free. Whoever looks at it
 * keeps it on his screen until the next frame, with no keys that answer -
 * settle() then draws it again or closes it.
 */
function drop(menu: Menu) {
	if (lookingAt(menu).length > 0) {
		if (left.length == 0) setTimeout(settle);
		left.push({ menu, countdown: menu.countdown });
	}

	stopMenuTimer(menu);
	menuByName.delete(menu.name);
	forgetState(menu.name);
}

/**
 * The frame after a plugin stopped. A menu it left on someone's screen that
 * was made again - a reload's new load makes it at its top level, its items
 * right after - is drawn from the new one, on the same page, its countdown
 * going on; one nobody made again closes.
 */
function settle() {
	const notes = left;
	left = [];
	for (const note of notes) {
		const menu = find(note.menu.name);
		if (menu != null) reopen(menu, note.countdown);
		else closeLeft(note.menu);
	}
}

/** A menu that went and was not made again: off the screen of whoever still looks at it. */
function closeLeft(menu: Menu) {
	for (const player of lookingAt(menu)) shut(player, viewerOf(player.id), menu, false);
}

/** A menu made again for whoever looked at the one that went: its shared countdown goes on from `countdown`. */
function reopen(menu: Menu, countdown: number) {
	if (countdown > 0) {
		menu.countdown = countdown;
		menu.sharedTimer = true;
		startMenuTimer(menu);
	}

	refreshMenu(menu);
}

/** Takes out of a menu the items, filters and placeholders `plugin` gave it; whether there were any. */
function forgetIn(menu: Menu, plugin: number) {
	const state = stateOf(menu.name);
	const before = state.items.length + state.fixed.length + state.filters.length + state.placeholders.length;
	state.items = state.items.filter(item => item.from != plugin);
	state.fixed = state.fixed.filter(item => item.from != plugin);
	state.filters = state.filters.filter(filter => filter.from != plugin);
	state.placeholders = state.placeholders.filter(entry => entry.from != plugin);
	return state.items.length + state.fixed.length + state.filters.length + state.placeholders.length != before;
}

/** The menu's keys come to pressed(), registered once for its name; a reload keeps the registration it had. */
function listenForKeys(menu: Menu) {
	if (listening.has(menu.name)) return;
	listening.add(menu.name);
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
	// An action gets a NamedContext, which the compiler does not take as the MenuContext onSelect asks for.
	addAction(name, (context: NamedContext) => handler(context));
	return name;
}

function pieces(text: string) {
	return text.split("|").map(part => part.trim()).filter(part => part.length > 0);
}

function at(list: string[], index: number) {
	return index >= 0 && index < list.length ? list[index] : "";
}

/**
 * "A|B" names with "C1|C2" conditions and "X|Y" actions - INI's: a variant
 * each. One name serves every action; one action serves every name.
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
			when: at(conditionList, i),
			action: at(actionList, actionList.length == 1 ? 0 : i),
		});
	}
	return variants;
}

/** Whether an item name of a menu file gives an item - e.g. `"A|B"` gives two variants; `""` and `"|"` give none. */
export function hasText(name: string) {
	return pieces(name).length > 0;
}

/** The item's variants for the player: its own, or its text read now - "A|B" split with the conditions and actions when it is INI's. */
function variantsFor(item: MenuItem, player: Player, target: number, menu: Menu) {
	const own = item.variants;
	if (own != null) return own;
	const text = textOf(item.label, contextOf(player, target, menu));

	if (!item.ini) {
		const single: Variant[] = [{ name: text, when: "", action: item.action }];
		return single;
	}

	const variants = variantsOf(text, item.condition, item.action);
	if (variants.length == 0) variants.push({ name: "", when: "", action: pieces(item.action).length > 0 ? pieces(item.action)[0] : "" });
	return variants;
}

/** Whether a line of names of the menu - ACTIVE_ON, a filter, an item's condition, `visible`, `enabled` or variant - names `name`. */
function usesCondition(menu: Menu, name: string) {
	const state = stateOf(menu.name);
	const lines = [menu.activeOn];
	for (const filter of state.filters) {
		lines.push(filter.condition);
		lines.push(filter.when);
	}
	for (const item of state.items.concat(state.fixed)) {
		for (const condition of pieces(item.condition)) lines.push(condition);
		const visible = item.visible;
		if (visible != null) lines.push(visible.when);
		item.enabled.forEach(check => lines.push(check.when));
		const variants = item.variants;
		if (variants != null) variants.forEach(variant => lines.push(variant.when));
	}
	return lines.some(line => restrictionTokens(line).some(token => nameOf(bare(token)) == name));
}

function viewerOf(id: number) {
	if (!viewers.has(id)) {
		const made: Viewer = { menu: "", page: 0, target: 0, history: [], slots: [], rows: 0, text: "", locked: false, timer: 0, ticker: 0, depth: 0 };
		viewers.set(id, made);
	}

	return viewers.get(id);
}

/** The menu a viewer looks at, or `null`. */
function menuOf(viewer: Viewer) {
	return viewer.menu.length > 0 ? find(viewer.menu) : null;
}

function menuNamed(name: string) {
	return find(name) ?? register(name);
}

function lookingAt(menu: Menu) {
	return server.players.filter(player => viewerOf(player.id).menu == menu.name);
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
function opensFor(player: Player, menu: Menu, target: number) {
	if (menu.activeOn.length > 0 && !check(player.id, player.id, menu.activeOn, false, menu)) return false;
	const test = stateOf(menu.name).activeWhen;
	return test == null || test(contextOf(player, target, menu));
}

/** The items of an items menu the player is shown: those whose `visible` does not say no. */
function shownItems(player: Player, viewer: Viewer, menu: Menu) {
	return stateOf(menu.name).items.filter(item => isVisible(item, player, viewer.target, menu));
}

function isVisible(item: MenuItem, player: Player, target: number, menu: Menu) {
	const check = item.visible;
	return check == null || passes(check, player, player.id, target, menu);
}

function draw(player: Player, viewer: Viewer, menu: Menu, options: MenuShowOptions, target: number) {
	// A list menu nobody is left in does not open, and nothing of the viewer's changes.
	const listing = menu.kind == "list" ? listOf(player, menu, target) : noListing();

	if (menu.kind == "list" && listing.count == 0 && stateOf(menu.name).filters.length > 0) {
		sayEmpty(player, menu);
		return false;
	}

	viewer.target = target;
	const id = player.id;
	const previous = menuOf(viewer);
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

	// Left out: the countdown running goes on, or the menu's own starts.
	const asked = options.time;
	const given = asked !== undefined;
	if (given) stopPlayerTimer(viewer);
	dispatch("open", player, menu, false);
	if (!returning) viewer.locked = menu.locked;

	let timer = asked ?? 0;
	if (!given) timer = menu.countdown > 0 ? menu.countdown : viewer.timer;
	if (timer <= 0) timer = menu.time;

	if (!returning && !options.skipHistory && back < 0) viewer.page = 0;

	const items = menu.kind == "list" ? noItems() : shownItems(player, viewer, menu);
	const total = menu.kind == "list" ? listing.count : items.length;
	const pages = Math.max(1, Math.ceil(total / perPage(menu)));
	const page = Math.max(0, Math.min(viewer.page, pages - 1));
	viewer.page = page;
	viewer.rows = total;

	if (timer > 0) startCountdown(viewer, id, menu, timer, given);

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

/** `given`: the seconds were asked for when the menu was shown - else the countdown running goes on. */
function startCountdown(viewer: Viewer, id: number, menu: Menu, timer: number, given: boolean) {
	if (menu.sharedTimer) {
		if (menu.countdown == 0 && given) {
			menu.countdown = timer;
			startMenuTimer(menu);
		}

		return;
	}

	if (!given) return;
	viewer.timer = timer;
	startPlayerTimer(viewer, id);
}

function header(id: number, viewer: Viewer, menu: Menu, timer: number, page: number, pages: number) {
	const player = new Player(id);
	const title = translate(id, textOf(menu.title, contextOf(player, viewer.target, menu)));
	const timed = title.includes("%time%");
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

/** A line with its key's number before it; `text` is translated already. */
function itemLabel(id: number, key: number, text: string, disabled: boolean) {
	const format = disabled ? ui(id, labels.disabled, DEFAULTS.disabled) : ui(id, labels.number, DEFAULTS.number);
	return `${numbered(format, [key])} ${text}`;
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

/** Draws the fixed item of a slot - a blank line while it is hidden; false for a slot that has none. */
function drawFixed(screen: Screen, player: Player, viewer: Viewer, menu: Menu, slot: number, target: number) {
	const fixed = fixedAt(menu, slot);
	if (fixed == null) return false;

	if (isVisible(fixed, player, viewer.target, menu)) drawItem(screen, player, viewer, menu, fixed, slot, target);
	else screen.text += "\n";
	return true;
}

/**
 * The first of the variants whose `when` holds; -1 when none does. INI's are
 * condition lines, asked of `subject` with `player` as the viewer; the rest
 * are lines of requirements - see meets().
 */
function variantFor(item: MenuItem, variants: Variant[], player: number, subject: number, target: number, menu: Menu) {
	return variants.findIndex((variant) => {
		if (variant.when.length == 0) return true;
		return item.ini ? check(subject, player, variant.when, false, menu) : meets(player, subject, target, variant.when, menu);
	});
}

/**
 * Why the item cannot be chosen, as said beside it - " message", or "" -
 * or null when it can: INI's restriction with its message; no variant that
 * holds, without a reason; the first requirement of `enabled` that says no,
 * with its message; an action check, with INI's message.
 */
function refusal(item: MenuItem, found: number, action: string, player: Player, subject: number, target: number, restrictionTarget: number, menu: Menu) {
	const id = player.id;
	const restriction = restrictionFailure(id, restrictionTarget, item.restriction, menu);
	if (restriction.length > 0) return reasonFor(item, restriction);
	if (found < 0) return "";

	const failed = item.enabled.find(check => !passes(check, player, subject, target, menu));
	if (failed != null) return requirementReason(failed, item, player, subject, target, menu);

	if (!actionAllowed(player, target, menu, action)) return reasonFor(item, "ACTION_CONDITION");
	return null;
}

/** An item of an items menu, or a fixed one: its conditions and restrictions are the viewer's own. */
function drawItem(screen: Screen, player: Player, viewer: Viewer, menu: Menu, item: MenuItem, slot: number, target: number) {
	const id = player.id;
	screen.text += "\n".repeat(item.spaceBefore);

	const variants = variantsFor(item, player, viewer.target, menu);
	const found = variantFor(item, variants, id, id, viewer.target, menu);
	const variant = variants[Math.max(0, found)];
	const name = translate(id, variant.name);
	const text = fill(id, target, item.placeholder.length > 0 ? `${name} ${item.placeholder}` : name, "", menu);

	// INI's restriction is asked with the viewer as its target, as menu_core asks it.
	const reason = refusal(item, found, variant.action, player, id, viewer.target, id, menu);
	const enabled = reason == null && !viewer.locked;
	addLine(screen, id, slot, text, enabled, reason ?? "");
	if (enabled) screen.slots[slot] = { action: variant.action, target: viewer.target };

	screen.text += "\n".repeat(item.spaceAfter);
}

function drawItems(screen: Screen, player: Player, viewer: Viewer, menu: Menu, items: MenuItem[], page: number) {
	let next = page * perPage(menu);
	for (let slot = 0; slot < PAGE_SLOTS; slot++) {
		if (drawFixed(screen, player, viewer, menu, slot, 0)) continue;

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
		if (drawFixed(screen, player, viewer, menu, slot, viewer.target)) continue;

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
	const variants = variantsFor(template, player, row.target, menu);
	const found = variantFor(template, variants, id, row.target, row.target, menu);
	const variant = variants[Math.max(0, found)];
	const text = fill(id, row.target, translate(id, variant.name), row.text, menu);

	let reason: string | null = null;
	if (row.restriction.length > 0 && !check(id, row.target, row.restriction, true, menu)) reason = reasonFor(template, row.restriction);
	reason ??= refusal(template, found, variant.action, player, row.target, row.target, row.target, menu);

	const enabled = reason == null && !viewer.locked;
	let shown = "";
	if (!enabled) shown = row.restrictionMessage.length > 0 ? ` ${row.restrictionMessage}` : (reason != null && reason.length > 0 ? reason : reasonFor(template, ""));
	addLine(screen, id, slot, text, enabled, shown);
	if (!enabled) return;

	// A row's own action wins when it is one this menu can run.
	const own = row.action;
	const usable = own.length > 0 && (hasAction(own) || own == "CLOSE_MENU" || own.startsWith("SHOW_"));
	screen.slots[slot] = { action: usable ? own : variant.action, target: row.target };
}

/**
 * A restriction line's tokens: names, space-separated; "NAME:text" takes the
 * rest of the line, spaces and all - "VIP:Only for VIP" is one restriction.
 */
function restrictionTokens(line: string) {
	const colon = line.indexOf(":");
	if (colon < 0) return words(line);
	const start = line.lastIndexOf(" ", colon) + 1;
	const tokens = words(line.slice(0, start));
	tokens.push(line.slice(start).trim());
	return tokens;
}

/** The first restriction token that does not pass; "" when all do. */
function restrictionFailure(player: number, target: number, restriction: string, menu: Menu) {
	return restrictionTokens(restriction).find(token => fails(token, passesRestriction(player, target, bare(token), menu))) ?? "";
}

/** A name without the "!" that turns it around. */
function bare(token: string) {
	return token.startsWith("!") ? token.slice(1) : token;
}

/** Whether a token fails with its name's answer - 1 holds, 0 does not, -1 nobody knows the name - its "!" counted. */
function fails(token: string, value: number) {
	return value < 0 || (value == 1) == token.startsWith("!");
}

/**
 * " message" beside an INI item greyed out by the restriction `failed`: the
 * one for it from "NAME:message|...", the one message there is, or the
 * restriction's own.
 */
function reasonFor(item: MenuItem, failed: string) {
	for (const pair of pieces(item.restrictionMessage)) {
		const colon = pair.indexOf(":");
		if (colon < 0) return ` ${pair}`;
		if (pair.slice(0, colon).trim() == failed) return ` ${pair.slice(colon + 1)}`;
	}
	const restriction = restrictionNamed(failed);
	return restriction != null && restriction.message.length > 0 ? ` ${restriction.message}` : "";
}

/** Whether a requirement holds: its test, or its line of names - see meets(). */
function passes(check: Check, player: Player, subject: number, target: number, menu: Menu) {
	const test = check.test;
	if (test != null) return test(contextOf(player, target, menu));
	return meets(player.id, subject, target, check.when, menu);
}

/**
 * " message" beside an item a requirement greys out, from general to
 * specific: the one the name that says no was registered with, the item's
 * `message`, the requirement's own - read for the player now, a lang key
 * translated.
 */
function requirementReason(check: Check, item: MenuItem, player: Player, subject: number, target: number, menu: Menu) {
	const message = check.message ?? item.message;
	let text = "";
	if (message != null) text = textOf(message, contextOf(player, target, menu));
	else if (check.when.length > 0) text = registeredMessage(failingToken(player.id, subject, target, check.when, menu));
	const translated = translate(player.id, text);
	return translated.length > 0 ? ` ${translated}` : "";
}

/** The message a restriction was registered with, for a name of a requirement's line - "*"'s for a name only it answers; "" for none. */
function registeredMessage(token: string) {
	const name = bare(token);
	const restriction = restrictionNamed(name);
	if (restriction != null) return restriction.message;
	const wildcard = wildcardRestriction();
	return wildcard != null && !knownCondition(name) ? wildcard.message : "";
}

function listOf(viewer: Player, menu: Menu, target: number) {
	const listing = noListing();
	const source = sourceFor(menu.name);
	const given = source != null ? source.rows(contextOf(viewer, target, menu)) : null;

	if (given != null) {
		listing.fromSource = true;
		listing.rows = given.filter(row => row.kind == "text" || passesFilters(menu, row.target, viewer.id));
	} else if (stateOf(menu.name).items.length > 0) {
		listing.rows = server.players
			.filter(player => passesFilters(menu, player.id, viewer.id))
			.map(player => listRow(player.id, player.name));
	}

	listing.count = listing.rows.filter(row => row.kind == "item").length;
	return listing;
}

function passesFilters(menu: Menu, target: number, viewer: number) {
	return stateOf(menu.name).filters.every(filter => passesFilter(filter, target, viewer, menu));
}

/** A filter by its test with whoever looks and the row's player, by a file's `when`, or by INI's condition names. */
function passesFilter(filter: ListFilter, target: number, viewer: number, menu: Menu) {
	const test = filter.test;

	if (test != null) {
		const looking = new Player(viewer);
		return test(contextOf(looking, target, menu));
	}

	if (filter.when.length > 0) return meets(viewer, target, target, filter.when, menu);
	return check(target, viewer, filter.condition, false, menu);
}

function sourceFor(menu: string) {
	const upper = menu.toUpperCase();
	return sources.find(source => source.menu == upper);
}

/** An empty list menu does not open: the player is told why - the filter nobody passes, or the first one. */
function sayEmpty(player: Player, menu: Menu) {
	const filters = stateOf(menu.name).filters;
	for (const filter of filters) {
		const passing = server.players.some(target => passesFilter(filter, target.id, player.id, menu));

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
	const menu = menuOf(viewer);
	if (menu == null) return;

	if (key == 7) {
		const pages = Math.max(1, Math.ceil(viewer.rows / perPage(menu)));
		if (viewer.page >= pages - 1) return;
		viewer.page++;
		open(player, menu.name, { skipHistory: true }, viewer.target);
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
	run(player, slot.action, slot.target, menu);
	if (viewer.menu == menu.name) open(player, menu.name, {}, viewer.target);
}

function goBack(player: Player, viewer: Viewer, menu: Menu) {
	if (menu.countdown > 0) return;

	if (viewer.page > 0) {
		viewer.page--;
		open(player, menu.name, { skipHistory: true }, viewer.target);
		return;
	}

	if (viewer.history.length > 0) {
		const step = viewer.history.pop();
		viewer.page = step.page;
		open(player, step.menu, { skipHistory: true }, 0);
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
 * then conditions; a restriction line keeps "NAME:text" whole. The built-in
 * conditions are answered by Menu Core when nobody registered them.
 */
function check(player: number, viewer: number, line: string, restriction: boolean, menu: Menu) {
	if (restriction) return restrictionFailure(player, viewer, line, menu).length == 0;
	return !words(line).some(token => fails(token, holds(player, viewer, bare(token))));
}

/**
 * A line of requirements - a menu file's `visible`, `enabled`, a variant's
 * or a filter's `when`: names, all of which must hold; "!NAME" turns one
 * around, "NAME:param" takes the rest of the line. `player` looks; a
 * condition is asked of `subject` - the row's player in a list menu, else
 * `player` - and a restriction gets `target`, the row's or the menu's.
 */
function meets(player: number, subject: number, target: number, line: string, menu: Menu) {
	return failingToken(player, subject, target, line, menu).length == 0;
}

/** The first name of a line of requirements that does not hold; "" when all do. */
function failingToken(player: number, subject: number, target: number, line: string, menu: Menu) {
	return restrictionTokens(line).find(token => fails(token, answer(player, subject, target, bare(token), menu))) ?? "";
}

/** A name of a line of requirements: a restriction, a condition, or else "*"'s. 1 holds, 0 does not, -1 nobody knows the name. */
function answer(player: number, subject: number, target: number, name: string, menu: Menu) {
	const looking = new Player(player);
	const asked = namedContextOf(looking, target, menu, name);
	const restriction = restrictionNamed(name);
	if (restriction != null) return restriction.test(asked) ? 1 : 0;
	const known = holds(subject, player, name);
	if (known >= 0) return known;
	const wildcard = wildcardRestriction();
	if (wildcard != null) return wildcard.test(asked) ? 1 : 0;
	return -1;
}

/** 1 holds, 0 does not, -1 nobody knows the name. */
function holds(id: number, viewerId: number, name: string) {
	const player = new Player(id);
	const viewer = new Player(viewerId);
	const entry = conditionNamed(name);
	if (entry != null) return filtered(player, viewer, name, entry.test(player, viewer, name)) ? 1 : 0;
	if (isBuiltInCondition(name)) return filtered(player, viewer, name, builtInHolds(player, name)) ? 1 : 0;
	return -1;
}

function passesRestriction(id: number, target: number, name: string, menu: Menu) {
	const player = new Player(id);
	const asked = namedContextOf(player, target, menu, name);
	const entry = restrictionNamed(name);
	if (entry != null) return entry.test(asked) ? 1 : 0;
	const wildcard = wildcardRestriction();
	if (wildcard != null) return wildcard.test(asked) ? 1 : 0;
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

/** IS_ALIVE, TEAM_CT, IS_ADMIN, FLAG_abc ... - a condition Menu Core answers itself, case aside. */
function isBuiltInCondition(name: string) {
	const upper = name.toUpperCase();
	if (BUILT_IN_CONDITIONS.includes(upper)) return true;
	if (upper.startsWith("TEAM_")) return TEAMS.includes(upper.slice(5));
	return upper.startsWith("FLAG_");
}

/** A built-in condition's answer for the player. */
function builtInHolds(player: Player, name: string) {
	const upper = name.toUpperCase();
	if (upper == "IS_ALIVE") return player.isAlive;
	if (upper == "IS_DEAD") return !player.isAlive;
	if (upper == "IS_BOT") return player.isBot;
	if (upper == "IS_ADMIN") return isAdmin(player);
	if (upper.startsWith("TEAM_")) return player.team == upper.slice(5);
	return hasAccess(player, name);
}

/** IS_ADMIN: any access but a plain user's "z" - AMX Mod X's is_user_admin. */
function isAdmin(player: Player) {
	const access = player.access;
	return access.length > 0 && !access.includes("user");
}

/** FLAG_abc: any of those users.ini letters. */
function hasAccess(player: Player, name: string) {
	const access = player.access;
	return accessOf(name.slice(5)).some(each => access.includes(each));
}

function actionAllowed(player: Player, target: number, menu: Menu, action: string) {
	if (action.length == 0) return true;
	for (const entry of actionChecks) {
		if (entry.menu.length > 0 && entry.menu != menu.name) continue;
		if (entry.action.length > 0 && entry.action != action) continue;
		if (!entry.test(namedContextOf(player, target, menu, action))) return false;
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

/** A lang key's translation for the player, its colour codes made tags; any other text as it is. */
function translate(id: number, text: string) {
	if (!isLangKey(text)) return text;
	const player = new Player(id);
	return lang.translate(player, text);
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
		const player = new Player(id);
		const found = lang.translate(player, key);
		return found != key ? found : fallback;
	}

	return looksLikeKey(key) ? fallback : key;
}

function secondsLeft(id: number, menu: Menu) {
	const viewer = viewerOf(id);
	return viewer.timer > 0 ? viewer.timer : menu.countdown;
}

/**
 * The text - translated already - with its placeholders filled: %name% from
 * `name`, the menu's own placeholders, then the registered ones, %time%, and
 * %target% as the target's name.
 */
function fill(id: number, target: number, input: string, name: string, menu: Menu) {
	let text = input;
	if (!text.includes("%")) return text;

	if (name.length > 0 && text.includes("%name%")) text = text.replaceAll("%name%", translate(id, name));

	const player = new Player(id);
	for (const entry of stateOf(menu.name).placeholders.concat(placeholders)) {
		const tag = `%${entry.name}%`;
		if (text.includes(tag)) text = text.replaceAll(tag, entry.value(namedContextOf(player, target, menu, entry.name)));
	}

	if (text.includes("%time%")) text = text.replaceAll("%time%", `${secondsLeft(id, menu)}`);

	if (target > 0 && target <= get_maxplayers() && text.includes("%target%")) {
		const targetPlayer = new Player(target);
		text = text.replaceAll("%target%", targetPlayer.name);
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
	const menu = menuOf(viewer);

	if (viewer.timer > 0) {
		if (menu != null) open(player, menu.name, { skipHistory: true }, viewer.target);
		return;
	}

	stopPlayerTimer(viewer);
	if (menu == null) return;
	if (menu.onTimeout.length > 0) run(player, menu.onTimeout, viewer.target, menu);
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
		if (menu.onTimeout.length > 0) run(player, menu.onTimeout, viewerOf(player.id).target, menu);
		else close(player, true);
	}
}
