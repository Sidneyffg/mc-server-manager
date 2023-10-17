const darkener = document.getElementById("darkener"),
  newServerMenu = document.getElementById("std-menu");

function closeNewServer() {
  darkener.style.display = "none";
  newServerMenu.style.display = "none";
}

function openNewServer() {
  darkener.style.display = "block";
  newServerMenu.style.display = "block";
}
