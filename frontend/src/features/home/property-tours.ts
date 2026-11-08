/** The six unique RC Premier YouTube Shorts shown on the homepage. */
export const TOUR_VIDEO_IDS = [
  "w0WveEZTyU8",
  "bZPY9DClb1o",
  "3_2NkdTCOVc",
  "YwIJ2P0v8Rk",
  "nUiZQtk351k",
  "BC1mvUMuMKY",
] as const;

export interface TourVideo {
  id: string;
  /** Real YouTube title and channel; absent when oEmbed could not be reached. */
  title?: string;
  channel?: string;
}

interface OembedResponse {
  title?: string;
  author_name?: string;
}

async function fetchTourVideo(id: string): Promise<TourVideo> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(3_000) },
    );
    if (!response.ok) return { id };
    const data = (await response.json()) as OembedResponse;
    return {
      id,
      title: data.title?.replace(/\s+/g, " ").trim() || undefined,
      channel: data.author_name?.trim() || undefined,
    };
  } catch {
    // Titles are decoration; a failed lookup leaves the poster without one rather than inventing it.
    return { id };
  }
}

/** Titles come from YouTube's key-less oEmbed endpoint on the server, cached for a day. */
export function loadTourVideos(): Promise<TourVideo[]> {
  return Promise.all(TOUR_VIDEO_IDS.map(fetchTourVideo));
}
