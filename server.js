// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// ===== MongoDB connection =====
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};
connectDB();

// ====== MODELS ======
// User Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.methods.matchPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);

// Movie Model
const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  year: { type: Number },
  genre: { type: String },
  description: { type: String },
  director: { type: String },
  rating: { type: Number, default: 0 }
}, { timestamps: true });

const Movie = mongoose.model("Movie", movieSchema);

// ====== MIDDLEWARE ======
const auth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (err) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) next();
  else res.status(403).json({ message: "Admin only" });
};

// ====== ROUTES ======

// Register
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, isAdmin } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).json({ message: "User already exists" });

  const user = await User.create({
    name,
    email,
    password,
    isAdmin: isAdmin === true
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    token
  });
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (user && (await user.matchPassword(password))) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token
    });
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
});

// ===== Auto-create default admin =====
const createDefaultAdmin = async () => {
  const adminEmail = "admin@example.com";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    // password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123", salt);

    const admin = await User.create({
      name: "Admin",
      email: adminEmail,
      password: hashedPassword,
      isAdmin: true
    });
    console.log("Default admin created:", adminEmail, "Password: admin123");
  } else {
    console.log("Default admin already exists");
  }
};
createDefaultAdmin();

// ===== Movie Routes =====

// Get all movies
app.get("/api/movies", async (req, res) => {
  const movies = await Movie.find();
  res.json(movies);
});

// Get single movie
app.get("/api/movies/:id", async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) return res.status(404).json({ message: "Movie not found" });
  res.json(movie);
});

// Create movie (Admin)
app.post("/api/movies", auth, admin, async (req, res) => {
  const movie = new Movie(req.body);
  await movie.save();
  res.status(201).json(movie);
});

// Update movie (Admin)
app.put("/api/movies/:id", auth, admin, async (req, res) => {
  const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(movie);
});

// Delete movie (Admin)
app.delete("/api/movies/:id", auth, admin, async (req, res) => {
  await Movie.findByIdAndDelete(req.params.id);
  res.json({ message: "Movie deleted" });
});

// ====== START SERVER ======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
