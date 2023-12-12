function run() {
  socket.on(
    `automaticBackupSettingsUpdate${utils.server.num}`,
    (newSettings) => {
      closeEditPopup();

      for (const e in newSettings)
        if (newSettings[e] != -1) newSettings[e] /= 36e5;

      const automaticBackup = newSettings.timeBetweenAutomaticBackups !== -1;
      automaticBackupsSwitch.checked = automaticBackup;
      deleteBackupTimeInp.value =
        newSettings.deleteAutomaticBackupAfter == -1
          ? ""
          : newSettings.deleteAutomaticBackupAfter;
      if (automaticBackup) {
        backupTimeInp.value = newSettings.timeBetweenAutomaticBackups;

        openAutomaticBackupsContent();
      } else {
        closeAutomaticBackupsContent();
        backupTimeInp.value = "1";
      }

      stdBackupData = getBackupData();
    }
  );

  socket.on(`backupUpdate${utils.server.num}`, (backups) => {
    let backupHtml = `
    <div>
      <h3>Backups</h3>
      <button onclick="createBackup()">Create backup</button>
    </div>`;

    const date = new Date();
    const year = date.getFullYear();

    backups.forEach((backup, idx) => {
      const backupDate = new Date(backup.timestamp);
      const minutes = "0" + backupDate.getMinutes();
      backupHtml += `
      <div class="backup-item">
        <div>
          <p>${backupDate.getDate()} ${months[backupDate.getMonth()]} ${
        backupDate.getFullYear() == year ? "" : backupDate.getFullYear()
      }</p>
          <p>${backupDate.getHours()}:${minutes.substring(
        minutes.length - 2,
        minutes.length
      )}</p>
        </div>
        <input id="backup-item-checkbox-${idx}" type="checkbox" style="display: none;">
        <label for="backup-item-checkbox-${idx}">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
            <path fill="white"
                d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
          </svg>
        </label>
        <div class="list">
          <button onclick="restoreBackup('${backup.id}')">Restore</button>
          <button onclick="deleteBackup('${backup.id}')">Delete</button>
        </div>
      </div>`;
    });
    document.getElementById("server-backups-list").innerHTML = backupHtml;
  });
  utils.stopMenu.init();
}

const getById = (id) => document.getElementById(id);
const automaticBackupsContent = getById("automatic-backups-content");
const automaticBackupsSwitch = getById("automatic-backups-switch");

automaticBackupsSwitch.addEventListener("change", (e) =>
  e.target.checked
    ? openAutomaticBackupsContent()
    : closeAutomaticBackupsContent()
);

function openAutomaticBackupsContent() {
  automaticBackupsContent.style.display = "flex";
}

function closeAutomaticBackupsContent() {
  automaticBackupsContent.style.display = "none";
}

const editPopup = getById("edit-popup");
function openEditPopup() {
  editPopup.style.display = "block";
}

function closeEditPopup() {
  editPopup.style.display = "none";
}

const backupTimeInp = getById("backup-time-inp");
const deleteBackupTimeInp = getById("delete-backup-time-inp");
let stdBackupData = getBackupData();

function getBackupData() {
  return {
    automaticBackup: automaticBackupsSwitch.checked,
    backupTime: backupTimeInp.value,
    deleteBackupTime: deleteBackupTimeInp.value,
  };
}

function discardChanges() {
  automaticBackupsSwitch.checked = stdBackupData.automaticBackup;
  backupTimeInp.value = stdBackupData.backupTime;
  deleteBackupTimeInp.value = stdBackupData.deleteBackupTime;
  stdBackupData.automaticBackup
    ? openAutomaticBackupsContent()
    : closeAutomaticBackupsContent();
  closeEditPopup();
}

function change() {
  replaceNonNumbers();
  const changed = !compareBackupData(getBackupData(), stdBackupData);
  if (changed) {
    openEditPopup();
  } else {
    closeEditPopup();
  }
}

function saveChanges() {
  const newBackupData = getBackupData();
  socket.emit("updateBackupSettings", utils.server.num, newBackupData);
}

function replaceNonNumbers() {
  backupTimeInp.value = Math.max(backupTimeInp.value.replace(/[^0-9]/g, ""), 1);
  if (deleteBackupTimeInp.value == "") return;
  deleteBackupTimeInp.value = Math.max(
    deleteBackupTimeInp.value.replace(/[^0-9]/g, ""),
    1
  );
}

function compareBackupData(t, e) {
  if (!t.automaticBackup && !e.automaticBackup) return !0;
  let a = Object.keys(t),
    r = Object.keys(e);
  if (a.length !== r.length) return !1;
  for (let u of a) if (t[u] !== e[u]) return !1;
  return !0;
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function createBackup() {
  if (utils.server.status == "offline") {
    socket.emit("createBackup", utils.server.num);
    return;
  }
  utils.stopMenu.open(
    "backup",
    (data) => {
      if (!data.shouldStop) return;
      socket.emit("createBackup", utils.server.num, data.time);
    },
    true
  );
}

const deleteBackup = (id) => socket.emit("deleteBackup", utils.server.num, id);
