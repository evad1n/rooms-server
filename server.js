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
// Array of rooms, each room is an object containing array of users, array of messageHistory, and optional specific room data
var rooms = []

// Do this for each public room
rooms["home"] = {
    users: [],
    messageHistory: [],
}

// LIST OF ALL USERS
var globalUsers = []

// START SERVER
server.listen(port, function () {
    console.log("Listening on " + port);
})

// CHECK USERNAME
server.get("/users", function (req, res) {
    res.send({
        users: Object.keys(globalUsers)
    })
})

// ADD USERNAME
server.post("/users", function (req, res) {
    globalUsers[req.body.username] = {invites: []}
    console.log(req.body.username + " has logged in")
    res.send()
})

// DOESN'T WORK IF SERVER TAKES TOO LONG
// DELETE USER WHEN PAGE CLOSED
server.put("/users", function (req, res) {
    //remove user from last room they were in
    var index = rooms[req.body.room].users.indexOf(req.body.user)
    rooms[req.body.room].users.splice(index, 1)
    //rooms[req.body.room].messageHistory.push({user: "Global", text: req.body.user + " has logged off"})
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

// GET INVITES FOR USER
server.get("/invites/:username", function (req, res) {
    res.send({invites: globalUsers[req.params.username].invites})
})

// SEND INVITE TO USER
server.post("/invites/:username", function (req, res) {
    console.log("invited " + req.params.username + " to " + req.body.room + " from user " + req.body.from)
    globalUsers[req.params.username].invites.push(req.body.room)
    rooms[req.body.room].messageHistory.push({user: "Global", text: req.body.from + " invited " + req.params.username})
    res.send()
})

// USER ACCEPTS INVITE TO PRIVATE ROOM
server.put("/:room/invite", function(req, res) {
    if(req.body.accepted) {
        rooms[req.params.room].messageHistory.push({user: "Global", text: req.body.user + " has joined "})
    } else {
        rooms[req.params.room].messageHistory.push({user: "Global", text: req.body.user + " declined the invitation from " + req.body.from})
    }
    //remove invite from user
    var index = globalUsers[req.body.user].invites.indexOf(req.params.room)
    globalUsers[req.body.user].invites.splice(index, 1)

    res.send()
})

// GET MESSAGES FROM ROOM
server.get("/:room/messaging", function (req, res) {
    if(!rooms[req.params.room]){
        rooms[req.params.room] = {
            users: [],
            messageHistory: [],
        }
    }
    res.send({ history: rooms[req.params.room].messageHistory, users: rooms[req.params.room].users })
});

// SEND MESSAGE TO ROOM
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

// GET ALL USERS IN ROOM
server.get("/:room/users", function (req, res) {
    if(!rooms[req.params.room]){
        rooms[req.params.room] = {
            users: [],
            messageHistory: [],
        }
    }
    res.send(rooms[req.params.room].users)
})

// ADD USER TO ROOM
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

// REMOVE USER FROM ROOM
server.put('/:room/users', function (req, res) {
    var index = rooms[req.params.room].users.indexOf(req.body.user)
    rooms[req.params.room].users.splice(index, 1)
    console.log(req.body.user + " has left " + req.params.room)
    res.send(rooms[req.params.room].users)
})



// GET GAME INFO
server.get("/:room/game", function (req, res) {
    res.send({
        characters: characters
    })
});

// SEND GAME INFO
server.post("/:room/game", function (req, res) {
    res.send({
        characters: characters
    })
});

// INITIALIZE GAME
server.post("/:room/game/login", function (req, res) {
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