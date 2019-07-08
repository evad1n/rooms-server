// imports
const express = require("express");
const expressSession = require('express-session') //npm install express-session
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs") //npm install bcryptjs
const passport = require("passport") //npm install passport
const LocalStrategy = require('passport-local').Strategy //npm install passport-local

//Models
var postsModel = require("./models/schema.js");
var userModel = require("./models/user.js")

//Routes
var userRouter = require('./routes/user.js')
server.use('/users', userRouter)

// Setup Server
var server = express();
var port = process.env.PORT || 3000;

// Middleware
//server.use(cors());
server.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", req.get("origin"))
    res.header("Access-Control-Allow-Credentials", "true")
    next()
})
server.options("*", function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "Content-type")
    next()
})
server.use(express.json());
server.use(express.urlencoded({ extended: false }));
mongoose.set('useFindAndModify', false);

//Passport Middleware
server.use(expressSession({
    secret: "Evadin",
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 3600000 
    }
}))
server.use(passport.initialize())
server.use(passport.session())
passport.serializeUser(function(user, callback) {
    callback(null, user.id)
})
passport.deserializeUser(function(id, callback) {
    userModel.findById(id, function(error, user) {
        callback(error, user)
    })
})
passport.use(new LocalStrategy(
    function(username, password, done) {
        userModel.findOne({
            username: username
        }, function(error, user) {
            if (error) {
                return done(error)
            }
            if (!user) {
                return done(null, false)
            }
            bcrypt.compare(password, user.password, function(error, isMatch) {
                if (isMatch) {
                    return done(null, user)
                } else {
                    return done(null, false)
                }
            })
        })
    }
))

//pass as parameter for restriction to logged in users only
var ensureAuthentication = function(req, res, next) {
    if (req.isAuthenticated()) {
        next()
    } else {
        res.status(403) //forbidden
        res.json({msg: "Please log in first"})
    }
}


//normal functions :)
server.get("/posts", function (req, res) {
    postsModel.find().then(function (posts) {
        var response = {
            posts: posts
        }
        res.json(response)
    }).catch(function (error) {
        res.status(400)
        res.json({
            msg: error.message
        })
    })
});

server.post("/posts", ensureAuthentication, function (req, res) {
    postsModel.create({
        title: req.body.title,
        author: req.body.author,
        category: req.body.category,
        image: req.body.image,
        text: req.body.text
    }).then(function (new_post) {
        res.status(201)
        res.json(new_post)
    }).catch(function (error) {
        res.status(400)
        res.json({
            msg: error.message
        })
    })
});

server.delete("/posts/:id", ensureAuthentication, function (req, res) {
    postsModel.findByIdAndDelete(req.params.id).then(function () {
        res.status(204)
        res.send()
    }).catch(function (error) {
        res.status(400)
        res.json({
            msg: error.message
        })
    })
})

server.put('/posts/:id', ensureAuthentication, function (req, res) {
    postsModel.findByIdAndUpdate(req.params.id, req.body).then(function () {
        res.status(204)
        res.send()
    }).catch(function (error) {
        res.status(400)
        res.json({
            msg: error.message
        })
    })
})

mongoose.connect('mongodb+srv://tfl:tfl@mongoloid-qomqb.mongodb.net/test?retryWrites=true&w=majority', {
    useNewUrlParser: true
}).then(function () {
    server.listen(port, function () {
        console.log("Listening on " + port);
    })
}).catch(function (error) {
    console.log("\n\n\n\n\n\n" + error.message + "\n\n\n\n\n\n");
})