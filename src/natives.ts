/**
 * Menu Core for Pawn plugins: the 29 mc_* natives of the original
 * menu_core.amxx, as include/menu_core.inc declares them.
 */
import { Player, plugin } from "@amxts/core";
import {
	PawnFunction,
	caller,
	cellArrayRows,
	cellsText,
	createCellArray,
	destroyCellArray,
	pushCellArrayRow,
	textCells,
} from "@amxts/core/kit";
import * as menus from "./index";

plugin({ name: "Menu Core", version: "1.6.2", author: "kukson", description: "Menus from ini files: the mc_* natives" });

/**
 * Menu properties: mc_set_menu_property takes MP_LOCKED .. MP_HIDE_EXIT,
 * mc_set_menu_property_string MP_ON_TIMEOUT .. MP_FILTER, and
 * mc_get_menu_property_string MP_SECTION.
 */
export enum MenuProperty {
	MP_LOCKED = 0,
	MP_GLOBAL_TIMER = 1,
	MP_TIMER_DURATION = 2,
	MP_HIDE_BACK = 3,
	MP_HIDE_EXIT = 4,
	MP_SECTION = 5,
	// eslint-disable-next-line ts/no-duplicate-enum-values -- the include's own: 5 is read as the section and written as the timeout action
	MP_ON_TIMEOUT = 5,
	MP_ACTIVE_ON = 6,
	MP_FILTER = 7,
}

/** A list data source's item: 289 cells, laid out as menu_core.inc says. */
const ROW_CELLS = 289;
const PLACEHOLDER_CELLS = 256;

// What each native has registered: the numbers the originals return.
let conditionCount = 0;
let actionCount = 0;
let restrictionCount = 0;
let filterCount = 0;
let openCount = 0;
let closeCount = 0;
let showCount = 0;

/** A public of the plugin calling the native that is running; null when it has none of that name. */
function publicOf(name: string) {
	return PawnFunction.find(caller(), name);
}

/** A data source fills an `Array:` of 289-cell items; one that does not return 1 is not used. */
function rowsFrom(fn: PawnFunction, viewer: Player) {
	const items = createCellArray(ROW_CELLS);
	const answered = fn.call().int(viewer.id).int(items).run();
	const rows = answered == 1 ? cellArrayRows(items, ROW_CELLS).map(rowOf) : null;
	destroyCellArray(items);
	return rows;
}

/** [0] target, or -2 for a line of text; [1..64] action; [65..128] text; [129..160] restriction; [161..288] message. */
function rowOf(cells: number[]) {
	const text = cellsText(cells, 65, 64);
	if (cells[0] == -2) return menus.textRow(text);
	return menus.listRow(cells[0], text, cellsText(cells, 1, 64), cellsText(cells, 129, 32), cellsText(cells, 161, 128));
}

/** 1 or 0, as the original's natives answer. */
function answer(done: boolean) {
	return done ? 1 : 0;
}

/**
 * Registers a condition menus refer to - an item's condition, ACTIVE_ON, a
 * FILTER. The first plugin to register a name answers for it (case-insensitive).
 * Callback: public callback(id, viewerId, const name[]) - true when it holds.
 * Returns the condition's id.
 */
export function mc_register_condition(name: string, callback: string) {
	const fn = publicOf(callback);
	if (fn != null) menus.addCondition(name, (player, viewer, used) => fn.call().int(player.id).int(viewer.id).text(used).run() != 0);
	return conditionCount++;
}

/**
 * Registers an action run when an item is chosen. Built in, not registered:
 * SHOW_<SECTION> opens that menu, CLOSE_MENU closes it; an action line may
 * list several, space-separated. Names are case-sensitive; the first wins.
 * Callback: public callback(id, const action[]) in an items menu,
 * public callback(id, targetId) in a LIST_ menu. isCritical is accepted and
 * does nothing, as in the original. Returns the action's id.
 */
export function mc_register_action(name: string, callback: string, _isCritical = false) {
	const fn = publicOf(callback);

	if (fn != null) {
		menus.addAction(name, (player, target) => {
			const menu = menus.activeMenu(player);
			const call = fn.call().int(player.id);
			// An items menu's action gets the action's name, a list menu's the row's target.
			if (menu != null && menu.kind == "items") call.text(name);
			else call.int(target);
			call.run();
		});
	}

	return actionCount++;
}

