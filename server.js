const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const multer = require("multer");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);
    socket.to(roomId).emit("user-connected", socket.id);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
      socket.to(roomId).emit("user-disconnected", socket.id);
    });
  });

  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });
});


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, "uploads");
      if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true }); // Create folder if not exists
      }
      cb(null, uploadPath);
  },
  // filename: (req, file, cb) => {
  //     cb(null, Date.now() + "-" + file.originalname); // Unique filename
  // }

  // filename: (req, file, cb) => {
  //   const now = new Date();
  //   const formattedDate = now.toISOString().replace(/:/g, "-").split(".")[0]; // Format YYYY-MM-DDTHH-MM-SS
  //   cb(null, `${formattedDate}-recorded-video.webm`);
  // }


  filename: (req, file, cb) => {
    const userTimestamp = req.body.timestamp || new Date().toISOString();
    const formattedTimestamp = userTimestamp.replace(/[\/,:\s]/g, "-"); // Ensure valid filename
    cb(null, `${formattedTimestamp}-recorded-video.webm`);
  }


});

const upload = multer({ storage });

// ✅ Handle video upload
app.post("/upload", upload.single("video"), (req, res) => {
  console.log("📁 File uploaded:", req.file.filename);
  res.json({ message: "Upload successful!", filename: req.file.filename });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


