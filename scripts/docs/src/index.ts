// The tooltips of src/index.ts, in both languages: scripts/apply-docs.ts writes the
// one AMXTS_DOCS_LANG picks into the JSDoc above each element.
export default {
	"Menu": {
		en: `
			A menu: read from menu.ini, or made with \`create()\`. The fields are what
			menu.ini sets; the methods fill the menu, open it and count it down.

			    const shop = menus.create("SHOP", { title: "Shop" });
			    shop.addItem("Heal", { onSelect: heal });
			    shop.show(player);
		`,
		ru: `
			Меню: прочитанное из menu.ini или сделанное через \`create()\`. Поля — то,
			что задаёт menu.ini; методы наполняют меню, открывают его и ведут отсчёт.

			    const shop = menus.create("SHOP", { title: "Shop" });
			    shop.addItem("Heal", { onSelect: heal });
			    shop.show(player);
		`,
	},
	"Menu.kind": {
		en: `The menu's kind, one of "items" (a list of items) or "list" (a row per player, or per row of a list source). A name starting with LIST_ makes a list.`,
		ru: `Вид меню, одно из "items" (список пунктов) или "list" (строка на игрока или на строку источника). Имя на LIST_ даёт список.`,
	},
	"Menu.hideBack": {
		en: `Hiding of the "Back" button: true leaves it out.`,
		ru: `Скрытие кнопки "Назад": true убирает её.`,
	},
	"Menu.hideExit": {
		en: `Hiding of the "Exit" button: true leaves it out.`,
		ru: `Скрытие кнопки "Выход": true убирает её.`,
	},
	"Menu.locked": {
		en: `A lock on the menu: while true, items cannot be chosen and no other menu replaces this one.`,
		ru: `Блокировка меню: пока true, пункты нельзя выбрать и другое меню не заменяет это.`,
	},
	"Menu.sharedTimer": {
		en: `One countdown for everyone looking at the menu (true), rather than one per player.`,
		ru: `Один отсчёт на всех, кто смотрит меню (true), а не у каждого игрока свой.`,
	},
	"Menu.time": {
		en: `Seconds on the countdown when the menu opens, e.g. 10; 0 for none.`,
		ru: `Секунды отсчёта при открытии меню, например 10; 0 — без отсчёта.`,
	},
	"Menu.onTimeout": {
		en: `Action names run when the countdown ends, e.g. "CLOSE_MENU"; "" closes the menu.`,
		ru: `Имена действий, которые выполняются, когда отсчёт кончился, например "CLOSE_MENU"; "" закрывает меню.`,
	},
	"Menu.activeOn": {
		en: `Condition names the menu opens only under, space-separated, e.g. "IS_ALIVE !IS_SPECTATOR"; "" for always.`,
		ru: `Имена условий, при которых меню открывается, через пробел, например "IS_ALIVE !IS_SPECTATOR"; "" — всегда.`,
	},
	"Menu.countdown": {
		en: `Seconds left on the shared countdown; 0 while none runs.`,
		ru: `Секунды, оставшиеся на общем отсчёте; 0, пока отсчёт не идёт.`,
	},
	"Menu.name": {
		en: `The menu's name - its section in menu.ini, e.g. "MAIN_MENU".`,
		ru: `Имя меню — его секция в menu.ini, например "MAIN_MENU".`,
	},
	"Menu.title": {
		en: `The menu's title: a lang key or the text itself.`,
		ru: `Заголовок меню: ключ словаря или сам текст.`,
	},
	"Menu.addItem": {
		en: `
			Adds an item. "A|B" in the text, a condition or an action are variants:
			the first whose condition holds is shown. False when the text gives none.
		`,
		ru: `
			Добавляет пункт. "A|B" в тексте, условии или действии — варианты:
			показывается первый, чьё условие выполнено. False, если текст не даёт ни одного.
		`,
	},
	"Menu.addFixedItem": {
		en: `Adds an item that takes the same slot on every page: \`slot\` is its key, 1 to 7.`,
		ru: `Добавляет пункт, который на каждой странице занимает один слот: \`slot\` — его клавиша, от 1 до 7.`,
	},
	"Menu.clearItems": {
		en: `Removes every item of the menu, fixed ones too.`,
		ru: `Удаляет все пункты меню, включая фиксированные.`,
	},
	"Menu.addFilter": {
		en: `A filter of a list menu: rows \`test\` says no to are left out, and \`message\` is said when none is left.`,
		ru: `Фильтр меню-списка: строки, на которые \`test\` отвечает «нет», пропускаются, а если не осталось ни одной, игрок получает \`message\`.`,
	},
	"Menu.addPlaceholder": {
		en: `A placeholder of this menu: the text %name% stands for, before the ones registered with \`addPlaceholder()\`.`,
		ru: `Плейсхолдер этого меню: текст, которым заменяется %name%, раньше зарегистрированных через \`addPlaceholder()\`.`,
	},
	"Menu.setListSource": {
		en: `The source of this list menu's rows, instead of the players.`,
		ru: `Источник строк этого меню-списка вместо игроков.`,
	},
	"Menu.addEventListener": {
		en: `Calls \`listener\` on this menu's events of \`type\`, one of "open", "close" or "show" (before it opens).`,
		ru: `Вызывает \`listener\` на события этого меню типа \`type\` — одно из "open", "close" или "show" (до открытия).`,
	},
	"Menu.show": {
		en: `
			Shows the menu to the player; false when it does not open - a "show"
			listener stopped it, it is not active, or the player's menu holds on.
		`,
		ru: `
			Показывает меню игроку; false, если оно не открылось — его отменил
			обработчик "show", оно не активно или меню игрока не уступает место.
		`,
	},
	"Menu.refresh": {
		en: `Draws the menu again for whoever looks at it; the number of players it was drawn for.`,
		ru: `Перерисовывает меню у всех, кто его смотрит; число игроков, у которых оно перерисовано.`,
	},
	"Menu.close": {
		en: `Closes the menu for whoever looks at it.`,
		ru: `Закрывает меню у всех, кто его смотрит.`,
	},
	"Menu.setTimer": {
		en: `
			Sets the shared countdown: starts it when none runs, or changes the
			seconds left - 0 stops it where it is. False when there is nothing to change.
		`,
		ru: `
			Задаёт общий отсчёт: запускает его, если он не идёт, или меняет
			оставшиеся секунды — 0 останавливает его на месте. False, если менять нечего.
		`,
	},
	"Menu.cancelTimer": {
		en: `Stops the shared countdown and closes the menu for everyone looking at it. False when none ran.`,
		ru: `Останавливает общий отсчёт и закрывает меню у всех, кто его смотрит. False, если отсчёт не шёл.`,
	},
	"MenuEvent": {
		en: `A menu event: the \`player\`, the \`menu\`, and on "close" whether its \`timeout\` ran out.`,
		ru: `Событие меню: игрок \`player\`, меню \`menu\` и на "close" — вышло ли время (\`timeout\`).`,
	},
	"MenuEvent.defaultPrevented": {
		en: `A mark of \`preventDefault()\`: true once it was called.`,
		ru: `Отметка \`preventDefault()\`: true, если его вызвали.`,
	},
	"MenuEvent.player": {
		en: `The player whose menu it is.`,
		ru: `Игрок, чьё это меню.`,
	},
	"MenuEvent.menu": {
		en: `The menu the event is about.`,
		ru: `Меню, о котором событие.`,
	},
	"MenuEvent.timeout": {
		en: `On "close": true when the menu closed because its time ran out.`,
		ru: `На "close": true, если меню закрылось, потому что вышло время.`,
	},
	"MenuEvent.preventDefault": {
		en: `On "show": keeps the menu from opening.`,
		ru: `На "show": не даёт меню открыться.`,
	},
	"MenuListener": {
		en: `A listener of menu events, as \`addEventListener()\` calls it.`,
		ru: `Обработчик событий меню, как его вызывает \`addEventListener()\`.`,
	},
	"setConfigFile": {
		en: `
			Sets the file menus are read from, under configs/ and without ".ini"; read
			when a menu is first asked for. \`fallback\` is read instead when \`file\` has no sections.
		`,
		ru: `
			Задаёт файл, из которого читаются меню: путь от configs/ без ".ini"; читается,
			когда меню понадобится впервые. Если в \`file\` нет секций, читается \`fallback\`.
		`,
	},
	"find": {
		en: `A menu by its name; null when there is none - \`register()\` reads one from the file.`,
		ru: `Меню по имени; null, если такого нет — меню из файла читает \`register()\`.`,
	},
	"indexOf": {
		en: `A menu's number among all of them - the one Pawn plugins know it by; -1 for none.`,
		ru: `Номер меню среди всех — тот, под которым его знают Pawn-плагины; -1, если меню нет.`,
	},
	"menuAt": {
		en: `The menu with that number among all of them - the reverse of \`indexOf()\`; null when there is none.`,
		ru: `Меню с этим номером среди всех — обратное к \`indexOf()\`; null, если такого нет.`,
	},
	"register": {
		en: `The menu of the file's [name] section, read now if it is not yet; null when there is no such section or no items in it.`,
		ru: `Меню из секции [name] файла, прочитанное сейчас, если ещё не прочитано; null, если секции нет или в ней нет пунктов.`,
	},
	"create": {
		en: `
			A menu made in code - or the one of that name already there, as it is. A
			name starting with LIST_ makes a list menu.
		`,
		ru: `
			Меню из кода — или уже существующее с этим именем, как есть. Имя на LIST_
			даёт меню-список.
		`,
	},
	"addCondition": {
		en: `Registers a condition by name, for menu.ini and Pawn plugins; the first one registered under a name is the one asked.`,
		ru: `Регистрирует условие по имени — для menu.ini и Pawn-плагинов; спрашивается то, что зарегистрировано под именем первым.`,
	},
	"addAction": {
		en: `Registers an action by name, for menu.ini and Pawn plugins; SHOW_<MENU> and CLOSE_MENU are built in.`,
		ru: `Регистрирует действие по имени — для menu.ini и Pawn-плагинов; SHOW_<MENU> и CLOSE_MENU встроены.`,
	},
	"addPlaceholder": {
		en: `Registers a placeholder: the text %name% stands for in titles and items. A name registered twice keeps the first.`,
		ru: `Регистрирует плейсхолдер: текст, которым заменяется %name% в заголовках и пунктах. Если имя зарегистрировано дважды, остаётся первое.`,
	},
	"addRestriction": {
		en: `Registers a restriction by name, for items to name; "*" answers for every name nothing else does.`,
		ru: `Регистрирует ограничение по имени, которое называют пункты; "*" отвечает за все имена, за которые не отвечает никто другой.`,
	},
	"addActionCheck": {
		en: `Greys out items with \`action\` in \`menu\` while \`test\` says no; "" for either means every one.`,
		ru: `Гасит пункты с \`action\` в \`menu\`, пока \`test\` отвечает «нет»; "" в любом из них означает «все».`,
	},
	"addConditionFilter": {
		en: `Registers a filter over the condition \`name\`, whoever registered it: it gets the condition's value and returns the one to use.`,
		ru: `Регистрирует фильтр над условием \`name\`, кто бы его ни зарегистрировал: получает значение условия и возвращает то, что будет использовано.`,
	},
	"setListSource": {
		en: `Sets the source of the rows of the list menu of that name, instead of the players; a second source replaces the first.`,
		ru: `Задаёт источник строк меню-списка с этим именем вместо игроков; второй источник заменяет первый.`,
	},
	"addEventListener": {
		en: `Calls \`listener\` on every menu event of \`type\`, one of "open", "close" or "show" (before a menu opens).`,
		ru: `Вызывает \`listener\` на каждое событие меню типа \`type\` — одно из "open", "close" или "show" (до открытия меню).`,
	},
	"listRow": {
		en: `A row for a list source: its target, text, and optionally an action, a restriction and its message.`,
		ru: `Строка для источника списка: цель, текст и, если нужно, действие, ограничение и его сообщение.`,
	},
	"textRow": {
		en: `A line of text among a list source's rows; \`centered\` pads it to the middle of the menu.`,
		ru: `Строка текста среди строк источника списка; \`centered\` выравнивает её по середине меню.`,
	},
	"show": {
		en: `
			Shows the menu of that name - one made in code, or one of the file;
			false when it does not open: no such menu, a "show" listener stopped it,
			it is not active, or the player's menu holds on.
		`,
		ru: `
			Показывает меню с этим именем — из кода или из файла; false, если оно
			не открылось: такого меню нет, его отменил обработчик "show", оно не
			активно или меню игрока не уступает место.
		`,
	},
	"close": {
		en: `Closes the player's menu; \`timeout\` tells the "close" listeners the time ran out.`,
		ru: `Закрывает меню игрока; \`timeout\` сообщает обработчикам "close", что вышло время.`,
	},
	"refresh": {
		en: `Draws the menus again for whoever looks at them; \`names\` are space-separated. The number of players they were drawn for.`,
		ru: `Перерисовывает меню у всех, кто их смотрит; \`names\` — через пробел. Число игроков, у которых меню перерисованы.`,
	},
	"conditionChanged": {
		en: `Tells the menus a condition's value changed: the menus drawn with it are drawn again.`,
		ru: `Сообщает меню, что значение условия изменилось: меню, нарисованные с ним, перерисовываются.`,
	},
	"activeMenu": {
		en: `The menu the player looks at, or null.`,
		ru: `Меню, которое смотрит игрок, или null.`,
	},
	"shownText": {
		en: `The text of the player's menu, as it was last drawn; "" when none is open.`,
		ru: `Текст меню игрока, как оно было нарисовано в последний раз; "", если меню не открыто.`,
	},
	"lock": {
		en: `Locks the player's menu: no item can be chosen and no other menu replaces it until it is unlocked or closed.`,
		ru: `Блокирует меню игрока: пункты нельзя выбрать и другое меню его не заменяет, пока его не разблокируют или не закроют.`,
	},
	"isLocked": {
		en: `Whether the player's menu is locked - see \`lock()\`.`,
		ru: `Заблокировано ли меню игрока — см. \`lock()\`.`,
	},
	"setPage": {
		en: `Sets the page the player's menu is drawn at next, from 0.`,
		ru: `Задаёт страницу, на которой меню игрока нарисуется в следующий раз, от 0.`,
	},
	"hasAction": {
		en: `Whether an action of that name is registered.`,
		ru: `Зарегистрировано ли действие с этим именем.`,
	},
	"runActions": {
		en: `Runs an action line: space-separated action names, CLOSE_MENU and SHOW_<MENU> among them.`,
		ru: `Выполняет строку действий: имена действий через пробел, в том числе CLOSE_MENU и SHOW_<MENU>.`,
	},
};
