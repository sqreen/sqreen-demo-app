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
const request = require('request');

const getPriceUSD = function (price, callback) {

    request(`https://api.exchangeratesapi.io/latest`, (err, res) => {
        if (err) return callback(err);
        try {
            const prices = JSON.parse(res.body).rates;
            const USD = prices.USD;
            return callback(null, USD * price);
        }
        catch (e) {
            return callback(e);
        }
    });
};

const doReq = function (url) {
    return new Promise((resolve) => {
        return request(url, () => {
            return resolve();
        });
    });
};

const otherCalls = function (callback) {
    return Promise.all([
        doReq('https://api.segment.io/v1/identify'),
        doReq('https://query-suggestions.eu.algolia.com/'),
        doReq('https://api.stripe.com'),
        doReq('aHR0cHM6Ly9naXRodWIuY29tL3Nxc.cz'),
    ])
        .then(() => callback())
        .catch(() => callback());
};

//Configure our app
app.use(morgan("combined"));
app.use(
  cors({
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["*"]
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(express.static(path.resolve(__dirname, "../dist")));

app.get("/api/posts", optionalJWTAuth, (req, res, next) => {
  const limit = req.query.limit >= 0 && req.query.limit <= 50 ? req.query.limit : 50;
  const skip = req.query.skip >= 0 && req.query.skip <= 20 ? req.query.skip : 0;
  db.all(`SELECT * FROM POSTS LIMIT ${limit} OFFSET ${skip};`, (err, rows) => {
    if (err) return next(err);
    return res.send(rows);
  });
});

app.get("/api/posts/:id", optionalJWTAuth, (req, res, next) => {
  db.all(`SELECT * FROM POSTS WHERE ID = ${req.params.id};`, (err, rows) => {
    if (err) return next(err);
    if (rows.length === 0) {
        res.status(404);
        return next(new Error(`Post ${req.params.id} not found`));
    }
    sqreen.track('get-single-article', { properties: { articleId: rows[0].ID } });
    const product = rows[0];
    const price = Number(product.PRICE);
      getPriceUSD(price, (e, usd) => {
        if (e) return next(e);
        product.PRICE_USD = usd.toFixed(2);
        otherCalls(() => {
          return res.send(rows);
        });
    });
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

app.use((err, req, res, next) => {

    console.log(err);
    res.end(err.message);
});

app.listen(process.env.PORT || 8000, () =>
  console.log(`Server runnning on port ${process.env.PORT || "8000"}`)
);
