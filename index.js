const { app, BrowserWindow, ipcMain } = require("electron");
const fetch = require("node-fetch");

process.on("uncaughtException", function (error) {
  console.error(error);
  process.exit(0);
});

app.whenReady().then(async () => {
  const { Extension, HPacket, HDirection, HFloorItem, HWallItem } =
    await import("gnode-api");

  let roomFloorItems;
  let roomWallItems;
  let habboData;

  let clickedItem;
  let averageStatus = false;

  const extensionInfo = {
    name: "G-Shopper",
    description: "Makes shopping easier",
    version: "0.2",
    author: "rocawear",
  };

  const ext = new Extension(extensionInfo);
  ext.run();

  ext.on("click", () => {
    win.show();
  });

  const win = new BrowserWindow({
    width: 300,
    height: 200,
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

  ipcMain.on("hide", () => {
    win.hide();
  });

  ipcMain.on("status", () => {
    averageStatus = !averageStatus;
    sendMessage(`Average checker ${averageStatus ? "on" : "off"}`);
    win.webContents.send("averageStatus", averageStatus);
  });

  ext.on("connect", (host) => {
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

  const fetchHabbo = async (hotel) => {
    let url = `https://${hotel}/gamedata/furnidata_json/0`;
    let res = await fetch(url);
    let json = await res.json();
    habboData = [
      ...json.roomitemtypes.furnitype,
      ...json.wallitemtypes.furnitype,
    ];
  };

  const getItemName = (typeId) => {
    return habboData.find((data) => {
      return typeId == data.id;
    }).name;
  };

  const sendMessage = (message) => {
    let packet = new HPacket(
      `{in:Shout}{i:1234}{s:"${message}"}{i:0}{i:0}{i:0}{i:-1}`
    );
    ext.sendToClient(packet);
  };

  const requestMarketPlaceAverage = (typeId) => {
    if (!typeId) return;

    let packet = new HPacket(`{out:GetMarketplaceItemStats}{i:1}{i:${typeId}}`);
    ext.sendToServer(packet);
  };

  ext.interceptByNameOrHash(HDirection.TOCLIENT, "Objects", (hMessage) => {
    let hPacket = hMessage.getPacket();
    let floorItems = HFloorItem.parse(hPacket);

    roomFloorItems = floorItems.map((item) => ({
      id: item.id,
      typeId: item.typeId,
      name: getItemName(item.typeId),
    }));
  });

  ext.interceptByNameOrHash(HDirection.TOCLIENT, "Items", (hMessage) => {
    let hPacket = hMessage.getPacket();
    let wallItems = HWallItem.parse(hPacket);

    roomWallItems = wallItems.map((item) => ({
      id: item.id,
      typeId: item.typeId,
      name: getItemName(item.typeId),
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
  });
});
