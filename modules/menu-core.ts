// Menu Core: menus described in an ini file or built in code, shown to a
// player with show_menu, answered through register_menucmd.
//
//   import * as menus from "~/modules/menu-core";
//
//   menus.setConfigFile("nhnse/menu");           // configs/nhnse/menu.ini
//   menus.addCondition("IS_ALIVE", (player) => player.isAlive);
//   menus.addAction("RESET_SCORE", (player) => { player.frags = 0; });
//   menus.addPlaceholder("hp", (player) => `${player.health}`);
//
//   const shop = menus.create("SHOP", "Shop");
//   menus.addItem(shop, "Heal %hp%", { onSelect: heal });
//   menus.show(player, "SHOP");
//
// A menu is a [SECTION] of the file (TITLE, ITEMS, VIEW, FILTER, FIXED_ITEMS,
// ...) or one made with create(). An "items" menu lists its items; a "list"
// menu - a name starting with LIST_ - draws one row per player, or per row a
// list source gives, from its VIEW template. Seven rows a page, 8 and 9 turn
// pages or go back, 0 closes.
//
// Conditions, actions and placeholders are named: the file refers to them by
// name, and whoever registers the name answers. The menu-core plugin
// (as/menu-core.ts) is this module behind menu_core's mc_* natives, which is
// how Pawn plugins register theirs. It owns this module: the server has one
// instance of it, that plugin's, and any other plugin that imports it calls
// that instance (scripts/shared-modules.ts) - so a menu has its items from
// every plugin, and a player has one open menu.
import {
	Access,
	Forward,
	MenuItemOptions,
	MenuShowOptions,
	Player,
	clearInterval,
	print,
	publicFor,
	server,
	setInterval,
	showMenu,
} from "~/facade";
import { GetLangTransKey, LookupLangKey, get_maxplayers, register_menucmd, register_menuid } from "~/natives";
import * as ini from "~/modules/universal-config";

/** "items": a list of items. "list": a row per player, or per row a list source gives. */
export type MenuKind = "items" | "list";

/** One way an item can look: shown when its condition holds, the first that does. */
export interface Variant {
	name: string;
	condition: string;
	action: string;
}

export interface MenuItem {
	variants: Variant[];
	/** Text after the name, placeholders and all: "%hp%". */
	placeholder: string;
	/** Restriction names, space-separated: the item is greyed out unless each passes. */
	restriction: string;
	/** Why it is greyed out: "NAME:message|NAME2:message", or one message. */
	restrictionMessage: string;
	spaceBefore: number;
	spaceAfter: number;
	/** The slot a fixed item always takes, 0-6; -1 for an item in the flow. */
	slot: number;
}

/** Rows of a list menu that fail the condition are left out; `message` says so when none is left. */
export interface ListFilter {
	condition: string;
	message: string;
}

export interface Menu {
	name: string;
	title: string;
	kind: MenuKind;
	/** The menu opens only while this condition holds. */
	activeOn: string;
	filters: ListFilter[];
	/** The items in the flow; a list menu's first one is its row template (VIEW). */
	items: MenuItem[];
	fixed: MenuItem[];
	hideBack: boolean;
	hideExit: boolean;
	/** Items cannot be chosen, and no other menu replaces it. */
	locked: boolean;
	/** One countdown for everyone looking at it, rather than one each. */
	sharedTimer: boolean;
	/** Seconds on the countdown when it opens; 0 for none. */
	time: number;
	/** The action run when the countdown ends; without one the menu closes. */
	onTimeout: string;
	/** Seconds left on the shared countdown; 0 while none runs. */
	countdown: number;
}

/** A row of a list menu, as a list source gives it. */
export interface ListRow {
	/** "text": a line of text, not a choice. */
	kind: "item" | "text";
	/** What the action gets as its target: a player id, an entity, an index. */
	target: number;
	/** The row's text, or %name% in the VIEW template. */
	text: string;
	/** An action of its own, instead of the template's. */
	action: string;
	restriction: string;
	restrictionMessage: string;
}

