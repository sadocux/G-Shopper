const { ipcRenderer } = require("electron");
const autocomplete = require("autocompleter");

const averageButton = document.getElementById("average-button");
const finderButton = document.getElementById("finder-button");
const list = document.getElementById("finder-list");

let finderList = [];

function averageStatus() {
  ipcRenderer.send("averageStatus");
}

function finderStatus() {
  ipcRenderer.send("finderStatus");
}

function hide() {
  ipcRenderer.send("hide");
}

const getIconSource = (item) => {
  return `https://images.habbo.com/dcr/hof_furni/${
    item.revision
  }/${item.classname.replace("*", "_")}_icon.png`;
};

function createDomFinderItem(item) {
  console.log(item);
  let imageSrc = item.icon || getIconSource(item);
  const element = document.createElement("li");
  element.classList.add("finder-list-item");
  element.innerHTML = `
  <img class="furniture-image" src="${imageSrc}" alt="${item.name}" />
<span>${item.name}</span>
  <span style="margin-left: auto;">${item.classname}</span>
  `;

  const removeButton = document.createElement("button");
  removeButton.innerHTML = "X";
  removeButton.addEventListener("click", () => {
    removeFinderItem(item, element);
  });
  element.appendChild(removeButton);
  list.appendChild(element);
}

function addToFinderList(item) {
  finderList.push(item);
  createDomFinderItem(item);
  ipcRenderer.send("addFinderList", item);
}

function removeFinderItem(item, element) {
  finderList = finderList.filter((i) => i.id !== item.id);
  element.remove();
  ipcRenderer.send("removeFinderItem", item);
}

ipcRenderer.once("getSettings", (event, message) => {
  if (message.averageStatus) {
    averageButton.classList.remove("red", "green");
    averageButton.classList.add(message.averageStatus ? "green" : "red");
  }

  if (message.finderStatus) {
    finderButton.classList.remove("red", "green");
    finderButton.classList.add(message.finderStatus ? "green" : "red");
  }

  averageButton.innerHTML = `AVERAGE ${message.averageStatus ? "ON" : "OFF"}`;

  finderButton.innerHTML = `FINDER ${
    message.finderButtonStatus ? "ON" : "OFF"
  }`;
});

ipcRenderer.once("getFinderList", (event, message) => {
  finderList = message;
  list.innerHTML = "";
  message.forEach((item) => {
    createDomFinderItem(item);
  });
});

ipcRenderer.on("averageStatus", (event, averageStatus) => {
  if (averageStatus) {
    averageButton.classList.remove("red");
    averageButton.classList.add("green");
  } else {
    averageButton.classList.remove("green");
    averageButton.classList.add("red");
  }
  averageButton.innerHTML = `AVERAGE ${averageStatus ? "ON" : "OFF"}`;
});

ipcRenderer.on("finderStatus", (event, finderStatus) => {
  if (finderStatus) {
    finderButton.classList.remove("red");
    finderButton.classList.add("green");
  } else {
    finderButton.classList.remove("green");
    finderButton.classList.add("red");
  }
  finderButton.innerHTML = `FINDER ${finderStatus ? "ON" : "OFF"}`;
});

ipcRenderer.on("addToFinderList", (event, item) => {
  addToFinderList(item);
});

ipcRenderer.once("getHabboData", (event, data) => {
  let combined = [
    ...data.roomitemtypes.furnitype,
    ...data.wallitemtypes.furnitype,
  ];
  autocomplete({
    input: document.getElementById("search"),
    minLength: 2,
    onSelect: function (item, input) {
      if (!finderList.find((i) => i.id === item.id)) {
        addToFinderList(item);
        input.value = "";
      } else {
        // console.log(`${item.name} is already on the list`);
      }
    },
    fetch: function (text, callback) {
      let searchTerm = text.toLowerCase();
      let filtered = combined.filter(function (furniture) {
        let data = furniture.name?.toLowerCase() || "";
        return data.indexOf(searchTerm) > -1;
      });

      callback(filtered);
    },
    render: function (item, value) {
      let itemElement = document.createElement("div");
      itemElement.innerHTML = `
      <img class="furniture-image" src="${getIconSource(item)}" alt="${
        item.name
      }" />
      <span>${item.name}</span>
      <span style="margin-left: auto;">${item.classname}</span>`;
      return itemElement;
    },
    emptyMsg: "No furnitures found with that name",
  });

  document.querySelector("input").focus();
});

document.addEventListener("DOMContentLoaded", () => {
  ipcRenderer.send("getSettings");
});
