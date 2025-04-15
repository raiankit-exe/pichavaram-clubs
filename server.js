require('dotenv').config(); // Load .env file first!

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');

const app = express();

// --- Session Configuration ---
app.use(session({
    secret: process.env.SESSION_SECRET, // Reads from environment variable
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (Vercel runs HTTPS)
        httpOnly: true, // Helps prevent XSS attacks
        maxAge: 1000 * 60 * 60 * 24 // Example: Cookie valid for 1 day
     } 
}));

// --- Passport Initialization ---
app.use(passport.initialize());
app.use(passport.session());

// --- Google OAuth 2.0 Strategy Configuration ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    scope: [ 'profile', 'email' ]
  },
  (accessToken, refreshToken, profile, cb) => { // Revert callback (no async, no DB logic)
    // Verify callback: Check if the user's email is allowed
    const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
    const allowedDomain1 = "@ds.study.iitm.ac.in";
    const allowedDomain2 = "@es.study.iitm.ac.in";

    console.log("Verifying email:", email);

    // Check if the email ends with either of the allowed domains
    if (email && (email.endsWith(allowedDomain1) || email.endsWith(allowedDomain2))) {
      // Email domain is allowed, proceed with login
      console.log("Email allowed.");
      return cb(null, profile); // Pass the original Google profile
    } else {
      // Email domain is not allowed
      console.log(`Email denied. Only ${allowedDomain1} or ${allowedDomain2} are allowed.`);
      return cb(null, false, { message: 'Access denied. Only specific email domains are allowed.' });
    }
  }
));

// --- User Serialization/Deserialization ---
// Stores user info (just the Google profile for now) in the session
passport.serializeUser((user, done) => {
  done(null, user); // Store the whole profile object
});

// Retrieves user info from the session
passport.deserializeUser((obj, done) => {
  // obj is the Google profile stored in the session
  done(null, obj); // Attach profile object to req.user
});

// --- Static Files ---
// Serve frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---

// Explicitly handle the root route ('/')
app.get('/', (req, res) => {
  // Check if user is already authenticated
  if (req.isAuthenticated()) {
    // If logged in, maybe redirect to home.html?
    res.redirect('/home.html'); 
  } else {
    // If not logged in, send the login page (index.html)
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// Initiates the Google OAuth flow
app.get('/auth/google', passport.authenticate('google')); // Use passport.authenticate

// Google OAuth Callback Route
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }), // Handle failure: redirect to login
  function(req, res) {
    // Successful authentication, redirect to a logged-in page.
    console.log("Authentication successful, redirecting...");
    res.redirect('/home.html'); // Redirect to home.html on success
  }
);

// Simple route to check login status (for testing) - COMMENTED OUT FOR DEBUGGING
/*
app.get('/profile', (req, res) => {
    if (req.isAuthenticated()) {
        // req.user now contains the Google profile passed from the verify callback
        res.send(`<h1>Hello, ${req.user.displayName}</h1>
                  <p>Email: ${req.user.emails ? req.user.emails[0].value : 'N/A'}</p>
                  <img src="${req.user.photos ? req.user.photos[0].value : ''}" alt="Profile Picture">
                  <br>
                  <a href="/logout">Logout</a>
                  <hr>
                  <pre>${JSON.stringify(req.user, null, 2)}</pre>`);
    } else {
        res.redirect('/');
    }
});
*/

// Simple logout route
app.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.session.destroy(() => {
            res.redirect('/');
        });
    });
});

// --- Server Start --- // (Keep existing uncommented listen block for Render)
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

// --- Export the Express app for Vercel --- // Remove this line
// module.exports = app; 
