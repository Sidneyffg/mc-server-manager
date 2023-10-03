export default class PlayerHandler {
  constructor(serverHandler) {
    this.serverHandler = serverHandler;

    for (let i = 0; i < serverHandler.servers.length; i++)
      this.onlinePlayers.push([]);
    console.log(this.onlinePlayers);
    serverHandler.on("playerConnected", (player, serverNum) => {
      const currentOnlinePlayers = this.onlinePlayers[serverNum];
      currentOnlinePlayers.push(player);
      this.emit("_playerUpdate" + serverNum, currentOnlinePlayers);
    });
    serverHandler.on("playerDisconnected", (player, serverNum) => {
      const currentOnlinePlayers = this.onlinePlayers[serverNum];
      const offlinePlayer = currentOnlinePlayers.find(
        (e) => e.name == player.name
      );
      currentOnlinePlayers.splice(
        currentOnlinePlayers.indexOf(offlinePlayer),
        1
      );
      this.emit("_playerUpdate" + serverNum, currentOnlinePlayers);
    });
  }
  onlinePlayers = [];

  listeners = [];
  pipers = [];
  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  emit(event, data) {
    this.listeners.forEach((e) => {
      if (e.event == event) {
        e.callback(data);
      }
    });
    this.pipers.forEach((e) => {
      if (event.startsWith(e.prefix))
        e.socket?.emit(event.replace(e.prefix, ""), data);
    });
  }

  pipe(socket, prefix = "") {
    this.pipers.push({
      socket,
      prefix,
    });
  }
}
