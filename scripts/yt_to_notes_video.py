import os
import json
import asyncio
import httpx
import re
from typing import List, Dict, Optional
from moviepy import TextClip, CompositeVideoClip, ColorClip, concatenate_videoclips
import moviepy.video.fx as fx

# --- CONFIGURATION ---
TRANSCRIPT_API_KEY = "sk_CCYHkysmQZElFLs3lHs9dUUtDofuyn5qzaVk4nZk2o4"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "your_openrouter_key")
OUTPUT_DIR = "output_videos"
CACHE_DIR = "cache_transcripts"

# Video Settings
VIDEO_SIZE = (1080, 1920)  # TikTok/Reels Portrait
FPS = 24
BG_COLOR = "#0f0f0f"
TITLE_COLOR = "#00ffff"  # Cyan
TEXT_COLOR = "#ffffff"   # White
FONT = "Arial-Bold"      # Fallback to a common system font
POINT_DURATION = 3       # Seconds per point

# --- API CLIENTS ---

class YouTubeTranscriptClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://transcriptapi.com/api/v2/youtube/transcript"

    async def get_transcript(self, video_url: str) -> str:
        """Fetches transcript from transcriptapi.com"""
        async with httpx.AsyncClient() as client:
            params = {
                "video_url": video_url,
                "format": "text",
                "include_timestamp": "false"
            }
            headers = {"Authorization": f"Bearer {self.api_key}"}
            
            response = await client.get(self.base_url, params=params, headers=headers)
            if response.status_code != 200:
                print(f"Error fetching transcript: {response.text}")
                response.raise_for_status()
            
            data = response.json()
            # The API returns the transcript in a 'transcript' field for text format
            return data.get("transcript", "")

class AIProcessor:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.url = "https://openrouter.ai/api/v1/chat/completions"

    async def extract_notes(self, transcript: str) -> Dict:
        """Summarizes transcript into structured sections using OpenRouter"""
        prompt = f"""You are an expert note extractor. From the transcript below, extract ONLY the most important ideas.

Rules:
- Remove filler words
- Keep only key concepts
- Group into sections (max 5–8 sections)
- Each section must have: title + 2–5 bullet points
- Make it simple, educational, and clean
- Do NOT include full sentences from transcript

Transcript:
{transcript[:10000]}  # Limit to 10k chars for safety

Respond ONLY with valid JSON in this format:
{{
  "sections": [
    {{
      "title": "Topic 1",
      "points": ["Point A", "Point B"]
    }}
  ]
}}"""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "openai/gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(self.url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            return json.loads(content)

# --- VIDEO GENERATOR ---

class VideoGenerator:
    def __init__(self, output_size=VIDEO_SIZE):
        self.size = output_size

    def create_section_scene(self, title: str, points: List[str]) -> List[CompositeVideoClip]:
        """Creates a sequence of clips for a single section"""
        clips = []
        
        # Title Clip (Fixed at top)
        title_clip = TextClip(
            title.upper(),
            fontsize=70,
            color=TITLE_COLOR,
            font=FONT,
            method='caption',
            size=(self.size[0] - 200, None)
        ).set_position(('center', 200))

        point_clips = []
        for i, point in enumerate(points):
            # Create point text
            p_clip = TextClip(
                f"• {point}",
                fontsize=50,
                color=TEXT_COLOR,
                font=FONT,
                method='caption',
                size=(self.size[0] - 250, None)
            ).set_start(i * 0.5) # Slight stagger
            
            # Animation: Fade in and slide up slightly
            p_clip = p_clip.set_position(('center', 450 + (i * 150))).fx(fx.fade_in, 0.5)
            point_clips.append(p_clip)

        # Background for the whole scene
        scene_duration = (len(points) * POINT_DURATION)
        bg = ColorClip(size=self.size, color=[15, 15, 15]).set_duration(scene_duration)
        
        # Watermark
        watermark = TextClip(
            "AI NOTES",
            fontsize=30,
            color="#444444",
            font=FONT
        ).set_position(('center', self.size[1] - 100)).set_duration(scene_duration)

        # Combine title, points, and background
        scene = CompositeVideoClip([bg, title_clip.set_duration(scene_duration), watermark] + point_clips)
        return scene

    def generate_video(self, data: Dict, output_path: str):
        """Orchestrates the creation of the final MP4"""
        scenes = []
        for section in data["sections"]:
            scenes.append(self.create_section_scene(section["title"], section["points"]))
        
        final_video = concatenate_videoclips(scenes, method="compose")
        final_video.write_videofile(output_path, fps=FPS, codec="libx264", audio=False)

# --- SYSTEM ORCHESTRATOR ---

class NotesVideoSystem:
    def __init__(self):
        self.yt_client = YouTubeTranscriptClient(TRANSCRIPT_API_KEY)
        self.ai_processor = AIProcessor(OPENROUTER_API_KEY)
        self.video_gen = VideoGenerator()
        
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        os.makedirs(CACHE_DIR, exist_ok=True)

    def _get_cache_path(self, url: str) -> str:
        safe_name = re.sub(r'[^a-zA-Z0-9]', '_', url)
        return os.path.join(CACHE_DIR, f"{safe_name}.txt")

    async def process_video(self, video_url: str):
        print(f"Processing: {video_url}")
        
        # 1. Get Transcript (with caching)
        cache_path = self._get_cache_path(video_url)
        if os.path.exists(cache_path):
            with open(cache_path, "r", encoding="utf-8") as f:
                transcript = f.read()
            print("Loaded transcript from cache.")
        else:
            transcript = await self.yt_client.get_transcript(video_url)
            with open(cache_path, "w", encoding="utf-8") as f:
                f.write(transcript)
            print("Fetched and cached transcript.")

        # 2. Extract Notes
        print("Extracting key notes using AI...")
        notes_data = await self.ai_processor.extract_notes(transcript)
        
        # Save JSON notes for reference
        json_path = cache_path.replace(".txt", ".json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(notes_data, f, indent=2)

        # 3. Generate Video
        video_filename = os.path.basename(json_path).replace(".json", ".mp4")
        video_path = os.path.join(OUTPUT_DIR, video_filename)
        
        print(f"Generating video: {video_path}")
        self.video_gen.generate_video(notes_data, video_path)
        print(f"Done! Video saved to {video_path}")

async def main():
    system = NotesVideoSystem()
    urls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ" # Example URL
    ]
    
    for url in urls:
        try:
            await system.process_video(url)
        except Exception as e:
            print(f"Failed to process {url}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
