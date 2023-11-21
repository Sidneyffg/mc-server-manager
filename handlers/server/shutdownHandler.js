import * as listener from "../listener.js";

export default class ShutdownHandler {
  constructor(server) {
    this.#server = server;
  }

  stopServerIn(sec, callback) {
    if (callback) this.#callbacks.push(callback);
    if (this.isTimeoutActive) {
      const shuttingDownAt = Date.now() + sec * 1000;
      if (shuttingDownAt > this.serverShuttingDownAt) return;
      this.resetTimeouts();
      this.setTimeouts(sec);
    } else {
      this.setTimeouts(sec);
    }
  }

  setTimeouts(sec) {
    listener.emit("_serverStoppingInUpdate" + this.#server.serverNum, sec);
    const timeoutId = setTimeout(() => {
      this.stopServer();
    }, sec * 1000);
    this.#stopTimeoutIds = [timeoutId];

    this.#stopTimestamps.forEach((timestamp) => {
      if (sec < timestamp) return;

      const timeoutId = setTimeout(() => {
        this.logTimeLeftInServer(timestamp);
        this.#stopTimeoutIds.pop();
      }, (sec - timestamp) * 1000);
      this.#stopTimeoutIds.push(timeoutId);
    });
    this.serverShuttingDownAt = Date.now() + sec * 1000;
    this.isTimeoutActive = true;
  }

  logTimeLeftInServer(timeLeft) {
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
    this.#stopTimeoutIds.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.#stopTimeoutIds = [];
    this.isTimeoutActive = false;
  }

  async stopServer() {
    this.resetTimeouts();
    this.#server.write("stop");
    this.#server.setServerStatus("stopping");
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (this.#server.status == "offline") break;
    }
    this.callCallbacks();
  }

  async callCallbacks() {
    this.#callbacks.forEach((callback) => callback());
    this.#callbacks = [];
  }

  isTimeoutActive = false;
  serverShuttingDownAt;
  #stopTimeoutIds = [];
  #callbacks = [];
  #stopTimestamps = [10, 30, 60, 120, 300, 600, 1200, 1800];

  #server;
}
