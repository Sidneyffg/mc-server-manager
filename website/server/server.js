const socket = io();

const currentServer = window.location.pathname.split("/")[2];
setServerStatus(document.body.dataset.serverstatus);
const serverConsole = document.getElementById("server-console");
const parent = serverConsole.parentElement;
parent.scrollTop = parent.scrollHeight;

let currentType = "INFO";

socket.on("consoleUpdate" + currentServer, (data) => {
  let scrollDown =
    parent.scrollTop + parent.clientHeight == parent.scrollHeight;

  let type = /\[[0-9]{2}\:[0-9]{2}\:[0-9]{2} ([A-Z]{4,5})|\]:/m.exec(data);
  if (type) currentType = type[1];

  serverConsole.innerHTML += `<span class="span-color-${currentType}">${data.replaceAll(
    "\n",
    "<br>"
  )}</span>`;
  if (scrollDown) {
    parent.scrollTop = parent.scrollHeight;
  }
});

socket.on("onlinePlayersUpdate" + currentServer, (onlinePlayers) => {
  const playersDiv = document.getElementById("players-div");
  let playersHtml = "";
  onlinePlayers.forEach((player) => {
    playersHtml += `
    <div>
    <img
      src="https://mc-heads.net/avatar/${player}/40"
    />
    <div>
      <p>USERNAME</p>
      <p>${player}</p>
    </div>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="24"
      viewBox="0 -960 960 960"
      width="24"
    >
      <path
        fill="white"
        d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"
      />
    </svg>
  </div>`;
  });
  playersDiv.innerHTML = playersHtml;
});

const usageCpu = document.getElementById("usage-cpu"),
  usageMem = document.getElementById("usage-mem"),
  usageStorage = document.getElementById("usage-storage");

socket.on("usageUpdate", (usage) => {
  usageCpu.innerHTML = usage.cpuUsage + "%";
  usageMem.innerHTML = Math.round(usage.memUsage.usedMemMb / 10) / 100 + "GB";
});

socket.on("serverDirSizeUpdate" + currentServer, (dirSize) => {
  usageStorage.innerHTML = dirSize;
});

socket.on("statusUpdate" + currentServer, (newStatus) => {
  setServerStatus(newStatus);
  if (newStatus == "starting") {
    serverConsole.innerHTML = "";
  }
});

function setServerStatus(status) {
  switch (status) {
    case "starting":
      editServerBtns(false, true);
      break;
    case "online":
      editServerBtns(true, false);
      break;
    case "stopping":
      editServerBtns(true, true);
      break;
    case "offline":
      editServerBtns(false, false);
      break;
  }
}

function editServerBtns(showActive, disabled) {
  const activeServerBtns = document.getElementById("active-server-btns"),
    inActiveServerBtns = document.getElementById("inactive-server-btns");

  activeServerBtns.style.display = showActive ? "flex" : "none";
  inActiveServerBtns.style.display = showActive ? "none" : "flex";


  Array.from(
    (showActive ? activeServerBtns : inActiveServerBtns).children
  ).forEach((e) => {
    e.disabled = disabled;
    if (disabled) {
      e.classList.add("disabled");
    } else {
      e.classList.remove("disabled");
    }
  });
}

function changeServerStatus(action) {
  socket.emit(action + "Server", currentServer);
  document.getElementById("overview-stop-checkbox").checked = false;
}

socket.on("serverStoppingInUpdate" + currentServer, (sec) => {
  if (sec == -1) {
    hideStoppingInInfo();
    return;
  }
  showStoppingInInfo(sec);
});

const stoppingInInfo = document.getElementById("stopping-in-info");
const stoppingInInfoP = document.getElementById("stopping-in-info-p");
let stoppingInInfoIntervalId;
function showStoppingInInfo(sec) {
  hideStoppingInInfo();
  stoppingInInfoIntervalId = setInterval(decreaseStoppingInInfo, 1000);
  stoppingInInfoP.innerHTML = sec;
  stoppingInInfo.style.display = "block";
}

function decreaseStoppingInInfo() {
  const value = parseInt(stoppingInInfoP.innerHTML) - 1;
  if (value == 0) {
    hideStoppingInInfo();
    return;
  }
  stoppingInInfoP.innerHTML = value;
}

function hideStoppingInInfo() {
  stoppingInInfo.style.display = "none";
  if (stoppingInInfoIntervalId) clearInterval(stoppingInInfoIntervalId);
}

stoppingInInfoInit();
function stoppingInInfoInit() {
  const value = parseInt(stoppingInInfoP.innerHTML);
  if (value && value > 0) showStoppingInInfo(value);
}

const stopServerInPopup = document.getElementById("stop-server-in-popup");
const stopServerInPopupInp = document.getElementById(
  "stop-server-in-popup-inp"
);
function openStopServerInPopup() {
  document.getElementById("overview-stop-checkbox").checked = false;
  stopServerInPopupInp.value = "";
  stopServerInPopup.style.display = "block";
}

function closeStopServerInPopup() {
  stopServerInPopup.style.display = "none";
}

function stopServerIn() {
  const min = stopServerInPopupInp.value;

  if (parseFloat(min).toString() != min || min <= 0) return;

  closeStopServerInPopup();

  const sec = Math.round(min * 60);
  socket.emit("stopServerIn", currentServer, sec);
}
