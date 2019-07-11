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
// do this for each public room
rooms["main"] = {
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
        users: Object.keys(globalUsers)
    })
})

//add username
server.post("/users", function (req, res) {
    globalUsers[req.body.username] = {invites: []}
    console.log(req.body.username + " has logged in")
    res.send()
})

//delete user when page is closed
server.put("/users", function (req, res) {
    //remove user from last room they were in
    var index = rooms[req.body.room].users.indexOf(req.body.user)
    rooms[req.body.room].users.splice(index, 1)
    console.log(req.body.user + " has left " + req.body.room)

    //remove user from globalUsers and log them off
    console.log(req.body.user + " has logged off")
    var tmp
    Object.keys(globalUsers).forEach(user => {
        if (user == req.body.user)
            tmp = user
    });
    delete globalUsers[tmp];
    res.send()
})

//get invites
server.get("/invites/:username", function (req, res) {
    res.send({invites: globalUsers[req.params.username].invites})
})

//send invite
server.post("/invites/:username", function (req, res) {
    console.log("invited " + req.params.username + " to " + req.body.room + " from user " + req.body.from)
    globalUsers[req.params.username].invites.push(req.body.room)
    rooms[req.body.room].messageHistory.push({user: "Global", text: req.body.from + " invited " + req.params.username})
    res.send()
})

//delete invite
server.delete("/invites/:username", function (req, res) {
    var index = globalUsers[req.params.username].invites.indexOf(req.body.room)
    rooms[req.body.room].messageHistory.push({user: "Global", text: req.params.username + " declined the invitation from " + req.body.from})
    globalUsers[req.params.username].invites.splice(index, 1)
    res.send()
})

//user accepts invite to private room
server.put("/:room/invite", function(req, res) {
    console.log(req.body.user + " accepted " + req.body.from + "'s invitation to " + req.params.room)
    rooms[req.params.room].users.push(req.body.user)
    rooms[req.params.room].messageHistory.push({user: "Global", text: req.body.user + " joined "})
})

//global messaging that goes to room based on parameter
server.get("/:room/messaging", function (req, res) {
    if(!rooms[req.params.room]){
        rooms[req.params.room] = {
            users: [],
            messageHistory: [],
        }
    }
    res.send({ history: rooms[req.params.room].messageHistory, users: rooms[req.params.room].users })
});

server.post("/:room/messaging", function (req, res) {
    if(!rooms[req.params.room]){
        rooms[req.params.room] = {
            users: [],
            messageHistory: [],
        }
    }
    rooms[req.params.room].messageHistory.push(req.body.message)
    res.send( rooms[req.params.room].messageHistory)
});

// get all users in room
server.get("/:room/users", function (req, res) {
    if(!rooms[req.params.room]){
        rooms[req.params.room] = {
            users: [],
            messageHistory: [],
        }
    }
    res.send(rooms[req.params.room].users)
})

// add user to room
server.post("/:room/users", function (req, res) {
    if(!rooms[req.params.room]){
        rooms[req.params.room] = {
            users: [],
            messageHistory: [],
        }
    }
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