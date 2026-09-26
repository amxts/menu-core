/**
 * Menu Core's own bookkeeping: registrations, viewers, a menu's items and the
 * menu being drawn. Not part of the API.
 */
import { Player } from "@amxts/core";
import { ActionHandler, ActionTest, ConditionFilter, ConditionTest, ListRow, ListSource, PlaceholderValue, RestrictionTest, RowTest } from "./types";

/** Whether an item is shown, or can be chosen: `player` looks, `target` is the row's or the menu's. */
export type ItemTest = (player: Player, target: number) => boolean;
/** Whether a menu opens for the player. */
export type OpenTest = (player: Player) => boolean;

/** One way an item can look - "A|B" in menu.ini - shown when its condition holds, the first that does. */
export interface Variant {
	name: string;
	/** Condition names; "" is always. */
	condition: string;
	/** Action names, built-in ones among them. */
	action: string;
}

export interface MenuItem {
	variants: Variant[];
	/** Text after the name: "%hp%". */
	placeholder: string;
	/** Restriction names, space-separated. */
	restriction: string;
	/** "NAME:message|NAME2:message", or one message. */
	restrictionMessage: string;
	/** Left out while it says no: it takes no slot. */
	visible: ItemTest | null;
	/** Greyed out while it says no. */
	enabled: ItemTest | null;
	/** Beside the item while `enabled` greys it out. */
	message: string;
	spaceBefore: number;
	spaceAfter: number;
	/** The slot a fixed item takes, from 0; -1 in the flow. */
	slot: number;
}

/** Rows of a list menu that fail it are left out; `message` says so when none is left. */
export interface ListFilter {
	/** Condition names, as menu.ini and Pawn plugins give them; "" with a test. */
	condition: string;
	test: RowTest | null;
	message: string;
}

/** What a menu has besides its public fields: its items, filters and its own placeholders. */
export interface MenuState {
	items: MenuItem[];
	/** Items that keep their slot on every page. */
	fixed: MenuItem[];
	filters: ListFilter[];
	placeholders: PlaceholderEntry[];
	/** The menu opens only while it says yes; null for always. */
	activeWhen: OpenTest | null;
}

const states = new Map<string, MenuState>();

/** The state of the menu of that name, made on first use. */
export function stateOf(name: string) {
	if (!states.has(name)) {
		const made: MenuState = { items: [], fixed: [], filters: [], placeholders: [], activeWhen: null };
		states.set(name, made);
	}

	return states.get(name);
}

/** A list menu's filter by condition names - menu.ini's FILTER, a Pawn plugin's MP_FILTER. */
export function addNamedFilter(menu: string, condition: string, message: string) {
	if (condition.length == 0) return;
	stateOf(menu).filters.push({ condition, test: null, message });
}

export interface ConditionEntry {
	name: string;
	test: ConditionTest;
}

export interface ActionEntry {
	name: string;
	run: ActionHandler;
}

export interface PlaceholderEntry {
	name: string;
	value: PlaceholderValue;
}

export interface RestrictionEntry {
	name: string;
	test: RestrictionTest;
	message: string;
}

export interface ActionCheck {
	menu: string;
	action: string;
	test: ActionTest;
}

export interface FilterEntry {
	name: string;
	filter: ConditionFilter;
}

export interface SourceEntry {
	menu: string;
	rows: ListSource;
}

/** What a shown slot does when its key is pressed. */
export interface ShownSlot {
	action: string;
	target: number;
}

/** A place on the way back: the menu, by name, and its page. */
export interface HistoryStep {
	menu: string;
	page: number;
}

/** A player's side of it: the menu he looks at, where he came from, his countdown. */
export interface Viewer {
	/** The name of the menu he looks at; "" for none. */
	menu: string;
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
	/** The handle of his countdown's timer, 0 when none runs. */
	ticker: number;
	depth: number;
}

/** A list menu's rows as they are drawn: a source's, or the players. */
export interface Listing {
	rows: ListRow[];
	fromSource: boolean;
	/** The rows that can be chosen - text lines are not counted. */
	count: number;
}

/** What the menu shows while it is drawn. */
export interface Screen {
	text: string;
	keys: number[];
	slots: ShownSlot[];
}

/** The menu's own words, from [MAIN] of the file; a lang key or the text itself. */
export interface Labels {
	exit: string;
	back: string;
	next: string;
	number: string;
	disabled: string;
	page: string;
	time: string;
	prefix: string;
}
