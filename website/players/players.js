const socket = io();

const currentServer = window.location.pathname.split("/")[2];

const playerAdderSvgs = document.getElementsByClassName("player-adder-svg");

socket.on("statusUpdate" + currentServer, (status) => {
  for (let i = 0; i < playerAdderSvgs.length; i++) {
    if (status == "online") playerAdderSvgs[i].classList.remove("disabled");
    else playerAdderSvgs[i].classList.add("disabled");
  }
});

const onlinePlayers = document.getElementById("onlinePlayers");
const allPlayers = document.getElementById("allPlayers");
const whitelistedPlayers = document.getElementById("whitelistedPlayers");
const oppedPlayers = document.getElementById("oppedPlayers");

socket.on("onlinePlayersUpdate" + currentServer, (players) => {
  reloadPlayers(onlinePlayers, players);
});
socket.on("allPlayersUpdate" + currentServer, (players) => {
  reloadPlayers(allPlayers, players);
});
socket.on("whitelistedPlayersUpdate" + currentServer, (players) => {
  reloadPlayers(whitelistedPlayers, players);
});
socket.on("oppedPlayersUpdate" + currentServer, (players) =>
  reloadPlayers(oppedPlayers, players)
);

function reloadPlayers(which, players) {
  let playersHtml = "";
  players.forEach((player) => {
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
  which.innerHTML = playersHtml;
}

const darkener = document.getElementById("darkener"),
  menu = document.getElementById("std-menu"),
  playerSearch = document.getElementById("player-search"),
  selectedPlayerImg = document.getElementById("selected-player-img"),
  playerName = document.getElementById("player-name"),
  menuTitle = document.getElementById("menu-title");

function closeMenu() {
  darkener.style.display = "none";
  menu.style.display = "none";
}

let isWhitelistMenu;
function openWhitelistMenu() {
  isWhitelistMenu = true;
  menuTitle.innerHTML = "Add player to whitelist";
  openMenu();
}

function openOppedMenu() {
  isWhitelistMenu = false;
  menuTitle.innerHTML = "Make players operator";
  openMenu();
}

function openMenu() {
  playerName.value = "";
  darkener.style.display = "block";
  menu.style.display = "block";
}

function selectPlayer(name) {
  playerSearch.classList.add("hidden");
  playerName.value = name;
  selectedPlayerImg.src = `https://mc-heads.net/avatar/${name}/20`;
  selectedPlayerImg.style.display = "block";
}

function removeHiddenFromPlayerSearch() {
  playerSearch.classList.remove("hidden");
}

function reloadSearchPlayers() {
  selectedPlayerImg.style.display = "none";

  const str = playerName.value;

  if (!str) {
    playerSearch.innerHTML = "";
    return;
  }

  let allPlayerScores = [];
  allPlayerList.forEach((name) => {
    const score = get(name.toLowerCase(), str.toLowerCase());
    if (score == 0) return;
    allPlayerScores.push({
      name,
      score: score,
    });
  });
  allPlayerScores.sort((a, b) => b.score - a.score);
  allPlayerScores = allPlayerScores.map((e) => e.name);

  let playerListHtml = "";
  const length = Math.min(allPlayerScores.length, 3);
  for (let i = 0; i < length; i++) {
    console.log("oui");
    playerListHtml += `<div onclick="selectPlayer('${allPlayerScores[i]}')">
    <img src="https://mc-heads.net/avatar/${allPlayerScores[i]}/40" alt="">
    <div>
      <p>USERNAME</p>
      <p>${allPlayerScores[i]}</p>
    </div>
  </div>`;
  }
  playerSearch.innerHTML = playerListHtml;
}

function get(s, f) {
  let r = s.indexOf(f);
  let c = 0;
  while (r != -1) {
    c++;
    r = s.indexOf(f, r + 1);
  }
  return c;
}

document.getElementById("player-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const player = playerName.value;
  console.log(player);
  if (!player) return;
  const msg = isWhitelistMenu ? "addPlayerToWhitelist" : "makePlayerOperator";
  console.log(msg);
  socket.emit(msg, currentServer, player, (success) => {
    if (success) {
      closeMenu();
    }
  });
});
