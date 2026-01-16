const Movie = require("../models/movie");

// Get all movies
const getAllMovies = async (req, res) => {
  const movies = await Movie.find();
  res.json(movies);
};

// Get single movie
const getMovieById = async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if(!movie) return res.status(404).json({ message: "Movie not found" });
  res.json(movie);
};

// Create movie (Admin)
const createMovie = async (req, res) => {
  const movie = new Movie(req.body);
  await movie.save();
  res.status(201).json(movie);
};

// Update movie (Admin)
const updateMovie = async (req, res) => {
  const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(movie);
};

// Delete movie (Admin)
const deleteMovie = async (req, res) => {
  await Movie.findByIdAndDelete(req.params.id);
  res.json({ message: "Movie deleted" });
};

module.exports = { getAllMovies, getMovieById, createMovie, updateMovie, deleteMovie };
