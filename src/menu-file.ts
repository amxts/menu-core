/**
 * Menu Core's menu file: INI as menu_core reads it, or YAML and JSON with
 * named fields, read into one description of each menu. What does not fit -
 * an unknown key, a value of the wrong kind - is said in the server console
 * with the file and the line. Not part of the API.
 */
import * as configs from "@amxts/config-core";
import { ConfigKind, ConfigNode } from "@amxts/config-core";
import { FilterSpec, ItemSpec, MenuFile, MenuSpec, NameKind, Variant } from "./internal";

/** The keys of a YAML or JSON menu file, each place its own. */
const FILE_KEYS = ["chatPrefix", "labels", "menus"];
const LABEL_KEYS = ["exit", "back", "next", "number", "disabled", "page", "time"];
const MENU_KEYS = ["title", "activeOn", "hideBack", "hideExit", "locked", "sharedTimer", "time", "onTimeout", "items", "fixedItems", "filters", "view"];
const ITEM_KEYS = ["name", "placeholder", "condition", "action", "restriction", "message", "spaceBefore", "spaceAfter", "variants"];
const FIXED_KEYS = ["slot", "name", "placeholder", "condition", "action", "restriction", "message", "spaceBefore", "spaceAfter", "variants"];
const VIEW_KEYS = ["name", "condition", "action", "restriction", "message", "variants"];
const VARIANT_KEYS = ["name", "condition", "action"];
const FILTER_KEYS = ["condition", "message"];

/** The keys of an INI menu file, as menu_core knows them. */
const INI_MAIN_KEYS = ["PREFIX", "KEY"];
const INI_LABEL_KEYS = ["EXIT", "BACK", "NEXT", "NUMBER", "DISABLED", "PAGE", "TIME"];
const INI_MENU_KEYS = ["TITLE", "ACTIVE_ON", "HIDE_BACK", "HIDE_EXIT", "TIME", "ON_TIMEOUT", "LOCKED", "GLOBAL", "ITEMS", "FIXED_ITEMS", "FILTER", "VIEW"];

const DIGITS = "0123456789";
const NAME_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";

/** Where a value is: "configs/menu.yaml:12:9" - without the column where the file does not keep it (INI). */
export function whereOf(node: ConfigNode) {
	return node.column > 0 ? `${node.file}:${node.line}:${node.column}` : `${node.file}:${node.line}`;
}

export function warn(where: string, message: string) {
	console.warn(`[MenuCore] ${where}: ${message}`);
}

/** How many letters to add, remove, change or swap to turn one word into the other, case aside. */
function distance(a: string, b: string) {
	const x = a.toLowerCase().split("");
	const y = b.toLowerCase().split("");
	let before: number[] = [];
	let previous: number[] = [];
	for (let j = 0; j <= y.length; j++) previous.push(j);
	for (let i = 1; i <= x.length; i++) {
		const current = [i];
		for (let j = 1; j <= y.length; j++) {
			const cost = x[i - 1] == y[j - 1] ? 0 : 1;
			let best = Math.min(Math.min(previous[j] + 1, current[j - 1] + 1), previous[j - 1] + cost);
			const swapped = i > 1 && j > 1 && x[i - 1] == y[j - 2] && x[i - 2] == y[j - 1];
			if (swapped) best = Math.min(best, before[j - 2] + 1);
			current.push(best);
		}
		before = previous;
		previous = current;
	}
	return previous[y.length];
}

/** ` - did you mean "NAME"?` for the known name a slip away from `name`; "" when none is that close. */
export function suggestion(name: string, known: string[]) {
	let best = "";
	let bestDistance = Infinity;
	for (const each of known) {
		const away = distance(name, each);
		if (away >= bestDistance) continue;
		best = each;
		bestDistance = away;
	}
	const limit = name.length <= 4 ? 1 : Math.max(2, Math.floor(name.length / 4));
	return bestDistance <= limit ? ` - did you mean "${best}"?` : "";
}

