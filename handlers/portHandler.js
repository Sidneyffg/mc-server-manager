import Logger from "./consoleHandler.js";

const portHandler = {
  bind(port, serverId) {
    if (this._getPortData({ serverId })) {
      this.logger.error("Server tried to bind to port without unbinding...");
      this._getPortData({ serverId }).port = port;
      return;
    }
    if (this._getPortData({ port }))
      this.logger.warn(`Port ${port} is already in use...`);
    this.logger.info(`Bound to port ${port}`);
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
    if (this._getPortData({ port: portData.port }, serverId)?.activated)
      this.logger.error(
        `Port ${portData.port} activated by multiple servers...`
      );
    this.logger.info(`Activated port ${portData.port}`);
    portData.activated = true;
  },
  deactivate(serverId) {
    const portData = this._getPortData({ serverId });
    if (!portData)
      return this.logger.error("Tried to deactivate port without binding...");
    if (!portData.activated)
      return this.logger.error("Tried to deactivate an inactive port...");
    this.logger.info(`Deactivated port ${portData.port}`);
    portData.activated = false;
  },
  isPortAvailable(port) {
    const serverWithPort = this._getPortData({ port });
    return serverWithPort == undefined;
  },
  getUsedPorts() {
    return this.ports.map((e) => e.port);
  },
  /**
   * @param {Object} data
   * @param {number} [data.port]
   * @param {string} [data.serverId]
   * @param {string} [excludingServerId]
   * @returns
   */
  _getPortData(data, excludingServerId = null) {
    if (data.port)
      return this.ports.find(
        (e) => e.port == data.port && e.serverId != excludingServerId
      );
    return this.ports.find(
      (e) => e.serverId == data.serverId && e.serverId != excludingServerId
    );
  },
  ports: [],
  logger: new Logger(["portHandler"]),
};
export default portHandler;
