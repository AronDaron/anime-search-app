export interface AniListResponse<T> {
  data: T;
}

export enum MediaSeason {
  WINTER = 'WINTER',
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
  FALL = 'FALL',
}

export interface AnimeMedia {
  id: number;
  title: {
    romaji: string;
    english: string | null;
  };
  coverImage: {
    extraLarge: string;
  };
  averageScore: number | null;
  seasonYear: number | null;
  episodes: number | null;
  description: string | null;
}

export interface PageData {
  Page: {
    pageInfo: {
      total: number;
      currentPage: number;
      lastPage: number;
      hasNextPage: boolean;
    };
    media: AnimeMedia[];
  };
}

const ANILIST_API_URL = '/graphql';

async function fetchAniList<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables
    })
  };

  try {
    const response = await fetch(ANILIST_API_URL, options);
    if (!response.ok) {
      throw new Error(`AniList API error: ${response.statusText}`);
    }
    const json = await response.json() as AniListResponse<T>;
    return json.data;
  } catch (error) {
    console.error('Error fetching AniList Data:', error);
    throw error;
  }
}

// Queries

const POPULAR_ANIME_QUERY = `
query ($page: Int, $perPage: Int) {
  Page (page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
    }
    media (type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
      }
      averageScore
      seasonYear
      episodes
      description
    }
  }
}
`;

const SEARCH_ANIME_QUERY = `
query ($page: Int, $perPage: Int, $search: String, $season: MediaSeason, $seasonYear: Int, $genre_in: [String], $tag_in: [String]) {
  Page (page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
    }
    media (type: ANIME, search: $search, season: $season, seasonYear: $seasonYear, genre_in: $genre_in, tag_in: $tag_in, sort: POPULARITY_DESC, isAdult: false) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
      }
      averageScore
      seasonYear
      episodes
      description
    }
  }
}
`;

export const getPopularAnime = async (page = 1, perPage = 20) => {
  return fetchAniList<PageData>(POPULAR_ANIME_QUERY, { page, perPage });
};

export const searchAnime = async (
  search?: string | null,
  page = 1,
  perPage = 20,
  season?: MediaSeason,
  seasonYear?: number,
  genres?: string[],
  tags?: string[]
) => {
  if (!search && !season && !seasonYear && (!genres || genres.length === 0) && (!tags || tags.length === 0)) {
    return { Page: { media: [], pageInfo: { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false } } };
  }

  const variables: Record<string, any> = { page, perPage };
  if (search) variables.search = search;
  if (season) variables.season = season;
  if (seasonYear) variables.seasonYear = seasonYear;
  if (genres && genres.length > 0) variables.genre_in = genres;
  if (tags && tags.length > 0) variables.tag_in = tags;

  return fetchAniList<PageData>(SEARCH_ANIME_QUERY, variables);
};

const SEARCH_BY_TITLE_EXACT_QUERY = `
query ($search: String) {
  Media (type: ANIME, search: $search, sort: POPULARITY_DESC, isAdult: false) {
    id
    title {
      romaji
      english
    }
    coverImage {
      extraLarge
    }
    averageScore
    seasonYear
    episodes
    description
  }
}
`;

export const getAnimeByExactTitle = async (title: string): Promise<AnimeMedia | null> => {
  try {
     const data = await fetchAniList<{ Media: AnimeMedia }>(SEARCH_BY_TITLE_EXACT_QUERY, { search: title });
     return data.Media;
  } catch (error) {
     console.warn(`Could not find exact match for title: ${title}`);
     return null;
  }
};

export interface JikanEpisode {
  mal_id: number;
  url: string;
  title: string;
  title_japanese: string;
  title_romanji: string;
  aired: string;
  score: number;
  filler: boolean;
  recap: boolean;
  forum_url: string;
}

