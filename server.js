// imports
const express = require("express");

// Setup Server
var server = express();
var port = process.env.PORT || 3000;

// Middleware
server.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", req.get("origin"));
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});
server.options("*", function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "Content-type");
    next();
});

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
rooms["singularity"] = {
    users: [],
    messageHistory: [],
    //stuff
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
        var room = globalUsers[user].current
        var index = rooms[room].users.indexOf(user)
        rooms[room].users.splice(index, 1)
    });

    //Delete users from globalUsers
    deletedUsers.forEach(user => {
        delete globalUsers[user];
    });
}, TIMEOUT);


// -----------------------------------------------------------------------------=
// START SERVER
server.listen(port, function () {
    console.log("Listening on " + port);
})

// -----------------------------------------------------------------------------=

// GETS ALL USERS
server.get("/users", function (req, res) {
    res.send({
        users: globalUsers
    })
})

// GET INFO FOR SPECIFIC USER
server.get("/:user/access", function (req, res) {
    res.send({
        access: globalUsers[req.params.user].rooms
    })
})

// ADD USER
server.post("/users", function (req, res) {
    globalUsers[req.body.user] = { invites: [], current: "home", rooms: ["home", `${req.body.user}-privateMessaging`], timeout: new Date() }
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
        rooms[req.body.room].messageHistory.push({ user: "Global", text: `${req.params.user} has already been invited` })
    } else {
        globalUsers[req.params.user].invites.push(req.body.room)
        rooms[req.body.room].messageHistory.push({ user: "Global", text: `${req.body.from} invite ${req.params.user}` })
    }
    res.send()
})

// USER ACCEPTS INVITE TO PRIVATE ROOM
server.put("/:room/invite", function (req, res) {
    if (req.body.accepted) {
        rooms[req.params.room].messageHistory.push({ user: "Global", text: `${req.body.user} has joined` })
        globalUsers[req.body.user].rooms.push(req.params.room)
    } else {
        rooms[req.params.room].messageHistory.push({ user: "Global", text: `${req.body.user} declined the invitation from ${req.body.from}` })
    }
    //remove invite from user
    var index = globalUsers[req.body.user].invites.indexOf(req.params.room)
    globalUsers[req.body.user].invites.splice(index, 1)

    res.send()
})

// CREATE NEW ROOM
server.post("/:room/create", function (req, res) {
    // remove room access for all users
    Object.keys(globalUsers).forEach(user => {
        var index = globalUsers[user].rooms.indexOf(req.params.room)
        if (index != -1) {
            globalUsers[user].rooms.splice(index, 1)
        }
    });

    createRoom(req.params.room)

    // add room access to room creator
    globalUsers[req.body.user].rooms.push(req.params.room)

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

// ADD USER TO ROOM
server.post("/:room/users", function (req, res) {
    // if room doesn't exist yet
    if (!rooms[req.params.room]) {
        createRoom(req.params.room)
        if (!globalUsers[req.body.user].rooms.includes(req.params.room)) {
            globalUsers[req.body.user].rooms.push(req.params.room)
        }
    }

    rooms[req.params.room].users.push(req.body.user)
    globalUsers[req.body.user].current = req.params.room
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

// REMOVE USER AND ACCESS
server.delete('/:room/users', function (req, res) {
    //remove access
    var index = globalUsers[req.body.user].rooms.indexOf(req.params.room)
    if (index != -1) {
        globalUsers[req.body.user].rooms.splice(index, 1)
    }

    // remove from room
    var index = rooms[req.params.room].users.indexOf(req.body.user)
    if (index != -1) {
        rooms[req.params.room].users.splice(index, 1)
    }

    // send message to room that user has been kicked
    rooms[req.params.room].messageHistory.push({ user: "Global", text: `${req.body.user} has been kicked` })

    res.send()
})


// ########################## GAME STUFF ##################################

// READY UP
server.post("/:room/game/ready", function (req, res) {
    // Set first turn to first player to ready up
    if (rooms[req.params.room].players.length == 0) {
        rooms[req.params.room].turn.user = req.body.user
    }

    // Add player to game info
    rooms[req.params.room].players.push({ name: req.body.user, score: 0 })

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

                    room.winner = isWin(room.tiles)
                    if (room.winner == "X" || room.winner == "O") {
                        // set winner to last user
                        room.winner = room.turn.user
                        room.players[getArrayValueIndex(room.winner, room.players)].score++
                    }
                }

                // if game still isn't over after check
                if (room.winner == "none") {
                    // next turn
                    room.turn.turn++
                    room.turn.turn %= room.players.length
                    room.turn.user = room.players[room.turn.turn].name
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
            data.players = []
            data.started = false
            data.turn = { user: "", turn: 0 }
            data.winner = "none"

            data.roundWinner = ""
            data.drawings = ["boat", "horse", "dinosaur", "crying children"]
            data.lines = [];
            data.drawing = false

            break;

        case 'tictactoe':
            data.players = []
            data.started = false
            data.turn = { user: "", turn: 0 }
            data.winner = "none"
            data.maxPlayers = 2
            data.first = 0

            data.tiles = [
                "", "", "",
                "", "", "",
                "", "", "",
            ]


        default:
            break;
    }

    // SET UP ROOM WITH CORRECT DATA
    rooms[room] = data
}

function getArrayValueIndex(item, list) {
    var index = -1
    for (let i = 0; i < list.length; i++) {
        if (list[i].name == item) {
            index = i
            break;
        }
    }
    return index
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