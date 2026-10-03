/**
 * Menu Core's own bookkeeping: registrations, viewers, a menu's items and the
 * menu being drawn. Not part of the API.
 */
import { ActionHandler, ActionTest, ConditionFilter, ConditionTest, ListRow, ListSource, MenuContext, MenuText, PlaceholderValue, Requirement, RestrictionTest, RowTest } from "./types";

/** Whether an item is shown, or can be chosen; whether a menu opens. */
export type ItemTest = (context: MenuContext) => boolean;

/**
 * One way an item can look, shown when its `when` holds - the first that
 * does. A menu file's `variants`, or "A|B" in menu.ini, where `when` is the
 * condition column's piece.
 */
export interface Variant {
	name: string;
	/** Names; "" is always. */
	when: string;
	/** Action names, built-in ones among them. */
	action: string;
}

/** A requirement of an item - `visible`, or one of `enabled`: a test from code, or a line of names from a menu file. */
export interface Check {
	test: ItemTest | null;
	/** Names, as a menu file's `when` gives them; "" with a test. */
	when: string;
	/** Beside the item while it says no; null for the item's `message`. */
	message: MenuText | null;
}

export interface MenuItem {
	/** Its text; "A|B" in it are variants when `ini`. */
	label: MenuText;
	/** Action names, "X|Y" a variant each when `ini`. */
	action: string;
	/** Text after the name: "%hp%". */
	placeholder: string;
	/** Left out while it says no: it takes no slot. */
	visible: Check | null;
	/** Greyed out while one says no: the first that does gives its message. */
	enabled: Check[];
	/** Beside the item while a requirement without a message of its own greys it out. */
	message: MenuText | null;
	/**
	 * An item of menu.ini or of a Pawn plugin: "A|B" in the text are variants,
	 * `condition` "C1|C2" picks one - greyed out, without a reason, when none
	 * holds - and `restriction` greys it out with `restrictionMessage`.
	 */
	ini: boolean;
	/** INI's condition names, "C1|C2" a variant each; "" is always. */
	condition: string;
	/** INI's restriction names, space-separated. */
	restriction: string;
	/** INI's message: "NAME:message|NAME2:message", or one message. */
	restrictionMessage: string;
	spaceBefore: number;
	spaceAfter: number;
	/** The slot a fixed item takes, from 0; -1 in the flow. */
	slot: number;
	/** Variants given one by one (a menu file's `variants`); null for the item's own text and action, or "A|B" when `ini`. */
	variants: Variant[] | null;
	/** The plugin that gave it, as `callingPlugin()` numbers it: it goes when that plugin stops. 0 for the module's own - a menu file's, a Pawn plugin's. */
	from: number;
}

/** An item made in code, or read from a YAML or JSON file: its text and action, in `slot` - -1 for the flow. */
export function blankItem(label: MenuText, action: string, slot: number) {
	const item: MenuItem = { label, action, placeholder: "", visible: null, enabled: [], message: null, ini: false, condition: "", restriction: "", restrictionMessage: "", spaceBefore: 0, spaceAfter: 0, slot, variants: null, from: 0 };
	return item;
}

/** An item as menu.ini's columns and the mc_* natives give it. */
export function iniItem(label: string, placeholder: string, condition: string, action: string, restriction: string, message: string, slot: number) {
	const item = blankItem(label, action, slot);
	item.ini = true;
	item.placeholder = placeholder;
	item.condition = condition;
	item.restriction = restriction;
	item.restrictionMessage = message;
	return item;
}

/** Puts an item among the menu's items: at `at`, from 0, or at the end when it is -1 or past them. */
export function insertItem(menu: string, item: MenuItem, at: number) {
	const items = stateOf(menu).items;
	if (at >= 0 && at < items.length) items.splice(at, 0, item);
	else items.push(item);
}

/** A requirement of a menu file: its names, and the message beside the item while they do not hold - "" for the item's. */
export interface RequirementSpec {
	when: string;
	message: string;
}

/** An item as a menu file describes it, whatever the file's format. */
export interface ItemSpec {
	name: string;
	placeholder: string;
	action: string;
	/** Whether it is INI's: "A|B" variants, and the three columns below. */
	ini: boolean;
	condition: string;
	restriction: string;
	restrictionMessage: string;
	/** YAML's and JSON's: names the item is shown under, "" for always. */
	visible: string;
	enabled: RequirementSpec[];
	message: string;
	spaceBefore: number;
	spaceAfter: number;
	/** The slot of a fixed item, from 0; -1 in the flow. */
	slot: number;
	variants: Variant[] | null;
}

/** A filter of a list menu as a menu file gives it: INI's condition, or YAML's and JSON's `when`. */
export interface FilterSpec {
	condition: string;
	when: string;
	message: string;
}

/**
 * What a name in a menu file names: checked once every plugin has had its
 * say. A "requirement" - YAML's and JSON's `visible`, `enabled`, `when` - is a
 * restriction or a condition; INI's columns are one or the other.
 */
export type NameKind = "condition" | "action" | "restriction" | "requirement" | "placeholder";

/** A name a menu file uses, and where: "configs/menu.yaml:12:9". */
export interface NameUse {
	kind: NameKind;
	name: string;
	where: string;
	/** An INI item's condition or action column: "A|B", a line a variant. */
	variants: boolean;
}

