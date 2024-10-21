import express from 'express';
import cors from 'cors';
import { DatabaseSync } from 'node:sqlite';

// Initialize the Express app
const app = express();
app.use(express.json());  // Middleware to parse JSON bodies

// Configure CORS
const corsOptions = {
  origin: 'http://localhost:5173',  // Allow requests from this origin
  methods: ['GET', 'POST'],  // Allow these HTTP methods
};
app.use(cors(corsOptions));


// Connect to the SQLite database
const db = new DatabaseSync("../database/shitChatDB.sqlite");

// Route to check if a QR code corresponds to a room
app.post('/check-code',cors(corsOptions) , (req, res) => {
  const { code } = req.body;  // Retrieve the QR code from the request body

  if (!code) {
    return res.status(400).json({ message: "QR code is required" });
  }

  try {
    // Prepare the query to check if the QR code exists and fetch the corresponding room
    const statement = db.prepare(`
      SELECT rooms.room_name
      FROM qr_codes
      INNER JOIN rooms ON qr_codes.room_id = rooms.id
      WHERE qr_codes.code = ?
    `);

    // Execute the query synchronously and get the result
    const result = statement.get(code);

    if (result) {
      return res.json({ roomName: result.room_name });
    } else {
      return res.status(404).json({ message: "QR code does not correspond to any room" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while checking the QR code" });
  }
});

app.post('/check-room', cors(corsOptions), (req, res) => {
  const { roomName, code } = req.body;

  if (!roomName || !code) {
    return res.status(400).json({ message: "Room name and code are required" });
  }

  try {
    // Prepare the query to check if the room exists
    const statement = db.prepare(`
      SELECT room_name 
      FROM rooms 
      WHERE id = (SELECT room_id FROM qr_codes WHERE code = ?)
    `);

    // Execute the query synchronously and get the result
    const result = statement.get(code);

    if (result && result.room_name === roomName) {
      return res.json({ valid: true });
    } else {
      return res.json({ valid: false });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while checking the room" });
  }
});


// Start the server on port 3000
const PORT =  3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});