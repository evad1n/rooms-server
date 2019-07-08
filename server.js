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

// MESSAGING
var messageHistory = []

// GAME
var gameMessageHistory = []
var characters = []
var characterCount = 0

//normal functions :)
server.get("/messaging", function (req, res) {
    res.send({
        history: messageHistory,
    })
});

server.post("/messaging", function (req, res) {
    messageHistory.push(req.body.message)
    res.send(messageHistory)
});

server.get("/game", function (req, res) {
    res.send({
        history: gameMessageHistory,
        characters: characters
    })
});

server.post("/game/login", function (req, res) {
    newPlayer = {
        id: characterCount,
        position: {
            "x": 250,
            "y": 250
        },
        color: "red"
    }
    console.log(newPlayer.id)
    characterCount++
    console.log(newPlayer.id)
    characters.push(newPlayer)    
    res.send({
        id: newPlayer.id
    })
});

server.post("/game/:id", function (req, res) {
    var player
    characters.forEach(el => {
        if (el.id == req.params.id)
            player = el
    });

    if(req.body.move == "left"){
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

server.post("/game/messages/:id", function (req, res) {
    gameMessageHistory.push(req.body.message)
    res.send(gameMessageHistory)
});

server.post("/game/color/:id", function (req, res) {
    gameMessageHistory.push(req.body.message)
    res.send(gameMessageHistory)
});

server.delete("/game/:id", function (req, res) {
    console.log("deleted")
    var player
    characters.forEach(el => {
        if (el.id == req.params.id)
            player = el
    });
    var index = characters.indexOf(player)
    characters.splice(index, 1)
    res.send()
})

server.listen(port, function () {
    console.log("Listening on " + port);
})