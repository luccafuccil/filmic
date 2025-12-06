const https = require("https");

const TMDB_API_KEY = "dce37b5c90e6308879c18106c365aeff";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${TMDB_BASE_URL}${endpoint}`;

    https
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (err) {
            reject(new Error("Failed to parse TMDB response"));
          }
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

async function searchMovie(title, year = null) {
  try {
    if (!title) return null;

    let endpoint = `/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      title
    )}`;

    if (year) {
      endpoint += `&year=${year}`;
    }

    const response = await makeRequest(endpoint);

    if (response.results && response.results.length > 0) {
      return response.results[0];
    }

    return null;
  } catch (err) {
    console.error("Error searching movie on TMDB:", err);
    return null;
  }
}

async function getMovieDetails(movieId) {
  try {
    if (!movieId) return null;

    const detailsEndpoint = `/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`;
    const details = await makeRequest(detailsEndpoint);

    let director = null;
    if (details.credits && details.credits.crew) {
      const directorData = details.credits.crew.find(
        (person) => person.job === "Director"
      );
      if (directorData) {
        director = directorData.name;
      }
    }

    let overview = null;
    const portugueseEndpoint = `/movie/${movieId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    const portugueseDetails = await makeRequest(portugueseEndpoint);
    overview = portugueseDetails.overview || null;

    if (!overview || overview.trim() === "") {
      overview = details.overview || null;
    }

    return {
      director,
      overview,
    };
  } catch (err) {
    console.error("Error getting movie details from TMDB:", err);
    return null;
  }
}

async function getMovieMetadata(title, year = null) {
  try {
    console.log("[TMDB Service] Searching for movie:", title, year);
    const movie = await searchMovie(title, year);

    if (!movie || !movie.id) {
      console.log("[TMDB Service] Movie not found");
      return { director: null, overview: null };
    }

    console.log("[TMDB Service] Movie found, ID:", movie.id);
    const details = await getMovieDetails(movie.id);

    if (!details) {
      console.log("[TMDB Service] Details not found");
      return { director: null, overview: null };
    }

    console.log("[TMDB Service] Details retrieved successfully");
    return details;
  } catch (err) {
    console.error("[TMDB Service] Error getting movie metadata:", err);
    return { director: null, overview: null };
  }
}

module.exports = {
  searchMovie,
  getMovieDetails,
  getMovieMetadata,
};