/** A menu as a menu file describes it, whatever the file's format. */
export interface MenuSpec {
	name: string;
	title: string;
	activeOn: string;
	hideBack: boolean;
	hideExit: boolean;
	locked: boolean;
	sharedTimer: boolean;
	time: number;
	onTimeout: string;
	/** An items menu's items; a list menu's row template, its VIEW. */
	items: ItemSpec[];
	fixed: ItemSpec[];
	filters: FilterSpec[];
	names: NameUse[];
}

/** What a menu file holds: its menus, and the words of [MAIN] - "" for those it leaves out. */
export interface MenuFile {
	/** The file's path; "" when no file was found. */
	file: string;
	/** Whether the file has nothing at all in it: the fallback file is read instead. */
	empty: boolean;
	labels: Labels;
	menus: MenuSpec[];
}

/** Rows of a list menu that fail it are left out; `message` says so when none is left. */
export interface ListFilter {
	/** Condition names, as menu.ini and Pawn plugins give them; "" otherwise. */
	condition: string;
	/** Names, as a YAML or JSON file's `when` gives them; "" otherwise. */
	when: string;
	test: RowTest | null;
	message: string;
	/** The plugin that gave it, as `callingPlugin()` numbers it: it goes when that plugin stops. 0 for the module's own - a menu file's, a Pawn plugin's. */
	from: number;
}

/** What a menu has besides its public fields: its items, filters and its own placeholders. */
export interface MenuState {
	items: MenuItem[];
	/** Items that keep their slot on every page. */
	fixed: MenuItem[];
	filters: ListFilter[];
	placeholders: PlaceholderEntry[];
	/** The menu opens only while it says yes; null for always. */
	activeWhen: ItemTest | null;
	/** The plugin that made the menu in code, as `callingPlugin()` numbers it: the menu goes when that plugin stops. 0 for the module's own. */
	from: number;
}

const states = new Map<string, MenuState>();

/** The state of the menu of that name, made on first use. */
export function stateOf(name: string) {
	if (!states.has(name)) {
		const made: MenuState = { items: [], fixed: [], filters: [], placeholders: [], activeWhen: null, from: 0 };
		states.set(name, made);
	}

	return states.get(name);
}

/** Forgets the state of the menu of that name: a menu that went. */
export function forgetState(name: string) {
	states.delete(name);
}

/**
 * The text a MenuText gives for the context: a string given for it is already
 * a function returning it, as the compiler holds this type.
 */
export function textOf(value: MenuText, context: MenuContext) {
	// @ts-ignore: a function here - see MenuText
	return value(context);
}

/**
 * An item's `enabled` as the list of requirements it is held as: a function
 * given for it is already a list of one, `[{ when: test }]`.
 */
export function checksOf(enabled: ((context: MenuContext) => boolean) | Requirement[]) {
	// @ts-ignore: a list here - see MenuItemOptions.enabled
	const requirements: Requirement[] = enabled;
	return requirements.map(checkOf);
}

/** A requirement from code, as an item holds it. */
function checkOf(requirement: Requirement) {
	const check: Check = { test: requirement.when, when: "", message: requirement.message ?? null };
	return check;
}

/** A list menu's filter by condition names - menu.ini's FILTER, a Pawn plugin's MP_FILTER. */
export function addNamedFilter(menu: string, condition: string, message: string) {
	if (condition.length == 0) return;
	stateOf(menu).filters.push({ condition, when: "", test: null, message, from: 0 });
}

export interface ConditionEntry {
	name: string;
	test: ConditionTest;
	/** The plugin that gave it, as `callingPlugin()` numbers it: it goes when that plugin stops. 0 for the module's own - a menu file's, a Pawn plugin's. */
	from: number;
}

export interface ActionEntry {
	name: string;
	run: ActionHandler;
	/** The plugin that gave it, as `callingPlugin()` numbers it: it goes when that plugin stops. 0 for the module's own - a menu file's, a Pawn plugin's. */
	from: number;
}

export interface PlaceholderEntry {
	name: string;
	value: PlaceholderValue;
	/** The plugin that gave it, as `callingPlugin()` numbers it: it goes when that plugin stops. 0 for the module's own - a menu file's, a Pawn plugin's. */
	from: number;
}

export interface RestrictionEntry {
	name: string;
	test: RestrictionTest;
	message: string;
	/** The plugin that gave it, as `callingPlugin()` numbers it: it goes when that plugin stops. 0 for the module's own - a menu file's, a Pawn plugin's. */
	from: number;
}

export interface ActionCheck {
	menu: string;
	action: string;
	test: ActionTest;
	/** The plugin that gave it, as `callingPlugin()` numbers it: it goes when that plugin stops. 0 for the module's own - a menu file's, a Pawn plugin's. */
	from: number;
}

export interface FilterEntry {
	name: string;
	filter: ConditionFilter;
	/** The plugin that gave it, as `callingPlugin()` numbers it: it goes when that plugin stops. 0 for the module's own - a menu file's, a Pawn plugin's. */
	from: number;
}

export interface SourceEntry {
	/** The menu's name upper-cased: any case names the same menu's source. */
	menu: string;
	rows: ListSource;
	/** The plugin that gave it, as `callingPlugin()` numbers it: it goes when that plugin stops. 0 for the module's own - a menu file's, a Pawn plugin's. */
	from: number;
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
