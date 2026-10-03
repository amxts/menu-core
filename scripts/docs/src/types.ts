// The tooltips of src/types.ts, in both languages: scripts/apply-docs.ts writes the
// one AMXTS_DOCS_LANG picks into the JSDoc above each element.
export default {
	"MenuKind": {
		en: `A menu's kind, one of \`"items"\` (a list of items) or \`"list"\` (a row per player, or per row of a list source).`,
		ru: `Вид меню, одно из \`"items"\` (список пунктов) или \`"list"\` (строка на игрока или на строку источника).`,
	},
	"MenuContext": {
		en: `
			A menu's context, which its functions get: the player who looks, who or
			what the menu is about, and the menu.

			    shop.addItem({ title: ({ player }) => \`Heal (\${player.health} HP)\`, onSelect: ({ player }) => heal(player) });
		`,
		ru: `
			Контекст меню, который получают его функции: игрок, который смотрит, о ком
			или о чём меню и само меню.

			    shop.addItem({ title: ({ player }) => \`Heal (\${player.health} HP)\`, onSelect: ({ player }) => heal(player) });
		`,
	},
	"MenuContext.player": {
		en: `The player the menu is shown to: who looks at it, and who chooses.`,
		ru: `Игрок, которому показано меню: тот, кто его смотрит и выбирает.`,
	},
	"MenuContext.target": {
		en: `The player the menu is about: the row's in a list menu, the one \`show()\` was given as \`target\` in an items menu; \`player\` himself when there is none.`,
		ru: `Игрок, о котором меню: игрок строки в меню-списке, тот, кого передали \`show()\` в \`target\`, в меню пунктов; сам \`player\`, если такого нет.`,
	},
	"MenuContext.row": {
		en: `The row's number in a list menu, as \`listRow()\` gave it - e.g. an entity or an index of the source's own; a player's \`id\` in a list of players. In an items menu, the \`id\` of the menu's target, \`0\` without one.`,
		ru: `Номер строки в меню-списке, как его дал \`listRow()\`, — например, сущность или индекс самого источника; в списке игроков — \`id\` игрока. В меню пунктов — \`id\` цели меню, \`0\`, если её нет.`,
	},
	"MenuContext.menu": {
		en: `The menu the function is asked for.`,
		ru: `Меню, для которого вызвана функция.`,
	},
	"NamedContext": {
		en: `The context of a function registered by name - an action, a placeholder, a restriction, an action check: the menu's context, and the name it is asked by.`,
		ru: `Контекст функции, зарегистрированной по имени, — действия, плейсхолдера, ограничения, проверки действия: контекст меню и имя, по которому её спросили.`,
	},
	"NamedContext.name": {
		en: `The name it is asked by: an action's or a placeholder's, a restriction's whole token - \`"NAME:param"\` included; for an action check, the item's action.`,
		ru: `Имя, по которому её спросили: имя действия или плейсхолдера, токен ограничения целиком — вместе с \`"NAME:param"\`; для проверки действия — действие пункта.`,
	},
	"MenuText": {
		en: `
			Text of a menu - a title, an item, a message: the text itself, or a
			function that gives it for the menu's context. A lang key is translated
			either way. Colour tags are chat's letters: \`!y\` yellow, \`!r\` red, \`!d\`
			grey, \`!w\` white, \`!R\` to the right edge; chat's own \`!g\`, \`!b\` and \`!t\`
			are dropped.

			    menus.create("SHOP", { title: ({ player }) => \`Shop for \${player.name}\` });
		`,
		ru: `
			Текст меню — заголовок, пункт, сообщение: сам текст или функция, которая
			даёт его по контексту меню. Ключ словаря переводится в обоих случаях.
			Цветовые метки — буквы чата: \`!y\` жёлтый, \`!r\` красный, \`!d\`
			серый, \`!w\` белый, \`!R\` — к правому краю; метки только для чата \`!g\`, \`!b\` и \`!t\`
			убираются.

			    menus.create("SHOP", { title: ({ player }) => \`Shop for \${player.name}\` });
		`,
	},
	"ListRow": {
		en: `A row of a list menu, as a list source gives it - made with \`listRow()\` or \`textRow()\`.`,
		ru: `Строка меню-списка, как её отдаёт источник, — из \`listRow()\` или \`textRow()\`.`,
	},
	"ListRow.kind": {
		en: `The row's kind, one of \`"item"\` (a row to choose) or \`"text"\` (a line of text, not a choice).`,
		ru: `Вид строки, одно из \`"item"\` (строка для выбора) или \`"text"\` (строка текста, не выбор).`,
	},
	"ListRow.target": {
		en: `The row's number, \`row\` of the context its item's functions get: e.g. a player's \`id\`, an entity or an index of the source's own; \`0\` for a line of text.`,
		ru: `Номер строки, \`row\` в контексте, который получают функции её пункта: например, \`id\` игрока, сущность или индекс самого источника; \`0\` у строки текста.`,
	},
	"ListRow.text": {
		en: `The row's text, put for \`%name%\` in the menu's row template.`,
		ru: `Текст строки, который подставляется вместо \`%name%\` в шаблон строки меню.`,
	},
	"ListRow.action": {
		en: `Action names of the row's own, run instead of the template's; \`""\` for the template's.`,
		ru: `Собственные имена действий строки, вместо действий шаблона; \`""\` — действия шаблона.`,
	},
	"ListRow.restriction": {
		en: `Restriction names, space-separated: the row is greyed out unless each passes.`,
		ru: `Имена ограничений через пробел: строка погашена, пока не пройдено каждое.`,
	},
	"ListRow.restrictionMessage": {
		en: `The text beside the row while it is greyed out; \`""\` for the restriction's own message.`,
		ru: `Текст рядом со строкой, пока она погашена; \`""\` — сообщение самого ограничения.`,
	},
	"MenuOptions": {
		en: `
			The options of a menu made with \`create()\`. Every field may be left out:

			    menus.create("SHOP", { title: "Shop", time: 30, activeWhen: ({ player }) => player.isAlive });
		`,
		ru: `
			Настройки меню, сделанного через \`create()\`. Любое поле можно не задавать:

			    menus.create("SHOP", { title: "Shop", time: 30, activeWhen: ({ player }) => player.isAlive });
		`,
	},
	"MenuOptions.title": {
		en: `The menu's title: the text - a lang key too - or a function that gives it for the menu's context; left out, the menu's name.`,
		ru: `Заголовок меню: сам текст — или ключ словаря — либо функция, которая даёт его по контексту меню; если не задан — имя меню.`,
	},
	"MenuOptions.time": {
		en: `Seconds on the countdown when the menu opens, e.g. \`10\`; left out, none.`,
		ru: `Секунды отсчёта при открытии меню, например \`10\`; если не задано — без отсчёта.`,
	},
	"MenuOptions.hideBack": {
		en: `Hiding of the \`"Back"\` button: \`true\` leaves it out.`,
		ru: `Скрытие кнопки \`"Назад"\`: \`true\` убирает её.`,
	},
	"MenuOptions.hideExit": {
		en: `Hiding of the \`"Exit"\` button: \`true\` leaves it out.`,
		ru: `Скрытие кнопки \`"Выход"\`: \`true\` убирает её.`,
	},
	"MenuOptions.locked": {
		en: `A lock on the menu: while \`true\`, items cannot be chosen and no other menu replaces this one.`,
		ru: `Блокировка меню: пока \`true\`, пункты нельзя выбрать и другое меню не заменяет это.`,
	},
	"MenuOptions.activeWhen": {
		en: `A test the menu opens under: while it says no, the menu does not open for the player.`,
		ru: `Проверка, при которой меню открывается: пока она отвечает «нет», меню игроку не открывается.`,
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
		en: `The player the menu is about: \`target\` of the context its functions get, and \`%target%\`.`,
		ru: `Игрок, о котором меню: \`target\` в контексте, который получают его функции, и \`%target%\`.`,
	},
	"MenuShowOptions.resetHistory": {
		en: `A new way back: \`true\` forgets the menus this one was opened from.`,
		ru: `Новый путь назад: \`true\` забывает меню, из которых открыто это.`,
	},
	"MenuShowOptions.force": {
		en: `Opening over a menu that holds on - a countdown, a lock: \`true\` opens anyway.`,
		ru: `Открытие поверх меню, которое держится, — с отсчётом или заблокированного: \`true\` открывает всё равно.`,
	},
	"MenuShowOptions.skipHistory": {
		en: `Leaving the menu out of the way back: \`true\` does not remember it.`,
		ru: `Пропуск меню на пути назад: \`true\` его не запоминает.`,
	},
	"MenuItemOptions": {
		en: `
			An item: its title, when it is shown and can be chosen, and what choosing
			it does. Every field but \`title\` may be left out:

			    shop.addItem({
			        title: ({ player }) => \`Heal (\${player.health} HP)\`,
			        visible: ({ player }) => player.health < 100,
			        onSelect: ({ player }) => {
			            player.health = 100;
			        },
			    });
		`,
		ru: `
			Пункт: его заголовок, когда он показан и когда его можно выбрать и что
			делает выбор. Любое поле, кроме \`title\`, можно не задавать:

			    shop.addItem({
			        title: ({ player }) => \`Heal (\${player.health} HP)\`,
			        visible: ({ player }) => player.health < 100,
			        onSelect: ({ player }) => {
			            player.health = 100;
			        },
			    });
		`,
	},
	"MenuItemOptions.title": {
		en: `The item's text - a lang key too - or a function that gives it for the menu's context.`,
		ru: `Текст пункта — или ключ словаря — либо функция, которая даёт его по контексту меню.`,
	},
	"MenuItemOptions.onSelect": {
		en: `The function run when the item is chosen; the menu is drawn again after it, while it stays open.`,
		ru: `Функция, которая выполняется при выборе пункта; после неё меню перерисовывается, если осталось открытым.`,
	},
	"MenuItemOptions.visible": {
		en: `A test the item is shown under: while it says no, the item is left out and takes no slot.`,
		ru: `Проверка, при которой пункт показан: пока она отвечает «нет», пункта нет и слот он не занимает.`,
	},
	"MenuItemOptions.enabled": {
		en: `
			A test the item can be chosen under - while it says no, the item is
			greyed out with \`message\` beside it; or a list of requirements, each with
			a message of its own - the first that fails gives its message.

			    enabled: [
			        { when: ({ player }) => player.frags >= 5, message: "5 frags needed" },
			        { when: ({ player }) => player.armor < 100, message: ({ player }) => \`(\${player.armor} already)\` },
			    ],
		`,
		ru: `
			Проверка, при которой пункт можно выбрать, — пока она отвечает «нет»,
			пункт погашен, а рядом \`message\`; или список требований, у каждого своё
			сообщение, — первое невыполненное даёт своё.

			    enabled: [
			        { when: ({ player }) => player.frags >= 5, message: "5 frags needed" },
			        { when: ({ player }) => player.armor < 100, message: ({ player }) => \`(\${player.armor} already)\` },
			    ],
		`,
	},
	"MenuItemOptions.message": {
		en: `The text beside the item while \`enabled\` greys it out, for a requirement without a message of its own: the text, e.g. \`"(full)"\`, or a function that gives it for the menu's context.`,
		ru: `Текст рядом с пунктом, пока его гасит \`enabled\`, — для требования без своего сообщения: сам текст, например \`"(full)"\`, или функция, которая даёт его по контексту меню.`,
	},
	"MenuItemOptions.placeholder": {
		en: `The text after the item's title, for items of menu files and Pawn plugins, placeholders and all, e.g. \`"%hp%"\`; in code the title is a function instead.`,
		ru: `Текст после заголовка пункта — для пунктов файлов меню и Pawn-плагинов, с плейсхолдерами, например \`"%hp%"\`; в коде заголовок — функция.`,
	},
	"MenuItemOptions.action": {
		en: `Action names from \`addAction()\` run when the item is chosen, or a built-in one: \`"SHOW_<MENU>"\`, \`"CLOSE_MENU"\`.`,
		ru: `Имена действий из \`addAction()\`, которые выполняются при выборе пункта, или встроенное: \`"SHOW_<MENU>"\`, \`"CLOSE_MENU"\`.`,
	},
	"MenuItemOptions.at": {
		en: `The item's place among the items, from \`0\`; left out, the end.`,
		ru: `Место пункта среди пунктов, от \`0\`; если не задано — в конце.`,
	},
	"MenuItemOptions.spaceBefore": {
		en: `Blank lines before the item.`,
		ru: `Пустые строки перед пунктом.`,
	},
	"MenuItemOptions.spaceAfter": {
		en: `Blank lines after the item.`,
		ru: `Пустые строки после пункта.`,
	},
	"Requirement": {
		en: `
			A requirement of an item, in the list \`enabled\` takes: while \`when\` says
			no, the item is greyed out with \`message\` beside it.

			    { when: ({ player }) => player.frags >= 5, message: "5 frags needed" }
		`,
		ru: `
			Требование пункта в списке, который принимает \`enabled\`: пока \`when\`
			отвечает «нет», пункт погашен, а рядом \`message\`.

			    { when: ({ player }) => player.frags >= 5, message: "5 frags needed" }
		`,
	},
	"Requirement.when": {
		en: `A test the requirement holds under, given the menu's context.`,
		ru: `Проверка, при которой требование выполнено, по контексту меню.`,
	},
	"Requirement.message": {
		en: `The text beside the item while \`when\` says no: the text, a lang key, or a function that gives it for the menu's context; left out, the item's \`message\`.`,
		ru: `Текст рядом с пунктом, пока \`when\` отвечает «нет»: сам текст, ключ словаря или функция, которая даёт его по контексту меню; если не задан — \`message\` пункта.`,
	},
	"ConditionTest": {
		en: `A condition's test, as \`addCondition()\` registers it. In a list menu \`player\` is the row's player and \`viewer\` whoever looks.`,
		ru: `Проверка условия, как её регистрирует \`addCondition()\`. В меню-списке \`player\` — игрок строки, \`viewer\` — тот, кто смотрит.`,
	},
	"ActionHandler": {
		en: `An action, as \`addAction()\` registers it: run with the context of the item chosen, and the action's name.`,
		ru: `Действие, как его регистрирует \`addAction()\`: выполняется с контекстом выбранного пункта и именем действия.`,
	},
	"PlaceholderValue": {
		en: `A placeholder's value: the text \`%name%\` stands for, given the context of the text it is in.`,
		ru: `Значение плейсхолдера: текст, которым заменяется \`%name%\`, по контексту текста, в котором он стоит.`,
	},
	"RestrictionTest": {
		en: `A restriction's test, as \`addRestriction()\` registers it; \`name\` is the whole token, \`"NAME:param"\` included.`,
		ru: `Проверка ограничения, как её регистрирует \`addRestriction()\`; \`name\` — токен целиком, вместе с \`"NAME:param"\`.`,
	},
	"ActionTest": {
		en: `A test of an item's action, as \`addActionCheck()\` registers it: \`name\` is the action, and \`false\` greys the item out.`,
		ru: `Проверка действия пункта, как её регистрирует \`addActionCheck()\`: \`name\` — действие, а \`false\` гасит пункт.`,
	},
	"ConditionFilter": {
		en: `A filter over a condition someone else registered: gets its value and returns the one to use.`,
		ru: `Фильтр над условием, которое зарегистрировал кто-то другой: получает его значение и возвращает то, что будет использовано.`,
	},
	"RowTest": {
		en: `A test of a row of a list menu, as \`addFilter()\` takes it: \`target\` is the row's player, \`player\` whoever looks.`,
		ru: `Проверка строки меню-списка, как её принимает \`addFilter()\`: \`target\` — игрок строки, \`player\` — тот, кто смотрит.`,
	},
	"ListSource": {
		en: `A list source: the rows of a list menu for the player who looks; \`null\` lists the players instead.`,
		ru: `Источник списка: строки меню-списка для игрока, который смотрит; \`null\` — вместо них список игроков.`,
	},
	"MenuEventType": {
		en: `A menu event's type, one of \`"open"\` and \`"close"\` as they happen, or \`"show"\` before a menu opens, to stop it.`,
		ru: `Тип события меню, одно из \`"open"\` и \`"close"\` — когда это происходит, или \`"show"\` — до открытия меню, чтобы его остановить.`,
	},
	"MenuCoreOptions": {
		en: `Menu Core's options: \`menus\` in \`amxts.config.ts\`.`,
		ru: `Настройки Menu Core: \`menus\` в \`amxts.config.ts\`.`,
	},
	"MenuCoreOptions.file": {
		en: `The menu file, from \`configs/\`: e.g. \`"menu"\` is \`configs/menu.ini\`, \`menu.yaml\`, \`menu.yml\`, \`menu.json\` or \`menu.jsonc\` - the first that is there; \`"myserver/menu.yaml"\` is that file.`,
		ru: `Файл меню от \`configs/\`: например, \`"menu"\` — \`configs/menu.ini\`, \`menu.yaml\`, \`menu.yml\`, \`menu.json\` или \`menu.jsonc\` — первый, который есть; \`"myserver/menu.yaml"\` — этот файл.`,
	},
	"MenuCoreOptions.fallback": {
		en: `The file read instead when \`file\` is empty or not there, e.g. \`"menu"\` for \`configs/menu.ini\` or \`menu.yaml\`; \`""\` is none.`,
		ru: `Файл, который читается вместо \`file\`, если тот пуст или его нет, например \`"menu"\` — \`configs/menu.ini\` или \`menu.yaml\`; \`""\` — никакой.`,
	},
};
