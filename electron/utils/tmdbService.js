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

// Search for media (auto-detect if movie or TV show)
async function searchMedia(title, year = null) {
  try {
    if (!title) return null;

    let endpoint = `/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      title
    )}`;

    const response = await makeRequest(endpoint);

    if (response.results && response.results.length > 0) {
      // Filter to only movies and TV shows
      const mediaResults = response.results.filter(
        (item) => item.media_type === "movie" || item.media_type === "tv"
      );

      if (mediaResults.length === 0) return null;

      // If year provided, try to match
      if (year) {
        const yearNum = parseInt(year, 10);
        const matchedByYear = mediaResults.find((item) => {
          const itemYear =
            item.media_type === "movie"
              ? item.release_date?.substring(0, 4)
              : item.first_air_date?.substring(0, 4);
          return itemYear && parseInt(itemYear, 10) === yearNum;
        });

        if (matchedByYear) return matchedByYear;
      }

      // Return first result
      return mediaResults[0];
    }

    return null;
  } catch (err) {
    console.error("Error searching media on TMDB:", err);
    return null;
  }
}

// Search for TV show
async function searchTVShow(title, year = null) {
  try {
    if (!title) return null;

    let endpoint = `/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      title
    )}`;

    if (year) {
      endpoint += `&first_air_date_year=${year}`;
    }

    const response = await makeRequest(endpoint);

    if (response.results && response.results.length > 0) {
      return response.results[0];
    }

    return null;
  } catch (err) {
    console.error("Error searching TV show on TMDB:", err);
    return null;
  }
}

// Get TV show details
async function getTVShowDetails(tvShowId) {
  try {
    if (!tvShowId) return null;

    const detailsEndpoint = `/tv/${tvShowId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`;
    const details = await makeRequest(detailsEndpoint);

    let creator = null;
    if (details.created_by && details.created_by.length > 0) {
      creator = details.created_by[0].name;
    }

    let overview = null;
    const portugueseEndpoint = `/tv/${tvShowId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    const portugueseDetails = await makeRequest(portugueseEndpoint);
    overview = portugueseDetails.overview || null;

    if (!overview || overview.trim() === "") {
      overview = details.overview || null;
    }

    return {
      creator,
      overview,
      numberOfSeasons: details.number_of_seasons || 0,
      numberOfEpisodes: details.number_of_episodes || 0,
      status: details.status || null,
      firstAirDate: details.first_air_date || null,
      lastAirDate: details.last_air_date || null,
    };
  } catch (err) {
    console.error("Error getting TV show details from TMDB:", err);
    return null;
  }
}

// Get season details
async function getSeasonDetails(tvShowId, seasonNumber) {
  try {
    if (!tvShowId || seasonNumber === null) return null;

    const endpoint = `/tv/${tvShowId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    const details = await makeRequest(endpoint);

    return {
      seasonNumber: details.season_number,
      name: details.name,
      overview: details.overview,
      airDate: details.air_date,
      episodes:
        details.episodes?.map((ep) => ({
          episodeNumber: ep.episode_number,
          name: ep.name,
          overview: ep.overview,
          airDate: ep.air_date,
          runtime: ep.runtime,
          stillPath: ep.still_path,
        })) || [],
    };
  } catch (err) {
    console.error("Error getting season details from TMDB:", err);
    return null;
  }
}

// Get episode details
async function getEpisodeDetails(tvShowId, seasonNumber, episodeNumber) {
  try {
    if (!tvShowId || seasonNumber === null || episodeNumber === null)
      return null;

    const endpoint = `/tv/${tvShowId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    const details = await makeRequest(endpoint);

    return {
      episodeNumber: details.episode_number,
      name: details.name,
      overview: details.overview,
      airDate: details.air_date,
      runtime: details.runtime,
      stillPath: details.still_path,
    };
  } catch (err) {
    console.error("Error getting episode details from TMDB:", err);
    return null;
  }
}

// Get TV show metadata (main entry point)
async function getTVShowMetadata(title, year = null) {
  try {
    console.log("[TMDB Service] Searching for TV show:", title, year);
    const tvShow = await searchTVShow(title, year);

    if (!tvShow || !tvShow.id) {
      console.log("[TMDB Service] TV show not found");
      return {
        creator: null,
        overview: null,
        numberOfSeasons: 0,
        numberOfEpisodes: 0,
      };
    }

    console.log("[TMDB Service] TV show found, ID:", tvShow.id);
    const details = await getTVShowDetails(tvShow.id);

    if (!details) {
      console.log("[TMDB Service] Details not found");
      return {
        creator: null,
        overview: null,
        numberOfSeasons: 0,
        numberOfEpisodes: 0,
      };
    }

    console.log("[TMDB Service] Details retrieved successfully");
    return details;
  } catch (err) {
    console.error("[TMDB Service] Error getting TV show metadata:", err);
    return {
      creator: null,
      overview: null,
      numberOfSeasons: 0,
      numberOfEpisodes: 0,
    };
  }
}

// Get media metadata (auto-detect type)
async function getMediaMetadata(title, year = null, mediaType = null) {
  try {
    console.log("[TMDB Service] Searching for media:", title, year, mediaType);

    // If type is explicitly provided, use specific search
    if (mediaType === "movie") {
      return await getMovieMetadata(title, year);
    } else if (mediaType === "tvshow") {
      return await getTVShowMetadata(title, year);
    }

    // Otherwise, use multi-search to auto-detect
    const media = await searchMedia(title, year);

    if (!media) {
      console.log("[TMDB Service] Media not found, returning fallback");
      return { success: true, metadata: null, fallback: true };
    }

    console.log("[TMDB Service] Media found, type:", media.media_type);

    if (media.media_type === "movie") {
      const details = await getMovieDetails(media.id);
      return {
        success: true,
        metadata: details,
        type: "movie",
        fallback: false,
      };
    } else if (media.media_type === "tv") {
      const details = await getTVShowDetails(media.id);
      return {
        success: true,
        metadata: details,
        type: "tvshow",
        fallback: false,
      };
    }

    return { success: true, metadata: null, fallback: true };
  } catch (err) {
    console.error("[TMDB Service] Error getting media metadata:", err);
    return { success: false, metadata: null, fallback: true };
  }
}

module.exports = {
  searchMovie,
  getMovieDetails,
  getMovieMetadata,
  searchMedia,
  searchTVShow,
  getTVShowDetails,
  getSeasonDetails,
  getEpisodeDetails,
  getTVShowMetadata,
  getMediaMetadata,
};