/** Whether a condition holds. In a list menu `player` is the row's player and `viewer` whoever looks. */
export type ConditionTest = (player: Player, viewer: Player, name: string) => boolean;
/** What choosing an item does. `target` is the row's in a list menu, else the menu's. */
export type ActionHandler = (player: Player, target: number, name: string) => void;
/** The text a %name% stands for. */
export type PlaceholderValue = (player: Player, target: number, name: string) => string;
/** Whether a player passes a restriction; `name` is the whole token, "NAME:param" included. */
export type RestrictionTest = (player: Player, name: string, target: number) => boolean;
/** Whether an item with this action may be chosen now; false greys it out. */
export type ActionTest = (player: Player, menu: string, action: string) => boolean;
/** Another say on a condition someone else registered: gets its value, returns the one to use. */
export type ConditionFilter = (player: Player, viewer: Player, name: string, value: boolean) => boolean;
/** The rows of a list menu; null lists the players instead. */
export type ListSource = (viewer: Player, menu: string) => ListRow[] | null;
export type MenuListener = (event: MenuEvent) => void;

/** "open" and "close" as they happen; "show" before a menu opens, to stop it. */
export type MenuEventType = "open" | "close" | "show";

export class MenuEvent {
	defaultPrevented = false;

	constructor(public player: Player, public menu: string, public timeout: boolean) {}

	/** On "show": the menu does not open. */
	preventDefault() {
		this.defaultPrevented = true;
	}
}

interface ConditionEntry {
	name: string;
	test: ConditionTest;
}

interface ActionEntry {
	name: string;
	run: ActionHandler;
}

interface PlaceholderEntry {
	name: string;
	value: PlaceholderValue;
}

interface RestrictionEntry {
	name: string;
	test: RestrictionTest;
	message: string;
}

interface ActionCheck {
	menu: string;
	action: string;
	test: ActionTest;
}

interface FilterEntry {
	name: string;
	filter: ConditionFilter;
}

interface SourceEntry {
	menu: string;
	rows: ListSource;
}

interface ListenerEntry {
	type: MenuEventType;
	listener: MenuListener;
}

/** What a shown slot does when its key is pressed. */
interface ShownSlot {
	action: string;
	target: number;
}

interface HistoryStep {
	menu: Menu;
	page: number;
}

/** A player's side of it: the menu he looks at, where he came from, his countdown. */
interface Viewer {
	menu: Menu | null;
	page: number;
	target: number;
	history: HistoryStep[];
	slots: ShownSlot[];
	/** The rows the open menu pages through. */
	rows: number;
	/** What the menu shows, as it was last drawn. */
	text: string;
	locked: boolean;
	timer: number;
	ticking: boolean;
	depth: number;
}

/** A list menu's rows as they are drawn: a source's, or the players. */
interface Listing {
	rows: ListRow[];
	fromSource: boolean;
	/** The rows that can be chosen - text lines are not counted. */
	count: number;
}

/** What the menu shows while it is drawn. */
interface Screen {
	text: string;
	keys: number[];
	slots: ShownSlot[];
}

/** The menu's own words, from [MAIN] of the file; a lang key or the text itself. */
interface Labels {
	exit: string;
	back: string;
	next: string;
	number: string;
	disabled: string;
	page: string;
	time: string;
	prefix: string;
}

const DEFAULTS: Labels = {
	exit: "Exit",
	back: "Back",
	next: "Next",
	number: "\\y[%d]\\w",
	disabled: "\\d[%d]",
	page: "\\y[\\r%d\\y | \\y%d\\y]",
	time: "Time left \\y[\\r%d \\wsec\\y]",
	prefix: "!g[MenuCore]!y",
};

/** Items a page; 8 and 9 turn pages, 0 closes. */
const PAGE_SLOTS = 7;
/** A menu that opens a menu that opens a menu ... stops here. */
const MAX_DEPTH = 5;
const PLAYER_TASK = 0x4D430100;
const MENU_TASK = 0x4D431000;
const ALL_KEYS = 1023;
/** users.ini letters, in the order of their Access names. */
const ACCESS_LETTERS = "abcdefghijklmnopqrstuvyz";
const ACCESS_NAMES: Access[] = [
	"Immunity",
	"Reservation",
	"Kick",
	"Ban",
	"Slay",
	"Map",
	"Cvar",
	"Cfg",
	"Chat",
	"Vote",
	"Password",
	"Rcon",
	"LevelA",
	"LevelB",
	"LevelC",
	"LevelD",
	"LevelE",
	"LevelF",
	"LevelG",
	"LevelH",
	"Menu",
	"BanTemp",
	"Admin",
	"User",
];
const ADMIN_ACCESS: Access[] = ["Ban", "Rcon", "Admin", "Menu"];
const KEY_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";

