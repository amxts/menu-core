/**
 * The types of Menu Core's API: options, rows and the callbacks plugins
 * register.
 */
import { Player } from "@amxts/core";

/** A menu's kind, one of "items" (a list of items) or "list" (a row per player, or per row of a list source). */
export type MenuKind = "items" | "list";

/**
 * Text of a menu - a title, an item, a message: the text itself, or a
 * function that gives it for the player who looks; `target` is the row's
 * in a list menu, else the menu's. A lang key is translated either way.
 * Colour tags are chat's letters: `!y` yellow, `!r` red, `!d` grey, `!w`
 * white, `!R` to the right edge; chat's own `!g`, `!b` and `!t` are dropped.
 *
 *     menus.create("SHOP", { title: (player) => `Shop for ${player.name}` });
 */
export type MenuText = string | ((player: Player, target: number) => string);

/** A row of a list menu, as a list source gives it - made with `listRow()` or `textRow()`. */
export interface ListRow {
	/** The row's kind, one of "item" (a row to choose) or "text" (a line of text, not a choice). */
	kind: "item" | "text";
	/** The row's target, handed to the action: e.g. a player's id, an entity or an index of the source's own. */
	target: number;
	/** The row's text, put for %name% in the menu's row template. */
	text: string;
	/** Action names of the row's own, run instead of the template's; "" for the template's. */
	action: string;
	/** Restriction names, space-separated: the row is greyed out unless each passes. */
	restriction: string;
	/** The text beside the row while it is greyed out; "" for the restriction's own message. */
	restrictionMessage: string;
}

/**
 * The options of a menu made with `create()`. Every field may be left out:
 *
 *     menus.create("SHOP", { title: "Shop", time: 30, activeWhen: player => player.isAlive });
 */
export interface MenuOptions {
	/** The menu's title: the text - a lang key too - or a function that gives it for the player; left out, the menu's name. */
	title?: MenuText;
	/** Seconds on the countdown when the menu opens, e.g. 10; left out, none. */
	time?: number;
	/** Hiding of the "Back" button: true leaves it out. */
	hideBack?: boolean;
	/** Hiding of the "Exit" button: true leaves it out. */
	hideExit?: boolean;
	/** A lock on the menu: while true, items cannot be chosen and no other menu replaces this one. */
	locked?: boolean;
	/** A test the menu opens under: while it says no to the player, the menu does not open for him. */
	activeWhen?: (player: Player) => boolean;
}

/**
 * The options of showing a menu. Every field may be left out:
 *
 *     shop.show(player, { time: 10 });
 */
export interface MenuShowOptions {
	/** Seconds on the countdown; left out, the countdown running goes on, or the menu's own starts. */
	time?: number;
	/** The player the menu is about, by id: %target%, and the target an action gets; 0 when left out. */
	target?: number;
	/** A new way back: true forgets the menus this one was opened from. */
	resetHistory?: boolean;
	/** Opening over a menu that holds on - a countdown, a lock: true opens anyway. */
	force?: boolean;
	/** Leaving the menu out of the way back: true does not remember it. */
	skipHistory?: boolean;
}

/**
 * The options of an item, besides its text. Every field may be left out:
 *
 *     shop.addItem("Heal", {
 *         visible: player => player.health < 100,
 *         onSelect: (player) => { player.health = 100; },
 *     });
 */
export interface MenuItemOptions {
	/** The function run when the item is chosen: the player who chose it, and the target - the row's in a list menu, else the menu's. */
	onSelect?: (player: Player, target: number) => void;
	/** A test the item is shown under: while it says no, the item is left out and takes no slot. */
	visible?: (player: Player, target: number) => boolean;
	/** A test the item can be chosen under: while it says no, the item is greyed out. */
	enabled?: (player: Player, target: number) => boolean;
	/** The text beside the item while `enabled` greys it out: the text, e.g. "(full)", or a function that gives it for the player. */
	message?: MenuText;
	/** The text after the item's name, for items of menu files and Pawn plugins, placeholders and all, e.g. "%hp%"; in code the item's text is a function instead. */
	placeholder?: string;
	/** Condition names from `addCondition()` the item is greyed out without; "!NAME" for the opposite; several, space-separated, must all hold. */
	condition?: string;
	/** Action names from `addAction()` run when the item is chosen, or a built-in one: "SHOW_<MENU>", "CLOSE_MENU". */
	action?: string;
	/** Restriction names from `addRestriction()`, "ADMIN" or "FLAG_<letters>": the item is greyed out unless each passes. */
	restriction?: string;
	/** The text beside the item while a restriction greys it out - one message for any, or one per restriction as in "NAME:message|NAME2:message". */
	restrictionMessage?: string;
	/** The item's place among the items, from 0; left out, the end. */
	at?: number;
	/** Blank lines before the item. */
	spaceBefore?: number;
	/** Blank lines after the item. */
	spaceAfter?: number;
}

/** A condition's test, as `addCondition()` registers it. In a list menu `player` is the row's player and `viewer` whoever looks. */
export type ConditionTest = (player: Player, viewer: Player, name: string) => boolean;
/** An action, as `addAction()` registers it: `target` is the row's in a list menu, else the menu's. */
export type ActionHandler = (player: Player, target: number, name: string) => void;
/** A placeholder's value: the text %name% stands for. */
export type PlaceholderValue = (player: Player, target: number, name: string) => string;
/** A restriction's test, as `addRestriction()` registers it; `name` is the whole token, "NAME:param" included. */
export type RestrictionTest = (player: Player, name: string, target: number) => boolean;
/** A test of an item's action, as `addActionCheck()` registers it: false greys the item out. */
export type ActionTest = (player: Player, menu: string, action: string) => boolean;
/** A filter over a condition someone else registered: gets its value and returns the one to use. */
export type ConditionFilter = (player: Player, viewer: Player, name: string, value: boolean) => boolean;
/** A test of a row of a list menu, as `addFilter()` takes it: `player` is the row's player, `viewer` whoever looks. */
export type RowTest = (player: Player, viewer: Player) => boolean;
/** A list source: the rows of a list menu for the player who looks; null lists the players instead. */
export type ListSource = (viewer: Player, menu: string) => ListRow[] | null;

/** A menu event's type, one of "open" and "close" as they happen, or "show" before a menu opens, to stop it. */
export type MenuEventType = "open" | "close" | "show";

/** Menu Core's options: `menus` in amxts.config.ts. */
export interface MenuCoreOptions {
	/** The menu file, from configs/: e.g. "menu" is configs/menu.ini, menu.yaml, menu.yml, menu.json or menu.jsonc - the first that is there; "myserver/menu.yaml" is that file. */
	file: string;
	/** The file read instead when `file` is empty or not there, e.g. "menu" for configs/menu.ini or menu.yaml; "" is none. */
	fallback: string;
}

declare module "@amxts/core" {
	interface ModuleOptions {
		menus?: Partial<MenuCoreOptions>;
	}
}
