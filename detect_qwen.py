import json
from graphify.detect import detect
from pathlib import Path

result = detect(Path('/Users/aayurtshrestha/projects/self/web/qwen-automate'))
print(json.dumps(result, indent=2))