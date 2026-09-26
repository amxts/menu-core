import { Player, plugin, print, server } from "@amxts/core";
import * as menus from "@amxts/menu-core";

plugin({ name: "Players", version: "1.0.0", author: "you", description: "A list menu: a row per player" });

// A name starting with LIST_ is a list menu: a row per player, drawn with its
// first item - `target` is the row's player.
const players = menus.create("LIST_PLAYERS", { title: "Who to greet" });
players.addFilter((row, viewer) => row.id != viewer.id && row.isAlive, "Nobody to greet");
players.addItem(rowText, { onSelect: greet });

players.addEventListener("close", (event) => {
	if (event.timeout) print(event.player, "Too slow");
});

server.addCommand("/greet", (player) => {
	players.show(player, { time: 10 });
});

function rowText(player: Player, target: number) {
	const row = new Player(target);
	return `${row.name} (${row.health} HP)`;
}

function greet(player: Player, target: number) {
	const greeted = new Player(target);
	print(greeted, `${player.name} says hello`);
}
