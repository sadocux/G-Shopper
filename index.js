import { Extension, HPacket, HDirection, HFloorItem, HWallItem } from 'gnode-api';
import { readFile } from 'fs/promises';
import fetch from 'node-fetch'

const extensionInfo = JSON.parse(
    await readFile(
        new URL('./package.json', import.meta.url)
    )
);

let ext = new Extension(extensionInfo);
ext.run();

let roomFloorItems
let roomWallItems
let habboData

let clickedItem

ext.on('connect', (host) => {
    switch (host) {
        case 'game-br.habbo.com':
            fetchHabbo('www.habbo.com.br');
            break;
        case 'game-de.habbo.com':
            fetchHabbo('www.habbo.de');
            break;
        case 'game-es.habbo.com':
            fetchHabbo('www.habbo.es');
            break;
        case 'game-fi.habbo.com':
            fetchHabbo('www.habbo.fi');
            break;
        case 'game-fr.habbo.com':
            fetchHabbo('www.habbo.fr');
            break;
        case 'game-it.habbo.com':
            fetchHabbo('www.habbo.it');
            break;
        case 'game-nl.habbo.com':
            fetchHabbo('www.habbo.nl');
            break;
        case 'game-s2.habbo.com':
            fetchHabbo('sandbox.habbo.com');
            break;
        case 'game-tr.habbo.com':
            fetchHabbo('www.habbo.com.tr');
            break;
        case 'game-us.habbo.com':
            fetchHabbo('www.habbo.com');
            break;
    }
});

async function fetchHabbo(hotel) {
    let url = `https://${hotel}/gamedata/furnidata_json/0`
    let res = await fetch(url);
    habboData = await res.json();
}

function getFloorItemName(typeId) {
    return habboData.roomitemtypes.furnitype.find(data => {
        return typeId == data.id
    }).name
}

function getWallItemName(typeId) {
    return habboData.wallitemtypes.furnitype.find(data => {
        return typeId == data.id
    }).name
}

function sendMessage(message) {
    let packet = new HPacket(`{in:Shout}{i:1234}{s:"${message}"}{i:0}{i:0}{i:0}{i:-1}`)
    ext.sendToClient(packet)
}

function requestMarketPlaceAvarage(typeId) {
    if (!typeId) return
    let packet = new HPacket(`{out:GetMarketplaceItemStats}{i:1}{i:${typeId}}`)
    ext.sendToServer(packet)
}

ext.interceptByNameOrHash(HDirection.TOCLIENT, 'Objects', hMessage => {
    let hPacket = hMessage.getPacket();
    let floorItems = HFloorItem.parse(hPacket)

    let array = []
    floorItems.forEach(item => {
        array.push({
            id: item.id,
            typeId: item.typeId,
            name: getFloorItemName(item.typeId),
        })
    })
    roomFloorItems = array
});

ext.interceptByNameOrHash(HDirection.TOCLIENT, 'Items', hMessage => {
    let hPacket = hMessage.getPacket();
    let wallItems = HWallItem.parse(hPacket)
    console.log(wallItems)

    let array = []
    wallItems.forEach(item => {
        array.push({
            id: item.id,
            typeId: item.typeId,
            name: getWallItemName(item.typeId),
        })
    })
    roomWallItems = array
});

ext.interceptByNameOrHash(HDirection.TOSERVER, 'UseFurniture', hMessage => {
    let hPacket = hMessage.getPacket();
    let id = hPacket.readInteger();

    let item = roomFloorItems.find(item => {
        return item.id == id
    })

    clickedItem = {
        id: item.id,
        typeId: item.typeId,
        name: item.name,
    }

    requestMarketPlaceAvarage(item.typeId)
});

ext.interceptByNameOrHash(HDirection.TOSERVER, 'UseWallItem', hMessage => {
    let hPacket = hMessage.getPacket();
    let id = hPacket.readInteger();

    let item = roomWallItems.find(item => {
        return item.id == id
    })

    clickedItem = {
        id: item.id,
        typeId: item.typeId,
        name: item.name,
    }

    requestMarketPlaceAvarage(item.typeId)
});

ext.interceptByNameOrHash(HDirection.TOCLIENT, 'MarketplaceItemStats', hMessage => {
    let hPacket = hMessage.getPacket();
    let avg = hPacket.readInteger();
    sendMessage(`${clickedItem.name} marketplace avarage is ${avg} coins`)
}); 