/** "a list", "true or false", ... - a value's kind as a message says it. */
function kindWords(kind: ConfigKind) {
	if (kind == "object") return "an object";
	if (kind == "array") return "a list";
	if (kind == "boolean") return "true or false";
	if (kind == "number") return "a number";
	if (kind == "string") return "text";
	return "null";
}

function emptyItem(slot: number) {
	const item: ItemSpec = { name: "", placeholder: "", condition: "", action: "", restriction: "", message: "", spaceBefore: 0, spaceAfter: 0, slot, variants: null };
	return item;
}

function emptyMenu(name: string) {
	const menu: MenuSpec = { name, title: "", activeOn: "", hideBack: false, hideExit: false, locked: false, sharedTimer: false, time: 0, onTimeout: "", items: [], fixed: [], filters: [], names: [] };
	return menu;
}

/** Records the names a line uses, for the check once every plugin has registered its own. */
function use(menu: MenuSpec, kind: NameKind, line: string, where: string) {
	if (line.trim().length > 0) menu.names.push({ kind, name: line, where });
}

/** Records the %placeholders% a text uses. */
function usePlaceholders(menu: MenuSpec, text: string, where: string) {
	const parts = text.split("%");
	// Between two % signs - the odd parts - a name of letters, digits and _.
	for (let i = 1; i < parts.length - 1; i += 2) {
		const name = parts[i];
		const isName = name.length > 0 && name.split("").every(letter => NAME_LETTERS.includes(letter));
		if (isName) menu.names.push({ kind: "placeholder", name, where });
	}
}

/** Warns of the keys of an object that are not among `known`; `folded` compares them in capitals (INI). */
function checkKeys(node: ConfigNode, known: string[], what: string, folded: boolean) {
	for (const child of node.values()) {
		const key = folded ? child.key.toUpperCase() : child.key;
		if (!known.includes(key)) warn(whereOf(child), `unknown key "${child.key}" in ${what}${suggestion(child.key, known)}`);
	}
}

/** Where a member of an object is, or the object when it has none of that key. */
function whereIn(node: ConfigNode, key: string) {
	const found = node.get(key);
	return whereOf(found ?? node);
}

function textField(node: ConfigNode, key: string) {
	const value = node.get(key);
	if (value == null || value.kind == "null") return "";
	if (value.kind == "string" || value.kind == "number") return value.getString();
	warn(whereOf(value), `"${key}" is text, not ${kindWords(value.kind)}`);
	return "";
}

function flagField(node: ConfigNode, key: string) {
	const value = node.get(key);
	if (value == null || value.kind == "null") return false;
	if (value.kind == "boolean") return value.getBoolean();
	warn(whereOf(value), `"${key}" is true or false, not ${kindWords(value.kind)}`);
	return false;
}

function numberField(node: ConfigNode, key: string) {
	const value = node.get(key);
	if (value == null || value.kind == "null") return 0;
	if (value.kind == "number") return Math.trunc(value.getNumber());
	warn(whereOf(value), `"${key}" is a number, not ${kindWords(value.kind)}`);
	return 0;
}

function listField(node: ConfigNode, key: string) {
	const value = node.get(key);
	const none: ConfigNode[] = [];
	if (value == null || value.kind == "null") return none;
	if (value.kind == "array") return value.values();
	warn(whereOf(value), `"${key}" is a list, not ${kindWords(value.kind)}`);
	return none;
}

/** A line of names: one name, several space-separated, or a list of them. */
function namesField(node: ConfigNode, key: string, kind: NameKind, menu: MenuSpec) {
	const value = node.get(key);
	if (value == null || value.kind == "null") return "";
	const listed = value.kind == "array" && value.values().every(each => each.kind == "string");

	if (value.kind != "string" && !listed) {
		warn(whereOf(value), `"${key}" is a name or a list of names, not ${kindWords(value.kind)}`);
		return "";
	}

	const line = value.getStrings().join(" ");
	use(menu, kind, line, whereOf(value));
	return line;
}

