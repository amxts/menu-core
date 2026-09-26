// The tooltips of src/types.ts, in both languages: scripts/apply-docs.ts writes the
// one AMXTS_DOCS_LANG picks into the JSDoc above each element.
export default {
	"MenuKind": {
		en: `A menu's kind, one of "items" (a list of items) or "list" (a row per player, or per row of a list source).`,
		ru: `Вид меню, одно из "items" (список пунктов) или "list" (строка на игрока или на строку источника).`,
	},
	"ListRow": {
		en: `A row of a list menu, as a list source gives it - made with \`listRow()\` or \`textRow()\`.`,
		ru: `Строка меню-списка, как её отдаёт источник, — из \`listRow()\` или \`textRow()\`.`,
	},
	"ListRow.kind": {
		en: `The row's kind, one of "item" (a row to choose) or "text" (a line of text, not a choice).`,
		ru: `Вид строки, одно из "item" (строка для выбора) или "text" (строка текста, не выбор).`,
	},
	"ListRow.target": {
		en: `The row's target, handed to the action: e.g. a player's id, an entity or an index of the source's own.`,
		ru: `Цель строки, которую получает действие: например, номер игрока, сущность или индекс самого источника.`,
	},
	"ListRow.text": {
		en: `The row's text, put for %name% in the menu's row template.`,
		ru: `Текст строки, который подставляется вместо %name% в шаблон строки меню.`,
	},
	"ListRow.action": {
		en: `Action names of the row's own, run instead of the template's; "" for the template's.`,
		ru: `Собственные имена действий строки, вместо действий шаблона; "" — действия шаблона.`,
	},
	"ListRow.restriction": {
		en: `Restriction names, space-separated: the row is greyed out unless each passes.`,
		ru: `Имена ограничений через пробел: строка погашена, пока не пройдено каждое.`,
	},
	"ListRow.restrictionMessage": {
		en: `The text beside the row while it is greyed out; "" for the restriction's own message.`,
		ru: `Текст рядом со строкой, пока она погашена; "" — сообщение самого ограничения.`,
	},
	"MenuOptions": {
		en: `
			The options of a menu made with \`create()\`. Every field may be left out:

			    menus.create("SHOP", { title: "Shop", time: 30, activeWhen: player => player.isAlive });
		`,
		ru: `
			Настройки меню, сделанного через \`create()\`. Любое поле можно не задавать:

			    menus.create("SHOP", { title: "Shop", time: 30, activeWhen: player => player.isAlive });
		`,
	},
	"MenuOptions.title": {
		en: `The menu's title: a lang key or the text itself; left out, the menu's name.`,
		ru: `Заголовок меню: ключ словаря или сам текст; если не задан — имя меню.`,
	},
	"MenuOptions.time": {
		en: `Seconds on the countdown when the menu opens, e.g. 10; left out, none.`,
		ru: `Секунды отсчёта при открытии меню, например 10; если не задано — без отсчёта.`,
	},
	"MenuOptions.hideBack": {
		en: `Hiding of the "Back" button: true leaves it out.`,
		ru: `Скрытие кнопки "Назад": true убирает её.`,
	},
	"MenuOptions.hideExit": {
		en: `Hiding of the "Exit" button: true leaves it out.`,
		ru: `Скрытие кнопки "Выход": true убирает её.`,
	},
	"MenuOptions.locked": {
		en: `A lock on the menu: while true, items cannot be chosen and no other menu replaces this one.`,
		ru: `Блокировка меню: пока true, пункты нельзя выбрать и другое меню не заменяет это.`,
	},
	"MenuOptions.activeWhen": {
		en: `A test the menu opens under: while it says no to the player, the menu does not open for him.`,
		ru: `Проверка, при которой меню открывается: пока она отвечает игроку «нет», меню ему не открывается.`,
	},
	"MenuShowOptions": {
		en: `
			The options of showing a menu. Every field may be left out:

			    shop.show(player, { time: 10 });
		`,
		ru: `
			Настройки показа меню. Любое поле можно не задавать:

			    shop.show(player, { time: 10 });
		`,
	},
	"MenuShowOptions.time": {
		en: `Seconds on the countdown; left out, the countdown running goes on, or the menu's own starts.`,
		ru: `Секунды отсчёта; если не заданы, идущий отсчёт продолжается или начинается собственный отсчёт меню.`,
	},
	"MenuShowOptions.target": {
		en: `The player the menu is about, by id: %target%, and the target an action gets; 0 when left out.`,
		ru: `Игрок, о котором меню, — его номер: %target% и цель, которую получает действие; если не задан — 0.`,
	},
	"MenuShowOptions.resetHistory": {
		en: `A new way back: true forgets the menus this one was opened from.`,
		ru: `Новый путь назад: true забывает меню, из которых открыто это.`,
	},
	"MenuShowOptions.force": {
		en: `Opening over a menu that holds on - a countdown, a lock: true opens anyway.`,
		ru: `Открытие поверх меню, которое держится, — с отсчётом или заблокированного: true открывает всё равно.`,
	},
	"MenuShowOptions.skipHistory": {
		en: `Leaving the menu out of the way back: true does not remember it.`,
		ru: `Пропуск меню на пути назад: true его не запоминает.`,
	},
	"MenuItemOptions": {
		en: `
			The options of an item, besides its text. Every field may be left out:

			    shop.addItem("Heal", {
			        visible: player => player.health < 100,
			        onSelect: (player) => { player.health = 100; },
			    });
		`,
		ru: `
			Настройки пункта, кроме текста. Любое поле можно не задавать:

			    shop.addItem("Heal", {
			        visible: player => player.health < 100,
			        onSelect: (player) => { player.health = 100; },
			    });
		`,
	},
	"MenuItemOptions.onSelect": {
		en: `The function run when the item is chosen: the player who chose it, and the target - the row's in a list menu, else the menu's.`,
		ru: `Функция, которая выполняется при выборе пункта: игрок, который выбрал, и цель — строки в меню-списке, иначе меню.`,
	},
	"MenuItemOptions.visible": {
		en: `A test the item is shown under: while it says no, the item is left out and takes no slot.`,
		ru: `Проверка, при которой пункт показан: пока она отвечает «нет», пункта нет и слот он не занимает.`,
	},
	"MenuItemOptions.enabled": {
		en: `A test the item can be chosen under: while it says no, the item is greyed out.`,
		ru: `Проверка, при которой пункт можно выбрать: пока она отвечает «нет», пункт погашен.`,
	},
	"MenuItemOptions.message": {
		en: `The text beside the item while \`enabled\` greys it out, e.g. "(full)".`,
		ru: `Текст рядом с пунктом, пока \`enabled\` его гасит, например "(full)".`,
	},
	"MenuItemOptions.placeholder": {
		en: `The text after the item's name, placeholders and all, e.g. "%hp%".`,
		ru: `Текст после имени пункта, с плейсхолдерами, например "%hp%".`,
	},
	"MenuItemOptions.condition": {
		en: `Condition names from \`addCondition()\` the item is greyed out without; "!NAME" for the opposite; several, space-separated, must all hold.`,
		ru: `Имена условий из \`addCondition()\`, без которых пункт погашен; "!NAME" — наоборот; несколько через пробел должны выполняться все.`,
	},
	"MenuItemOptions.action": {
		en: `Action names from \`addAction()\` run when the item is chosen, or a built-in one: "SHOW_<MENU>", "CLOSE_MENU".`,
		ru: `Имена действий из \`addAction()\`, которые выполняются при выборе пункта, или встроенное: "SHOW_<MENU>", "CLOSE_MENU".`,
	},
	"MenuItemOptions.restriction": {
		en: `Restriction names from \`addRestriction()\`, "ADMIN" or "FLAG_<letters>": the item is greyed out unless each passes.`,
		ru: `Имена ограничений из \`addRestriction()\`, "ADMIN" или "FLAG_<буквы>": пункт погашен, пока не пройдено каждое.`,
	},
	"MenuItemOptions.restrictionMessage": {
		en: `The text beside the item while a restriction greys it out - one message for any, or one per restriction as in "NAME:message|NAME2:message".`,
		ru: `Текст рядом с пунктом, пока его гасит ограничение, — одно сообщение на все или своё для каждого, как в "NAME:сообщение|NAME2:сообщение".`,
	},
	"MenuItemOptions.at": {
		en: `The item's place among the items, from 0; left out, the end.`,
		ru: `Место пункта среди пунктов, от 0; если не задано — в конце.`,
	},
	"MenuItemOptions.spaceBefore": {
		en: `Blank lines before the item.`,
		ru: `Пустые строки перед пунктом.`,
	},
	"MenuItemOptions.spaceAfter": {
		en: `Blank lines after the item.`,
		ru: `Пустые строки после пункта.`,
	},
	"ConditionTest": {
		en: `A condition's test, as \`addCondition()\` registers it. In a list menu \`player\` is the row's player and \`viewer\` whoever looks.`,
		ru: `Проверка условия, как её регистрирует \`addCondition()\`. В меню-списке \`player\` — игрок строки, \`viewer\` — тот, кто смотрит.`,
	},
	"ActionHandler": {
		en: `An action, as \`addAction()\` registers it: \`target\` is the row's in a list menu, else the menu's.`,
		ru: `Действие, как его регистрирует \`addAction()\`: \`target\` — цель строки в меню-списке, иначе меню.`,
	},
	"PlaceholderValue": {
		en: `A placeholder's value: the text %name% stands for.`,
		ru: `Значение плейсхолдера: текст, которым заменяется %name%.`,
	},
	"RestrictionTest": {
		en: `A restriction's test, as \`addRestriction()\` registers it; \`name\` is the whole token, "NAME:param" included.`,
		ru: `Проверка ограничения, как её регистрирует \`addRestriction()\`; \`name\` — токен целиком, вместе с "NAME:param".`,
	},
	"ActionTest": {
		en: `A test of an item's action, as \`addActionCheck()\` registers it: false greys the item out.`,
		ru: `Проверка действия пункта, как её регистрирует \`addActionCheck()\`: false гасит пункт.`,
	},
	"ConditionFilter": {
		en: `A filter over a condition someone else registered: gets its value and returns the one to use.`,
		ru: `Фильтр над условием, которое зарегистрировал кто-то другой: получает его значение и возвращает то, что будет использовано.`,
	},
	"RowTest": {
		en: `A test of a row of a list menu, as \`addFilter()\` takes it: \`player\` is the row's player, \`viewer\` whoever looks.`,
		ru: `Проверка строки меню-списка, как её принимает \`addFilter()\`: \`player\` — игрок строки, \`viewer\` — тот, кто смотрит.`,
	},
	"ListSource": {
		en: `A list source: the rows of a list menu for the player who looks; null lists the players instead.`,
		ru: `Источник списка: строки меню-списка для игрока, который смотрит; null — вместо них список игроков.`,
	},
	"MenuEventType": {
		en: `A menu event's type, one of "open" and "close" as they happen, or "show" before a menu opens, to stop it.`,
		ru: `Тип события меню, одно из "open" и "close" — когда это происходит, или "show" — до открытия меню, чтобы его остановить.`,
	},
	"MenuCoreOptions": {
		en: `Menu Core's options: \`menus\` in amxts.config.ts.`,
		ru: `Настройки Menu Core: \`menus\` в amxts.config.ts.`,
	},
	"MenuCoreOptions.file": {
		en: `The menu file, from configs/, without ".ini": e.g. "menu" is configs/menu.ini, "myserver/menu" configs/myserver/menu.ini.`,
		ru: `Файл меню от configs/ без ".ini": например, "menu" — configs/menu.ini, "myserver/menu" — configs/myserver/menu.ini.`,
	},
	"MenuCoreOptions.fallback": {
		en: `The file read instead when \`file\` has no menus, e.g. "menu" for configs/menu.ini; "" is none.`,
		ru: `Файл, который читается вместо \`file\`, если в том нет меню, например "menu" — configs/menu.ini; "" — никакой.`,
	},
};
