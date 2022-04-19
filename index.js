const { app, BrowserWindow, ipcMain } = require("electron");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

process.on("uncaughtException", function (error) {
  console.error(error);
  process.exit(0);
});

app.whenReady().then(async () => {
  const {
    Extension,
    HPacket,
    HDirection,
    HFloorItem,
    HWallItem,
    GAsync,
    AwaitingPacket,
  } = await import("gnode-api");

  let roomFloorItems;
  let roomWallItems;
  let habboData;
  let finderList;

  let language;
  let clickedItem;
  let averageStatus = false;
  let finderStatus = false;

  const extensionInfo = {
    name: "G-Shopper",
    description: "Makes shopping easier",
    version: "0.2.2",
    author: "rocawear",
  };

  const ext = new Extension(extensionInfo);
  const gAsync = new GAsync(ext);

  ext.run();

  const win = new BrowserWindow({
    width: 600,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false,
    fullscreenable: false,
    resizable: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    frame: false,
  });

  win.loadFile("index.html");

  ext.on("click", () => {
    win.show();
  });

  ipcMain.on("hide", () => {
    win.hide();
  });

  ext.on("socketdisconnect", () => {
    process.exit(0);
  });

  ipcMain.on("averageStatus", () => {
    averageStatus = !averageStatus;
    win.webContents.send("averageStatus", averageStatus);
  });

  ipcMain.on("finderStatus", () => {
    finderStatus = !finderStatus;
    win.webContents.send("finderStatus", finderStatus);
  });

  ipcMain.on("getFinderList", () => {
    finderList = getFinderList();
    win.webContents.send("getFinderList", finderList);
  });

  ipcMain.on("addFinderList", (event, item) => {
    finderList.push({
      name: item.name,
      id: item.id,
      classname: item.classname,
    });
    fs.writeFileSync(
      path.join(__dirname, `finder/${language}-finder.json`),
      JSON.stringify(finderList),
      "utf8"
    );
  });

  ipcMain.on("removeFinderItem", (event, item) => {
    finderList = finderList.filter((i) => i.id !== item.id);
    fs.writeFileSync(
      `finder/${language}-finder.json`,
      JSON.stringify(finderList),
      "utf8"
    );
  });

  ext.on("connect", (host) => {
    language = host.split(".")[0];

    switch (host) {
      case "game-br.habbo.com":
        fetchHabbo("www.habbo.com.br");
        break;
      case "game-de.habbo.com":
        fetchHabbo("www.habbo.de");
        break;
      case "game-es.habbo.com":
        fetchHabbo("www.habbo.es");
        break;
      case "game-fi.habbo.com":
        fetchHabbo("www.habbo.fi");
        break;
      case "game-fr.habbo.com":
        fetchHabbo("www.habbo.fr");
        break;
      case "game-it.habbo.com":
        fetchHabbo("www.habbo.it");
        break;
      case "game-nl.habbo.com":
        fetchHabbo("www.habbo.nl");
        break;
      case "game-s2.habbo.com":
        fetchHabbo("sandbox.habbo.com");
        break;
      case "game-tr.habbo.com":
        fetchHabbo("www.habbo.com.tr");
        break;
      case "game-us.habbo.com":
        fetchHabbo("www.habbo.com");
        break;
    }
  });

  const getFinderList = () => {
    const filePath = path.join(__dirname, `finder/${language}-finder.json`);
    const data = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(data);
    return json;
  };

  const fetchHabbo = async (hotel) => {
    let url = `https://${hotel}/gamedata/furnidata_json/0`;
    let res = await fetch(url);
    habboData = await res.json();

    win.webContents.send("getHabboData", habboData);
  };
  const getFloorItemName = (typeId) => {
    return habboData.roomitemtypes.furnitype.find((data) => {
      return typeId == data.id;
    }).name;
  };

  const getWallItemName = (typeId) => {
    return habboData.wallitemtypes.furnitype.find((data) => {
      return typeId == data.id;
    }).name;
  };

  const sendMessage = (message) => {
    let packet = new HPacket(
      `{in:Shout}{i:1234}{s:"${message}"}{i:0}{i:0}{i:0}{i:-1}`
    );
    ext.sendToClient(packet);
  };

  const isOnList = (item) => {
    return finderList.find((i) => i.id == item.typeId);
  };

  const requestMarketPlaceAverage = (typeId) => {
    if (!typeId) return;

    let packet = new HPacket(`{out:GetMarketplaceItemStats}{i:1}{i:${typeId}}`);
    ext.sendToServer(packet);
  };

  ext.interceptByNameOrHash(
    HDirection.TOCLIENT,
    "Objects",
    async (hMessage) => {
      let hPacket = hMessage.getPacket();
      let floorItems = HFloorItem.parse(hPacket);
      let alerted = [];

      if (finderStatus) {
        let awaitedPacket = await gAsync.awaitPacket(
          new AwaitingPacket("GetGuestRoomResult", HDirection.TOCLIENT, 5000)
        );

        if (!awaitedPacket != undefined) {
          floorItems.forEach((item) => {
            if (isOnList(item)) {
              if (!alerted.includes(item.typeId)) {
                alerted.push(item.typeId);
                let name = finderList.find((i) => i.id == item.typeId).name;
                sendMessage(`Found ${name}`);
              }
            }
          });
        }
      }

      roomFloorItems = floorItems.map((item) => ({
        id: item.id,
        typeId: item.typeId,
        name: getFloorItemName(item.typeId),
      }));
    }
  );

  ext.interceptByNameOrHash(HDirection.TOCLIENT, "Items", async (hMessage) => {
    let hPacket = hMessage.getPacket();
    let wallItems = HWallItem.parse(hPacket);
    let alerted = [];

    if (finderStatus) {
      let awaitedPacket = await gAsync.awaitPacket(
        new AwaitingPacket("GetGuestRoomResult", HDirection.TOCLIENT, 5000)
      );

      if (!awaitedPacket != undefined) {
        wallItems.forEach((item) => {
          if (isOnList(item)) {
            if (!alerted.includes(item.typeId)) {
              alerted.push(item.typeId);
              let name = finderList.find((i) => i.id == item.typeId).name;
              sendMessage(`Found ${name}`);
            }
          }
        });
      }
    }

    roomWallItems = wallItems.map((item) => ({
      id: item.id,
      typeId: item.typeId,
      name: getWallItemName(item.typeId),
    }));
  });

  ext.interceptByNameOrHash(HDirection.TOSERVER, "UseFurniture", (hMessage) => {
    if (!averageStatus) return;

    hMessage.blocked = true;

    let hPacket = hMessage.getPacket();
    let id = hPacket.readInteger();

    clickedItem = roomFloorItems.find((item) => {
      return item.id == id;
    });

    requestMarketPlaceAverage(clickedItem.typeId);
  });

  ext.interceptByNameOrHash(HDirection.TOSERVER, "UseWallItem", (hMessage) => {
    if (!averageStatus) return;

    hMessage.blocked = true;

    let hPacket = hMessage.getPacket();
    let id = hPacket.readInteger();

    clickedItem = roomWallItems.find((item) => {
      return item.id == id;
    });

    requestMarketPlaceAverage(clickedItem.typeId);
  });

  ext.interceptByNameOrHash(
    HDirection.TOCLIENT,
    "MarketplaceItemStats",
    (hMessage) => {
      if (!averageStatus) return;

      hMessage.blocked = true;

      let hPacket = hMessage.getPacket();
      let avg = hPacket.readInteger();
      sendMessage(`${clickedItem.name} marketplace average is ${avg} coins`);
    }
  );

  ext.interceptByNameOrHash(HDirection.TOSERVER, "Chat", (hMessage) => {
    let hPacket = hMessage.getPacket();
    let message = hPacket.readString().toLocaleLowerCase();

    if (message.startsWith("!avg")) {
      hMessage.blocked = true;
      averageStatus = !averageStatus;
      sendMessage(`Average checker ${averageStatus ? "on" : "off"}`);
      win.webContents.send("averageStatus", averageStatus);
    }

    if (message.startsWith("!finder")) {
      hMessage.blocked = true;
      finderStatus = !finderStatus;
      sendMessage(`Furniture finder ${finderStatus ? "on" : "off"}`);
      win.webContents.send("finderStatus", finderStatus);
    }
  });
});
