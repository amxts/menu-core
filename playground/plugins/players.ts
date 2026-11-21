plugin({ name: "Players", version: "1.0.0", author: "you", description: "A list menu: a row per player" });

// A name starting with LIST_ is a list menu: a row per player, drawn with its
// first item - `target` is the row's player.
const players = menus.create("LIST_PLAYERS", { title: "Who to greet" });
players.addFilter(({ player, target }) => target.id != player.id && target.isAlive, "Nobody to greet");
players.addItem({
	title: ({ target }) => `${target.name} (${target.health} HP)`,
	onSelect: ({ player, target }) => target.print(`${player.name} says hello`),
});

players.addEventListener("close", (event) => {
	if (event.timeout) event.player.print("Too slow");
});

// Why the list is empty, in the middle of the screen instead of the chat.
players.addEventListener("message", (event) => {
	event.player.print(event.text, "center");
	event.preventDefault();
});

server.addCommand("/greet", ({ player }) => {
	players.show(player, { time: 10 });
});
