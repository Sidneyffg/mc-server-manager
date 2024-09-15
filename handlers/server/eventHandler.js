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
    this.serverType = this.#server.data.type;
  }

  handle(message) {
    listener.emit("_consoleUpdate" + this.#server.serverNum, message);
    message = this.filterTimestamp(message);
    if (!message) return;
    if (this.isChatMessage(message)) return;

    let res = this.checkforEvent(message);
    if (!res) return;

    switch (res.event) {
      case "started":
        this.#server.resolveStart(true);
        this.#server.setServerStatus("online");
        break;
      case "joined":
        this.#server.playerHandler.handlePlayerConnected(res.data.username);
        break;
      case "left":
        this.#server.playerHandler.handlePlayerDisconnected(res.data.username);
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
    const reg = this.timestampReg[this.serverType].exec(message);
    if (!reg) return null;
    return reg[1];
  }
  isChatMessage(message) {
    return message.match(/^<[^ ]*>/m);
  }

  addOnlineTodoItem(data) {
    this.data.todo.online.push(new TodoItem(data));
    this.#logger.info(`Added online todo item: ${data.action}`);
  }

  addOfflineTodoItem(data) {
    console.trace();
    this.data.todo.offline.push(new TodoItem(data));
    this.#logger.info(`Added offline todo item: ${data.action}`);
  }

  timestampReg = {
    paper: /\[[0-9:]{8} (?:INFO|WARN|ERROR)\]: (.*)/,
    vanilla: /^\[.*?\] \[.*?\]: (.*)/m,
  };

  checker = {
    paper: [
      {
        match: /Done \([0-9.]*s\)! For help, type "help"/,
        event: "started",
      },
      {
        match: /([^ ]*) joined the game/,
        event: "joined",
        data: ["username"],
      },
      {
        match: /([^ ]*) lost connection: (.*)/,
        event: "left",
        data: ["username", "reason"],
      },
    ],
    vanilla: [
      {
        match: /Done \([0-9.]*s\)! For help, type "help"/,
        event: "started",
      },
      {
        match: /([^ ]*) joined the game/,
        event: "joined",
        data: ["username"],
      },
      {
        match: /([^ ]*) lost connection: (.*)/,
        event: "left",
        data: ["username", "reason"],
      },
    ],
  };

  #logger;
  #server;
}
