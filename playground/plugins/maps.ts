plugin({ name: "Maps", version: "1.0.0", author: "you", description: "A list menu of rows of its own" });

const maps = ["de_dust2", "de_inferno", "de_nuke"];

// A list source gives the rows: `row` is the number listRow was given.
const vote = menus.create("LIST_MAPS", { title: "Next map" });
vote.setListSource(() => maps.map((map, index) => menus.listRow(index, map)));
vote.addItem({
	title: ({ row }) => maps[row],
	onSelect: ({ player, row }) => print(0, `${player.name} votes for ${maps[row]}`),
});

server.addCommand("/maps", ({ player }) => {
	vote.show(player);
});
