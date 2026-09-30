/**
 * Menu Core's menu file: INI as menu_core reads it, or YAML and JSON with
 * named fields, read into one description of each menu. What does not fit -
 * an unknown key, a value of the wrong kind - is said in the server console
 * with the file and the line. Not part of the API.
 */
import * as configs from "@amxts/config-core";
import { ConfigKind, ConfigNode } from "@amxts/config-core";
import { FilterSpec, ItemSpec, MenuFile, MenuSpec, NameKind, RequirementSpec, Variant } from "./internal";

/** The keys of a YAML or JSON menu file, each place its own. */
const FILE_KEYS = ["chatPrefix", "labels", "menus"];
const LABEL_KEYS = ["exit", "back", "next", "number", "disabled", "page", "time"];
const MENU_KEYS = ["title", "activeOn", "hideBack", "hideExit", "locked", "sharedTimer", "time", "onTimeout", "items", "fixedItems", "filters", "view"];
const ITEM_KEYS = ["name", "placeholder", "action", "visible", "enabled", "message", "spaceBefore", "spaceAfter", "variants"];
const FIXED_KEYS = ["slot", "name", "placeholder", "action", "visible", "enabled", "message", "spaceBefore", "spaceAfter", "variants"];
const VIEW_KEYS = ["name", "action", "enabled", "message", "variants"];
const VARIANT_KEYS = ["name", "when", "action"];
const REQUIREMENT_KEYS = ["when", "message"];
const FILTER_KEYS = ["when", "message"];

/** The keys of an INI menu file, as menu_core knows them. */
const INI_MAIN_KEYS = ["PREFIX", "KEY"];
const INI_LABEL_KEYS = ["EXIT", "BACK", "NEXT", "NUMBER", "DISABLED", "PAGE", "TIME"];
const INI_MENU_KEYS = ["TITLE", "ACTIVE_ON", "HIDE_BACK", "HIDE_EXIT", "TIME", "ON_TIMEOUT", "LOCKED", "GLOBAL", "ITEMS", "FIXED_ITEMS", "FILTER", "VIEW"];

const DIGITS = "0123456789";
const NAME_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
const BACKSLASH = "\\";
/** The letters of the colours a menu has: `!y` in a menu file, and a backslash before them in Pawn's text. */
const COLOUR_LETTERS = ["y", "r", "w", "d", "R"];

/** Where a value is: "configs/menu.yaml:12:9" - without the column where the file does not keep it (INI). */
export function whereOf(node: ConfigNode) {
	return node.column > 0 ? `${node.file}:${node.line}:${node.column}` : `${node.file}:${node.line}`;
}

export function warn(where: string, message: string) {
	console.warn(`[MenuCore] ${where}: ${message}`);
}

/**
 * A text of the file, as it is. A colour in it is a tag, `!y`: Pawn's code -
 * a backslash and the letter - is warned of with the tag to write, and is
 * left out when the menu is drawn.
 */
function fileText(text: string, where: string) {
	const codes = COLOUR_LETTERS.filter(letter => text.includes(`${BACKSLASH}${letter}`));
	if (codes.length == 0) return text;
	const fixes = codes.map(letter => `!${letter} for ${BACKSLASH}${letter}`).join(", ");
	warn(where, `"${text}": a colour is a tag in a menu file - write ${fixes}; the codes are left out`);
	return text;
}

/** What may be meant but is worth a look: said in the console, not warned of. */
function note(where: string, message: string) {
	console.info(`[MenuCore] ${where}: ${message}`);
}

/** An item of a file with no action - in no variant either: choosing it does nothing. */
function noteIfIdle(item: ItemSpec, where: string) {
	const variants = item.variants;
	const actions = variants != null ? variants.map(variant => variant.action) : item.ini ? item.action.split("|") : [item.action];
	const idle = actions.every(action => action.trim().length == 0);
	if (idle) note(where, `the item "${item.name}" has no action: choosing it does nothing`);
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
	if (bestDistance <= limit) return ` - did you mean "${best}"?`;
	const longer = known.filter(each => wordAdded(name, each)).sort((a, b) => a.length - b.length);
	return longer.length > 0 ? ` - did you mean "${longer[0]}"?` : "";
}

