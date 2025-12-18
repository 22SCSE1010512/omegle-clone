const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve public folder
app.use(express.static(path.join(__dirname, "public")));

// Force homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

let waitingUser = null;

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    if (waitingUser) {
        socket.partner = waitingUser;
        waitingUser.partner = socket;

        socket.emit("matched");
        waitingUser.emit("matched");

        waitingUser = null;
    } else {
        waitingUser = socket;
    }

    socket.on("message", (msg) => {
        if (socket.partner) {
            socket.partner.emit("message", msg);
        }
    });

    socket.on("next", () => {
        if (socket.partner) {
            socket.partner.emit("partnerLeft");
            socket.partner.partner = null;
        }
        socket.partner = null;
        waitingUser = socket;
    });

    socket.on("disconnect", () => {
        if (socket.partner) {
            socket.partner.emit("partnerLeft");
            socket.partner.partner = null;
        }
        if (waitingUser === socket) {
            waitingUser = null;
        }
    });
    
    socket.on("offer", offer => {
    socket.partner && socket.partner.emit("offer", offer);
});

socket.on("answer", answer => {
    socket.partner && socket.partner.emit("answer", answer);
});

socket.on("ice", candidate => {
    socket.partner && socket.partner.emit("ice", candidate);
});

});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
