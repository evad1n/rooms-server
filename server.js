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
var rooms = {}

// Do this for each public room
rooms["home"] = {
    users: [],
    messageHistory: [],
}

// LIST OF ALL USERS
var globalUsers = {}

// USER TIMEOUT IN MILLISECONDS
const TIMEOUT = 3000

// TIMEOUT CHECKING
setInterval(() => {
    //loop through users and see if they should be timed out
    var deletedUsers = []
    var currentTime = new Date()
    Object.keys(globalUsers).forEach(user => {
        if (currentTime.getTime() - globalUsers[user].timeout.getTime() > TIMEOUT) {
            deletedUsers.push(user)
        }
    });

    //Remove users from last room they were in
    deletedUsers.forEach(user => {
        var room = globalUsers[user].room
        var index = rooms[room].users.indexOf(user)
        rooms[room].users.splice(index, 1)
    });

    //Delete users from globalUsers
    deletedUsers.forEach(user => {
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
    if (globalUsers[req.params.user].invites.includes(req.body.room)) {
        rooms[req.body.room].messageHistory.push({ user: "Global", text: req.params.user + " has already been invited" })
    } else {
        globalUsers[req.params.user].invites.push(req.body.room)
        rooms[req.body.room].messageHistory.push({ user: "Global", text: req.body.from + " invited " + req.params.user })
    }
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

// GET ROOM DATA
server.get("/:room/data", function (req, res) {
    res.send({ data: rooms[req.params.room] })
})

// SEND MESSAGE TO ROOM
server.post("/:room/messaging", function (req, res) {
    rooms[req.params.room].messageHistory.push(req.body.message)
    res.send(rooms[req.params.room].messageHistory)
});

// ADD USER TO ROOM AND CREATE ROOM
server.post("/:room/users", function (req, res) {
    // IF ROOM DOES NOT EXIST YET
    if (!rooms[req.params.room]) {
        createRoom(req.params.room)
    }
    rooms[req.params.room].users.push(req.body.user)
    globalUsers[req.body.user].room = req.params.room
    res.send(rooms[req.params.room].users)
})

// REMOVE USER FROM ROOM
server.put('/:room/users', function (req, res) {
    var index = rooms[req.params.room].users.indexOf(req.body.user)
    if (index != -1) {
        rooms[req.params.room].users.splice(index, 1)
    }
    res.send()
})

// DELETE ROOM
server.delete('/:room/users', function (req, res) {
    delete rooms[req.params.room]
    res.send()
})

// ########################## GAME STUFF ##################################

// READY UP
server.post("/:room/game/ready", function (req, res) {
    // Set first turn to first player to ready up
    if (Object.keys(rooms[req.params.room].players).length == 0) {
        rooms[req.params.room].turn.user = req.body.user
    }

    // Add player to game info
    rooms[req.params.room].players[req.body.user] = { score: 0 }

    res.send()
});

// INITIALIZE GAME
server.post("/:room/game/start", function (req, res) {
    rooms[req.params.room].started = true
    res.send()
});

// SEND GAME INFO
server.post("/:room/game", function (req, res) {
    // SET DATA
    rooms[req.params.room] = req.body.data

    var room = rooms[req.params.room]

    // GET ROOM TYPE
    var roomType = getRoomType(req.params.room)

    // SPECIFIC GAME TYPE DATA
    switch (roomType) {
        case 'pictionary':
            // pictionary specific logic
            break;

        case 'tictactoe':

            if (room.started) {
                // check for winner
                if (room.winner == "none") {
                    console.log(isWin(room.tiles))
                    room.winner = isWin(room.tiles)
                    if (room.winner == "X" || room.winner == "O") {
                        // set winner to last user
                        room.winner = room.turn.user
                        room.players[room.winner].score++
                    }
                }

                // if game still isn't over after check
                if (room.winner == "none") {
                    // next turn
                    room.turn.turn++
                    room.turn.turn %= room.maxPlayers
                    room.turn.user = Object.keys(room.players)[room.turn.turn]
                }

            }
            break;

        default:
            data = { message: "not a real game" }
            break;
    }

    res.send()
});



// ###################### HELPER FUNCTIONS ###################

function getRoomType(room) {
    var index = room.indexOf("-")
    var roomType = room.substring(index + 1, room.length)
    return roomType
}

function createRoom(room) {
    // GET ROOM TYPE
    var roomType = getRoomType(room)

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
            data.started = false
            break;

        case 'tictactoe':
            data.maxPlayers = 2
            data.first = 0
            data.started = false
            data.players = {}
            data.tiles = [
                "", "", "",
                "", "", "",
                "", "", "",
            ]
            data.turn = { user: "", turn: 0 }
            data.winner = "none"

        default:
            break;
    }

    // SET UP ROOM WITH CORRECT DATA
    rooms[room] = data
}


// TIC TAC TOE
//Possible 3 in a row combinations
var winSet = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],

    [1, 5, 9],
    [7, 5, 3],

    [1, 4, 7],
    [2, 5, 8],
    [3, 6, 9]
]

//Check win condition
function isWin(tiles) {
    var xTiles = [];
    var oTiles = [];

    tiles.forEach(function (tile, i) {
        if (tile == "X") {
            xTiles.push(i + 1);
        }
        else if (tile == "O") {
            oTiles.push(i + 1);
        }
    });

    for (var i = 0; i < winSet.length; i++) {
        if (xTiles.includes(winSet[i][0]) && xTiles.includes(winSet[i][1]) && xTiles.includes(winSet[i][2])) {
            return "X";
        }

        if (oTiles.includes(winSet[i][0]) && oTiles.includes(winSet[i][1]) && oTiles.includes(winSet[i][2])) {
            return "O";
        }
    }

    if (xTiles.length + oTiles.length >= 9)
        return "tie";

    return "none";
}