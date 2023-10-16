const socket = io();

const currentServer = window.location.pathname.split("/")[2];

const onlinePlayers = document.getElementById("onlinePlayers");
const allPlayers = document.getElementById("allPlayers");
const whitelistedPlayers = document.getElementById("whitelistedPlayers");
const oppedPlayers = document.getElementById("oppedPlayers");

socket.on("onlinePlayersUpdate" + currentServer, (players) => {
  reloadPlayers(onlinePlayers, players);
});
socket.on("allPlayersUpdate" + currentServer, (players) =>
  reloadPlayers(allPlayers, players)
);
socket.on("whitelistedPlayersUpdate" + currentServer, (players) =>
  reloadPlayers(whitelistedPlayers, players)
);
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