/** An object where one is wanted; a warning for anything else. */
function isObject(node: ConfigNode, what: string, shape: string) {
	if (node.kind == "object") return true;
	warn(whereOf(node), `${what} is an object: ${shape}, not ${kindWords(node.kind)}`);
	return false;
}

function treeVariant(node: ConfigNode, menu: MenuSpec) {
	if (!isObject(node, "a variant", "{ name: ..., condition: ..., action: ... }")) return null;
	checkKeys(node, VARIANT_KEYS, "a variant", false);
	const variant: Variant = { name: textField(node, "name"), condition: namesField(node, "condition", "condition", menu), action: namesField(node, "action", "action", menu) };
	usePlaceholders(menu, variant.name, whereIn(node, "name"));
	if (variant.name.length == 0) warn(whereOf(node), "a variant without a name");
	return variant.name.length > 0 ? variant : null;
}

/** An item, a fixed item or a list menu's view, by `keys`; null for one that cannot be drawn. */
function treeItem(node: ConfigNode, keys: string[], what: string, menu: MenuSpec) {
	if (!isObject(node, what, "{ name: ..., action: ... }")) return null;
	checkKeys(node, keys, what, false);
	const item = emptyItem(-1);
	item.name = textField(node, "name");
	if (keys.includes("placeholder")) item.placeholder = textField(node, "placeholder");
	item.condition = namesField(node, "condition", "condition", menu);
	item.action = namesField(node, "action", "action", menu);
	item.restriction = namesField(node, "restriction", "restriction", menu);
	item.message = textField(node, "message");
	if (keys.includes("spaceBefore")) item.spaceBefore = numberField(node, "spaceBefore");
	if (keys.includes("spaceAfter")) item.spaceAfter = numberField(node, "spaceAfter");
	usePlaceholders(menu, item.name, whereIn(node, "name"));
	usePlaceholders(menu, item.placeholder, whereIn(node, "placeholder"));
	const listed = listField(node, "variants");

	if (listed.length > 0) {
		const named = item.name.length > 0 || item.condition.length > 0 || item.action.length > 0;
		if (named) warn(whereOf(node), `${what} with variants takes its name, condition and action from them`);
		const variants: Variant[] = [];
		for (const each of listed) {
			const variant = treeVariant(each, menu);
			if (variant != null) variants.push(variant);
		}
		item.variants = variants.length > 0 ? variants : null;
		item.name = variants.length > 0 ? variants[0].name : "";
		item.condition = "";
		item.action = "";
	}

	if (item.name.length == 0) warn(whereOf(node), `${what} without a name`);
	return item.name.length > 0 ? item : null;
}

function treeFilter(node: ConfigNode, menu: MenuSpec) {
	if (!isObject(node, "a filter", "{ condition: ..., message: ... }")) return null;
	checkKeys(node, FILTER_KEYS, "a filter", false);
	const filter: FilterSpec = { condition: namesField(node, "condition", "condition", menu), message: textField(node, "message") };
	if (filter.condition.length == 0) warn(whereOf(node), "a filter without a condition");
	return filter.condition.length > 0 ? filter : null;
}

function treeFixed(node: ConfigNode, menu: MenuSpec) {
	const item = treeItem(node, FIXED_KEYS, "a fixed item", menu);
	if (item == null) return null;
	const slot = numberField(node, "slot");

	if (slot < 1 || slot > 7) {
		warn(whereOf(node), `"slot" is the item's key, 1 to 7`);
		return null;
	}

	item.slot = slot - 1;
	return item;
}

