// The tooltips of src/types.ts, in both languages: scripts/apply-docs.ts writes the
// one AMXTS_DOCS_LANG picks into the JSDoc above each element.
export default {
	"MenuKind": {
		en: `"items": a list of items. "list": a row per player, or per row a list source gives.`,
		ru: `"items": список пунктов. "list": строка на каждого игрока или на каждую строку источника списка.`,
	},
	"Variant": {
		en: `One way an item can look: shown when its condition holds, the first that does.`,
		ru: `Один из вариантов пункта: показывается первый, чьё условие выполнено.`,
	},
	"Variant.name": {
		en: `The text shown: a lang key or the text itself.`,
		ru: `Показываемый текст: ключ перевода или сам текст.`,
	},
	"Variant.condition": {
		en: `The condition it is shown under; "" is always.`,
		ru: `Условие, при котором он показывается; "" — всегда.`,
	},
	"Variant.action": {
		en: `What choosing it does: a registered action or a built-in one.`,
		ru: `Что делает его выбор: зарегистрированное или встроенное действие.`,
	},
	"MenuItem": {
		en: `An item of a menu.`,
		ru: `Пункт меню.`,
	},
	"MenuItem.variants": {
		en: `The ways it can look - "A|B" in menu.ini - the first whose condition holds is shown.`,
		ru: `Варианты пункта — "A|B" в menu.ini; показывается первый, чьё условие выполнено.`,
	},
	"MenuItem.placeholder": {
		en: `Text after the name, placeholders and all: "%hp%".`,
		ru: `Текст после имени, вместе с плейсхолдерами: "%hp%".`,
	},
	"MenuItem.restriction": {
		en: `Restriction names, space-separated: the item is greyed out unless each passes.`,
		ru: `Имена ограничений через пробел: пункт погашен, если не пройдено хотя бы одно.`,
	},
	"MenuItem.restrictionMessage": {
		en: `Why it is greyed out: "NAME:message|NAME2:message", or one message.`,
		ru: `Почему пункт погашен: "NAME:message|NAME2:message" или одно сообщение.`,
	},
	"MenuItem.spaceBefore": {
		en: `Blank lines before it.`,
		ru: `Пустые строки перед пунктом.`,
	},
	"MenuItem.spaceAfter": {
		en: `Blank lines after it.`,
		ru: `Пустые строки после пункта.`,
	},
	"MenuItem.slot": {
		en: `The slot a fixed item always takes, counted from 0: key 1 is 0, key 7 is 6. -1 for an item in the flow.`,
		ru: `Слот, который всегда занимает фиксированный пункт, считая с 0: клавиша 1 — это 0, клавиша 7 — 6. -1 у пункта в общем потоке.`,
	},
	"ListFilter": {
		en: `Rows of a list menu that fail the condition are left out; \`message\` says so when none is left.`,
		ru: `Строки меню-списка, не прошедшие условие, пропускаются; если не осталось ни одной, об этом говорит \`message\`.`,
	},
	"ListFilter.condition": {
		en: `The condition a row must pass.`,
		ru: `Условие, которое строка должна пройти.`,
	},
	"ListFilter.message": {
		en: `What the player is told when no row passes.`,
		ru: `Что сказать игроку, если не прошла ни одна строка.`,
	},
	"Menu": {
		en: `A menu, from menu.ini or made in code.`,
		ru: `Меню из menu.ini или из кода.`,
	},
	"Menu.name": {
		en: `Its section name: "MAIN_MENU".`,
		ru: `Имя его секции: "MAIN_MENU".`,
	},
	"Menu.title": {
		en: `The title: a lang key or the text itself.`,
		ru: `Заголовок: ключ перевода или сам текст.`,
	},
	"Menu.kind": {
		en: `"items", or "list" - a row per player or per row of a list source.`,
		ru: `"items" или "list" — строка на каждого игрока или на каждую строку источника списка.`,
	},
	"Menu.activeOn": {
		en: `The menu opens only while this condition holds.`,
		ru: `Меню открывается, только пока выполнено это условие.`,
	},
	"Menu.filters": {
		en: `A list menu's filters: rows that fail one are left out.`,
		ru: `Фильтры меню-списка: строки, не прошедшие хотя бы один, пропускаются.`,
	},
	"Menu.items": {
		en: `The items in the flow; a list menu's first one is its row template (VIEW).`,
		ru: `Пункты в общем потоке; у меню-списка первый из них — шаблон строки (VIEW).`,
	},
	"Menu.fixed": {
		en: `Items that keep their slot on every page (FIXED_ITEMS).`,
		ru: `Пункты, которые держат свой слот на каждой странице (FIXED_ITEMS).`,
	},
	"Menu.hideBack": {
		en: `No "Back" button.`,
		ru: `Без кнопки "Назад".`,
	},
	"Menu.hideExit": {
		en: `No "Exit" button.`,
		ru: `Без кнопки "Выход".`,
	},
	"Menu.locked": {
		en: `Items cannot be chosen, and no other menu replaces it.`,
		ru: `Пункты нельзя выбрать, и другое меню его не заменит.`,
	},
	"Menu.sharedTimer": {
		en: `One countdown for everyone looking at it, rather than one each.`,
		ru: `Один таймер на всех, кто его смотрит, а не у каждого свой.`,
	},
	"Menu.time": {
		en: `Seconds on the countdown when it opens; 0 for none.`,
		ru: `Секунды на таймере при открытии; 0 — без таймера.`,
	},
	"Menu.onTimeout": {
		en: `The action run when the countdown ends; without one the menu closes.`,
		ru: `Действие, которое выполняется, когда таймер кончился; без него меню закрывается.`,
	},
	"Menu.countdown": {
		en: `Seconds left on the shared countdown; 0 while none runs.`,
		ru: `Сколько секунд осталось на общем таймере; 0, пока он не идёт.`,
	},
	"ListRow": {
		en: `A row of a list menu, as a list source gives it.`,
		ru: `Строка меню-списка, как её отдаёт источник списка.`,
	},
	"ListRow.kind": {
		en: `"text": a line of text, not a choice.`,
		ru: `"text": строка текста, которую нельзя выбрать.`,
	},
	"ListRow.target": {
		en: `What the action gets as its target: a player id, an entity, an index.`,
		ru: `Что действие получит как цель: id игрока, сущность, индекс.`,
	},
	"ListRow.text": {
		en: `The row's text, or %name% in the VIEW template.`,
		ru: `Текст строки, он же %name% в шаблоне VIEW.`,
	},
	"ListRow.action": {
		en: `An action of its own, instead of the template's.`,
		ru: `Своё действие вместо действия шаблона.`,
	},
	"ListRow.restriction": {
		en: `Restriction names, space-separated: the row is greyed out unless each passes.`,
		ru: `Имена ограничений через пробел: строка погашена, если не пройдено хотя бы одно.`,
	},
	"ListRow.restrictionMessage": {
		en: `Why it is greyed out; "" is the restriction's own message.`,
		ru: `Почему строка погашена; "" — собственное сообщение ограничения.`,
	},
	"ConditionTest": {
		en: `Whether a condition holds. In a list menu \`player\` is the row's player and \`viewer\` whoever looks.`,
		ru: `Выполнено ли условие. В меню-списке \`player\` — игрок строки, а \`viewer\` — тот, кто смотрит меню.`,
	},
	"ActionHandler": {
		en: `What choosing an item does. \`target\` is the row's in a list menu, else the menu's.`,
		ru: `Что делает выбор пункта. \`target\` — цель строки в меню-списке, иначе цель меню.`,
	},
	"PlaceholderValue": {
		en: `The text a %name% stands for.`,
		ru: `Текст, которым заменяется %name%.`,
	},
	"RestrictionTest": {
		en: `Whether a player passes a restriction; \`name\` is the whole token, "NAME:param" included.`,
		ru: `Проходит ли игрок ограничение; \`name\` — токен целиком, вместе с "NAME:param".`,
	},
	"ActionTest": {
		en: `Whether an item with this action may be chosen now; false greys it out.`,
		ru: `Можно ли сейчас выбрать пункт с этим действием; false гасит его.`,
	},
	"ConditionFilter": {
		en: `Another say on a condition someone else registered: gets its value, returns the one to use.`,
		ru: `Своё слово в условии, которое зарегистрировал кто-то другой: получает его значение и возвращает то, которое использовать.`,
	},
	"ListSource": {
		en: `The rows of a list menu; null lists the players instead.`,
		ru: `Строки меню-списка; null — вместо них список игроков.`,
	},
	"MenuListener": {
		en: `What addEventListener() calls on a menu event.`,
		ru: `Что addEventListener() вызывает на событие меню.`,
	},
	"MenuEventType": {
		en: `"open" and "close" as they happen; "show" before a menu opens, to stop it.`,
		ru: `"open" и "close" — когда это происходит; "show" — до открытия меню, чтобы его отменить.`,
	},
	"MenuEvent": {
		en: `A menu event: the \`player\`, the \`menu\` name, and on "close" whether its \`timeout\` ran out.`,
		ru: `Событие меню: игрок \`player\`, имя меню \`menu\` и, на "close", вышло ли время — \`timeout\`.`,
	},
	"MenuEvent.defaultPrevented": {
		en: `Whether preventDefault() was called.`,
		ru: `Был ли вызван preventDefault().`,
	},
	"MenuEvent.player": {
		en: `Whose menu it is.`,
		ru: `Чьё это меню.`,
	},
	"MenuEvent.menu": {
		en: `The menu's name.`,
		ru: `Имя меню.`,
	},
	"MenuEvent.timeout": {
		en: `On "close": the menu closed because its time ran out.`,
		ru: `При "close": меню закрылось, потому что вышло его время.`,
	},
	"MenuEvent.preventDefault": {
		en: `On "show": the menu does not open.`,
		ru: `На "show": меню не открывается.`,
	},
	"MenuShowOptions": {
		en: `How \`menus.show\` opens a menu: \`menus.show(player, "SHOP", { time: 10 })\`. Every field may be left out.`,
		ru: `Как \`menus.show\` открывает меню: \`menus.show(player, "SHOP", { time: 10 })\`. Любое поле можно не указывать.`,
	},
	"MenuShowOptions.time": {
		en: `Seconds on the countdown; left out, the one running goes on, or the menu's TIME starts.`,
		ru: `Секунды обратного отсчёта; без него идёт текущий отсчёт или начинается TIME меню.`,
	},
	"MenuShowOptions.target": {
		en: `Who the menu is about: %target%, and the target an action gets; 0 when left out.`,
		ru: `О ком меню: %target% и цель, которую получает действие; без него — 0.`,
	},
	"MenuShowOptions.resetHistory": {
		en: `Starts the way back anew.`,
		ru: `Начинает историю возврата заново.`,
	},
	"MenuShowOptions.force": {
		en: `Opens over a menu that holds on: a countdown, or locked.`,
		ru: `Открывает поверх меню, которое держится: с обратным отсчётом или заблокированного.`,
	},
	"MenuShowOptions.skipHistory": {
		en: `Leaves the menu out of the way back.`,
		ru: `Не добавляет меню в историю возврата.`,
	},
	"MenuItemOptions": {
		en: `What \`menus.addItem\` takes besides the name. Every field may be left out.`,
		ru: `Что \`menus.addItem\` принимает помимо имени. Любое поле можно не указывать.`,
	},
	"MenuItemOptions.placeholder": {
		en: `Text after the name, placeholders and all: "%hp%".`,
		ru: `Текст после имени, вместе с плейсхолдерами: "%hp%".`,
	},
	"MenuItemOptions.condition": {
		en: `The condition it is shown under - a name from addCondition, "!NAME" for its opposite, several space-separated must all hold.`,
		ru: `Условие, при котором пункт виден: имя из addCondition, "!NAME" — обратное; несколько через пробел должны выполняться все.`,
	},
	"MenuItemOptions.action": {
		en: `What choosing it does - a name from addAction, or a built-in: "SHOW_<MENU>", "CLOSE_MENU".`,
		ru: `Что делает выбор пункта: имя из addAction или встроенное действие — "SHOW_<MENU>", "CLOSE_MENU".`,
	},
	"MenuItemOptions.onSelect": {
		en: `What choosing it does, instead of naming an action.`,
		ru: `Что делает выбор пункта — вместо имени действия.`,
	},
	"MenuItemOptions.restriction": {
		en: `Greys it out while it holds - a name from addRestriction, "ADMIN" or "FLAG_<letters>".`,
		ru: `Делает пункт серым, пока выполняется: имя из addRestriction, "ADMIN" или "FLAG_<letters>".`,
	},
	"MenuItemOptions.restrictionMessage": {
		en: `Shown beside it while it is greyed out; left out, the restriction's own message.`,
		ru: `Показывается рядом, пока пункт серый; без него — собственное сообщение ограничения.`,
	},
	"MenuItemOptions.at": {
		en: `Its place among the items; left out, the end.`,
		ru: `Позиция среди пунктов; без неё — в конец.`,
	},
	"MenuItemOptions.spaceBefore": {
		en: `Blank lines before it.`,
		ru: `Пустые строки перед пунктом.`,
	},
	"MenuItemOptions.spaceAfter": {
		en: `Blank lines after it.`,
		ru: `Пустые строки после пункта.`,
	},
	"MenuCoreOptions": {
		en: `Menu Core's options: \`menus\` in amxts.config.ts.`,
		ru: `Настройки Menu Core: \`menus\` в amxts.config.ts.`,
	},
	"MenuCoreOptions.file": {
		en: `The menu file, from configs/: "menu" is configs/menu.ini, "myserver/menu" configs/myserver/menu.ini.`,
		ru: `Файл меню от configs/: "menu" — это configs/menu.ini, "myserver/menu" — configs/myserver/menu.ini.`,
	},
	"MenuCoreOptions.fallback": {
		en: `Read instead when \`file\` has no menus: "menu" falls back to configs/menu.ini. "" is none.`,
		ru: `Читается вместо \`file\`, если в нём нет меню: "menu" — это configs/menu.ini. "" — без запасного файла.`,
	},
};
