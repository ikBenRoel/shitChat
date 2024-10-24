import express from "express";
import cors from "cors";
import { DatabaseSync } from "node:sqlite";
import usernameOptions from "./usernameOptions.js";
import { isStringValid } from "./utils.js";

// Initialize the Express app
const app = express();
app.use(express.json());  // Middleware to parse JSON bodies

// Configure CORS
const corsOptions = {
  origin: "http://localhost:5173",  // Allow requests from this origin
  methods: ["GET", "POST"],  // Allow these HTTP methods
};
app.use(cors(corsOptions));

// Connect to the SQLite database
const db = new DatabaseSync("C:\\Users\\roelb\\WebstormProjects\\shitchat-serevr\\database\\shitChatDB.sqlite");

// Route to check if a QR code corresponds to a room
app.post("/check-code", (req, res) => {
  const { code } = req.body;
  if (!isStringValid(code)) return res.status(400).json({ message: "Invalid input" });

  try {
    const statement = db.prepare(`
      SELECT rooms.room_name
      FROM qr_codes
      INNER JOIN rooms ON qr_codes.room_id = rooms.id
      WHERE qr_codes.code = ?
    `);
    const result = statement.get(code);
    if (result) return res.json({ roomName: result.room_name });
    return res.status(404).json({ message: "QR code does not correspond to any room" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while checking the QR code" });
  }
});

app.post("/check-room", (req, res) => {
  const { roomName, code } = req.body;
  if (!isStringValid(roomName) || !isStringValid(code)) return res.status(400).json({ message: "Invalid input" });

  try {
    return res.json({ valid: checkCode(code, roomName) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while checking the room" });
  }
});

app.get("/random-username", (req, res) => {
  const username = usernameOptions.animals[Math.floor(Math.random() * usernameOptions.animals.length)] +
    capitalizeFirstLetter(usernameOptions.toiletWords[Math.floor(Math.random() * usernameOptions.toiletWords.length)]);
  return res.json({ username });
});

app.post("/set-username", (req, res) => {
  const { username, roomName, code } = req.body;
  if (!isStringValid(username) || !checkCode(code, roomName)) return res.status(400).json({ message: "Invalid input" });

  try {
    const statement = db.prepare(`
      INSERT INTO users (username, room_id, code)
      VALUES (?, (SELECT id FROM rooms WHERE room_name = ?), ?)
    `);
    statement.run(username, roomName, code);
    return res.json({ message: "Username set successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while setting the username" });
  }
});

app.post("/send-message", (req, res) => {
  const { username, message, roomName, code } = req.body;
  if (!isStringValid(username) || !isStringValid(message) || !checkCode(code, roomName)) return res.status(400).json({ message: "Invalid input" });

  try {
    const statement = db.prepare(`
      INSERT INTO messages (user_id, message, room_id)
      VALUES ((SELECT id FROM users WHERE username = ?), ?, (SELECT id FROM rooms WHERE room_name = ?))
    `);
    statement.run(username, message, roomName);
    return res.json({ message: "Message sent successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while sending the message" });
  }
});

app.post("/send-review", (req, res) => {
  const { username, roomName, code, toiletRating, shitRating, time, isGoldenDrop } = req.body;
  if (!isStringValid(username) || !checkCode(code, roomName)) return res.status(400).json({ message: "Invalid input" });

  try {
    const statement = db.prepare(`
      INSERT INTO reviews (user_id, room_id, toilet_rating, shit_rating, time, is_golden_drop)
      VALUES ((SELECT id FROM users WHERE username = ?), (SELECT id FROM rooms WHERE room_name = ?), ?, ?, ?, ?)
    `);
    statement.run(username, roomName, toiletRating, shitRating, time, 0 + isGoldenDrop);
    return res.json({ message: "Review sent successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while sending the review" });
  }
})


app.post("/get-messages", (req, res) => {
  const { roomName, code } = req.body;
  if (!isStringValid(roomName) || !checkCode(code, roomName)) return res.status(400).json({ message: "Invalid input" });

  try {
    const messagesStatement = db.prepare(`
      SELECT users.username, messages.message, messages.timestamp
      FROM messages
      INNER JOIN users ON messages.user_id = users.id
      WHERE messages.room_id = (SELECT id FROM rooms WHERE room_name = ?)
      AND messages.timestamp > datetime('now', '-1 day')
    `);
    const messagesResult = messagesStatement.all(roomName);

    const reviewsStatement = db.prepare(`
      SELECT users.username, reviews.toilet_rating, reviews.shit_rating, reviews.time, reviews.is_golden_drop, reviews.timestamp
      FROM reviews
      INNER JOIN users ON reviews.user_id = users.id
      WHERE reviews.room_id = (SELECT id FROM rooms WHERE room_name = ?)
      AND reviews.timestamp > datetime('now', '-1 day')
    `);
    const reviewsResult = reviewsStatement.all(roomName);

    const combinedData = [...messagesResult.map((message) => ({ ...message, type: "message" })), ...reviewsResult.map((review) => ({ ...review, type: "review", review: { toiletRating: review.toilet_rating, shitRating: review.shit_rating, time: review.time, isGoldenDrop: review.is_golden_drop } }))];

    combinedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    console.log(combinedData);
    return res.json({ messages: combinedData });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while fetching the messages" });
  }
});

function checkCode(code, roomName) {
  const statement = db.prepare(`
    SELECT rooms.room_name
    FROM qr_codes
    INNER JOIN rooms ON qr_codes.room_id = rooms.id
    WHERE qr_codes.code = ?
  `);
  const result = statement.get(code);
  return result && result.room_name === roomName;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Start the server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});