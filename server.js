// imports
const express = require("express");
const cors = require("cors")

// Setup Server
var server = express();
var port = process.env.PORT || 3000;

// Middleware
server.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", req.get("origin"));
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});
server.options("*", function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Content-type");
    next();
});

server.use(cors())

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
    //GLOBAL
    users: [],
    messageHistory: [],

    //SINGULARITY
    players: [
        {
            username: "hi",
            position: { x: 0, y: 0, z: 0 }
        }
    ],
    galaxies: [
        {
            name: "",
            type: "",
            position: { x: 0, y: 0, z: 0 },
            extent: null,
            asteroids: [],
            systems: [],
            nebulas: [],
            location_total: 0,
        }
    ],
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
        console.log(user + " logged off")
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
        rooms[req.body.room].messageHistory.push({ user: "Global", text: `${req.body.from} invited ${req.params.user}` })
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

// START GAME TURN
server.post("/:room/game/turn", function (req, res) {
    rooms[req.params.room].drawing = true
    rooms[req.params.room].startTime = new Date()

    setTimeout(() => {
        rooms[req.params.room].drawing = false
        rooms[req.params.room].lines = []

        // next turn
        console.log(rooms[req.params.room].turn)
        rooms[req.params.room].turn.turn++
        rooms[req.params.room].turn.turn %= rooms[req.params.room].players.length
        rooms[req.params.room].turn.user = rooms[req.params.room].players[rooms[req.params.room].turn.turn].name
        console.log(rooms[req.params.room].turn)
    }, 30000);
    res.send()
})

