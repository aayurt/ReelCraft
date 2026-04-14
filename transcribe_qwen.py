import json, os
from pathlib import Path
from graphify.transcribe import transcribe_all

detect = json.loads(Path('/tmp/detect.json').read_text())
video_files = detect.get('files', {}).get('video', [])
prompt = 'Video generation automation using Playwright for Qwen AI video generation service. Use proper punctuation and paragraph breaks.'

transcript_paths = transcribe_all(video_files, initial_prompt=prompt)
print(json.dumps(transcript_paths))