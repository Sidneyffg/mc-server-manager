import * as listener from "./listener.js";
import Logger from "./consoleHandler.js";

export default class PlayerHandler {
  constructor(server) {
    this.#logger = new Logger([
      "serverHandler",
      "server " + server.serverNum,
      "playerhandler",
    ]);

    server.on("playerConnected", (player) => {
      this.onlinePlayers.push(player);
      listener.emit("_playerUpdate" + server.serverNum, this.onlinePlayers);
      this.#logger.info(`${player.name} connected to server.`);
    });
    server.on("playerDisconnected", (player) => {
      const offlinePlayer = this.onlinePlayers.find(
        (e) => e.name == player.name
      );
      this.onlinePlayers.splice(this.onlinePlayers.indexOf(offlinePlayer), 1);
      listener.emit("_playerUpdate" + server.serverNum, this.onlinePlayers);
      this.#logger.info(`${player.name} disconnected from server.`);
    });
  }
  onlinePlayers = [];
  #logger;
}
