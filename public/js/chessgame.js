// public/js/chessgame.js
(() => {
  const socket = io();
  const chess = new Chess();
  const boardElement = document.querySelector(".chessboard");

  let draggedPiece = null;
  let sourceSquare = null;
  let playerRole = null;

  const FILES = "abcdefgh";

  const getPieceUnicode = (piece) => {
    const map = {
      p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
      P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔",
    };
    return piece.color === "w"
      ? map[piece.type.toUpperCase()]
      : map[piece.type];
  };

  function renderBoard() {
    const board = chess.board();
    boardElement.innerHTML = "";

    board.forEach((row, rowIndex) => {
      row.forEach((square, colIndex) => {
        const squareElement = document.createElement("div");
        squareElement.classList.add(
          "square",
          (rowIndex + colIndex) % 2 === 0 ? "light" : "dark"
        );
        squareElement.dataset.row = rowIndex;
        squareElement.dataset.col = colIndex;

        if (square) {
          const pieceElement = document.createElement("div");
          pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
          pieceElement.innerText = getPieceUnicode(square);

          pieceElement.draggable =
            playerRole === square.color && chess.turn() === square.color;

          pieceElement.addEventListener("dragstart", (e) => {
            if (!pieceElement.draggable) return;
            draggedPiece = pieceElement;
            sourceSquare = { row: rowIndex, col: colIndex };
            e.dataTransfer.setData("text/plain", "");
          });

          pieceElement.addEventListener("dragend", () => {
            draggedPiece = null;
            sourceSquare = null;
          });

          squareElement.appendChild(pieceElement);
        }

        squareElement.addEventListener("dragover", (e) => e.preventDefault());
        squareElement.addEventListener("drop", (e) => {
          e.preventDefault();
          if (!draggedPiece || !sourceSquare) return;

          const targetSquare = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };

          handleMove(sourceSquare, targetSquare);
        });

        boardElement.appendChild(squareElement);
      });
    });

    // Flip the view visually for black
    if (playerRole === "b") {
      boardElement.classList.add("flipped");
      document.querySelectorAll(".piece").forEach((p) => {
        p.style.transform = "rotate(180deg)";
      });
    } else {
      boardElement.classList.remove("flipped");
      document.querySelectorAll(".piece").forEach((p) => {
        p.style.transform = "rotate(0deg)";
      });
    }
  }

  function coordFromRC(row, col) {
    return `${FILES[col]}${8 - row}`;
  }

  function handleMove(source, target) {
    const from = coordFromRC(source.row, source.col);
    const to = coordFromRC(target.row, target.col);

    const move = chess.move({ from, to, promotion: "q" });
    if (move) {
      socket.emit("move", { from, to, promotion: "q" });
      renderBoard();
      checkGameOver();
    }
  }

  function checkGameOver() {
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        const winner = chess.turn() === "w" ? "Black" : "White";
        alert(`${winner} wins by checkmate!`);
      } else if (chess.isStalemate()) {
        alert("Game drawn by stalemate!");
      } else if (chess.isThreefoldRepetition()) {
        alert("Game drawn by threefold repetition!");
      } else if (chess.isInsufficientMaterial()) {
        alert("Game drawn due to insufficient material!");
      } else if (chess.isDraw()) {
        alert("Game drawn!");
      }
    }
  }

  // Socket events
  socket.on("playerRole", (role) => {
    playerRole = role;
    renderBoard();
  });

  socket.on("spectatorRole", () => {
    playerRole = null;
    renderBoard();
  });

  socket.on("boardState", (fen) => {
    chess.load(fen);
    renderBoard();
    checkGameOver();
  });

  socket.on("invalidMove", () => {
    renderBoard();
  });

  renderBoard();
})();
