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