export interface AnimeDetailsData {
  Media: {
    id: number;
    idMal: number | null;
    title: { romaji: string; english: string | null; };
    coverImage: { extraLarge: string; large: string; color: string | null; };
    bannerImage: string | null;
    description: string | null;
    episodes: number | null;
    duration: number | null;
    status: string;
    averageScore: number | null;
    meanScore: number | null;
    popularity: number | null;
    favourites: number | null;
    trending: number | null;
    rankings: {
      id: number;
      rank: number;
      type: string;
      context: string;
      allTime: boolean;
    }[];
    genres: string[];
    studios: { nodes: { name: string }[] };
    characters: {
      edges: {
        role: string;
        node: {
          id: number;
          name: { full: string };
          image: { large: string };
        };
        voiceActors: {
          id: number;
          name: { full: string };
          image: { large: string };
        }[];
      }[];
    };
    relations: {
      edges: {
        relationType: string;
        node: {
          id: number;
          title: { english: string | null; romaji: string };
          type: string;
          format: string;
          coverImage: { large: string };
        }
      }[]
    };
    externalLinks: {
      url: string;
      site: string;
      type: string;
      language: string | null;
    }[];
    streamingEpisodes: {
      title: string;
      thumbnail: string;
      url: string;
      site: string;
    }[];
    reviews: {
      edges: {
        node: {
          id: number;
          summary: string;
          body: string;
          rating: number;
          ratingAmount: number;
          score: number;
        }
      }[]
    };
  };
}

const ANIME_DETAILS_QUERY = `
query ($id: Int) {
  Media (id: $id, type: ANIME) {
    id
    idMal
    title {
      romaji
      english
    }
    coverImage {
      extraLarge
      large
      color
    }
    bannerImage
    description
    episodes
    duration
    status
    averageScore
    meanScore
    popularity
    favourites
    trending
    rankings {
      id
      rank
      type
      context
      allTime
    }
    genres
    studios(isMain: true) {
      nodes {
        name
      }
    }
    characters(sort: [ROLE, RELEVANCE, ID], perPage: 12) {
      edges {
        role
        node {
          id
          name {
            full
          }
          image {
            large
          }
        }
        voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) {
          id
          name {
            full
          }
          image {
            large
          }
        }
      }
    }
    relations {
      edges {
        relationType
        node {
          id
          title {
            english
            romaji
          }
          type
          format
          coverImage {
            large
          }
        }
      }
    }
    externalLinks {
      url
      site
      type
      language
    }
    streamingEpisodes {
      title
      thumbnail
      url
      site
    }
    reviews(sort: [RATING_DESC, SCORE_DESC], perPage: 15) {
      edges {
        node {
          id
          summary
          body
          rating
          ratingAmount
          score
        }
      }
    }
  }
}
`;

export const getAnimeDetails = async (id: number) => {
  return fetchAniList<AnimeDetailsData>(ANIME_DETAILS_QUERY, { id });
};

export const getAnimeEpisodesFromJikan = async (malId: number): Promise<JikanEpisode[]> => {
  let allEpisodes: JikanEpisode[] = [];
  let page = 1;
  let hasNextPage = true;

  try {
    while (hasNextPage) {
      const response = await fetch(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`);
      if (!response.ok) {
        console.warn(`Jikan API error for malId ${malId} on page ${page}: ${response.statusText}`);
        break; // Stop fetching on error
      }

      const json = await response.json();
      if (json.data && json.data.length > 0) {
        allEpisodes = allEpisodes.concat(json.data);
      }

      if (json.pagination && json.pagination.has_next_page) {
        page++;
        // Polite delay to avoid hitting Jikan API rate limits (3 requests / second)
        await new Promise(resolve => setTimeout(resolve, 350));
      } else {
        hasNextPage = false;
      }
    }
    return allEpisodes;
  } catch (error) {
    console.error(`Error fetching episodes from Jikan for malId ${malId}:`, error);
    return allEpisodes; // Return whatever we managed to fetch before crashing
  }
};
