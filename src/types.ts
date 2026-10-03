/**
 * The types of Menu Core's API: options, rows and the callbacks plugins
 * register.
 */
import { Player } from "@amxts/core";
import { Menu } from "./menus";

/** A menu's kind, one of `"items"` (a list of items) or `"list"` (a row per player, or per row of a list source). */
export type MenuKind = "items" | "list";

/**
 * A menu's context, which its functions get: the player who looks, who or
 * what the menu is about, and the menu.
 *
 *     shop.addItem({ title: ({ player }) => `Heal (${player.health} HP)`, onSelect: ({ player }) => heal(player) });
 */
export interface MenuContext {
	/** The player the menu is shown to: who looks at it, and who chooses. */
	player: Player;
	/** The player the menu is about: the row's in a list menu, the one `show()` was given as `target` in an items menu; `player` himself when there is none. */
	target: Player;
	/** The row's number in a list menu, as `listRow()` gave it - e.g. an entity or an index of the source's own; a player's `id` in a list of players. In an items menu, the `id` of the menu's target, `0` without one. */
	row: number;
	/** The menu the function is asked for. */
	menu: Menu;
}

/** The context of a function registered by name - an action, a placeholder, a restriction, an action check: the menu's context, and the name it is asked by. */
export interface NamedContext extends MenuContext {
	/** The name it is asked by: an action's or a placeholder's, a restriction's whole token - `"NAME:param"` included; for an action check, the item's action. */
	name: string;
}

/**
 * Text of a menu - a title, an item, a message: the text itself, or a
 * function that gives it for the menu's context. A lang key is translated
 * either way. Colour tags are chat's letters: `!y` yellow, `!r` red, `!d`
 * grey, `!w` white, `!R` to the right edge; chat's own `!g`, `!b` and `!t`
 * are dropped.
 *
 *     menus.create("SHOP", { title: ({ player }) => `Shop for ${player.name}` });
 */
export type MenuText = string | ((context: MenuContext) => string);

/** A row of a list menu, as a list source gives it - made with `listRow()` or `textRow()`. */
export interface ListRow {
	/** The row's kind, one of `"item"` (a row to choose) or `"text"` (a line of text, not a choice). */
	kind: "item" | "text";
	/** The row's number, `row` of the context its item's functions get: e.g. a player's `id`, an entity or an index of the source's own; `0` for a line of text. */
	target: number;
	/** The row's text, put for `%name%` in the menu's row template. */
	text: string;
	/** Action names of the row's own, run instead of the template's; `""` for the template's. */
	action: string;
	/** Restriction names, space-separated: the row is greyed out unless each passes. */
	restriction: string;
	/** The text beside the row while it is greyed out; `""` for the restriction's own message. */
	restrictionMessage: string;
}

/**
 * The options of a menu made with `create()`. Every field may be left out:
 *
 *     menus.create("SHOP", { title: "Shop", time: 30, activeWhen: ({ player }) => player.isAlive });
 */
export interface MenuOptions {
	/** The menu's title: the text - a lang key too - or a function that gives it for the menu's context; left out, the menu's name. */
	title?: MenuText;
	/** Seconds on the countdown when the menu opens, e.g. `10`; left out, none. */
	time?: number;
	/** Hiding of the `"Back"` button: `true` leaves it out. */
	hideBack?: boolean;
	/** Hiding of the `"Exit"` button: `true` leaves it out. */
	hideExit?: boolean;
	/** A lock on the menu: while `true`, items cannot be chosen and no other menu replaces this one. */
	locked?: boolean;
	/** A test the menu opens under: while it says no, the menu does not open for the player. */
	activeWhen?: (context: MenuContext) => boolean;
}

/**
 * The options of showing a menu. Every field may be left out:
 *
 *     shop.show(player, { time: 10 });
 */
export interface MenuShowOptions {
	/** Seconds on the countdown; left out, the countdown running goes on, or the menu's own starts. */
	time?: number;
	/** The player the menu is about: `target` of the context its functions get, and `%target%`. */
	target?: Player;
	/** A new way back: `true` forgets the menus this one was opened from. */
	resetHistory?: boolean;
	/** Opening over a menu that holds on - a countdown, a lock: `true` opens anyway. */
	force?: boolean;
	/** Leaving the menu out of the way back: `true` does not remember it. */
	skipHistory?: boolean;
}

