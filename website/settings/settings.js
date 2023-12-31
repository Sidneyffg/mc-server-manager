const main = {
  start() {
    this.editPopup.init();
  },

  editPopup: {
    unsavedChanges: false,
    init() {
      this.popup = document.getElementById("edit-popup");
      this.popupHeader = document.getElementById("edit-popup-header");
      this.popupRestartBtn = document.getElementById("edit-popup-restart-btn");
      this.popupSaveBtn = document.getElementById("edit-popup-save-btn");
      this.popupDiscardBtn = document.getElementById("edit-popup-discard-btn");

      this.settingElems = Array.from(
        document.getElementsByClassName("setting-item")
      );
      this.stdSettings = this.getSettings();

      utils.server.on("statusUpdate", () => {
        this.open();
      });

      utils.server.on("settingsUpdate", (updatedSettings) => {
        this.stdSettings = updatedSettings;
        this.setSettings(this.stdSettings);
        this.close();
      });
    },
    open() {
      this.unsavedChanges = true;
      switch (utils.server.status) {
        case "offline":
          this.popupHeader.innerHTML = "Unsaved changes";
          this.popupRestartBtn.style.display = "none";
          this.enableBtns();
          break;
        case "online":
          this.popupHeader.innerHTML =
            "Server needs to restart to save changes";
          this.popupRestartBtn.style.display = "inline";
          this.enableBtns();
          break;
        default:
          this.popupHeader.innerHTML = "Unsaved changes";
          this.popupRestartBtn.style.display = "none";
          this.disableBtns();
      }
      this.popup.style.display = "block";
    },
    close() {
      this.unsavedChanges = false;
      this.popup.style.display = "none";
    },
    enableBtns() {
      this.popupDiscardBtn.disabled = false;
      this.popupRestartBtn.disabled = false;
      this.popupSaveBtn.disabled = false;
    },
    disableBtns() {
      this.popupDiscardBtn.disabled = true;
      this.popupRestartBtn.disabled = true;
      this.popupSaveBtn.disabled = true;
    },
    getSettings() {
      const settings = {};
      this.settingElems.forEach((e) => {
        let value;
        if (e.type == "checkbox") {
          value = e.checked.toString();
        } else {
          value = e.value.toString();
        }
        settings[e.dataset.settingName] = value;
      });
      return settings;
    },
    setSettings(newSettings) {
      this.settingElems.forEach((e) => {
        if (e.type == "checkbox") {
          e.checked = newSettings[e.dataset.settingName] === "true";
        } else {
          e.value = newSettings[e.dataset.settingName];
        }
      });
    },
    settingsChange() {
      const changed = !utils.shallowEqual(this.stdSettings, this.getSettings());
      if (changed) {
        this.open();
      } else {
        this.close();
      }
    },
    getChangesSettings() {
      const changedSettings = {};
      this.settingElems.forEach((e) => {
        let setting;
        if (e.type == "checkbox") {
          setting = e.checked.toString();
        } else {
          setting = e.value.toString();
        }
        if (setting != this.stdSettings[e.dataset.settingName]) {
          changedSettings[e.dataset.settingName] = setting;
        }
      });
      return changedSettings;
    },
    saveChanges(force) {
      utils.server.emit("updateSettings", this.getChangesSettings(), force);
    },
    discardChanges() {
      this.setSettings(this.stdSettings);
      this.close();
    },
    popup: null,
    popupHeader: null,
    popupRestartBtn: null,
    popupSaveBtn: null,
    popupDiscardBtn: null,
  },
};
