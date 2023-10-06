import Logger from "./consoleHandler.js";
import * as listener from "./listener.js";

export default class EventHandler {
  constructor(server) {
    this.server = server;
    this.#logger = new Logger([
      "serverManager",
      "server " + server.serverNum,
      "eventHandler",
    ]);
  }
  #logger;

  handle(data, resolve) {
    listener.emit("_consoleUpdate" + this.server.serverNum, data);

    if (data.includes("Timings Reset")) {
      this.server.setServerStatus("online");
      resolve();
    }
    if (data.includes("UUID of player ")) {
      const dataArr = data.split(" ");
      this.server.emit("playerConnected", {
        name: dataArr[5],
        uuid: dataArr[7],
      });
    }
    if (data.includes(" lost connection: ")) {
      const name = data.split(" ")[2];
      this.server.emit("playerDisconnected", { name });
    }
  }

  handleErr(err) {
    listener.emit("_consoleUpdate" + this.server.serverNum, err);
    this.#logger.error(err);
  }
}
