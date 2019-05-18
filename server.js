'use strict';

// My modules
const toYMDFormat = require('./helpers.js').toYMDFormat;
const toDate = require('./helpers.js').toDate;

// Other modules
const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', { useNewUrlParser: true } )

const userSchema = new mongoose.Schema({
  username: String,
  log: [{description: String, duration: Number, date: Date}]
});
const User = mongoose.model('User', userSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Add User
app.post('/api/exercise/new-user', function(req, res) {
  // return User.findOneAndDelete({username: req.body.username}).then(() => res.json({deleted: 'yes'})).catch(err => res.send(err));
  const username = req.body.username;
  
  User.find({username: username})
    .then(docs => {
    // If I found docs with that username
    if (docs[0]) return res.send("Username already exists");
    // Else create new user
    const newUser = new User({
      username: username
    });
    newUser.save(function(err, doc) {
      if (err) return res.send("Failed to add new user.");
      res.json({_id: doc._id, username: doc.username})
    });
  }).catch(err => res.send(err));
});

// Get array of users
app.get('/api/exercise/users', function(req, res) {
  User.find({}).select('_id username').then(docs => res.json(docs));
});

// Add exercise
app.post('/api/exercise/add', function(req, res) {
  const userId = req.body.userId;
  const description = req.body.description;
  let duration = req.body.duration;
  let date = req.body.date;
  
  // Check if fields are filled
  if (!userId) return res.send("Missing required field (userId)");
  if (!description) return res.send("Missing required field (description)");
  if (!duration) return res.send("Missing required field (duration)");
  
  // Check if duration is valid
  if (!duration.match(/^[0-9]+$/)) return res.send("Please enter valid duration (Integer)");
  duration *= 1;
  
  // Check if date is valid
  if (!date) date = new Date();
  // Check if date format is correct
  else if (!(date = toDate(date))) return res.send('Invalid Date');
  
  User.findById(userId)
    .then(doc => {
    if (doc) {
      doc.log.push({description: description, duration: duration, date: date});
      doc.save(function(err, doc) {
        if (err) return res.send(err);
        
        res.json({username: doc.username, log: doc.log.map(e => ({description: e.description, duration: e.duration, date: e.date.toISOString().split("T")[0]}))});
      });
    }
    else res.send("User doesn't exist");
  }).catch(err => {
    // Catch cast error as if it is an invalid id. (cast error in this case is when the id *can't* be valid).
    if (err.name === "CastError") return res.send("User doesn't exist");
    res.send(err)
  });
});

// Get logs
app.get('/api/exercise/log', function(req, res) {
  if (!req.query.userId) return res.send("Please enter a userId");
  
  const query = User.findById(req.query.userId).select('-_id username log.description log.duration log.date');
  query.then(doc => {
    if (doc) {
      // Log should have been a seperate schema, but I didn't think of it and now I have to handle selecting and limiting on the server
      let from = req.query.from;
      if (from && (from = toDate(from))) doc.log = doc.log.filter(entry => entry.date >= from);
      let to = req.query.to;
      if (to && (to = toDate(to))) doc.log = doc.log.filter(entry => entry.date <= to);
      let limit = req.query.limit;
      if (limit && limit.match(/^[0-9]+$/)) {
        limit *= 1;
        doc.log = doc.log.slice(0, limit);
      }
      res.json({username: doc.username, count: doc.log.length, log: doc.log.map(e => ({description: e.description, duration: e.duration, date: e.date.toISOString().split("T")[0]}))});
    }
    else res.send("User doesn't exist");
  }).catch(err => {
    // Catch cast error as if it is an invalid id. (cast error in this case is when the id *can't* be valid).
    if (err.name === "CastError") return res.send("User doesn't exist");
    res.send(err)
  });
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
