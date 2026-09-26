// The tooltips of src/index.ts, in both languages: scripts/apply-docs.ts writes the
// one AMXTS_DOCS_LANG picks into the JSDoc above each element.
export default {
	setConfigFile: {
		en: `
			The file menus are read from, under configs/ and without ".ini"; read when a
			menu is first asked for. \`fallback\` is read instead when \`file\` has no sections.
		`,
		ru: `
			Файл, из которого читаются меню: путь от configs/ без ".ini"; читается, когда
			меню понадобится впервые. Если в \`file\` нет секций, читается \`fallback\`.
		`,
	},
	find: {
		en: `A menu by its name; null when there is none - see register() for one in the file.`,
		ru: `Меню по имени; null, если такого нет — меню из файла даёт register().`,
	},
	indexOf: {
		en: `A menu's place among all of them - what mc_get_active_menu gives Pawn; -1 for none.`,
		ru: `Номер меню среди всех — то, что mc_get_active_menu отдаёт Pawn; -1, если меню нет.`,
	},
	menuAt: {
		en: `The menu at that place among all of them - the reverse of indexOf(); null when there is none.`,
		ru: `Меню с этим номером среди всех — обратное к indexOf(); null, если такого нет.`,
	},
	register: {
		en: `The menu of the file's [name] section, read now if it is not yet; null when it has none or no items.`,
		ru: `Меню из секции [name] файла, прочитанное сейчас, если ещё не прочитано; null, если секции нет или в ней нет пунктов.`,
	},
	create: {
		en: `A menu made in code - or the one of that name already there. A name starting with LIST_ makes a list menu.`,
		ru: `Меню из кода — или уже существующее с этим именем. Имя на LIST_ даёт меню-список.`,
	},
	addItem: {
		en: `
			An item. "A|B" in the name, the condition or the action are variants: the
			first whose condition holds is shown. False when the name gives none.
		`,
		ru: `
			Пункт. "A|B" в имени, условии или действии — варианты: показывается первый,
			чьё условие выполнено. False, если имя не даёт ни одного варианта.
		`,
	},
	addFixedItem: {
		en: `An item that takes the same slot on every page: \`slot\` is its key, 1 to 7.`,
		ru: `Пункт, который на каждой странице занимает один и тот же слот: \`slot\` — его клавиша, от 1 до 7.`,
	},
	clearItems: {
		en: `Removes all items of the menu, fixed ones too.`,
		ru: `Удаляет все пункты меню, включая фиксированные.`,
	},
	addFilter: {
		en: `A list menu leaves out rows that fail \`condition\`; \`message\` is said when none is left.`,
		ru: `Меню-список пропускает строки, не прошедшие \`condition\`; если не осталось ни одной, игрок получает \`message\`.`,
	},
	setActiveOn: {
		en: `The menu opens only while \`condition\` holds.`,
		ru: `Меню открывается, только пока выполнено \`condition\`.`,
	},
	addCondition: {
		en: `A condition the file names; the first one registered under a name is the one asked.`,
		ru: `Условие, которое файл называет по имени; спрашивается то, что зарегистрировано под этим именем первым.`,
	},
	addAction: {
		en: `An action the file names; SHOW_<MENU> and CLOSE_MENU are built in.`,
		ru: `Действие, которое файл называет по имени; SHOW_<MENU> и CLOSE_MENU встроены.`,
	},
	addPlaceholder: {
		en: `What %name% stands for in titles and items. A name registered twice keeps the first.`,
		ru: `Чем заменяется %name% в заголовках и пунктах. Если имя зарегистрировано дважды, остаётся первое.`,
	},
	addRestriction: {
		en: `A restriction items name; "*" answers for every name nothing else does.`,
		ru: `Ограничение, которое пункты называют по имени; "*" отвечает за все имена, за которые не отвечает никто другой.`,
	},
	addActionCheck: {
		en: `Greys out items with \`action\` in \`menu\` while \`test\` says no; "" for either means every one.`,
		ru: `Гасит пункты с \`action\` в \`menu\`, пока \`test\` отвечает "нет"; "" в любом из них означает "все".`,
	},
	addConditionFilter: {
		en: `Another say on the condition \`name\`, whoever registered it.`,
		ru: `Своё слово в условии \`name\`, кто бы его ни зарегистрировал.`,
	},
	setListSource: {
		en: `The rows of the list menu \`menu\`, instead of the players; a second source replaces the first.`,
		ru: `Строки меню-списка \`menu\` вместо игроков; второй источник заменяет первый.`,
	},
	addEventListener: {
		en: `Calls \`listener\` on every menu event of \`type\`: "open", "close", or "show" before a menu opens.`,
		ru: `Вызывает \`listener\` на каждое событие меню типа \`type\`: "open", "close" или "show" до открытия меню.`,
	},
	listRow: {
		en: `A row for a list source.`,
		ru: `Строка для источника списка.`,
	},
	textRow: {
		en: `A line of text among a list source's rows; \`centered\` pads it to the middle of the menu.`,
		ru: `Строка текста среди строк источника списка; \`centered\` выравнивает её по середине меню.`,
	},
	show: {
		en: `
			Shows a menu; false when it does not open - no such menu, a "show"
			listener stopped it, ACTIVE_ON does not hold, or the player's menu holds on.
		`,
		ru: `
			Показывает меню; false, если оно не открылось — такого меню нет, его отменил
			обработчик "show", ACTIVE_ON не выполнено или меню игрока не уступает место.
		`,
	},
	close: {
		en: `Closes the player's menu; \`timeout\` tells the "close" listeners it ran out.`,
		ru: `Закрывает меню игрока; \`timeout\` сообщает обработчикам "close", что вышло время.`,
	},
	refresh: {
		en: `Draws the menus again for whoever looks at them; \`names\` are space-separated. How many were drawn.`,
		ru: `Перерисовывает меню у всех, кто их смотрит; \`names\` — через пробел. Возвращает, сколько перерисовано.`,
	},
	conditionChanged: {
		en: `A condition's value changed: the menus drawn with it are drawn again.`,
		ru: `Значение условия изменилось: меню, нарисованные с ним, перерисовываются.`,
	},
	activeMenu: {
		en: `The menu the player looks at, or null.`,
		ru: `Меню, которое смотрит игрок, или null.`,
	},
	shownText: {
		en: `
			What the player's menu shows, as it was last drawn; "" when none is open.
		`,
		ru: `
			Что показывает меню игрока, как оно было нарисовано в последний раз;
			"", если меню не открыто.
		`,
	},
	lock: {
		en: `Stops the player choosing items - and other menus replacing this one - until unlocked or closed.`,
		ru: `Не даёт игроку выбирать пункты — а другим меню заменять это — пока меню не разблокируют или не закроют.`,
	},
	isLocked: {
		en: `Whether the player's menu is locked - see lock().`,
		ru: `Заблокировано ли меню игрока — см. lock().`,
	},
	setPage: {
		en: `The page the player's menu is drawn at next.`,
		ru: `Страница, на которой меню игрока нарисуется в следующий раз.`,
	},
	setTimer: {
		en: `
			Sets the shared countdown of a menu: starts it when none runs, or changes
			the seconds left - 0 stops it where it is. False when there is nothing to change.
		`,
		ru: `
			Задаёт общий таймер меню: запускает его, если он не идёт, или меняет
			оставшиеся секунды — 0 останавливает его на месте. False, если менять нечего.
		`,
	},
	cancelTimer: {
		en: `Stops the shared countdown and closes the menu for everyone looking at it. False when none ran.`,
		ru: `Останавливает общий таймер и закрывает меню у всех, кто его смотрит. False, если таймер не шёл.`,
	},
	hasAction: {
		en: `Whether an action of that name is registered.`,
		ru: `Зарегистрировано ли действие с этим именем.`,
	},
	runActions: {
		en: `Runs an action line: space-separated actions, CLOSE_MENU and SHOW_<MENU> among them.`,
		ru: `Выполняет строку действий: действия через пробел, в том числе CLOSE_MENU и SHOW_<MENU>.`,
	},
};
