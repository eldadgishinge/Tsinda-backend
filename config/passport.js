const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const User = require("../models/User")

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "dummy",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy",
      callbackURL: "/api/auth/google/callback",
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id })

        if (user) {
          return done(null, user)
        }

        // Check if user exists with the same email
        const email = profile.emails[0].value
        user = await User.findOne({ email })

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id
          user.authMethod = "google"
          await user.save()
          return done(null, user)
        }

        // Create new user
        const phoneNumber = `g${profile.id.substring(0, 10)}` // Temporary phone number

        const newUser = new User({
          googleId: profile.id,
          email,
          phoneNumber,
          authMethod: "google",
          isVerified: true, // Google accounts are pre-verified
        })

        await newUser.save()
        done(null, newUser)
      } catch (error) {
        console.error("Google strategy error:", error)
        done(error, null)
      }
    },
  ),
)

module.exports = passport