const menus: Menu[] = [];
const menuByName = new Map<string, Menu>();
const viewers = new Map<number, Viewer>();
/** Condition name -> the menus drawn with it, redrawn when it changes. */
const conditionMenus = new Map<string, string[]>();

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
	stopPlayerTimer(viewer, event.player.id);
	viewer.menu = null;
	viewer.history = [];
	viewer.page = 0;
	viewer.locked = false;
});

server.addEventListener("disconnected", (event) => {
	close(event.player);
	viewerOf(event.player.id).history = [];
});

/**
 * The file menus are read from, under configs/ and without ".ini"; read when a
 * menu is first asked for. `fallback` is read instead when `file` has no sections.
 */
export function setConfigFile(file: string, fallback?: string) {
	configFile = file;
	fallbackFile = fallback ?? "";
	config = null;
}

/** A menu by its name; null when there is none - see register() for one in the file. */
export function find(name: string) {
	if (!menuByName.has(name)) return null;
	return menuByName.get(name);
}

/** A menu's place among all of them - what mc_get_active_menu gives Pawn; -1 for none. */
export function indexOf(menu: Menu | null) {
	return menu != null ? menus.indexOf(menu) : -1;
}

export function menuAt(index: number) {
	if (index < 0 || index >= menus.length) return null;
	return menus[index];
}

/** The menu of the file's [name] section, read now if it is not yet; null when it has none or no items. */
export function register(name: string) {
	const known = find(name);
	if (known != null) return known;
	if (name.toUpperCase() == "MAIN") return null;

	const section = ini.section(loadedConfig(), name);
	if (section == null) return null;
	const title = ini.getValue(section, "TITLE");
	if (title == null) return null;

	const menu = newMenu(name, title);
	readOptions(menu, section);
	if (menu.kind == "list") readList(menu, section);
	else readRows(menu, section, "ITEMS");
	readFixed(menu, section);

	if (menu.items.length + menu.fixed.length == 0) {
		console.error(`[MenuSystem] ERROR: No items found for menu section '${name}'`);
		return null;
	}

	return add(menu);
}

/** A menu made in code - or the one of that name already there. A name starting with LIST_ makes a list menu. */
export function create(name: string, title: string) {
	const known = find(name);
	if (known != null) return known;
	return add(newMenu(name, title));
}

/**
 * An item. "A|B" in the name, the condition or the action are variants: the
 * first whose condition holds is shown. False when the name gives none.
 */
export function addItem(menu: Menu, name: string, options: MenuItemOptions = {}) {
	const item = makeItem(menu, name, options.placeholder!, options.condition!, actionOf(menu, options), options.restriction!, options.restrictionMessage!, -1);
	if (item == null) return false;
	item.spaceBefore = options.spaceBefore!;
	item.spaceAfter = options.spaceAfter!;
	const at = options.at!;
	// splice(at, 0, item) does not insert: AssemblyScript's splice takes two arguments.
	if (at >= 0 && at < menu.items.length) menu.items = menu.items.slice(0, at).concat([item]).concat(menu.items.slice(at));
	else menu.items.push(item);
	return true;
}

/** An item that always takes slot 1-7 of every page. */
export function addFixedItem(menu: Menu, slot: number, name: string, options: MenuItemOptions = {}) {
	const item = makeItem(menu, name, options.placeholder!, options.condition!, actionOf(menu, options), options.restriction!, options.restrictionMessage!, slot - 1);
	if (item == null) return false;
	item.spaceBefore = options.spaceBefore!;
	item.spaceAfter = options.spaceAfter!;
	menu.fixed.push(item);
	return true;
}

export function clearItems(menu: Menu) {
	menu.items = [];
	menu.fixed = [];
}

/** A list menu leaves out rows that fail `condition`; `message` is said when none is left. */
export function addFilter(menu: Menu, condition: string, message?: string) {
	if (condition.length == 0) return;
	watchConditions(condition, menu.name);
	menu.filters.push({ condition, message: message ?? "" });
}

/** The menu opens only while `condition` holds. */
export function setActiveOn(menu: Menu, condition: string) {
	menu.activeOn = condition;
	if (condition.length > 0) watchCondition(condition, menu.name);
}

/** A condition the file names; the first one registered under a name is the one asked. */
export function addCondition(name: string, test: ConditionTest) {
	conditions.push({ name, test });
	return conditions.length - 1;
}

