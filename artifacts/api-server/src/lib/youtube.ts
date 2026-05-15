/**
 * YouTube Transcript API Integration
 * Documentation: https://transcriptapi.com
 */

const API_BASE = "https://transcriptapi.com";

export function extractVideoId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 1): Promise<Response> {
  const response = await fetch(url, options);
  if ((response.status === 408 || response.status === 503) && retries > 0) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return fetchWithRetry(url, options, retries - 1);
  }
  return response;
}

export async function fetchYouTubeTranscript(videoUrl: string, apiKey: string) {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube URL: Could not extract video ID");
  }

  const url = new URL(`${API_BASE}/api/v2/youtube/transcript`);
  url.searchParams.append("video_url", videoId);
  url.searchParams.append("format", "json");
  url.searchParams.append("include_timestamp", "false");
  url.searchParams.append("send_metadata", "true");

  const response = await fetchWithRetry(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Accept": "application/json",
    },
  });

  if (response.status === 404) {
    throw new Error("This video has no available transcript.");
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(errorBody.detail || `Failed to fetch transcript: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    transcript: string | Array<{ text: string }>;
    video_id: string;
    metadata?: {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
  };

  let transcriptText = "";
  if (Array.isArray(data.transcript)) {
    transcriptText = data.transcript.map((t) => t.text).join(" ");
  } else {
    transcriptText = data.transcript;
  }

  return {
    transcript: transcriptText,
    title: data.metadata?.title,
    videoId: data.video_id,
    author: data.metadata?.author_name,
    thumbnail: data.metadata?.thumbnail_url,
  };
}

export function isYouTubeUrl(url: string): boolean {
  const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return ytRegex.test(url);
}