/** Whether `longer` is `name` with a word added before or after it, case aside: ADMIN - IS_ADMIN. */
function wordAdded(name: string, longer: string) {
	const upper = name.toUpperCase();
	const other = longer.toUpperCase();
	return other.endsWith(`_${upper}`) || other.startsWith(`${upper}_`);
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

function emptyItem(slot: number, ini: boolean) {
	const item: ItemSpec = { name: "", placeholder: "", action: "", ini, condition: "", restriction: "", restrictionMessage: "", visible: "", enabled: [], message: "", spaceBefore: 0, spaceAfter: 0, slot, variants: null };
	return item;
}

function emptyMenu(name: string) {
	const menu: MenuSpec = { name, title: "", activeOn: "", hideBack: false, hideExit: false, locked: false, sharedTimer: false, time: 0, onTimeout: "", items: [], fixed: [], filters: [], names: [] };
	return menu;
}

/** Records the names a line uses, for the check once every plugin has registered its own. */
function use(menu: MenuSpec, kind: NameKind, line: string, where: string, variants = false) {
	if (line.trim().length > 0) menu.names.push({ kind, name: line, where, variants });
}

/** Records the %placeholders% a text uses. */
function usePlaceholders(menu: MenuSpec, text: string, where: string) {
	const parts = text.split("%");
	// Between two % signs - the odd parts - a name of letters, digits and _.
	for (let i = 1; i < parts.length - 1; i += 2) {
		const name = parts[i];
		const isName = name.length > 0 && name.split("").every(letter => NAME_LETTERS.includes(letter));
		if (isName) menu.names.push({ kind: "placeholder", name, where, variants: false });
	}
}

/** Warns of the keys of an object that are not among `known`; `folded` compares them in capitals (INI). */
function checkKeys(node: ConfigNode, known: string[], what: string, folded: boolean) {
	for (const child of node.values()) {
		const key = folded ? child.key.toUpperCase() : child.key;
		if (known.includes(key)) continue;
		const hint = folded ? "" : iniName(child.key, known);
		warn(whereOf(child), `unknown key "${child.key}" in ${what}${hint.length > 0 ? hint : suggestion(child.key, known)}`);
	}
}

/**
 * " - did you mean ..." for an INI column's name where a YAML or JSON file
 * has another: an item's condition is `visible` or `enabled`, its
 * restriction `enabled`, a variant's or a filter's condition `when`.
 */
function iniName(key: string, known: string[]) {
	const names = key == "condition" ? ["visible", "enabled", "when"] : key == "restriction" ? ["enabled"] : key == "restrictionMessage" ? ["message"] : [];
	const meant = names.filter(name => known.includes(name)).map(name => `"${name}"`);
	return meant.length > 0 ? ` - did you mean ${meant.join(" or ")}?` : "";
}

/** Where a member of an object is, or the object when it has none of that key. */
function whereIn(node: ConfigNode, key: string) {
	const found = node.get(key);
	return whereOf(found ?? node);
}

function textField(node: ConfigNode, key: string) {
	const value = node.get(key);
	if (value == null || value.kind == "null") return "";
	if (value.kind == "string" || value.kind == "number") return fileText(value.getString(), whereOf(value));
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
	if (kind == "requirement") checkParamLast(value);
	return line;
}

/** A list of requirements is one line: "NAME:param" takes the rest of it, so it goes last. */
function checkParamLast(value: ConfigNode) {
	const entries = value.values();
	const at = entries.findIndex(each => each.getString().includes(":"));
	if (at >= 0 && at < entries.length - 1) warn(whereOf(entries[at]), `"${entries[at].getString()}" takes the rest of the line - NAME:param goes last`);
}

/**
 * `enabled`: a line of names, the item's `message` beside it - or a list of
 * requirements, each a line of names or `{ when, message }` with its own.
 */
function enabledField(node: ConfigNode, menu: MenuSpec) {
	const value = node.get("enabled");
	const requirements: RequirementSpec[] = [];
	if (value == null || value.kind == "null") return requirements;

	if (value.kind == "string") {
		const line = namesField(node, "enabled", "requirement", menu);
		if (line.trim().length > 0) requirements.push({ when: line, message: "" });
		return requirements;
	}

	if (value.kind != "array") {
		warn(whereOf(value), `"enabled" is a name, a list of names or a list of { when, message }, not ${kindWords(value.kind)}`);
		return requirements;
	}

	for (const each of value.values()) {
		const requirement = requirementOf(each, menu);
		if (requirement != null) requirements.push(requirement);
	}
	return requirements;
}

/** One of `enabled`'s list: a line of names, or `{ when, message }`; null for one that says nothing. */
function requirementOf(node: ConfigNode, menu: MenuSpec) {
	if (node.kind == "string") {
		const line = node.getString();
		use(menu, "requirement", line, whereOf(node));
		const named: RequirementSpec = { when: line, message: "" };
		return line.trim().length > 0 ? named : null;
	}

	if (node.kind != "object") {
		warn(whereOf(node), `a requirement is a name or { when: ..., message: ... }, not ${kindWords(node.kind)}`);
		return null;
	}

	checkKeys(node, REQUIREMENT_KEYS, "a requirement", false);
	const requirement: RequirementSpec = { when: namesField(node, "when", "requirement", menu), message: textField(node, "message") };

	if (requirement.when.length == 0) {
		warn(whereOf(node), `a requirement without "when"`);
		return null;
	}

	return requirement;
}

/** An object where one is wanted; a warning for anything else. */
function isObject(node: ConfigNode, what: string, shape: string) {
	if (node.kind == "object") return true;
	warn(whereOf(node), `${what} is an object: ${shape}, not ${kindWords(node.kind)}`);
	return false;
}

function treeVariant(node: ConfigNode, menu: MenuSpec) {
	if (!isObject(node, "a variant", "{ name: ..., when: ..., action: ... }")) return null;
	checkKeys(node, VARIANT_KEYS, "a variant", false);
	const variant: Variant = { name: textField(node, "name"), when: namesField(node, "when", "requirement", menu), action: namesField(node, "action", "action", menu) };
	usePlaceholders(menu, variant.name, whereIn(node, "name"));
	if (variant.name.length == 0) warn(whereOf(node), "a variant without a name");
	return variant.name.length > 0 ? variant : null;
}

/** An item, a fixed item or a list menu's view, by `keys`; null for one that cannot be drawn. */
function treeItem(node: ConfigNode, keys: string[], what: string, menu: MenuSpec) {
	if (!isObject(node, what, "{ name: ..., action: ... }")) return null;
	checkKeys(node, keys, what, false);
	const item = emptyItem(-1, false);
	item.name = textField(node, "name");
	if (keys.includes("placeholder")) item.placeholder = textField(node, "placeholder");
	item.action = namesField(node, "action", "action", menu);
	if (keys.includes("visible")) item.visible = namesField(node, "visible", "requirement", menu);
	item.enabled = enabledField(node, menu);
	item.message = textField(node, "message");
	if (keys.includes("spaceBefore")) item.spaceBefore = numberField(node, "spaceBefore");
	if (keys.includes("spaceAfter")) item.spaceAfter = numberField(node, "spaceAfter");
	usePlaceholders(menu, item.name, whereIn(node, "name"));
	usePlaceholders(menu, item.placeholder, whereIn(node, "placeholder"));
	const listed = listField(node, "variants");

	if (listed.length > 0) {
		const named = item.name.length > 0 || item.action.length > 0;
		if (named) warn(whereOf(node), `${what} with variants takes its name and action from them`);
		const variants: Variant[] = [];
		for (const each of listed) {
			const variant = treeVariant(each, menu);
			if (variant != null) variants.push(variant);
		}
		item.variants = variants.length > 0 ? variants : null;
		item.name = variants.length > 0 ? variants[0].name : "";
		item.action = "";
	}

	if (item.name.length == 0) warn(whereOf(node), `${what} without a name`);
	// A list menu's rows may bring actions of their own.
	if (item.name.length > 0 && keys != VIEW_KEYS) noteIfIdle(item, whereOf(node));
	return item.name.length > 0 ? item : null;
}

function treeFilter(node: ConfigNode, menu: MenuSpec) {
	if (!isObject(node, "a filter", "{ when: ..., message: ... }")) return null;
	checkKeys(node, FILTER_KEYS, "a filter", false);
	const filter: FilterSpec = { condition: "", when: namesField(node, "when", "requirement", menu), message: textField(node, "message") };
	if (filter.when.length == 0) warn(whereOf(node), `a filter without "when"`);
	return filter.when.length > 0 ? filter : null;
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

	return withItems(menu, whereOf(node));
}

/** A menu with nothing in it is no menu: said once, as the file is read, and left out of it. */
function withItems(menu: MenuSpec, where: string) {
	if (menu.items.length + menu.fixed.length > 0) return menu;
	warn(where, `the menu "${menu.name}" has no items, so it is not a menu`);
	return null;
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

/** A flag of an INI menu: YES or NO. Anything else is warned of, with the word to write, and is NO. */
function iniFlag(section: ConfigNode, key: string) {
	const node = section.get(key);
	const value = first(node);
	if (node == null || value.length == 0 || value == "NO") return false;
	if (value == "YES") return true;
	warn(whereOf(node), `${key} is YES or NO, not "${value}"${flagFix(value)}`);
	return false;
}

/** " - write YES" for a flag written some other way that means yes, " - write NO" for no; "" for anything else. */
function flagFix(value: string) {
	const lower = value.toLowerCase();
	if (["yes", "true", "on", "1"].includes(lower)) return " - write YES";
	if (["no", "false", "off", "0"].includes(lower)) return " - write NO";
	return "";
}

/**
 * Whether a block has nothing in it. Config Core reads `{` and `}` on lines
 * of their own as an object - no row in it is not `key = value` - and
 * `ITEMS = { }` on one line as the values "{" and "}".
 */
function isEmptyBlock(block: ConfigNode) {
	if (block.kind == "object") return block.keys().length == 0;
	return block.getStrings().join("") == "{}";
}

/** The rows of a block, each as its columns; a warning for anything that is not a block of rows. */
function iniRows(section: ConfigNode, key: string) {
	const block = section.get(key);
	const rows: ConfigNode[] = [];
	if (block == null || isEmptyBlock(block)) return rows;

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
	const item = emptyItem(-1, true);
	let next = at;
	item.name = fileText(column(columns, next++), where);
	if (placeholder) item.placeholder = fileText(column(columns, next++), where);
	item.condition = column(columns, next++);
	item.action = column(columns, next++);
	item.restriction = column(columns, next++);
	item.restrictionMessage = fileText(column(columns, next++), where);
	usePlaceholders(menu, item.name, where);
	usePlaceholders(menu, item.placeholder, where);
	use(menu, "condition", item.condition, where, true);
	use(menu, "action", item.action, where, true);
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
			noteIfIdle(item, whereOf(row));
			setSpacing(item, column(columns, 6));
			menu.items.push(item);
		}
		return;
	}

	for (const row of iniRows(section, "FILTER")) {
		const columns = row.getStrings();
		const filter: FilterSpec = { condition: column(columns, 0), when: "", message: fileText(column(columns, 1), whereOf(row)) };
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
	menu.title = fileText(title, whereOf(section));
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
		noteIfIdle(item, whereOf(row));
		const slot = toInt(column(columns, 0));
		if (slot < 1 || slot > 7) warn(whereOf(row), `the slot of a fixed item is its key, 1 to 7, not "${column(columns, 0)}"`);
		item.slot = slot - 1;
		setSpacing(item, column(columns, 7));
		menu.fixed.push(item);
	}

	return withItems(menu, whereOf(section));
}

/** An INI menu file: [MAIN] with the words, a [section] a menu. */
function readIni(root: ConfigNode, file: MenuFile) {
	const main = root.get("MAIN");

	if (main != null && main.kind == "object") {
		checkKeys(main, INI_MAIN_KEYS, "[MAIN]", true);
		file.labels.prefix = fileText(first(main.get("PREFIX")), whereOf(main));
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
	file.labels.exit = iniLabel(key, "EXIT");
	file.labels.back = iniLabel(key, "BACK");
	file.labels.next = iniLabel(key, "NEXT");
	file.labels.number = iniLabel(key, "NUMBER");
	file.labels.disabled = iniLabel(key, "DISABLED");
	file.labels.page = iniLabel(key, "PAGE");
	file.labels.time = iniLabel(key, "TIME");
}

/** A word of KEY: a lang key, or the text itself. */
function iniLabel(key: ConfigNode, name: string) {
	const node = key.get(name);
	return fileText(first(node), whereOf(node ?? key));
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