/** A menu of a YAML or JSON file: its named fields. */
function treeMenu(node: ConfigNode) {
	const name = node.key;
	if (!isObject(node, `the menu "${name}"`, "{ title: ..., items: [...] }")) return null;
	checkKeys(node, MENU_KEYS, `the menu "${name}"`, false);
	const menu = emptyMenu(name);
	menu.title = textField(node, "title");

	if (menu.title.length == 0) {
		warn(whereOf(node), `the menu "${name}" has no title`);
		return null;
	}

	usePlaceholders(menu, menu.title, whereIn(node, "title"));
	menu.activeOn = namesField(node, "activeOn", "condition", menu);
	menu.hideBack = flagField(node, "hideBack");
	menu.hideExit = flagField(node, "hideExit");
	menu.locked = flagField(node, "locked");
	menu.sharedTimer = flagField(node, "sharedTimer");
	menu.time = numberField(node, "time");
	menu.onTimeout = namesField(node, "onTimeout", "action", menu);
	readTreeContent(node, menu);

	for (const each of listField(node, "fixedItems")) {
		const item = treeFixed(each, menu);
		if (item != null) menu.fixed.push(item);
	}

	return menu;
}

/** An items menu's items; a list menu's view and filters. */
function readTreeContent(node: ConfigNode, menu: MenuSpec) {
	const list = menu.name.startsWith("LIST_");
	const items = node.get("items");
	const view = node.get("view");
	const filters = node.get("filters");
	if (list && items != null) warn(whereOf(items), `a list menu draws its rows with "view" - "items" is not read`);
	if (!list && view != null) warn(whereOf(view), `"view" is for a list menu, whose name starts with LIST_`);
	if (!list && filters != null) warn(whereOf(filters), `"filters" are for a list menu, whose name starts with LIST_`);

	if (!list) {
		for (const each of listField(node, "items")) {
			const item = treeItem(each, ITEM_KEYS, "an item", menu);
			if (item != null) menu.items.push(item);
		}
		return;
	}

	const row = view != null ? treeItem(view, VIEW_KEYS, "the view", menu) : null;
	if (row != null) menu.items.push(row);
	for (const each of listField(node, "filters")) {
		const filter = treeFilter(each, menu);
		if (filter != null) menu.filters.push(filter);
	}
}

/** A YAML or JSON menu file: `chatPrefix`, `labels` and `menus`. */
function readTree(root: ConfigNode, file: MenuFile) {
	if (!isObject(root, "a menu file", "{ menus: { ... } }")) return;
	checkKeys(root, FILE_KEYS, "the menu file", false);
	file.labels.prefix = textField(root, "chatPrefix");
	const labels = root.get("labels");

	if (labels != null && isObject(labels, "\"labels\"", "{ exit: ..., back: ... }")) {
		checkKeys(labels, LABEL_KEYS, "\"labels\"", false);
		file.labels.exit = textField(labels, "exit");
		file.labels.back = textField(labels, "back");
		file.labels.next = textField(labels, "next");
		file.labels.number = textField(labels, "number");
		file.labels.disabled = textField(labels, "disabled");
		file.labels.page = textField(labels, "page");
		file.labels.time = textField(labels, "time");
	}

	const menus = root.get("menus");
	if (menus == null || !isObject(menus, "\"menus\"", "{ MAIN_MENU: { ... } }")) return;
	for (const node of menus.values()) {
		const menu = treeMenu(node);
		if (menu != null) file.menus.push(menu);
	}
}

/** An INI value as menu_core reads it: the first of a line of values. */
function first(node: ConfigNode | null) {
	if (node == null) return "";
	const values = node.getStrings();
	return values.length > 0 ? values[0] : "";
}

/** Every value of an INI line, space-separated. */
function all(node: ConfigNode | null) {
	return node != null ? node.getStrings().join(" ") : "";
}

function toInt(text: string) {
	const value = parseInt(text, 10);
	return isNaN(value) ? 0 : value;
}

function isInteger(text: string) {
	const digits = text.startsWith("-") ? text.slice(1) : text;
	return digits.length > 0 && digits.split("").every(letter => DIGITS.includes(letter));
}

