import * as listener from "./listener.js";
import Logger from "./consoleHandler.js";

export default class PlayerHandler {
  constructor(server) {
    this.server = server;
    this.#logger = new Logger([
      "serverHandler",
      "server " + server.serverNum,
      "playerhandler",
    ]);
    this.fileHandler = this.server.fileHandler;

    this.#updateAllPlayergroups();

    server.on("playerConnected", (playerName) => {
      this.onlinePlayers.push(playerName);
      listener.emit(
        "_onlinePlayersUpdate" + server.serverNum,
        this.onlinePlayers
      );
      this.#logger.info(`${playerName} connected to server`);

      const playerData = this.allPlayers.find((e) => e.name == playerName);
      if (playerData) {
        playerData.lastJoin = Date.now();
        return;
      }
      this.allPlayers.push({ name: playerName, lastJoin: Date.now() });
    });

    server.on("playerDisconnected", (playerName) => {
      this.onlinePlayers.splice(this.onlinePlayers.indexOf(playerName), 1);
      listener.emit(
        "_onlinePlayersUpdate" + server.serverNum,
        this.onlinePlayers
      );
      this.#logger.info(`${playerName} disconnected from server`);
    });

    server.on("statusUpdate", (status) => {
      switch (status) {
        case "online":
          this.#wachPlayers();
          this.#updateAllPlayergroups();
          break;
        case "offline":
          this.#unwatchPlayers();
          break;
      }
    });
  }
  onlinePlayers = [];
  allPlayers = [];
  whitelistedPlayers = [];
  oppedPlayers = [];

  #wachPlayers() {
    this.fileHandler.watchFile("usercache", this.#updateAllPlayers.bind(this));
    this.fileHandler.watchFile(
      "whitelist",
      this.#updateWhitelistedPlayers.bind(this)
    );
    this.fileHandler.watchFile("ops", this.#updateOppedPlayers.bind(this));
  }

  #unwatchPlayers() {
    this.fileHandler.unwatchFiles("usercache", "whitelist", "ops");
  }

  #updateAllPlayergroups() {
    this.#updateAllPlayers();
    this.#updateOppedPlayers();
    this.#updateWhitelistedPlayers();
  }

  #updateAllPlayers() {
    const allPlayers = this.fileHandler.readFile("usercache");

    this.allPlayers = allPlayers.map((e) => e.name);
    listener.emit("_allPlayersUpdate" + this.server.serverNum, this.allPlayers);
  }

  #updateWhitelistedPlayers() {
    const whitelistedPlayers = this.fileHandler.readFile("whitelist");

    this.whitelistedPlayers = whitelistedPlayers.map((e) => e.name);
    listener.emit(
      "_whitelistedPlayersUpdate" + this.server.serverNum,
      this.whitelistedPlayers
    );
  }

  #updateOppedPlayers() {
    const oppedPlayers = this.fileHandler.readFile("ops")

    this.oppedPlayers = oppedPlayers.map((e) => e.name);
    listener.emit(
      "_oppedPlayersUpdate" + this.server.serverNum,
      this.oppedPlayers
    );
  }

  addPlayerToWhitelist(name) {
    if (this.whitelistedPlayers.includes(name)) return false;
    this.server.server.stdin.write(`whitelist add ${name}\n`);
    return true;
  }

  makePlayerOperator(name) {
    if (this.oppedPlayers.includes(name)) return false;
    this.server.server.stdin.write(`op ${name}\n`);
    return true;
  }

  #logger;
}