/**
 * Registers a placeholder, %name% in titles and items, without the %.
 * Callback: public callback(id, targetId, value[], len) - fills value[].
 * A name registered again keeps the first. Returns the placeholder's id.
 */
export function mc_register_placeholder(name: string, callback: string) {
	const fn = publicOf(callback);
	return menus.addPlaceholder(name, (player, target) => {
		if (fn == null) return "";
		const call = fn.call().int(player.id).int(target).buffer(PLACEHOLDER_CELLS).int(PLACEHOLDER_CELLS - 1);
		call.run();
		return call.bufferText;
	});
}

/**
 * Registers the config file's [section] as a menu. Returns the menu's id, or
 * -1 when the section is missing, has no TITLE or no items, or is MAIN.
 */
export function mc_register_menu(section: string) {
	return menus.indexOf(menus.register(section));
}

/**
 * Shows a menu. time: countdown seconds, -1 for the menu's TIME (or the
 * countdown running). targetId: who a LIST_ menu is about. resetHistory
 * starts the way back anew; forceOpen opens over a menu that holds on (a
 * countdown, a lock); ignoreHistory leaves this menu out of the way back.
 * Returns 1 when it opened; 0 when the player is not in the game, there is no
 * such menu, a show filter or ACTIVE_ON stopped it.
 */
export function mc_show_menu(player: Player, section: string, time = -1, targetId = 0, resetHistory = false, forceOpen = false, ignoreHistory = false) {
	return answer(menus.show(player, section, { time, target: targetId, resetHistory, force: forceOpen, skipHistory: ignoreHistory }));
}

/**
 * Sets the menu's shared countdown: starts one of `time` seconds when none
 * runs, or changes the seconds left (0 stops it). Returns 1, or 0 when there
 * is no such menu or nothing to change.
 */
export function mc_set_menu_timer(section: string, time: number) {
	const menu = menus.find(section);
	return answer(menu != null && menus.setTimer(menu, time));
}

/** Draws again every menu that uses the condition, for whoever looks at it. */
export function mc_notify_condition_changed(condition: string) {
	menus.conditionChanged(condition);
}

/** Draws the menus again (space-separated names) for whoever looks at them. Returns how many were drawn. */
export function mc_refresh_menu(sections: string) {
	return menus.refresh(sections);
}

/**
 * Registers a restriction items name in their restriction column; "*"
 * answers for every name no other restriction does. Callback:
 * public callback(id, const restrictName[], targetId) - true when the player
 * passes. message is said beside an item it greys out, when the item has no
 * message of its own. Returns the restriction's id.
 */
export function mc_register_restriction(name: string, callback: string, message?: string) {
	const fn = publicOf(callback);
	if (fn != null) menus.addRestriction(name, (player, used, target) => fn.call().int(player.id).text(used).int(target).run() != 0, message);
	return restrictionCount++;
}

/**
 * Greys out items whose action is actionName in menuSection while the
 * callback says no; "" for either matches all. Callback:
 * public callback(id, const menuSection[], const actionName[]). Returns 1.
 */
export function mc_register_action_condition(menuSection: string, actionName: string, callback: string) {
	const fn = publicOf(callback);
	if (fn != null) menus.addActionCheck(menuSection, actionName, (player, menu, action) => fn.call().int(player.id).text(menu).text(action).run() != 0);
	return 1;
}

/**
 * Registers a filter over a condition someone else registered: it gets the
 * condition's value and returns the one to use. Callback:
 * public bool:callback(id, viewerId, const condition[], bool:currentVal).
 * Returns the filter's id.
 */
export function mc_register_condition_filter(condition: string, callback: string) {
	const fn = publicOf(callback);
	if (fn == null) return filterCount - 1;
	menus.addConditionFilter(condition, (player, viewer, name, value) => fn.call().int(player.id).int(viewer.id).text(name).bool(value).run() != 0);
	return filterCount++;
}