/** YES, true, or a number other than 0, as menu_core reads a flag; anything else is warned of. */
function iniFlag(section: ConfigNode, key: string) {
	const node = section.get(key);
	const value = first(node);
	const lower = value.toLowerCase();
	const known = ["yes", "no", "true", "false"].includes(lower) || isInteger(value);
	if (node != null && value.length > 0 && !known) warn(whereOf(node), `${key} is YES or NO, not "${value}"`);
	return toInt(value) != 0 || lower == "true" || lower == "yes";
}

/** The rows of a block, each as its columns; a warning for anything that is not a block of rows. */
function iniRows(section: ConfigNode, key: string) {
	const block = section.get(key);
	const rows: ConfigNode[] = [];
	if (block == null) return rows;

	if (block.kind != "array") {
		warn(whereOf(block), `${key} is a block of rows in quotes: ${key} = { "..." "..." }`);
		return rows;
	}

	for (const row of block.values()) {
		if (row.kind == "object") warn(whereOf(row), `a row of ${key} is values in quotes, not "key = value"`);
		else rows.push(row);
	}
	return rows;
}

function column(row: string[], index: number) {
	return index < row.length ? row[index] : "";
}

/** Whether an item name gives an item - e.g. "A|B" gives two variants; "" and "|" give none. */
function givesItem(name: string) {
	return name.split("|").some(part => part.trim().length > 0);
}

/** "2" is two blank lines after the item; "1 2" one before and two after. */
function setSpacing(item: ItemSpec, spacing: string) {
	const parts = spacing.split(" ").filter(part => part.trim().length > 0);

	if (parts.length == 1) {
		item.spaceAfter = toInt(parts[0]);
		return;
	}

	item.spaceBefore = parts.length > 0 ? toInt(parts[0]) : 0;
	item.spaceAfter = parts.length > 1 ? toInt(parts[1]) : 0;
}

/** An INI row's item: its columns from `at` - name, placeholder (when `placeholder`), condition, action, restriction, message. */
function iniItem(row: ConfigNode, columns: string[], at: number, placeholder: boolean, menu: MenuSpec) {
	const where = whereOf(row);
	const item = emptyItem(-1);
	let next = at;
	item.name = column(columns, next++);
	if (placeholder) item.placeholder = column(columns, next++);
	item.condition = column(columns, next++);
	item.action = column(columns, next++);
	item.restriction = column(columns, next++);
	item.message = column(columns, next++);
	usePlaceholders(menu, item.name, where);
	usePlaceholders(menu, item.placeholder, where);
	use(menu, "condition", item.condition, where);
	use(menu, "action", item.action, where);
	use(menu, "restriction", item.restriction, where);
	return item;
}

/** ITEMS, or a list menu's FILTER and VIEW. */
function readIniContent(section: ConfigNode, menu: MenuSpec) {
	const list = menu.name.startsWith("LIST_");
	const items = section.get("ITEMS");
	if (list && items != null) warn(whereOf(items), "a list menu draws its rows with VIEW - ITEMS is not read");
	for (const key of ["VIEW", "FILTER"]) {
		const found = section.get(key);
		if (!list && found != null) warn(whereOf(found), `${key} is for a list menu, whose name starts with LIST_`);
	}

	if (!list) {
		for (const row of iniRows(section, "ITEMS")) {
			const columns = row.getStrings();
			if (!givesItem(column(columns, 0))) continue;
			const item = iniItem(row, columns, 0, true, menu);
			setSpacing(item, column(columns, 6));
			menu.items.push(item);
		}
		return;
	}

	for (const row of iniRows(section, "FILTER")) {
		const columns = row.getStrings();
		const filter: FilterSpec = { condition: column(columns, 0), message: column(columns, 1) };
		use(menu, "condition", filter.condition, whereOf(row));
		if (filter.condition.length > 0) menu.filters.push(filter);
	}

	const views = iniRows(section, "VIEW");
	if (views.length == 0) return;
	const columns = views[0].getStrings();
	if (givesItem(column(columns, 0))) menu.items.push(iniItem(views[0], columns, 0, false, menu));
}

