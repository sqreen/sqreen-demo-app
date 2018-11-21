const sqreen = require("sqreen");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { passport, optionalJWTAuth } = require("./config/auth");
const db = require("./config/db");
var morgan = require("morgan");
var path = require("path");
//Initiate our app
const app = express();
const jwt = require("jsonwebtoken");

//Configure our app
app.use(morgan("combined"));
app.use(
  cors({
    allowedHeaders: ["*"],
    exposedHeaders: ["*"]
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(express.static(path.resolve(__dirname, "../dist")));

app.get("/api/posts", optionalJWTAuth, (req, res) => {
  const limit =
    req.query.limit >= 0 && req.query.limit <= 50 ? req.query.limit : 50;
  const skip = req.query.skip >= 0 && req.query.skip <= 20 ? req.query.skip : 0;
  db.all(`SELECT * FROM POSTS LIMIT ${limit} OFFSET ${skip};`, function(
    err,
    row
  ) {
    res.send(row);
  });
});

app.get("/api/posts/:id", optionalJWTAuth, (req, res) => {
  db.all(`SELECT * FROM POSTS WHERE ID = ${req.params.id};`, function(
    err,
    row
  ) {
    sqreen.track("get-single-article", {
      properties: { articleId: req.params.id }
    });
    res.send(row);
  });
});

app.get("/WWW/", (req, res) => {
  res.send(true);
});
app.get("/cankao/admin/", (req, res) => {
  res.send(true);
});

app.post("/api/ping", (req, res) => {
  res.send({ status: true });
});

app.post(
  "/api/login",
  passport.authenticate("local", { session: false }),
  (req, res) => {
    const token = jwt.sign(req.user, "your_jwt_secret");
    res.send({ token });
  }
);

app.get(
  "/api/user/me",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.send(req.user);
  }
);

app.get(["/", "/post/*", "/login"], function(request, response) {
  response.sendFile(path.resolve(__dirname, "../dist/index.html"));
});

app.listen(process.env.PORT || 8000, () =>
  console.log("Server running on http://localhost:8000/")
);
