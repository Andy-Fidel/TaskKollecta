const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/users/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // If they exist but don't have a googleId, link it
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // If new user, create them
        // We use their Google photo as avatar
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          avatar: profile.photos[0].value,
        });

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackURL: "/api/users/microsoft/callback",
      scope: ['user.read'],
      tenant: 'common', // Use 'common' for both personal and work/school accounts
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Microsoft profile.emails might be empty if the user doesn't have a mailbox
        // Use userPrincipalName if no email is found
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : profile.userPrincipalName;

        if (!email) {
          return done(new Error('No email found in Microsoft profile'), null);
        }

        // Check if user already exists
        let user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
          // If they exist but don't have a microsoftId, link it
          if (!user.microsoftId) {
            user.microsoftId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // If new user, create them
        user = await User.create({
          name: profile.displayName,
          email: email.toLowerCase(),
          microsoftId: profile.id,
          avatar: "", // Microsoft Profile Photo API is more complex to fetch in one go
        });

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

// Serialize/Deserialize (Required for sessions, though we use JWT mostly)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => done(err, user));
});