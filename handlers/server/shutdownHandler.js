import Logger from "../consoleHandler.js";
import * as listener from "../listener.js";

export default class ShutdownHandler {
  constructor(server) {
    this.#server = server;
    this.#logger = new Logger([
      "serverHandler",
      "server " + server.serverNum,
      "shutdownHandler",
    ]);
  }

  stopServerIn(callback, millis, shouldRestart = null) {
    this.#logger.info(`Server shutting down in ${millis} millis`);
    const shuttingDownAt = Date.now() + millis;
    this.#callbacks.push({ callback, shouldRestart, shuttingDownAt });
    if (this.isTimeoutActive) {
      if (shuttingDownAt > this.serverShuttingDownAt) return;
      this.resetTimeouts();
      this.setTimeouts(millis);
    } else {
      this.setTimeouts(millis);
    }
  }

  setTimeouts(millis) {
    listener.emit(
      "_serverStoppingInUpdate" + this.#server.serverNum,
      millis / 1000
    );
    const timeoutId = setTimeout(() => {
      this.stopServer(false);
    }, millis);
    this.#stopTimeoutIds = [timeoutId];

    this.#stopTimestamps.forEach((timestamp) => {
      if (millis < timestamp) return;

      const timeoutId = setTimeout(() => {
        this.logTimeLeftInServer(timestamp);
        this.#stopTimeoutIds.pop();
      }, millis - timestamp);
      this.#stopTimeoutIds.push(timeoutId);
    });
    this.serverShuttingDownAt = Date.now() + millis;
    this.isTimeoutActive = true;
  }

  logTimeLeftInServer(timeLeft) {
    this.#logger.info(`Time logged in server (${timeLeft} ms left)`);
    timeLeft /= 1000;
    let quantity = "seconds";
    if (timeLeft >= 60) {
      quantity = "minutes";
      timeLeft /= 60;
    }
    this.#server.write(
      `title @a subtitle {"text":"In ${timeLeft} ${quantity}"}\n` +
        `title @a title {"text":"Server shutting down","color":"green"}`
    );
  }

  resetTimeouts() {
    listener.emit("_serverStoppingInUpdate" + this.#server.serverNum, -1);
    this.#stopTimeoutIds.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.#stopTimeoutIds = [];
    this.isTimeoutActive = false;
  }

  async stopServer(force = true) {
    this.#calcTooEarlyCallbacks();
    this.resetTimeouts();
    this.#server.write("stop");
    this.#server.setServerStatus("stopping");
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (this.#server.status == "offline") break;
    }
    this.callCallbacks(force);
  }

  #calcTooEarlyCallbacks() {
    const date = Date.now();
    this.#callbacks.forEach((e) => {
      e.timeTooEarly = e.shuttingDownAt - date;
    });
  }

  async callCallbacks(forceShutdown) {
    let shouldRestart = null;
    for (const callback of this.#callbacks) {
      await callback.callback(callback.timeTooEarly);
      if (callback.shouldRestart === false && shouldRestart !== false)
        shouldRestart = false;
      if (callback.shouldRestart === true && shouldRestart === null)
        shouldRestart = true;
    }
    if (shouldRestart && !forceShutdown) this.#server.start();
    this.#callbacks = [];
  }

  async restart(callbackOnShutdown) {
    await this.stopServer();
    if (callbackOnShutdown) await callbackOnShutdown();
    this.#server.start();
  }

  isTimeoutActive = false;
  serverShuttingDownAt;
  #stopTimeoutIds = [];
  #callbacks = [];
  #stopTimestamps = [10e3, 30e3, 60e3, 120e3, 300e3, 600e3, 1200e3, 1800e3]; //seconds

  #logger;
  #server;
}
