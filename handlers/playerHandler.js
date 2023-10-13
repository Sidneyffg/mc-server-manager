import * as listener from "./listener.js";
import Logger from "./consoleHandler.js";

export default class PlayerHandler {
  constructor(server) {
    this.#logger = new Logger([
      "serverHandler",
      "server " + server.serverNum,
      "playerhandler",
    ]);
    if (!server.data?.playerHandler) {
      server.data.playerHandler = {
        allPlayers: [],
        oppedPlayers: [],
        whitelistedPlayers: [],
      };
    }
    this.data = server.data.playerHandler;

    server.on("playerConnected", (playerName) => {
      this.onlinePlayers.push(playerName);
      listener.emit("_playerUpdate" + server.serverNum, this.onlinePlayers);
      this.#logger.info(`${playerName} connected to server`);

      const playerData = this.data.allPlayers.find((e) => e.name == playerName);
      if (playerData) {
        playerData.lastJoin = Date.now();
        return;
      }
      this.data.allPlayers.push({ name: playerName, lastJoin: Date.now() });
    });

    server.on("playerDisconnected", (playerName) => {
      this.onlinePlayers.splice(this.onlinePlayers.indexOf(playerName), 1);
      listener.emit("_playerUpdate" + server.serverNum, this.onlinePlayers);
      this.#logger.info(`${playerName} disconnected from server`);
    });

    server.on("playerOpped", (playerName) => {
      this.data.oppedPlayers.push(playerName);
      this.#logger.info(`Player ${playerName} has been opped`);
    });

    server.on("playerDeOpped", (playerName) => {
      this.data.oppedPlayers.splice(
        this.data.oppedPlayers.indexOf(playerName),
        1
      );
      console.log(this.data.oppedPlayers);
      this.#logger.info(`Player ${playerName} has been deopped`);
    });

    server.on("playerAddedToWhitelist", (playerName) => {
      this.data.whitelistedPlayers.push(playerName);
      this.#logger.info(`Added ${playerName} to whitelist`);
    });

    server.on("playerRemovedFromWhitelist", (playerName) => {
      this.data.whitelistedPlayers.splice(
        this.data.whitelistedPlayers.indexOf(playerName),
        1
      );
      this.#logger.info(`Removed ${playerName} from whitelist`);
    });
  }
  onlinePlayers = [];
  #logger;
}
