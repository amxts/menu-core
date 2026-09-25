/**
 * The types of Menu Core's API: menus, items, rows and the callbacks plugins
 * register.
 */
import { Player } from "~/facade";

/** "items": a list of items. "list": a row per player, or per row a list source gives. */
export type MenuKind = "items" | "list";

/** One way an item can look: shown when its condition holds, the first that does. */
export interface Variant {
	/** The text shown: a lang key or the text itself. */
	name: string;
	/** The condition it is shown under; "" is always. */
	condition: string;
	/** What choosing it does: a registered action or a built-in one. */
	action: string;
}

/** An item of a menu. */
export interface MenuItem {
	/** The ways it can look - "A|B" in menu.ini - the first whose condition holds is shown. */
	variants: Variant[];
	/** Text after the name, placeholders and all: "%hp%". */
	placeholder: string;
	/** Restriction names, space-separated: the item is greyed out unless each passes. */
	restriction: string;
	/** Why it is greyed out: "NAME:message|NAME2:message", or one message. */
	restrictionMessage: string;
	/** Blank lines before it. */
	spaceBefore: number;
	/** Blank lines after it. */
	spaceAfter: number;
	/** The slot a fixed item always takes, 0-6; -1 for an item in the flow. */
	slot: number;
}

/** Rows of a list menu that fail the condition are left out; `message` says so when none is left. */
export interface ListFilter {
	/** The condition a row must pass. */
	condition: string;
	/** What the player is told when no row passes. */
	message: string;
}

/** A menu, from menu.ini or made in code. */
export interface Menu {
	/** Its section name: "MAIN_MENU". */
	name: string;
	/** The title: a lang key or the text itself. */
	title: string;
	/** "items", or "list" - a row per player or per row of a list source. */
	kind: MenuKind;
	/** The menu opens only while this condition holds. */
	activeOn: string;
	/** A list menu's filters: rows that fail one are left out. */
	filters: ListFilter[];
	/** The items in the flow; a list menu's first one is its row template (VIEW). */
	items: MenuItem[];
	/** Items that keep their slot on every page (FIXED_ITEMS). */
	fixed: MenuItem[];
	/** No "Back" button. */
	hideBack: boolean;
	/** No "Exit" button. */
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
	/** Restriction names, space-separated: the row is greyed out unless each passes. */
	restriction: string;
	/** Why it is greyed out; "" is the restriction's own message. */
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

/** Menu Core's options: `menus` in amxts.config.ts. */
export interface MenuCoreOptions {
	/** The menu file, from configs/: "menu" is configs/menu.ini, "myserver/menu" configs/myserver/menu.ini. */
	file: string;
	/** Read instead when `file` has no menus: "menu" falls back to configs/menu.ini. "" is none. */
	fallback: string;
}

declare module "@amxts/core" {
	interface ModuleOptions {
		menus?: Partial<MenuCoreOptions>;
	}
}
