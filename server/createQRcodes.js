import readline from "node:readline";
import {DatabaseSync} from "node:sqlite";
import QRCode from "qrcode";

function validateRoomName(roomName) {
  const forbiddenChars = ["(", ")", "-", "&", "@", "*", "$", "|", "%", "~"];
  return !forbiddenChars.some(char => roomName.includes(char));
}

const rl = readline.createInterface({
  input: process.stdin, output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

let amount;
let chatRoom;

(async () => {
  do {
    chatRoom = (await askQuestion("Enter the name of the chat room: ")).trim();
  } while (!chatRoom || !validateRoomName(chatRoom));

  do {
    amount = parseInt(await askQuestion("Enter the amount of QR codes you want to create: "));
  } while (!amount || amount < 1);

  rl.close();
  await crateQRcodes(chatRoom);
})();

function createRandomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}


async function crateQRcodes(chatRoom) {
  const db = new DatabaseSync("../database/shitChatDB.sqlite");


  for (let i = 0; i < amount; i++) {
    const code = createRandomString(64);
    const path = `../qrcodes/${chatRoom}_${i}.png`;

    await QRCode.toFile(path, code);
    await db.exec(`INSERT OR ignore INTO rooms (room_name) VALUES ('${chatRoom}')`);
    await db.exec(`INSERT INTO qr_codes (room_id, code)
                         VALUES ((SELECT id FROM rooms WHERE room_name = '${chatRoom}'), '${code}')`);
  }
}