/** An action the file names; SHOW_<MENU> and CLOSE_MENU are built in. */
export function addAction(name: string, run: ActionHandler) {
	actions.push({ name, run });
	return actions.length - 1;
}

/** What %name% stands for in titles and items. A name registered twice keeps the first. */
export function addPlaceholder(name: string, value: PlaceholderValue) {
	for (let i = 0; i < placeholders.length; i++) {
		if (placeholders[i].name == name) return i;
	}
	placeholders.push({ name, value });
	return placeholders.length - 1;
}

/** A restriction items name; "*" answers for every name nothing else does. */
export function addRestriction(name: string, test: RestrictionTest, message?: string) {
	restrictions.push({ name, test, message: message ?? "" });
	return restrictions.length - 1;
}

/** Greys out items with `action` in `menu` while `test` says no; "" for either means every one. */
export function addActionCheck(menu: string, action: string, test: ActionTest) {
	actionChecks.push({ menu, action, test });
	return actionChecks.length - 1;
}

/** Another say on the condition `name`, whoever registered it. */
export function addConditionFilter(name: string, filter: ConditionFilter) {
	conditionFilters.push({ name, filter });
	return conditionFilters.length - 1;
}

/** The rows of the list menu `menu`, instead of the players; a second source replaces the first. */
export function setListSource(menu: string, rows: ListSource) {
	for (let i = 0; i < sources.length; i++) {
		if (sources[i].menu == menu) {
			sources[i].rows = rows;
			return i;
		}
	}
	sources.push({ menu, rows });
	return sources.length - 1;
}

export function addEventListener(type: MenuEventType, listener: MenuListener) {
	listeners.push({ type, listener });
	return listeners.length - 1;
}

/** A row for a list source. */
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
 * Shows a menu; false when it does not open - no such menu, a "show"
 * listener stopped it, ACTIVE_ON does not hold, or the player's menu holds on.
 */
export function show(player: Player, name: string, options: MenuShowOptions = {}) {
	if (!player.isConnected) return false;
	const viewer = viewerOf(player.id);
	viewer.target = options.target!;

	const menu = menuNamed(name);
	if (menu == null) return false;
	if (!allowed(player, menu.name)) return false;

	const current = viewer.menu;

	if (current != null && current != menu) {
		if (!options.force && (viewer.timer > 0 || viewer.locked)) return false;
		stopPlayerTimer(viewer, player.id);
		viewer.timer = 0;
		dispatch("close", player, current.name, false);
	}

	if (options.resetHistory) {
		viewer.history = [];
		viewer.menu = null;
	}

	if (menu.activeOn.length > 0 && !check(player.id, player.id, menu.activeOn, false)) {
		close(player);
		return false;
	}

	if (viewer.depth >= MAX_DEPTH) return false;
	viewer.depth++;
	const shown = draw(player, viewer, menu, options);
	viewer.depth--;
	return shown;
}

/** Closes the player's menu; `timeout` tells the "close" listeners it ran out. */
export function close(player: Player, timeout = false) {
	const viewer = viewerOf(player.id);
	const menu = viewer.menu;
	if (menu == null) return;

	stopPlayerTimer(viewer, player.id);
	viewer.timer = 0;
	viewer.locked = false;
	viewer.menu = null;
	viewer.page = 0;
	viewer.target = 0;
	viewer.history = [];

	showMenu(player.id, 0, "\n", "");
	dispatch("close", player, menu.name, timeout);
}

/** Draws the menus again for whoever looks at them; `names` are space-separated. How many were drawn. */
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

/** A condition's value changed: the menus drawn with it are drawn again. */
export function conditionChanged(name: string) {
	if (!conditionMenus.has(name)) return;
	refresh(conditionMenus.get(name).join(" "));
}

/** The menu the player looks at, or null. */
export function activeMenu(player: Player) {
	return viewerOf(player.id).menu;
}

/** What the player's menu shows, as it was last drawn; "" when none is open. */
export function shownText(player: Player) {
	const viewer = viewerOf(player.id);
	return viewer.menu != null ? viewer.text : "";
}

/** Stops the player choosing items - and other menus replacing this one - until unlocked or closed. */
export function lock(player: Player, locked = true) {
	viewerOf(player.id).locked = locked;
}

export function isLocked(player: Player) {
	return viewerOf(player.id).locked;
}

/** The page the player's menu is drawn at next. */
export function setPage(player: Player, page: number) {
	viewerOf(player.id).page = page;
}

