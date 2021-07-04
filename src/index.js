const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
require("./db/mongoose");
const User = require("./models/user");
const Filter = require("bad-words");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "thisissecret";
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const bodyParser = require("body-parser");

const app = express();

const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

app.set("view engine", "html");
//app.set('views', viewsPath)

app.use(express.json());
//app.use(express.static(publicDirectoryPath));
app.use("/", express.static(path.join(__dirname, "../public")));
app.use(bodyParser.json());

app.post("/api/login", async (req, res) => {
  ////res.render(login.html)
  const { username, password } = req.body;
  const user = await User.findOne({ username, password }).lean();

  if (!user) {
    return res.json({ status: "error", error: "Invalid username/password" });
  }

  if (await bcrypt.compare(password, user.password)) {
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      JWT_SECRET
    );
    authed = true;
    //res.redirect("/api/chat");

    return res.json({ status: "ok", data: "" });
  }

  res.json({ status: "ok", data: "waitingg" });
});

app.post("/api/register", async (req, res) => {
  //res.render(register.html)
  const { username, password: plianTextPassword } = req.body;
  //hashed_password
  console.log(await bcrypt.hash(password, 10));

  if (!username || typeof username !== "string") {
    return res.json({ status: "error", error: "Invalid username" });
  }

  if (!password || typeof password !== "string") {
    return res.json({ status: "error", error: "Invalid password" });
  }

  if (password.length < 5) {
    return res.json({
      status: "error",
      error: "password should be atleast 6 characters",
    });
  }

  try {
    const response = await User.create({
      username,
      password,
    });
    (authed = true), console.log("User created successfully", response);
    //res.redirect("/api/chat");
  } catch (error) {
    if (error.code === 11000) {
      return res.json({ status: "error", error: "username already in use" });
    }
    throw error;
  }

  res.json({ status: "ok" });
});

io.on("connection", (socket) => {
  console.log("New websocket connection");

  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);
    socket.emit("message", generateMessage("Admin", "Welcome!"));
    socket.broadcast
      .to(room)
      .emit(
        "message",
        generateMessage("Admin", user.username + " has joined the custom room")
      );
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    if (filter.isProfane(message)) {
      return callback("Bad words are not allowed!");
    }

    io.to(user.room).emit("message", generateMessage(user.username, message));
    callback();
  });

  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        "https://google.com/maps?q=" + coords.latitude + "," + coords.longitude
      )
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", user.username + " has left the custom room!")
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log("server is on port " + port);
});
