// imports
const express = require("express");
const cors = require("cors");

// Setup Server
var server = express();
var port = process.env.PORT || 3000;

// Middleware
server.use(cors());
server.use(express.json());
server.use(express.urlencoded({ extended: false }));

//Global session info
var users = []

// MESSAGING
var mainMessageHistory = []
var sideMessageHistory = []

// GAME
var gameMessageHistory = []
var characters = []


//check usernames
server.get("/users", function (req, res) {
    res.send({
        users: users
    })
})

//add username
server.post("/users", function (req, res) {
    users.push(req.body.username)
    console.log(req.body.username)
    res.send(users)
})

server.delete("/:user", function (req, res) {
    console.log("deleted ", req.params.user)
    var tmp
    users.forEach(user => {
        if (user.id == req.params.user)
            tmp = user
    });
    var index = users.indexOf(tmp)
    users.splice(index, 1)
    res.send()
})

//normal functions :)
server.get("/messaging/main", function (req, res) {
    res.send({
        history: mainMessageHistory,
    })
});

server.post("/messaging/main", function (req, res) {
    mainMessageHistory.push(req.body.message)
    res.send(mainMessageHistory)
});

server.get("/messaging/side", function (req, res) {
    res.send({
        history: sideMessageHistory,
    })
});

server.post("/messaging/side", function (req, res) {
    sideMessageHistory.push(req.body.message)
    res.send(sideMessageHistory)
});

server.get("/game", function (req, res) {
    res.send({
        characters: characters
    })
});

server.post("/game/login", function (req, res) {
    console.log("logging in new character")
    newPlayer = {
        name: req.body.username,
        position: {
            "x": 250,
            "y": 250
        },
        color: "red"
    }
    characters.push(newPlayer)
    console.log(newPlayer)
    res.send({ name: newPlayer.name })
});

server.post("/game", function (req, res) {
    var player
    characters.forEach(char => {
        if (char.name == req.body.user)
            player = char
    });

    console.log(player)

    if (req.body.move == "left") {
        player.position.x -= 10
    } else if (req.body.move == "right") {
        player.position.x += 10
    } else if (req.body.move == "up") {
        player.position.y -= 10
    } else if (req.body.move == "down") {
        player.position.y += 10
    }
    res.send(player.position)
});

server.get("/game/messaging", function (req, res) {
    res.send({
        history: gameMessageHistory,
    })
});

server.post("/game/messaging", function (req, res) {
    gameMessageHistory.push(req.body.message)
    res.send(gameMessageHistory)
});

server.listen(port, function () {
    console.log("Listening on " + port);
})