import { Extension, HPacket, HDirection, HFloorItem, HWallItem } from 'gnode-api';
import { readFile } from 'fs/promises';

const extensionInfo = JSON.parse(
    await readFile(
        new URL('./package.json', import.meta.url)
    )
);

let ext = new Extension(extensionInfo);
ext.run();

let furnitures
let clicked

function sendMessage(message) {
    console.log(message)
}

function requestMarketPlaceAvarage(typeId) {
    let packet = new HPacket(`{out:GetMarketplaceItemStats}{i:1}{i:${typeId}}`)
    ext.sendToServer(packet)
}

ext.interceptByNameOrHash(HDirection.TOCLIENT, 'Objects', hMessage => {
    let hPacket = hMessage.getPacket();
    let floorItems = HFloorItem.parse(hPacket)
    //let wallItems = HWallItem.parse(hPacket)

    let array = []
    floorItems.forEach(item => {
        array.push({
            id: item.id,
            typeId: item.typeId
        })
    })
    furnitures = array
});

ext.interceptByNameOrHash(HDirection.TOSERVER, 'UseFurniture', hMessage => {
    let hPacket = hMessage.getPacket();
    let id = hPacket.readInteger();
    let typeId = furnitures.find(item => item.id === id).typeId;

    clicked = {
        id: id,
        typeId: typeId
    }
    requestMarketPlaceAvarage(typeId)
});

ext.interceptByNameOrHash(HDirection.TOCLIENT, 'MarketplaceItemStats', hMessage => {
    let hPacket = hMessage.getPacket();
    let avg = hPacket.readInteger();
    sendMessage(`Furniture id: ${clicked.id} typeId: ${clicked.typeId} has ${avg} coins average price`)
});