/**
 * Sets the shared countdown of a menu: starts it when none runs, or changes
 * the seconds left - 0 stops it where it is. False when there is nothing to change.
 */
export function setTimer(menu: Menu, seconds: number) {
	if (menu.countdown == 0 && seconds > 0) {
		menu.countdown = seconds;
		menu.sharedTimer = true;
		startMenuTimer(menu);
		refresh(menu.name);
		return true;
	}

	if (menu.countdown <= 0) return false;

	menu.countdown = seconds;
	if (seconds <= 0) clearInterval(MENU_TASK + indexOf(menu));
	else refresh(menu.name);
	return true;
}

/** Stops the shared countdown and closes the menu for everyone looking at it. False when none ran. */
export function cancelTimer(menu: Menu) {
	if (menu.countdown == 0) return false;
	clearInterval(MENU_TASK + indexOf(menu));
	menu.countdown = 0;
	for (const player of lookingAt(menu)) close(player);
	return true;
}

/** Whether an action of that name is registered. */
export function hasAction(name: string) {
	return actionNamed(name) != null;
}

/** Runs an action line: space-separated actions, CLOSE_MENU and SHOW_<MENU> among them. */
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
	const value = ini.getValueByPath(section, path);
	if (value == null) return fallback;
	return value;
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
	setActiveOn(menu, activeOn.join(" "));

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
		const item = makeItem(menu, column(row, 0), column(row, 1), column(row, 2), column(row, 3), column(row, 4), column(row, 5), -1);
		if (item == null) continue;
		setSpacing(item, column(row, 6));
		menu.items.push(item);
	}
}

/** FILTER rows (condition, message) and the VIEW template (name, condition, action, restriction, message). */
function readList(menu: Menu, section: ini.Section) {
	for (const row of blockRows(section, "FILTER")) addFilter(menu, column(row, 0), column(row, 1));

	const views = blockRows(section, "VIEW");
	if (views.length == 0) return;
	const view = views[0];
	const item = makeItem(menu, column(view, 0), "", column(view, 1), column(view, 2), column(view, 3), column(view, 4), -1);
	if (item != null) menu.items.push(item);
}

