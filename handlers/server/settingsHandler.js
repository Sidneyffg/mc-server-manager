import Logger from "../consoleHandler.js";
import * as listener from "../listener.js";
import versionHandler from "../versionHandler.js";

export default class SettingsHandler {
  constructor(server) {
    this.#server = server;
    this.fileHandler = server.fileHandler;
    this.#logger = new Logger([
      "serverHandler",
      `server ${server.serverNum}`,
      "settingsHandler",
    ]);

    server.on("updateSettings", (data) => {
      for (const property in data) {
        this.clientSettings[property] = data[property];
        const setting = allClientSettings[property];
        setting.handlers.handleClientSettingUpdate.call(this, {
          defaultServerProperty: setting.defaultServerProperty,
          value: data[property],
        });
      }
      this.saveSettings();
    });
  }

  init() {
    this.getSettings();
    this.getEditableSettings();
    this.getClientSettings();
  }

  getSettings() {
    this.settings = {};
    let properties = this.fileHandler.readFile("properties");

    properties = properties.replaceAll("\r", "").split("\n");
    properties.forEach((fullProperty) => {
      if (!fullProperty || fullProperty.startsWith("#")) return;
      const [property, value] = fullProperty.split("=");
      this.settings[property] = value;
    });
  }

  getEditableSettings() {
    const editableSettings = [
      "gamemode",
      "port",
      "enable command block",
      "motd",
      "pvp",
      "difficulty",
      "max players",
      "allow flight",
      "view distance",
      "allow nether",
      "simulation distance",
      "player idle timeout",
      "spawn monsters",
      "spawn protection",
    ];
    this.editableSettings = editableSettings;
  }

  getClientSettings() {
    this.clientSettings = {};
    this.editableSettings.forEach((e) => {
      const clientSetting = allClientSettings[e];
      this.clientSettings[e] =
        clientSetting.handlers.genClientSettingValue.call(
          this,
          clientSetting.defaultServerProperty
        );
    });
  }

  saveSettings() {
    listener.emit(
      "_settingsUpdate" + this.#server.serverNum,
      this.clientSettings
    );
    let properties = "";
    for (const setting in this.settings) {
      const value = this.settings[setting];
      properties += `${setting}=${value}\r\n`;
    }
    if (this.#server.status !== "offline") {
      this.#server.eventHandler.addOfflineTodoItem({
        action: "saveServerProperties",
        value: properties,
      });
      return;
    }
    this.fileHandler.writeFile("properties", properties);
    this.#logger.info("Updated server properties");
  }
  allClientSettings = allClientSettings;
  #logger;
  #server;
}

const defaultSettingsHandlers = {
  genClientSettingValue(defaultServerProperty) {
    return this.settings[defaultServerProperty];
  },
  handleClientSettingUpdate({ defaultServerProperty, value }) {
    this.settings[defaultServerProperty] = value;
  },
};

const allClientSettings = {
  port: {
    type: "int",
    min: 0,
    max: 65535,
    handlers: {
      genClientSettingValue() {
        const port = this.settings["server-port"];
        const queryPort = this.settings["query.port"];
        if (port != queryPort) {
          this.settings["query.port"] = port;
          this.saveSettings();
        }
        return port;
      },
      handleClientSettingUpdate({ value }) {
        this.settings["server-port"] = value;
        this.settings["query.port"] = value;
      },
    },
  },
  gamemode: {
    type: "option",
    options: ["survival", "creative", "hardcore"],
    handlers: defaultSettingsHandlers,
    defaultServerProperty: "gamemode",
  },
  "enable command block": {
    type: "bool",
    handlers: defaultSettingsHandlers,
    defaultServerProperty: "enable-command-block",
  },
  motd: {
    type: "string",
    handlers: defaultSettingsHandlers,
    defaultServerProperty: "motd",
  },
  pvp: {
    type: "bool",
    handlers: defaultSettingsHandlers,
    defaultServerProperty: "pvp",
  },
  difficulty: {
    type: "option",
    options: ["hard", "normal", "easy", "peaceful"],
    handlers: defaultSettingsHandlers,
    defaultServerProperty: "difficulty",
  },
  "max players": {
    type: "int",
    min: 1,
    max: 99999,
    handlers: defaultSettingsHandlers,
    defaultServerProperty: "max-players",
  },
  "allow flight": {
    type: "bool",
    handlers: defaultSettingsHandlers,
    defaultServerProperty: "allow-flight",
  },
  "view distance": {
    type: "int",
    min: 3,
    max: 32,
    handlers: defaultSettingsHandlers,
    defaultServerProperty: "view-distance",
  },
  "allow nether": {
    type: "bool",
    handlers: defaultSettingsHandlers,
    defaultServerProperty: "allow-nether",
  },
  "simulation distance": {
    type: "int",
    min: 3,
    max: 32,
    handlers: defaultSettingsHandlers,
    defaultServerProperty: "simulation-distance",
  },
  "player idle timeout": {
    type: "int",
    min: 0,
    max: 99999,
    handlers: defaultSettingsHandlers,
    defaultServerProperty: "player-idle-timeout",
  },
  "spawn monsters": {
    type: "bool",
    handlers: defaultSettingsHandlers,
    defaultServerProperty: "spawn-monsters",
  },
  "spawn protection": {
    type: "int",
    min: 0,
    max: 2147483647,
    handlers: defaultSettingsHandlers,
    defaultServerProperty: "spawn-protection",
  },
};
