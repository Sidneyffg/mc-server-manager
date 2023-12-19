import Logger from "../consoleHandler.js";
import * as listener from "../listener.js";
import TodoItem from "../todoItem.js";

export default class EventHandler {
  constructor(server) {
    this.#server = server;
    this.#logger = new Logger([
      "serverHandler",
      "server " + server.serverNum,
      "eventHandler",
    ]);

    this.data = server.data.eventHandler;
    if (!this.data) {
      this.#server.data.eventHandler = {
        todo: {
          online: [],
          offline: [],
        },
      };
      this.data = server.data.eventHandler;
    }

    server.on("statusUpdate", (status) => {
      switch (status) {
        case "online":
          this.data.todo.online.forEach((todoItem) => {
            switch (todoItem.action) {
              case "addPlayerToWhitelist":
                server.playerHandler.addPlayerToWhitelist(todoItem.value);
                break;
              case "makePlayerOperator":
                server.playerHandler.makePlayerOperator(todoItem.value);
                break;
            }
          });
          this.data.todo.online = [];
          break;
        case "offline":
          this.data.todo.offline.forEach((todoItem) => {
            switch (todoItem.action) {
              case "saveServerProperties":
                this.#server.fileHandler.writeFile(
                  "properties",
                  todoItem.value
                );
                break;
            }
          });
          this.data.todo.offline = [];
          break;
      }
    });
    this.serverType = this.#server.data.versionData.type;
  }

  handle(message, resolve) {
    listener.emit("_consoleUpdate" + this.#server.serverNum, message);
    message = this.filterTimestamp(message);
    if (!message) return;
    if (this.isChatMessage(message)) return;

    let res = this.checkforEvent(message);
    if (!res) return;

    switch (res.event) {
      case "started":
        this.#server.setServerStatus("online");
        resolve();
        break;
      case "joined":
        this.#server.emit("playerConnected", res.data.username);
        break;
      case "left":
        this.#server.emit("playerDisconnected", res.data.username);
        break;
    }
  }

  checkforEvent(message) {
    let res = null;
    this.checker[this.serverType].forEach((e) => {
      if (res) return;
      const reg = e.match.exec(message);
      if (!reg) return;
      if (!e.data) return (res = { event: e.event });
      const data = {};
      e.data.forEach((a, idx) => (data[a] = reg[idx + 1]));
      res = { event: e.event, data };
    });
    return res;
  }

  filterTimestamp(message) {
    const reg = /\[[0-9:]{8} (?:INFO|WARN|ERROR)\]: (.*)/.exec(message);
    if (!reg) return null;
    return reg[1];
  }
  isChatMessage(message) {
    return message.match(/^<[^ ]*>/m);
  }

  addOnlineTodoItem(data) {
    this.data.todo.online.push(new TodoItem(data));
  }

  addOfflineTodoItem(data) {
    this.data.todo.offline.push(new TodoItem(data));
    this.#logger.info(
      "Added todo item:\n" + JSON.stringify(this.settings, null, 2)
    );
  }

  checker = {
    paper: [
      {
        match: /Done \([0-9.]*s\)! For help, type "help"/,
        event: "started",
      },
      {
        match: /\[38;2;255;255;85m([^ ]*) joined the game/,
        event: "joined",
        data: ["username"],
      },
      {
        match: /([^ ]*) lost connection: (.*)/,
        event: "left",
        data: ["username", "reason"],
      },
    ],
    vanilla: {},
  };

  #logger;
  #server;
}
