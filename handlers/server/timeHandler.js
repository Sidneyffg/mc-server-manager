import Logger from "../consoleHandler.js";

export default class TimeHandler {
  constructor(server) {
    this.#server = server;
    this.#logger = new Logger([
      "serverHandler",
      "server " + server.serverNum,
      "timeHandler",
    ]);
  }

  #server;
  #logger;
}
