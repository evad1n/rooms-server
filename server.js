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

// Global session info
// array of rooms, each room is an object containing array of users, array of messageHistory, and specific room data
var rooms = []
// do this for each room
rooms["globalMessaging"] = {
    users: [],
    messageHistory: [],
}
rooms["otherMessaging"] = {
    users: [],
    messageHistory: [],
}
rooms["game"] = {
    users: [],
    messageHistory: [],
    characters: []
}
var globalUsers = []

//start server
server.listen(port, function () {
    console.log("Listening on " + port);
})

//check usernames
server.get("/users", function (req, res) {
    res.send({
        users: globalUsers
    })
})

//add username
server.post("/users", function (req, res) {
    globalUsers.push(req.body.username)
    console.log(req.body.username + " has logged in")
    res.send(globalUsers)
})

//delete user when page is closed
server.delete("/users", function (req, res) {
    console.log(req.body.user + " has logged off")
    var tmp
    globalUsers.forEach(user => {
        if (user.id == req.body.user)
            tmp = user
    });
    var index = globalUsers.indexOf(tmp)
    globalUsers.splice(index, 1)
    res.send(globalUsers)
})

//global messaging that goes to room based on parameter
server.get("/:room/messaging", function (req, res) {
    res.send({ history: rooms[req.params.room].messageHistory, users: rooms[req.params.room].users })
});

server.post("/:room/messaging", function (req, res) {
    rooms[req.params.room].messageHistory.push(req.body.message)
    res.send( rooms[req.params.room].messageHistory)
});

// get all users in room
server.get("/:room/users", function (req, res) {
    res.send(rooms[req.params.room].users)
})

// add user to room
server.post("/:room/users", function (req, res) {
    rooms[req.params.room].users.push(req.body.user)
    console.log(req.body.user + " has joined " + req.params.room)
    res.send(rooms[req.params.room].users)
})

// remove user from room
server.put('/:room/users', function (req, res) {
    var index = rooms[req.params.room].users.indexOf(req.body.user)
    rooms[req.params.room].users.splice(index, 1)
    console.log(req.body.user + " has left " + req.params.room)
    res.send(rooms[req.params.room].users)
})

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
        color: req.body.color
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