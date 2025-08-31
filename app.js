const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const chess = new Chess();
let players = {}; // { white: socketId, black: socketId }
let currentPlayer = "w";

// ---- Express Setup ----
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

// ---- Socket.io ----
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Assign roles
  if (!players.white) {
    players.white = socket.id;
    socket.emit("playerRole", "w");
    console.log("White assigned:", socket.id);
  } else if (!players.black) {
    players.black = socket.id;
    socket.emit("playerRole", "b");
    console.log("Black assigned:", socket.id);
  } else {
    socket.emit("spectatorRole");
    console.log("Spectator joined:", socket.id);
  }

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);

    if (socket.id === players.white) {
      delete players.white;
    } else if (socket.id === players.black) {
      delete players.black;
    }

    // Reset the game if a player leaves
    chess.reset();
    io.emit("boardState", chess.fen());
  });

  // Handle moves
  socket.on("move", (move) => {
    try {
      // Validate turn
      if (chess.turn() === "w" && socket.id !== players.white) return;
      if (chess.turn() === "b" && socket.id !== players.black) return;

      const result = chess.move(move);
      if (result) {
        currentPlayer = chess.turn();
        io.emit("move", move); // send move to all
        io.emit("boardState", chess.fen()); // send updated board
      } else {
        console.log("Invalid move:", move);
        socket.emit("invalidMove", move);
      }
    } catch (err) {
      console.error("Error processing move:", move, err);
      socket.emit("invalidMove", move);
    }
  });
});

// ---- Start Server ----
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
