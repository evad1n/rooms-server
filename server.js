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

// USER TIMEOUT IN MILLISECONDS
const TIMEOUT = 5000

// TIMEOUT CHECKING
setInterval(() => {
    //loop through users and see if they should be timed out
    var deletedUsers = []
    var currentTime = new Date()
    Object.keys(globalUsers).forEach(user => {
        if(currentTime.getTime() - globalUsers[user].timeout.getTime() > TIMEOUT) {
            deletedUsers.push(user)
        }
    });

    //Remove users from last room they were in
    deletedUsers.forEach(user => {
        var room = globalUsers[user].room
        var index = rooms[room].users.indexOf(user)
        rooms[room].users.splice(index, 1)
        console.log(user, " has left room " + room + " due to timeout")
    });

    //Delete users from globalUsers
    deletedUsers.forEach(user => {
        console.log(user, " has logged off")
        delete globalUsers[user];
    });
}, TIMEOUT);

// START SERVER
server.listen(port, function () {
    console.log("Listening on " + port);
})

// GETS ALL USERNAMES
server.get("/users", function (req, res) {
    res.send({
        users: Object.keys(globalUsers)
    })
})

// ADD USER
server.post("/users", function (req, res) {
    globalUsers[req.body.user] = { invites: [], room: "home", timeout: new Date() }
    console.log(req.body.user + " has logged in")
    res.send()
})

// REFRESH USER TIMEOUT
server.put("/users", function (req, res) {
    globalUsers[req.body.user].timeout = new Date()
    res.send()
})

// GET INVITES FOR USER
server.get("/invites/:user", function (req, res) {
    res.send({ invites: globalUsers[req.params.user].invites })
})

// SEND INVITE TO USER
server.post("/invites/:user", function (req, res) {
    console.log("invited " + req.params.user + " to " + req.body.room + " from user " + req.body.from)
    globalUsers[req.params.user].invites.push(req.body.room)
    rooms[req.body.room].messageHistory.push({ user: "Global", text: req.body.from + " invited " + req.params.user })
    res.send()
})

// USER ACCEPTS INVITE TO PRIVATE ROOM
server.put("/:room/invite", function (req, res) {
    if (req.body.accepted) {
        rooms[req.params.room].messageHistory.push({ user: "Global", text: req.body.user + " has joined " })
    } else {
        rooms[req.params.room].messageHistory.push({ user: "Global", text: req.body.user + " declined the invitation from " + req.body.from })
    }
    //remove invite from user
    var index = globalUsers[req.body.user].invites.indexOf(req.params.room)
    globalUsers[req.body.user].invites.splice(index, 1)

    res.send()
})

// GET MESSAGES FROM ROOM
server.get("/:room/messaging", function (req, res) {
    if (!rooms[req.params.room]) {
        rooms[req.params.room] = {
            users: [],
            messageHistory: [],
        }
    }
    res.send({ history: rooms[req.params.room].messageHistory, users: rooms[req.params.room].users })
});

// SEND MESSAGE TO ROOM
server.post("/:room/messaging", function (req, res) {
    if (!rooms[req.params.room]) {
        rooms[req.params.room] = {
            users: [],
            messageHistory: [],
        }
    }
    rooms[req.params.room].messageHistory.push(req.body.message)
    res.send(rooms[req.params.room].messageHistory)
});

// GET ALL USERS IN ROOM
server.get("/:room/users", function (req, res) {
    if (!rooms[req.params.room]) {
        rooms[req.params.room] = {
            users: [],
            messageHistory: [],
        }
    }
    res.send(rooms[req.params.room].users)
})

// ADD USER TO ROOM
server.post("/:room/users", function (req, res) {
    // IF ROOM DOES NOT EXIST YET
    if (!rooms[req.params.room]) {
        // GET ROOM TYPE
        var roomType = getRoomType(req.params.room)

        // ALL ROOMS WILL HAVE THIS DATA
        var data = {
            users: [],
            messageHistory: [],
        }
        // SPECIFIC GAME TYPE DATA
        switch (roomType) {
            // NO OTHER FIELDS NECESSARY
            case 'privateMessaging':
                break;

            case 'pictionary':
                data.turn = 0
                data.canvas = {}
                data.points = {}
                break;

            default:
                break;
        }

        // SET UP ROOM WITH CORRECT DATA
        rooms[req.params.room] = data
    }
    rooms[req.params.room].users.push(req.body.user)
    globalUsers[req.body.user].room = req.params.room
    res.send(rooms[req.params.room].users)
})

// REMOVE USER FROM ROOM
server.put('/:room/users', function (req, res) {
    var index = rooms[req.params.room].users.indexOf(req.body.user)
    rooms[req.params.room].users.splice(index, 1)
    res.send(rooms[req.params.room].users)
})


// ########################## GAME STUFF ##################################

// GET GAME INFO
server.get("/:room/game", function (req, res) {
    // GET ROOM TYPE
    var roomType = getRoomType(req.params.room)

    var data = rooms[req.params.room]

    // SPECIFIC GAME TYPE DATA
    switch (roomType) {
        case 'pictionary':
            data = {context: data.context, points: data.points}
            break;

        default:
            data = { message: "not a real game" }
            break;
    }
    console.log(data)
    res.send(data)
});

// SEND GAME INFO
server.post("/:room/game", function (req, res) {
    // GET ROOM TYPE
    var roomType = getRoomType(req.params.room)

    // SPECIFIC GAME TYPE DATA
    switch (roomType) {
        case 'pictionary':
            rooms[req.params.room].context = req.body.context
            rooms[req.params.room].points = req.body.points
            break;

        default:
            data = { message: "not a real game" }
            break;
    }
    console.log(req.body)

    res.send()
});

// INITIALIZE GAME
server.post("/:room/game/login", function (req, res) {
    console.log("logging in new character")
    newPlayer = {
        name: req.body.user,
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



// ###################### HELPER FUNCTIONS ###################

function getRoomType(room) {
    var index = room.indexOf("-")
    var roomType = room.substring(index + 1, room.length)
    return roomType
}