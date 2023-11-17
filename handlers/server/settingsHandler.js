import Logger from "../consoleHandler.js";
import * as listener from "../listener.js";
import * as versionHandler from "../versionHandler.js";

export default class SettingsHandler {
  constructor(server) {
    this.server = server;
    this.fileHandler = server.fileHandler;
    this.#logger = new Logger([
      "serverHandler",
      `server ${server.serverNum}`,
      "settingsHandler",
    ]);

    server.on("updateSettings", (data) => {
      for (const property in data) {
        this.settings[property].value = data[property];
      }
      this.saveSettings();
    });
  }

  init() {
    this.getSettings();
    this.setEditableSettings();
  }

  getSettings() {
    this.settings = {};
    let properties = this.fileHandler.readFile("properties");

    properties = properties.replaceAll("\r", "").split("\n");
    properties.forEach((fullProperty) => {
      if (fullProperty.startsWith("#") || fullProperty == "") return;
      const [property, value] = fullProperty.split("=");

      const propertyData = versionHandler.allSettings[property];
      if (propertyData) {
        this.settings[property] = structuredClone(propertyData);
        this.settings[property].value = value;
      } else {
        this.#logger.warn(
          `Setting "${property}" missing in allSettings, adding empty item...`
        );
        versionHandler.allSettings[property] = {};
        this.settings[property] = { value };
      }
    });
  }

  setEditableSettings() {
    const editableSettingsNames = versionHandler.getEditableServerSettings();
    const editableSettings = {};

    editableSettingsNames.forEach((e) => {
      const settingData = this.settings[e];
      if (settingData) editableSettings[e] = this.settings[e];
      else
        this.#logger.error(
          `Editable setting "${e}" not found in server settings, skipping it...`
        );
    });

    this.editableSettings = editableSettings;
  }

  saveSettings() {
    listener.emit("_settingsUpdate" + this.server.serverNum, this.settings);
    this.#logger.info("Updated server properties");
    let properties = "";
    for (const setting in this.settings) {
      const value = this.settings[setting].value;
      properties += `${setting}=${value}\r\n`;
    }
    if (this.server.status !== "offline") {
      this.#logger.error("Added offline todo item...");
      this.server.eventHandler.addOfflineTodoItem({
        action: "saveServerProperties",
        value: properties,
      });
      return;
    }
    this.fileHandler.writeFile("properties", properties);
  }
  #logger;
}
