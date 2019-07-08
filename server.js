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

//normal functions :)
server.get("/messaging", function (req, res) {
    res.send({
        history: history
    })
});

server.post("/messaging", function (req, res) {
    var body = {
        message: req.body.message
    }
    history.push(req.body.message)
    res.send(history)
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