/**
 * An item: its title, when it is shown and can be chosen, and what choosing
 * it does. Every field but `title` may be left out:
 *
 *     shop.addItem({
 *         title: ({ player }) => `Heal (${player.health} HP)`,
 *         visible: ({ player }) => player.health < 100,
 *         onSelect: ({ player }) => {
 *             player.health = 100;
 *         },
 *     });
 */
export interface MenuItemOptions {
	/** The item's text - a lang key too - or a function that gives it for the menu's context. */
	title: MenuText;
	/** The function run when the item is chosen; the menu is drawn again after it, while it stays open. */
	onSelect?: (context: MenuContext) => void;
	/** A test the item is shown under: while it says no, the item is left out and takes no slot. */
	visible?: (context: MenuContext) => boolean;
	/**
	 * A test the item can be chosen under - while it says no, the item is
	 * greyed out with `message` beside it; or a list of requirements, each with
	 * a message of its own - the first that fails gives its message.
	 *
	 *     enabled: [
	 *         { when: ({ player }) => player.frags >= 5, message: "5 frags needed" },
	 *         { when: ({ player }) => player.armor < 100, message: ({ player }) => `(${player.armor} already)` },
	 *     ],
	 */
	enabled?: ((context: MenuContext) => boolean) | Requirement[];
	/** The text beside the item while `enabled` greys it out, for a requirement without a message of its own: the text, e.g. `"(full)"`, or a function that gives it for the menu's context. */
	message?: MenuText;
	/** The text after the item's title, for items of menu files and Pawn plugins, placeholders and all, e.g. `"%hp%"`; in code the title is a function instead. */
	placeholder?: string;
	/** Action names from `addAction()` run when the item is chosen, or a built-in one: `"SHOW_<MENU>"`, `"CLOSE_MENU"`. */
	action?: string;
	/** The item's place among the items, from `0`; left out, the end. */
	at?: number;
	/** Blank lines before the item. */
	spaceBefore?: number;
	/** Blank lines after the item. */
	spaceAfter?: number;
}

/**
 * A requirement of an item, in the list `enabled` takes: while `when` says
 * no, the item is greyed out with `message` beside it.
 *
 *     { when: ({ player }) => player.frags >= 5, message: "5 frags needed" }
 */
export interface Requirement {
	/** A test the requirement holds under, given the menu's context. */
	when: (context: MenuContext) => boolean;
	/** The text beside the item while `when` says no: the text, a lang key, or a function that gives it for the menu's context; left out, the item's `message`. */
	message?: MenuText;
}

/** A condition's test, as `addCondition()` registers it. In a list menu `player` is the row's player and `viewer` whoever looks. */
export type ConditionTest = (player: Player, viewer: Player, name: string) => boolean;
/** An action, as `addAction()` registers it: run with the context of the item chosen, and the action's name. */
export type ActionHandler = (context: NamedContext) => void;
/** A placeholder's value: the text `%name%` stands for, given the context of the text it is in. */
export type PlaceholderValue = (context: NamedContext) => string;
/** A restriction's test, as `addRestriction()` registers it; `name` is the whole token, `"NAME:param"` included. */
export type RestrictionTest = (context: NamedContext) => boolean;
/** A test of an item's action, as `addActionCheck()` registers it: `name` is the action, and `false` greys the item out. */
export type ActionTest = (context: NamedContext) => boolean;
/** A filter over a condition someone else registered: gets its value and returns the one to use. */
export type ConditionFilter = (player: Player, viewer: Player, name: string, value: boolean) => boolean;
/** A test of a row of a list menu, as `addFilter()` takes it: `target` is the row's player, `player` whoever looks. */
export type RowTest = (context: MenuContext) => boolean;
/** A list source: the rows of a list menu for the player who looks; `null` lists the players instead. */
export type ListSource = (context: MenuContext) => ListRow[] | null;

/** A menu event's type, one of `"open"` and `"close"` as they happen, or `"show"` before a menu opens, to stop it. */
export type MenuEventType = "open" | "close" | "show";

/** Menu Core's options: `menus` in `amxts.config.ts`. */
export interface MenuCoreOptions {
	/** The menu file, from `configs/`: e.g. `"menu"` is `configs/menu.ini`, `menu.yaml`, `menu.yml`, `menu.json` or `menu.jsonc` - the first that is there; `"myserver/menu.yaml"` is that file. */
	file: string;
	/** The file read instead when `file` is empty or not there, e.g. `"menu"` for `configs/menu.ini` or `menu.yaml`; `""` is none. */
	fallback: string;
}

declare module "@amxts/core" {
	interface ModuleOptions {
		menus?: Partial<MenuCoreOptions>;
	}
}
