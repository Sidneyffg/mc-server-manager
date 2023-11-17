const socket = io();
const currentServer = window.location.pathname.split("/")[2];
let serverStatus = document.body.dataset.serverstatus;

socket.on("settingsUpdate" + currentServer, (updatedSettings) => {
  const newSettings = {};
  for (const property in updatedSettings) {
    newSettings[property] = updatedSettings[property].value;
  }
  stdSettings = newSettings;
  setSettings(stdSettings);
  closeEditPopup();
});
socket.on("statusUpdate" + currentServer, (newStatus) => {
  setServerStatus(newStatus);
});

function setServerStatus(newStatus) {
  serverStatus = newStatus;
  if (unsavedChanges) openEditPopup();
}

let unsavedChanges = false;
const settingItems = Array.from(
  document.getElementsByClassName("setting-item")
);

let stdSettings = getSettings();

function getSettings() {
  const settings = {};
  settingItems.forEach((e) => {
    let value;
    if (e.type == "checkbox") {
      value = e.checked.toString();
    } else {
      value = e.value.toString();
    }
    settings[e.dataset.settingName] = value;
  });
  return settings;
}

function setSettings(newSettings) {
  settingItems.forEach((e) => {
    if (e.type == "checkbox") {
      e.checked = newSettings[e.dataset.settingName] === "true";
    } else {
      e.value = newSettings[e.dataset.settingName];
    }
  });
}

function discardChanges() {
  setSettings(stdSettings);
  closeEditPopup();
}

function settingsChange() {
  const changed = !shallowEqual(stdSettings, getSettings());
  console.log(changed);
  if (changed) {
    openEditPopup();
  } else {
    closeEditPopup();
  }
}

function getChangesSettings() {
  const changedSettings = {};
  settingItems.forEach((e) => {
    let setting;
    if (e.type == "checkbox") {
      setting = e.checked.toString();
    } else {
      setting = e.value.toString();
    }
    if (setting != stdSettings[e.dataset.settingName]) {
      changedSettings[e.dataset.settingName] = setting;
    }
  });
  return changedSettings;
}

const editPopup = document.getElementById("edit-popup");
const editPopupHeader = document.getElementById("edit-popup-header");
const editPopupRestartBtn = document.getElementById("edit-popup-restart-btn");
const editPopupSaveBtn = document.getElementById("edit-popup-save-btn");
const editPopupDiscardBtn = document.getElementById("edit-popup-discard-btn");
function openEditPopup() {
  unsavedChanges = true;
  switch (serverStatus) {
    case "offline":
      editPopupHeader.innerHTML = "Unsaved changes";
      editPopupRestartBtn.style.display = "none";
      enablePopupBtns();
      break;
    case "online":
      editPopupHeader.innerHTML = "Server needs to restart to save changes";
      editPopupRestartBtn.style.display = "inline";
      enablePopupBtns();
      break;
    default:
      editPopupHeader.innerHTML = "Unsaved changes";
      editPopupRestartBtn.style.display = "none";
      disablePopupBtns();
      console.log("disabled");
  }
  editPopup.style.display = "block";
}

function closeEditPopup() {
  unsavedChanges = false;
  editPopup.style.display = "none";
}

function disablePopupBtns() {
  editPopupDiscardBtn.disabled = true;
  editPopupRestartBtn.disabled = true;
  editPopupSaveBtn.disabled = true;
}

function enablePopupBtns() {
  editPopupDiscardBtn.disabled = false;
  editPopupRestartBtn.disabled = false;
  editPopupSaveBtn.disabled = false;
}

function saveChanges(force) {
  socket.emit("updateSettings", currentServer, getChangesSettings(), force);
}

function shallowEqual(e, t) {
  let l = Object.keys(e),
    n = Object.keys(t);
  if (l.length !== n.length) return !1;
  for (let r of l) if (e[r] !== t[r]) return !1;
  return !0;
}
