import * as listener from "./listener.js";
import Logger from "./consoleHandler.js";
import fs, { watch } from "fs";

export default class PlayerHandler {
  constructor(server) {
    this.server = server;
    this.#logger = new Logger([
      "serverHandler",
      "server " + server.serverNum,
      "playerhandler",
    ]);

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
    fs.watchFile(
      `${this.server.path}/usercache.json`,
      this.#updateAllPlayers.bind(this)
    );
    fs.watchFile(
      `${this.server.path}/whitelist.json`,
      this.#updateWhitelistedPlayers.bind(this)
    );
    fs.watchFile(
      `${this.server.path}/ops.json`,
      this.#updateOppedPlayers.bind(this)
    );
  }

  #unwatchPlayers() {
    fs.unwatchFile(`${this.server.path}/usercache.json`);
    fs.unwatchFile(`${this.server.path}/whitelist.json`);
    fs.unwatchFile(`${this.server.path}/ops.json`);
  }

  #updateAllPlayergroups() {
    this.#updateAllPlayers();
    this.#updateOppedPlayers();
    this.#updateWhitelistedPlayers();
  }

  #updateAllPlayers() {
    let path = `${this.server.path}/usercache.json`;
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, "[]");
    }

    let allPlayers = fs.readFileSync(path);
    allPlayers = JSON.parse(allPlayers);

    this.allPlayers = allPlayers.map((e) => e.name);
    listener.emit("_allPlayersUpdate" + this.server.serverNum, this.allPlayers);
  }

  #updateWhitelistedPlayers() {
    let path = `${this.server.path}/whitelist.json`;
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, "[]");
    }

    let whitelistedPlayers = fs.readFileSync(path);
    whitelistedPlayers = JSON.parse(whitelistedPlayers);

    this.whitelistedPlayers = whitelistedPlayers.map((e) => e.name);
    listener.emit(
      "_whitelistedPlayersUpdate" + this.server.serverNum,
      this.whitelistedPlayers
    );
  }

  #updateOppedPlayers() {
    let path = `${this.server.path}/ops.json`;
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, "[]");
    }

    let oppedPlayers = fs.readFileSync(path);
    oppedPlayers = JSON.parse(oppedPlayers);

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
