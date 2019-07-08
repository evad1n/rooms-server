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


var history = []
var position = {
    "x": 250,
    "y": 250
}

//normal functions :)
server.get("/messaging", function (req, res) {
    res.send({
        history: history,
        position: position
    })
});

server.post("/messaging", function (req, res) {
    history.push(req.body.message)
    res.send(history)
});

server.post("/game", function (req, res) {
    if(req.body.move == "left"){
        position.x -= 10
    } else {
        position.x += 10
    }
    res.send(position)
});

// server.delete("/posts/:id", function (req, res) {
//     postsModel.findByIdAndDelete(req.params.id).then(function () {
//         res.status(204)
//         res.send()
//     }).catch(function (error) {
//         res.status(400)
//         res.json({
//             msg: error.message
//         })
//     })
// })

// server.put('/posts/:id', function (req, res) {
//     postsModel.findByIdAndUpdate(req.params.id, req.body).then(function () {
//         res.status(204)
//         res.send()
//     }).catch(function (error) {
//         res.status(400)
//         res.json({
//             msg: error.message
//         })
//     })
// })

server.listen(port, function () {
    console.log("Listening on " + port);
})