/** FIXED_ITEMS: slot, name, placeholder, condition, action, restriction, message, spacing. */
function readFixed(menu: Menu, section: ini.Section) {
	for (const row of blockRows(section, "FIXED_ITEMS")) {
		const item = makeItem(menu, column(row, 1), column(row, 2), column(row, 3), column(row, 4), column(row, 5), column(row, 6), toInt(column(row, 0)) - 1);
		if (item == null) continue;
		setSpacing(item, column(row, 7));
		menu.fixed.push(item);
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

function newMenu(name: string, title: string) {
	const menu: Menu = {
		name,
		title,
		kind: name.startsWith("LIST_") ? "list" : "items",
		activeOn: "",
		filters: [],
		items: [],
		fixed: [],
		hideBack: false,
		hideExit: false,
		locked: false,
		sharedTimer: false,
		time: 0,
		onTimeout: "",
		countdown: 0,
	};
	return menu;
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
	if (handler == null) return options.action!;
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

function makeItem(menu: Menu, name: string, placeholder: string, condition: string, action: string, restriction: string, message: string, slot: number) {
	const variants = variantsOf(name, condition, action);
	if (variants.length == 0) return null;
	for (const variant of variants) watchConditions(variant.condition, menu.name);
	const item: MenuItem = { variants, placeholder, restriction, restrictionMessage: message, spaceBefore: 0, spaceAfter: 0, slot };
	return item;
}

function watchConditions(condition: string, menu: string) {
	for (const token of words(condition)) watchCondition(token.startsWith("!") ? token.slice(1) : token, menu);
}

function watchCondition(name: string, menu: string) {
	if (name.length == 0 || menu.length == 0) return;
	if (!conditionMenus.has(name)) conditionMenus.set(name, []);
	const list = conditionMenus.get(name);
	if (!list.includes(menu)) list.push(menu);
}

function viewerOf(id: number) {
	if (!viewers.has(id)) {
		const made: Viewer = { menu: null, page: 0, target: 0, history: [], slots: [], rows: 0, text: "", locked: false, timer: 0, ticking: false, depth: 0 };
		viewers.set(id, made);
	}

	return viewers.get(id);
}

function menuNamed(name: string) {
	const known = find(name);
	if (known != null) return known;
	return register(name);
}

function lookingAt(menu: Menu) {
	const found: Player[] = [];
	for (const player of Player.all()) {
		if (viewerOf(player.id).menu == menu) found.push(player);
	}
	return found;
}

function words(text: string) {
	return text.split(" ").map(word => word.trim()).filter(word => word.length > 0);
}

function perPage(menu: Menu) {
	return Math.max(1, PAGE_SLOTS - menu.fixed.length);
}

function historyIndex(viewer: Viewer, menu: Menu) {
	for (let i = 0; i < viewer.history.length; i++) {
		if (viewer.history[i].menu == menu) return i;
	}
	return -1;
}

function draw(player: Player, viewer: Viewer, menu: Menu, options: MenuShowOptions) {
	const id = player.id;
	const previous = viewer.menu;
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

	if (options.time! != -1) stopPlayerTimer(viewer, id);
	dispatch("open", player, menu.name, false);
	if (!returning) viewer.locked = menu.locked;

	const asked = options.time!;
	let timer = asked == -1 ? 0 : asked;
	if (asked == -1) timer = menu.countdown > 0 ? menu.countdown : viewer.timer;
	if (timer <= 0) timer = menu.time;

	if (!returning && !options.skipHistory && back < 0) viewer.page = 0;

	const listing = menu.kind == "list" ? listOf(player, menu) : noListing();
	const total = menu.kind == "list" ? listing.count : menu.items.length;

	if (menu.kind == "list" && total == 0 && menu.filters.length > 0) {
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

	if (menu.kind == "list") drawList(screen, id, viewer, menu, listing, page);
	else drawItems(screen, id, viewer, menu, page);

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

	if (remember && previous != null) viewer.history.push({ menu: previous, page: previousPage });
	viewer.menu = menu;
	viewer.slots = screen.slots;
	viewer.text = screen.text;
	showMenu(id, keyMask(screen.keys), screen.text, menu.name);
	return true;
}

function noListing() {
	const listing: Listing = { rows: [], fromSource: false, count: 0 };
	return listing;
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
	const title = translate(id, menu.title);
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
	const shown = reason.length > 0 ? `${text}\\y${reason}` : text;
	screen.text += `${itemLabel(id, slot + 1, shown, !enabled)}\n`;
	if (enabled) screen.keys.push(slot + 1);
}

function fixedAt(menu: Menu, slot: number) {
	for (const item of menu.fixed) {
		if (item.slot == slot) return item;
	}
	return null;
}

/** The first variant whose condition holds; -1 when none does. */
function variantFor(item: MenuItem, player: number, viewer: number) {
	for (let i = 0; i < item.variants.length; i++) {
		const condition = item.variants[i].condition;
		if (condition.length == 0 || check(player, viewer, condition, false)) return i;
	}
	return -1;
}

/** An item of an items menu, or a fixed one: its conditions and restrictions are the viewer's own. */
function drawItem(screen: Screen, id: number, viewer: Viewer, menu: Menu, item: MenuItem, slot: number, target: number) {
	screen.text += "\n".repeat(item.spaceBefore);

	const found = variantFor(item, id, id);
	const variant = item.variants[Math.max(0, found)];
	const name = translate(id, variant.name);
	const text = fill(id, target, item.placeholder.length > 0 ? `${name} ${item.placeholder}` : name, "", menu);

	let failed = restrictionFailure(id, id, item.restriction);
	if (found >= 0 && failed.length == 0 && !actionAllowed(id, menu.name, variant.action)) failed = "ACTION_CONDITION";

	const enabled = found >= 0 && failed.length == 0 && !viewer.locked;
	addLine(screen, id, slot, text, enabled, failed.length > 0 ? reasonFor(item.restrictionMessage, failed) : "");
	if (enabled) screen.slots[slot] = { action: variant.action, target: viewer.target };

	screen.text += "\n".repeat(item.spaceAfter);
}

function drawItems(screen: Screen, id: number, viewer: Viewer, menu: Menu, page: number) {
	let next = page * perPage(menu);
	for (let slot = 0; slot < PAGE_SLOTS; slot++) {
		const fixed = fixedAt(menu, slot);

		if (fixed != null) {
			drawItem(screen, id, viewer, menu, fixed, slot, 0);
			continue;
		}

		if (next >= menu.items.length) {
			screen.text += "\n";
			continue;
		}

		drawItem(screen, id, viewer, menu, menu.items[next], slot, 0);
		next++;
	}
}

function drawList(screen: Screen, id: number, viewer: Viewer, menu: Menu, listing: Listing, page: number) {
	const template = menu.items.length > 0 ? menu.items[0] : null;
	const rows = listing.rows;
	const start = page * perPage(menu);
	let drawn = 0;

	for (let slot = 0; slot < PAGE_SLOTS; slot++) {
		const fixed = fixedAt(menu, slot);

		if (fixed != null) {
			drawItem(screen, id, viewer, menu, fixed, slot, viewer.target);
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
		drawRow(screen, id, viewer, menu, template, rows[index], slot);
	}
}

function drawRow(screen: Screen, id: number, viewer: Viewer, menu: Menu, template: MenuItem, row: ListRow, slot: number) {
	const found = variantFor(template, row.target, id);
	const variant = template.variants[Math.max(0, found)];
	const text = fill(id, row.target, variant.name, row.text, menu);

	let failed = "";
	if (row.restriction.length > 0 && !check(id, row.target, row.restriction, true)) failed = row.restriction;
	if (failed.length == 0) failed = restrictionFailure(id, row.target, template.restriction);
	if (found >= 0 && failed.length == 0 && !actionAllowed(id, menu.name, variant.action)) failed = "ACTION_CONDITION";

	const enabled = found >= 0 && failed.length == 0 && !viewer.locked;
	let reason = "";
	if (!enabled) reason = row.restrictionMessage.length > 0 ? ` ${row.restrictionMessage}` : reasonFor(template.restrictionMessage, failed);
	addLine(screen, id, slot, text, enabled, reason);
	if (!enabled) return;

	// A row's own action wins when it is one this menu can run.
	const own = row.action;
	const usable = own.length > 0 && (hasAction(own) || own == "CLOSE_MENU" || own.startsWith("SHOW_"));
	screen.slots[slot] = { action: usable ? own : variant.action, target: row.target };
}

/** The first restriction token that does not pass; "" when all do. */
function restrictionFailure(player: number, target: number, restriction: string) {
	for (const token of words(restriction)) {
		if (!check(player, target, token, true)) return token;
	}
	return "";
}

/** " message" for the failed restriction from "NAME:message|..." - or the one message there is. */
function reasonFor(messages: string, failed: string) {
	for (const pair of pieces(messages)) {
		const colon = pair.indexOf(":");
		if (colon < 0) return ` ${pair}`;
		if (pair.slice(0, colon).trim() == failed) return ` ${pair.slice(colon + 1)}`;
	}
	const restriction = restrictionNamed(failed);
	return restriction != null && restriction.message.length > 0 ? ` ${restriction.message}` : "";
}

function listOf(viewer: Player, menu: Menu) {
	const listing = noListing();
	const source = sourceFor(menu.name);
	const given = source != null ? source.rows(viewer, menu.name) : null;

	if (given != null) {
		listing.fromSource = true;
		for (const row of given) {
			if (row.kind == "text" || passesFilters(menu, row.target, viewer.id)) listing.rows.push(row);
		}
	} else if (menu.items.length > 0) {
		for (const player of Player.all()) {
			if (passesFilters(menu, player.id, viewer.id)) listing.rows.push(listRow(player.id, player.name));
		}
	}

	for (const row of listing.rows) {
		if (row.kind == "item") listing.count++;
	}
	return listing;
}

function passesFilters(menu: Menu, target: number, viewer: number) {
	for (const filter of menu.filters) {
		if (!check(target, viewer, filter.condition, false)) return false;
	}
	return true;
}

function sourceFor(menu: string) {
	const upper = menu.toUpperCase();
	for (const source of sources) {
		if (source.menu.toUpperCase() == upper) return source;
	}
	return null;
}

/** An empty list menu does not open: the player is told why - the filter nobody passes, or the first one. */
function sayEmpty(player: Player, menu: Menu) {
	for (const filter of menu.filters) {
		let passing = 0;
		for (const target of Player.all()) {
			if (check(target.id, player.id, filter.condition, false)) passing++;
		}

		if (passing == 0 && filter.message.length > 0) {
			say(player, filter.message);
			return;
		}
	}
	if (menu.filters[0].message.length > 0) say(player, menu.filters[0].message);
}

function say(player: Player, message: string) {
	print(player, `${ui(player.id, labels.prefix, DEFAULTS.prefix)} ${translate(player.id, message)}`);
}

function pressed(player: Player, key: number) {
	const viewer = viewerOf(player.id);
	const menu = viewer.menu;
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
	if (viewer.menu == menu) show(player, menu.name, { target: viewer.target });
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
		show(player, step.menu.name, { skipHistory: true });
		return;
	}

	if (!menu.hideBack) close(player);
}

function conditionNamed(name: string) {
	const upper = name.toUpperCase();
	for (const entry of conditions) {
		if (entry.name.toUpperCase() == upper) return entry;
	}
	return null;
}

function actionNamed(name: string) {
	for (const entry of actions) {
		if (entry.name == name) return entry;
	}
	return null;
}

function restrictionNamed(name: string) {
	const colon = name.indexOf(":");
	const upper = (colon < 0 ? name : name.slice(0, colon)).toUpperCase();
	for (const entry of restrictions) {
		if (entry.name != "*" && entry.name.toUpperCase() == upper) return entry;
	}
	return null;
}

function wildcardRestriction() {
	for (const entry of restrictions) {
		if (entry.name == "*") return entry;
	}
	return null;
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
	const wanted: Access[] = [];

	if (upper == "ADMIN" || upper == "ACCESS_ADMIN") {
		for (const each of ADMIN_ACCESS) wanted.push(each);
	} else {
		for (const letter of name.slice(5).split("")) {
			const at = ACCESS_LETTERS.indexOf(letter);
			if (at >= 0) wanted.push(ACCESS_NAMES[at]);
		}
	}

	for (const each of wanted) {
		if (access.includes(each)) return true;
	}
	return false;
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

function allowed(player: Player, menu: string) {
	const event = new MenuEvent(player, menu, false);
	for (const entry of listeners) {
		if (entry.type == "show") entry.listener(event);
		if (event.defaultPrevented) return false;
	}
	return true;
}

function dispatch(type: MenuEventType, player: Player, menu: string, timeout: boolean) {
	const event = new MenuEvent(player, menu, timeout);
	for (const entry of listeners) {
		if (entry.type == type) entry.listener(event);
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

function secondsLeft(id: number, menu: Menu | null) {
	const viewer = viewerOf(id);
	if (viewer.timer > 0) return viewer.timer;
	const shown = menu ?? viewer.menu;
	return shown != null ? shown.countdown : 0;
}

/**
 * The text with its placeholders filled: %name% from `name`, registered
 * ones, %time%, and %target% (or %s) as the target's name.
 */
function fill(id: number, target: number, input: string, name: string, menu: Menu | null) {
	let text = translate(id, input);
	if (!text.includes("%")) return text;

	if (name.length > 0 && text.includes("%name%")) text = text.replaceAll("%name%", translate(id, name));

	const player = new Player(id);
	for (const entry of placeholders) {
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
	if (viewer.ticking) return;
	viewer.ticking = true;
	setInterval(onPlayerSecond, 1000, PLAYER_TASK + id);
}

function stopPlayerTimer(viewer: Viewer, id: number) {
	if (!viewer.ticking) return;
	viewer.ticking = false;
	clearInterval(PLAYER_TASK + id);
}

function onPlayerSecond(task: number) {
	const id = task - PLAYER_TASK;
	const viewer = viewerOf(id);
	const player = new Player(id);

	if (!player.isConnected || viewer.timer <= 0) {
		stopPlayerTimer(viewer, id);
		return;
	}

	viewer.timer--;
	const menu = viewer.menu;

	if (viewer.timer > 0) {
		if (menu != null) show(player, menu.name, { target: viewer.target, skipHistory: true });
		return;
	}

	stopPlayerTimer(viewer, id);
	if (menu == null) return;
	if (menu.onTimeout.length > 0) runActions(player, menu.onTimeout, viewer.target);
	if (player.isConnected && viewer.menu == menu) close(player, true);
}

function startMenuTimer(menu: Menu) {
	setInterval(onMenuSecond, 1000, MENU_TASK + indexOf(menu));
}

function onMenuSecond(task: number) {
	const menu = menuAt(task - MENU_TASK);

	if (menu == null || menu.countdown <= 0) {
		clearInterval(task);
		return;
	}

	menu.countdown--;

	if (menu.countdown > 0) {
		refresh(menu.name);
		return;
	}

	clearInterval(task);
	timerExpired.emit(menu.name);
	for (const player of lookingAt(menu)) {
		if (menu.onTimeout.length > 0) runActions(player, menu.onTimeout, viewerOf(player.id).target);
		else close(player, true);
	}
}