/** A [section] with a TITLE: a menu, read as menu_core reads it. */
function iniMenu(section: ConfigNode) {
	const name = section.key;
	const title = first(section.get("TITLE"));
	const content = section.has("ITEMS") || section.has("VIEW") || section.has("FIXED_ITEMS");

	if (title.length == 0) {
		if (content) warn(whereOf(section), `[${name}] has no TITLE, so it is not a menu`);
		return null;
	}

	checkKeys(section, INI_MENU_KEYS, `[${name}]`, true);
	const menu = emptyMenu(name);
	menu.title = title;
	usePlaceholders(menu, title, whereOf(section));
	menu.activeOn = all(section.get("ACTIVE_ON"));
	use(menu, "condition", menu.activeOn, whereOf(section));
	menu.hideBack = iniFlag(section, "HIDE_BACK");
	menu.hideExit = iniFlag(section, "HIDE_EXIT");
	menu.locked = iniFlag(section, "LOCKED");
	menu.sharedTimer = iniFlag(section, "GLOBAL");
	const time = section.get("TIME");
	if (time != null && !isInteger(first(time))) warn(whereOf(time), `TIME is a number of seconds, not "${first(time)}"`);
	menu.time = toInt(first(time));
	menu.onTimeout = first(section.get("ON_TIMEOUT"));
	use(menu, "action", menu.onTimeout, whereOf(section));
	readIniContent(section, menu);

	for (const row of iniRows(section, "FIXED_ITEMS")) {
		const columns = row.getStrings();
		if (!givesItem(column(columns, 1))) continue;
		const item = iniItem(row, columns, 1, true, menu);
		const slot = toInt(column(columns, 0));
		if (slot < 1 || slot > 7) warn(whereOf(row), `the slot of a fixed item is its key, 1 to 7, not "${column(columns, 0)}"`);
		item.slot = slot - 1;
		setSpacing(item, column(columns, 7));
		menu.fixed.push(item);
	}

	return menu;
}

/** An INI menu file: [MAIN] with the words, a [section] a menu. */
function readIni(root: ConfigNode, file: MenuFile) {
	const main = root.get("MAIN");

	if (main != null && main.kind == "object") {
		checkKeys(main, INI_MAIN_KEYS, "[MAIN]", true);
		file.labels.prefix = first(main.get("PREFIX"));
		const key = main.get("KEY");
		if (key != null && key.kind == "object") checkKeys(key, INI_LABEL_KEYS, "KEY", true);
		if (key != null) readIniLabels(key, file);
	}

	for (const section of root.values()) {
		if (section.key.toUpperCase() == "MAIN" || section.kind != "object") continue;
		const menu = iniMenu(section);
		if (menu != null) file.menus.push(menu);
	}
}

function readIniLabels(key: ConfigNode, file: MenuFile) {
	file.labels.exit = first(key.get("EXIT"));
	file.labels.back = first(key.get("BACK"));
	file.labels.next = first(key.get("NEXT"));
	file.labels.number = first(key.get("NUMBER"));
	file.labels.disabled = first(key.get("DISABLED"));
	file.labels.page = first(key.get("PAGE"));
	file.labels.time = first(key.get("TIME"));
}

/**
 * The menu file of that name, from configs/ - name.ini, name.yaml, name.yml,
 * name.json or name.jsonc, whichever is there - with its menus described.
 */
export function readMenuFile(name: string) {
	const root = configs.read(name);
	const file: MenuFile = {
		file: root.file,
		empty: root.keys().length == 0,
		labels: { exit: "", back: "", next: "", number: "", disabled: "", page: "", time: "", prefix: "" },
		menus: [],
	};
	if (root.format == "ini") readIni(root, file);
	else readTree(root, file);
	return file;
}
