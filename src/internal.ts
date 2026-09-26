/**
 * Menu Core's own bookkeeping: registrations, viewers and the menu being drawn.
 * Not part of the API.
 */
import { ActionHandler, ActionTest, ConditionFilter, ConditionTest, ListRow, ListSource, Menu, MenuEventType, MenuListener, PlaceholderValue, RestrictionTest } from "./types";

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

export interface ListenerEntry {
	type: MenuEventType;
	listener: MenuListener;
}

/** What a shown slot does when its key is pressed. */
export interface ShownSlot {
	action: string;
	target: number;
}

export interface HistoryStep {
	menu: Menu;
	page: number;
}

/** A player's side of it: the menu he looks at, where he came from, his countdown. */
export interface Viewer {
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
