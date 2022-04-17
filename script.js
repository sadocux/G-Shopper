const { ipcRenderer } = require("electron");

const toggleButton = document.querySelector("#status");

function status() {
  ipcRenderer.send("status");
}

function hide() {
  ipcRenderer.send("hide");
  console.log("pressed");
}

ipcRenderer.on("averageStatus", (event, status) => {
  console.log(status);
  if (status) {
    toggleButton.classList.remove("red");
    toggleButton.classList.add("green");
  } else {
    toggleButton.classList.remove("green");
    toggleButton.classList.add("red");
  }
  toggleButton.innerHTML = `STATUS ${status ? "ON" : "OFF"}`;
});