/**
 * The rows of a LIST_ menu, instead of the players. Callback:
 * public callback(id, Array:items) - pushes 289-cell items and returns 1:
 * [0] the target the action gets (-2: a line of text), [1..64] an action of
 * its own, [65..128] the text (%name%), [129..160] a restriction,
 * [161..288] the message when it greys the row out. A second source for the
 * menu replaces the first. Returns the source's id.
 */
export function mc_register_list_data_source(menuName: string, callback: string) {
	const fn = publicOf(callback);
	return menus.setListSource(menuName, viewer => (fn != null ? rowsFrom(fn, viewer) : null));
}

/** Called when a menu opens. Callback: public callback(id, const section[]). Returns its id. */
export function mc_register_menu_open_callback(callback: string) {
	const fn = publicOf(callback);
	if (fn == null) return openCount - 1;
	menus.addEventListener("open", event => fn.call().int(event.player.id).text(event.menu).run());
	return openCount++;
}

/**
 * Called when a menu closes - by a key, a timeout, another menu opening over
 * it, the player leaving. Callback: public callback(id, const section[], bool:isTimeout).
 * Returns its id.
 */
export function mc_register_menu_close_callback(callback: string) {
	const fn = publicOf(callback);
	if (fn == null) return closeCount - 1;
	menus.addEventListener("close", event => fn.call().int(event.player.id).text(event.menu).bool(event.timeout).run());
	return closeCount++;
}

/**
 * Asked before any menu opens; returning false stops it (mc_show_menu returns
 * 0) - the place to tell the player why. Callback:
 * public bool:callback(id, const section[]). Returns its id.
 */
export function mc_register_show_filter(callback: string) {
	const fn = publicOf(callback);
	if (fn == null) return showCount - 1;
	// The first filter that says no stops the menu; the ones after it are not asked.
	menus.addEventListener("show", (event) => {
		if (!event.defaultPrevented && fn.call().int(event.player.id).text(event.menu).run() == 0) event.preventDefault();
	});
	return showCount++;
}

/** Stops the menu's shared countdown and closes it for everyone. Returns 1, or 0 when none ran. */
export function mc_cancel_menu_timer(section: string) {
	const menu = menus.find(section);
	return answer(menu != null && menus.cancelTimer(menu));
}

/** Locks (or unlocks) the player's menu: nothing can be chosen, and no other menu replaces it. */
export function mc_lock_menu(player: Player, lock = true) {
	if (player.isConnected) menus.lock(player, lock);
}

/** Closes the player's menu. */
export function mc_hide_menu(player: Player) {
	if (player.isConnected) menus.close(player);
}

/** Whether the player's menu is locked. */
export function mc_is_menu_locked(player: Player) {
	return player.isConnected && menus.isLocked(player);
}

/** The id of the menu the player looks at, or -1. */
export function mc_get_active_menu(id: number) {
	const player = new Player(id);
	return player.isConnected ? menus.indexOf(menus.activeMenu(player)) : -1;
}

/**
 * A string property of a menu by its id (mc_get_active_menu): MP_SECTION, the
 * section name, into out[]. Returns its length; 0 when the id or the property
 * is not one.
 */
export function mc_get_menu_property_string(menuIdx: number, property: MenuProperty) {
	const menu = menus.menuAt(menuIdx);
	// 4 is what the original compared with; 5 is the include's MP_SECTION.
	if (menu == null || (property != MenuProperty.MP_SECTION && property != 4)) return "";
	return menu.name;
}

/**
 * Sets MP_LOCKED, MP_GLOBAL_TIMER, MP_TIMER_DURATION, MP_HIDE_BACK or
 * MP_HIDE_EXIT. Returns 1, or 0 when there is no such menu or property.
 */
export function mc_set_menu_property(section: string, property: MenuProperty, value: number) {
	const menu = menus.find(section);
	if (menu == null) return 0;
	const on = value != 0;
	if (property == MenuProperty.MP_LOCKED) menu.locked = on;
	else if (property == MenuProperty.MP_GLOBAL_TIMER) menu.sharedTimer = on;
	else if (property == MenuProperty.MP_TIMER_DURATION) menu.time = value;
	else if (property == MenuProperty.MP_HIDE_BACK) menu.hideBack = on;
	else if (property == MenuProperty.MP_HIDE_EXIT) menu.hideExit = on;
	else return 0;
	return 1;
}

