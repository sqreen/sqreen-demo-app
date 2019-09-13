const sqreen = require("sqreen");
const db = require("./db");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const passportJWT = require("passport-jwt");
const ExtractJWT = passportJWT.ExtractJwt;
const JWTStrategy = passportJWT.Strategy;

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password"
    },
    function(email, password, done) {
      db.get(
        "SELECT * FROM users WHERE EMAIL = ? AND PASSWORD = ?",
        email,
        password,
        function(err, row) {
          if (!row) return done(null, false);
          console.log('LOGIN', row);
          return done(null, row);
        }
      );
    }
  )
);

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: "your_jwt_secret",
      passReqToCallback: true
    },
    function(req, jwtPayload, done) {
      db.get(
        "SELECT EMAIL, ID FROM users WHERE ID = ?",
        jwtPayload.ID,
        function(err, row) {
          if (!row) return done(null, false);
          sqreen.identify(req, { email: row.EMAIL });
          return done(null, row);
        }
      );
    }
  )
);

passport.serializeUser(function(user, done) {
  return done(null, user.ID);
});

passport.deserializeUser(function(id, done) {
  db.get("SELECT id, username FROM users WHERE id = ?", id, function(err, row) {
    if (!row) return done(null, false);
    return done(null, row);
  });
});

const optionalJWTAuth = (req, res, next) => {
  if (req.header("Authorization")) {
    passport.authenticate("jwt", { session: false })(req, res, next);
  } else {
    next();
  }
};

module.exports = { passport, optionalJWTAuth };
