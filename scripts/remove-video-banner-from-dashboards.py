#!/usr/bin/env python3
"""
Remove all 3 <VideoBanner /> insertions and the import from dashboard.tsx.
The floating cat widget in AppLayout now handles all roles globally.
"""
import re

file_path = "/home/z/my-project/src/components/dashboard.tsx"
with open(file_path, "r") as f:
    src = f.read()

# Remove the import line
src = re.sub(
    r'import \{ VideoBanner \} from "@/components/video-banner";\n',
    '',
    src
)

# Remove all 3 insertions of:
#   {/* Video Banner — ... */}\n      <VideoBanner />\n
# (handles the multi-line comment + tag pattern)
src = re.sub(
    r'\n      \{/[^}]*Video Banner[^}]*\*/\}\n      <VideoBanner />\n',
    '\n',
    src
)

# Just in case, also remove bare <VideoBanner /> lines
src = re.sub(r'\n      <VideoBanner />\n', '\n', src)

with open(file_path, "w") as f:
    f.write(src)

# Verify
print("After removal — VideoBanner references remaining:")
import subprocess
result = subprocess.run(['grep', '-n', 'VideoBanner', file_path], capture_output=True, text=True)
print(result.stdout if result.stdout else "(none — all removed)")