// SEND GAME INFO
server.post("/:room/game", function (req, res) {
    // GET ROOM TYPE
    var roomType = getRoomType(req.params.room)

    // SPECIFIC GAME TYPE DATA
    switch (roomType) {
        case 'pictionary':
            // SET DATA
            rooms[req.params.room].lines = req.body.lines

            // pictionary specific logic
            if (rooms[req.params.room].started) {
                if (rooms[req.params.room].drawing) {

                } else if (rooms[req.params.room].roundWinner == '') {
                    // CHECK FOR GAME WINNER

                    // if game still isn't over after check
                    if (rooms[req.params.room].winner == "none") {

                    }
                }
            }
            break;

        case 'tictactoe':
            // SET DATA
            rooms[req.params.room] = req.body.data

            if (rooms[req.params.room].started) {
                // check for winner
                if (rooms[req.params.room].winner == "none") {

                    rooms[req.params.room].winner = isWin(rooms[req.params.room].tiles)
                    if (rooms[req.params.room].winner == "X" || rooms[req.params.room].winner == "O") {
                        // set winner to last user
                        rooms[req.params.room].winner = rooms[req.params.room].turn.user
                        rooms[req.params.room].players[getArrayValueIndex(rooms[req.params.room].winner, rooms[req.params.room].players)].score++
                    }
                }

                // if game still isn't over after check
                if (rooms[req.params.room].winner == "none") {
                    // next turn
                    rooms[req.params.room].turn.turn++
                    rooms[req.params.room].turn.turn %= rooms[req.params.room].players.length
                    rooms[req.params.room].turn.user = rooms[req.params.room].players[rooms[req.params.room].turn.turn].name
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
            data.startTime = new Date()

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


//SINGULARITY

server.post("/:room/update", function (req, res) {
    rooms[req.params.room].players.push(req.body);
    res.send();
});

server.get("/:room/visible/:username", function (req, res) {
    var response = compileObjectsInRadius();
    res.send({ data: response })
});

var findDistance = function (main, other) {
    var dx = main.position.x - other.position.x;
    var dy = main.position.y - other.position.y;
    var dz = main.position.z - other.position.z;
    var distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return distance;
};

//GAME CREATION FUNCTIONS
var generateAsteroids = function (location) {
    location.asteroids = [];
    for (var i = 0; i < location.amount / 3; i++) {
        var radius = Math.floor(Math.sqrt(location.amount));
        var amount = Math.floor(location.amount / (location.amount / 3) * (Math.random() * 2)) + 1;

        var position = {
            x: location.position.x + ((Math.random() * radius) - (Math.random() * radius)),
            y: location.position.y + ((Math.random() * radius) - (Math.random() * radius)),
            z: location.position.z + ((Math.random() * radius) - (Math.random() * radius))
        };

        var asteroid = {
            amount: amount,
            position: position,
            alive: true
        };
        location.asteroids.push(asteroid);
    }
}

var generateLocation = function (galaxy) {
    //RANDOMLY GET TYPE OF STELLAR BODY
    var typeNum = Math.floor(Math.random() * 10);
    if (typeNum < 7) {
        type = "asteroid field";
    } else if (typeNum == 7) {
        type = "nebula";
    } else if (typeNum >= 8) {
        type = "system"
    }

    //RANDOMLY GET AMOUNT OF MASS
    var amount = Math.floor(Math.random() * 1000);

    //RANDOMLY GET LOCATION OF STELLAR BODY
    var locationPosition = {
        x: Math.floor((Math.random() * galaxy.extent) - (Math.random() * galaxy.extent)),
        y: Math.floor((Math.random() * galaxy.extent) - (Math.random() * galaxy.extent)),
        z: Math.floor((Math.random() * galaxy.extent) - (Math.random() * galaxy.extent))
    };

    var location = {
        name: "",
        type: type,
        amount: amount,
        position: locationPosition
    };

    return location;
}

var generateLocations = function (number_of_locations, galaxy) {
    var new_locations = 0;
    while (new_locations < number_of_locations) {
        for (var l = 0; l < number_of_locations; l++) {
            var pass_location = 0;
            var new_location = generateLocation(galaxy);
            while (pass_location != galaxy.location_total) {
                galaxy.locations.forEach(function (location) {
                    var distance = findDistance(new_location, location);
                    if (distance > (new_location.amount / 3) * 1.1) {
                        pass_location += 1;
                    } else {
                        console.log('mission-failure');
                    }
                })
            }
            if (new_location.type == "asteroid field") {
                generateAsteroids(new_location);
                galaxy.asteroids.push(new_location);
            } else if (new_location.type == "system") {
                //generateSystem(new_location);
                galaxy.systems.push(new_location);
            } else if (new_location.type == "nebula") {
                //generateNebula(new_location);
                galaxy.nebulas.push(new_location);
            }
            new_locations += 1;
        }
    }
}

var generateGalaxy = function (galaxy) {
    var typeNum = Math.floor(Math.random() * 3);
    var galaxy_extent = 100000;
    if (typeNum == 0) {
        galaxy.type = "Generation A";
    } else if (typeNum == 1) {
        galaxy.type = "Generation B";
    } else if (typeNum == 2) {
        galaxy.type = "Generation C";
    }
    galaxy.extent = galaxy_extent;
    galaxy.name = galaxy.type + " - Category " + Math.floor(Math.sqrt(galaxy.extent));
    generateLocations(galaxy.extent / Math.cbrt(galaxy.extent), galaxy);
}

//PERFORMANCE FUNCTIONS
var findObjectsInRadius = function (main, objects) {
    var nearObjects = [];
    objects.forEach(function (object) {
        if (object.username != main.username) {
            var userDistance = findDistance(main, object);
        }
        if (userDistance <= 5000) {
            nearObjects.push(object);

        }

    })
    console.log(nearObjects)
    return nearObjects;
}

var compileObjectsInRadius = function (player) {
    if (rooms['singularity'].players.length > 1) {
        var players = findObjectsInRadius(player, rooms['singularity'].players);
    }
    var asteroids = null;
    //var systems = null;
    //var nebulas = null;
    if (player.amount < 1000) {
        asteroids = findObjectsInRadius(player, rooms['singularity'].galaxies[0].asteroids);
    }
    /*if (player.amount < 5000) {
        nebula = findObjectsInRadius(player, rooms['singularity'].galaxies.nebulas);
    }
    if (player.amount < 10000) {
        systems = findObjectsInRadius(player, rooms['singularity'].galaxies.systems);
    }*/
    return { players: players, asteroids: asteroids, /*systems: systems, nebulas: nebulas*/ };
}


//GENERATES SINGULARITY GALAXY ON SERVER START
generateGalaxy(rooms["singularity"].galaxies[0]);

server.post("/singularity/update", function (req, res) {
    rooms['singularity'].players.forEach(function (player) {
        if (player.username == req.body.username) {
            player = req.body;
        } else {
            rooms['singularity'].players.push(req.body);
        }
    })
    res.send();
});

server.get("/singularity/visible/:username", function (req, res) {
    var aplayer = null;
    rooms["singularity"].players.forEach(function (player) {
        if (req.params.username == player.username) {
            aplayer = player;
        }
    })
    var response = compileObjectsInRadius(aplayer);
    res.send(response);
});
