const express = require('express');
const bodyParser= require('body-parser')
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const ejs = require('ejs');

const app = express();

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());
app.set('view engine', ejs);

const MongoClient = require('mongodb').MongoClient
const ObjectId = require("mongodb").ObjectId;

const mongoDbConnectionString = 'mongodb+srv://davideperrotta:davideperrotta@cluster0.cc2yi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';

MongoClient.connect(mongoDbConnectionString, {
  useUnifiedTopology: true
}).then(client => {

  console.log('Connected to Database');
  const db = client.db('project')
  const quotesCollection = db.collection('quotes')
  const usersCollection = db.collection('users');

  const authorization = (req, res, next) => {
    const token = req.cookies.access_token;
    if (!token) {
      res.redirect('/');
      return res.sendStatus(403);
    }
    try {
      const data = jwt.verify(token, "YOUR_SECRET_KEY");
      req.userId = data.id;
      req.userRole = data.role;
      return next();
    } catch {
      res.redirect('/');
      return res.sendStatus(403);
    }
  };

  app.get('/getquotes', (req, res) => {
    const results = quotesCollection.find().toArray()
    .then(results => {
      return res.json(results);
    })
  })

  app.post('/quotes', (req, res) => {
    quotesCollection.insertOne(req.body)
      .then(result => {
        res.redirect('/protected');
      })
      .catch(error => console.error(error))
  })

  app.post('/deletePost', authorization, (req, res) => {
    quotesCollection.deleteOne({_id: ObjectId(req.body.id)})
    .then(result => {
      res.send(result);
    })
  })

  app.post("/access", (req, res) => {
    usersCollection.findOne({"username": req.body.username, "password": req.body.password})
    .then(results => {
      if (results) {
        const token = jwt.sign({ id: 1, role: "developer", username: req.body.username }, "YOUR_SECRET_KEY");
        //return res
        res.cookie("access_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        })
        .status(200)
        res.redirect('/protected');
      } else {
        res.redirect('/login');
      }
    })
  });
  
  app.get("/protected", authorization, (req, res) => {
    const token = req.cookies.access_token;
    const data = jwt.verify(token, "YOUR_SECRET_KEY");
    const username = data.username;
    res.render(__dirname + '/views/addQuotes.ejs', {token, username});
    //return res.json({ user: { id: req.userId, role: req.userRole } });
  });
  
  app.get("/logout", authorization, (req, res) => {
    res
      .clearCookie("access_token")
      .status(200)
      res.redirect('/');
  });

})
.catch(
  error => console.error(error)
);

app.listen(3000, function() {
  console.log('listening on 3000!')
})

app.get('/', (req, res) => {
  const token = req.cookies.access_token;
  res.render(__dirname + '/views/index.ejs', {token});
})

app.get('/login', (req, res) => {
  const token = req.cookies.access_token;
  res.render(__dirname + '/views/login.ejs', {token});
})

