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
  }

  handle(data, resolve) {
    listener.emit("_consoleUpdate" + this.#server.serverNum, data);
    const inc = data.includes.bind(data);

    if (inc("Timings Reset")) {
      this.#server.setServerStatus("online");
      resolve();
    }
    if (inc("UUID of player ")) {
      const name = data.split(" ")[5];
      this.#server.emit("playerConnected", name);
    }
    if (inc(" lost connection: ")) {
      const name = data.split(" ")[2];
      this.#server.emit("playerDisconnected", name);
    }
    if (inc(" a server operator")) {
      const name = data.split(" ")[4];
      if (inc(" no longer ")) {
        this.#server.emit("playerDeOpped", name);
      } else {
        this.#server.emit("playerOpped", name);
      }
    }

    if (inc("to the whitelist")) {
      const name = data.split(" ")[4];
      this.#server.emit("playerAddedToWhitelist", name);
    }

    if (inc("from the whitelist")) {
      const name = data.split(" ")[4];
      this.#server.emit("playerRemovedFromWhitelist", name);
    }

    if (inc("Whitelist is now turned ")) {
      this.#server.emit("whitelistStatusUpdate", inc(" on"));
    }
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

  #logger;
  #server;
}
