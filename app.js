require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(session({
    secret: 'This Is Our Little Secret',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect('mongodb+srv://mahmoudhshukri:2873MhMA@cluster0.0puzrca.mongodb.net/userDB',{useNewUrlParser: true});
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    secret: String
});
// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password']});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model('User', userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
        cb(null, { id: user.id, username: user.username });
    });
});

    passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, user);
    });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://secrets-node.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get('/', function(req, res){
    res.render('home');
});
app.get('/auth/google',
    passport.authenticate('google', { scope: ["profile"] })
);
app.get('/auth/google/secrets', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
});
app.get('/secrets', function(req, res){
    User.find({"secret": {$ne: null}}, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                res.render('secrets', {usersWithSecrets: foundUser});
            }
        }
    });
});
app.get('/login', function(req, res){
    res.render('login');
});
app.post('/login', function(req, res){
    // const userEmail = req.body.email;
    // // const userPassword = md5(req.body.password);
    // const userPassword = req.body.password;
    // User.findOne({email : userEmail}, function(err, foundUser){
    //     if(err){
    //         console.log(err);
    //     }else{
    //         if(foundUser){
    //             bcrypt.compare(userPassword, foundUser.password, function(err, result) {
    //                 if(result === true){
    //                     res.render('secrets');
    //                 };
    //             });
    //         };
    //     };
    // });
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            // passport.authenticate("local")(req, res, function(){
            //     res.redirect('/secrets');
            // });
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        };
    });
});

app.get('/register', function(req, res){
    res.render('register');
});
app.post('/register', function(req, res){
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     const newUser = new User({
    //         email : req.body.email,
    //         password: hash
    //         // password: md5(req.body.password)
    //     });
    //     newUser.save(function(err){
    //         if(err){
    //             console.log(err);
    //         }else{
    //             res.render('secrets')
    //         };
    //     });
    // });
    User.register({username : req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect('/register');
        }else{
            // passport.authenticate("local")(req, res, function(){
            //     res.redirect('/secrets');
            // });
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        };
    });
});
app.get('/submit', function(req, res){
    if(req.isAuthenticated()){
        res.render('submit');
    }else{
        res.redirect('/login');
    };
});
app.post('/submit', function(req, res){
    const submittedSecret = req.body.secret;
    User.findById(req.user.id, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect('/secrets');
                });
            };
        };
    });
});
app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });
let port = process.env.PORT;
if(port == null || port ==""){
    port = 3000;
}
app.listen(port ||3000 , function(){
    console.log('Server run on port 3000');
});