/**
 * Sets MP_ON_TIMEOUT (the action when the countdown ends), MP_ACTIVE_ON (the
 * condition the menu opens under) or MP_FILTER ("CONDITION|MESSAGE", added to
 * a LIST_ menu's filters). Returns 1, or 0 when there is no such menu or
 * property.
 */
export function mc_set_menu_property_string(section: string, property: MenuProperty, value: string) {
	const menu = menus.find(section);
	if (menu == null) return 0;
	if (property == MenuProperty.MP_ON_TIMEOUT) menu.onTimeout = value;
	else if (property == MenuProperty.MP_ACTIVE_ON) menus.setActiveOn(menu, value);
	else if (property == MenuProperty.MP_FILTER) addFilter(menu, value);
	else return 0;
	return 1;
}

function addFilter(menu: menus.Menu, value: string) {
	if (menu.kind != "list") return;
	const pipe = value.indexOf("|");
	if (pipe < 0) menus.addFilter(menu, value.trim());
	else menus.addFilter(menu, value.slice(0, pipe).trim(), value.slice(pipe + 1).trim());
}

/**
 * Adds an item to a menu. name, condition and action take "A|B" variants: the
 * first whose condition holds is shown. iPosition: its place among the items,
 * -1 the end; emptyBefore/emptyAfter: blank lines around it. Returns 1, or 0
 * when there is no such menu or the name gives no item.
 */
export function mc_add_menu_item(section: string, name: string, placeholder?: string, condition?: string, action?: string, restriction?: string, restrictMsg?: string, iPosition = -1, emptyBefore = 0, emptyAfter = 0) {
	const menu = menus.find(section);
	if (menu == null) return 0;
	return answer(menus.addItem(menu, name, {
		placeholder,
		condition,
		action,
		restriction,
		restrictionMessage: restrictMsg,
		at: iPosition,
		spaceBefore: emptyBefore,
		spaceAfter: emptyAfter,
	}));
}

/**
 * Adds an item that always takes slot 1-7 of every page. Returns 1, or 0 when
 * there is no such menu or the name gives no item.
 */
export function mc_add_fixed_menu_item(section: string, slot: number, name: string, placeholder?: string, action?: string, condition?: string, restriction?: string, emptyBefore = 0, emptyAfter = 0) {
	const menu = menus.find(section);
	if (menu == null) return 0;
	return answer(menus.addFixedItem(menu, slot, name, {
		placeholder,
		action,
		condition,
		restriction,
		spaceBefore: emptyBefore,
		spaceAfter: emptyAfter,
	}));
}

/**
 * Adds a line of text - a header, a separator - to the items a data source
 * fills; call it from the data source callback. Returns 1.
 */
export function mc_add_list_text(aItems: number, text: string, centered = false) {
	const row = menus.textRow(text, centered);
	const cells = [-2].concat(textCells("", 64)).concat(textCells(row.text, 64)).concat(textCells("", 32)).concat(textCells("", 128));
	pushCellArrayRow(aItems, cells);
	return 1;
}

/** Removes every item of a menu, fixed ones too. Returns 1, or 0 when there is no such menu. */
export function mc_clear_menu_items(section: string) {
	const menu = menus.find(section);
	if (menu != null) menus.clearItems(menu);
	return answer(menu != null);
}

/**
 * Makes a menu in code, without a config section; a name starting with LIST_
 * makes a list menu. Returns 1, or 0 when a menu of that name is there.
 */
export function mc_create_menu(section: string, title: string) {
	if (menus.find(section) != null) return 0;
	menus.create(section, title);
	return 1;
}

/** The page, from 0, the player's menu is drawn at next. */
export function mc_set_menu_page(player: Player, page: number) {
	if (player.isConnected) menus.setPage(player, page);
}

/**
 * Not in the original menu_core: the text the player's menu shows now, colour
 * codes and all ("" when none is open) - for a test or a log to see what the
 * player sees.
 */
export function mc_get_menu_text(player: Player) {
	return player.isConnected ? menus.shownText(player) : "";
}
