const socket = io();

const currentServer = window.location.pathname.split("/")[2];
setServerStatus(document.body.dataset.serverStatus);

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

socket.on("playerUpdate" + currentServer, (players) => {
  const playersDiv = document.getElementById("players-div");
  let playersHtml = "";
  players.forEach((player) => {
    playersHtml += `
    <div>
    <img
      src="https://mc-heads.net/avatar/${player.uuid}/40"
    />
    <div>
      <p>USERNAME</p>
      <p>${player.name}</p>
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

function setServerStatus(status) {
  console.log(status);
}


