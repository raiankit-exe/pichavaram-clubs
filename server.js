require('dotenv').config(); // Load .env file first!

const express = require('express');
const session = require('express-session');
const passport = require('passport');
// We will configure the Google strategy in the next step
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path'); // Import path module
const mongoose = require('mongoose'); // Require mongoose

// --- Database Connection ---
mongoose.connect(process.env.MONGODB_URI, {
  // Remove deprecated options: useNewUrlParser and useUnifiedTopology
  // Mongoose 6+ handles these automatically
})
.then(() => console.log('MongoDB connected successfully.'))
.catch(err => console.error('MongoDB connection error:', err));

// --- User Schema and Model ---
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    displayName: String,
    email: String,
    image: String,
    // Add other fields you might want to store
});
const User = mongoose.model('User', userSchema);

const app = express();

// --- Session Configuration ---
app.use(session({
    secret: process.env.SESSION_SECRET, // Use secret from .env
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
    clientID: process.env.GOOGLE_CLIENT_ID,       // Use client ID from .env
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Use client secret from .env
    callbackURL: "/auth/google/callback",         // The callback route
    scope: [ 'profile', 'email' ]                 // Request profile and email
  },
  async (accessToken, refreshToken, profile, cb) => { // Make callback async
    // Verify callback: Check email domain AND find/create user in DB
    const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
    const allowedDomain1 = "@ds.study.iitm.ac.in";
    const allowedDomain2 = "@es.study.iitm.ac.in";

    console.log("Verifying email:", email);

    // 1. Check domain first
    if (!email || !(email.endsWith(allowedDomain1) || email.endsWith(allowedDomain2))) {
      console.log(`Email denied. Only ${allowedDomain1} or ${allowedDomain2} are allowed.`);
      return cb(null, false, { message: 'Access denied. Only specific email domains are allowed.' });
    }

    // 2. Domain allowed, find or create user in DB
    try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            // User found
            console.log("User found in DB:", user.displayName);
            return cb(null, user); // Pass DB user object
        } else {
            // User not found, create new user
            const newUser = new User({
                googleId: profile.id,
                displayName: profile.displayName,
                email: email, // Use the verified email
                image: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null
            });
            await newUser.save();
            console.log("New user created:", newUser.displayName);
            return cb(null, newUser); // Pass newly created DB user object
        }
    } catch (err) {
        console.error("Error during DB user find/create:", err);
        return cb(err, null); // Pass error to Passport
    }
  }
));

// --- User Serialization/Deserialization ---
// Stores user's MongoDB _id in the session
passport.serializeUser((user, done) => {
  done(null, user.id); // user.id is the shortcut for user._id from Mongoose
});

// Retrieves user info from the DB using the ID stored in the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user); // Attach the mongoose user object to req.user
    } catch (err) {
        done(err, null);
    }
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
