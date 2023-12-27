import Logger from "./consoleHandler.js";

const portHandler = {
  init(serverData) {
    this.logger = new Logger(["portHandler"]);
    this.serverData = serverData;
  },
  bind(port, serverId) {
    if (this._getPortData({ serverId })) {
      this.logger.error("Server tried to bind to port without unbinding...");
      this._getPortData({ serverId }).port = port;
      return;
    }
    this.ports.push({ serverId, port, activated: false });
  },
  unbind(serverId) {
    const portData = this._getPortData({ serverId });
    if (!portData)
      return this.logger.error("Server tried to unbind without binding...");
    const idx = this.ports.indexOf(portData);
    this.ports.splice(idx, 1);
  },
  activate(serverId) {
    const portData = this._getPortData({ serverId });
    if (!portData)
      return this.logger.error("Tried to activate port without binding...");
    if (portData.activated)
      return this.logger.error("Tried to activate already activated port...");
    portData.activated = true;
  },
  deactive(serverId) {
    const portData = this._getPortData({ serverId });
    if (!portData)
      return this.logger.error("Tried to deactivate port without binding...");
    if (!portData.activated)
      return this.logger.error("Tried to deactivate an inactive port...");
    portData.activated = false;
  },
  isPortAvailable(port) {
    const serverWithPort = this._getPortData({ port });
    return serverWithPort != undefined;
  },
  getUsedPorts() {
    return this.serverData.map((e) => e.id);
  },
  /**
   * @param {Object} data
   * @param {number} [data.port]
   * @param {string} [data.serverId]
   * @returns
   */
  _getPortData(data) {
    if (data.port) return this.serverData.find((e) => e.port == data.port);
    return this.serverData.find((e) => e.serverId == data.serverId);
  },
  ports: [],
  logger: null,
};
export default portHandler;
