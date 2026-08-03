#!/usr/bin/env python3
"""
Add <VideoBanner /> to the bottom of TelecallingDashboard (line ~442)
and SalesDashboard (line ~700), preserving the existing AdminDashboard
placement (line ~982).
"""
import re

file_path = "/home/z/my-project/src/components/dashboard.tsx"
with open(file_path, "r") as f:
    src = f.read()

# Marker to insert before the closing </div> ); } of each dashboard
MARKER = "    </div>\n  );\n}"

# What we want to insert
INSERT = (
    "\n      {/* Video Banner — shown to all roles. Transparent wrapper, muted auto-play,\n"
    "          replays every 5 minutes. Dismissible for the session. Bottom of dashboard. */}\n"
    "      <VideoBanner />\n"
    "    </div>\n  );\n}"
)

# Find ALL occurrences of the marker
positions = [m.start() for m in re.finditer(re.escape(MARKER), src)]
print("Found", len(positions), "closing div markers")
for i, p in enumerate(positions):
    # Show line number
    line = src[:p].count("\n") + 1
    print(f"  #{i+1}: line {line}")

# Skip the LAST one (line ~982) — that's AdminDashboard, already has VideoBanner
# Insert at positions[0] (TelecallingDashboard, line 442) and positions[1] (SalesDashboard, line 700)
assert len(positions) >= 3, f"Expected at least 3 closing markers, found {len(positions)}"

# Replace from the END so earlier positions don't shift
# Position 2 (index 2) is AdminDashboard — already has VideoBanner, skip
# Position 1 (index 1) is SalesDashboard — needs insertion
# Position 0 (index 0) is TelecallingDashboard — needs insertion

new_src = src
# Replace SalesDashboard (index 1)
old_sales = src[positions[1]:positions[1]+len(MARKER)]
assert old_sales == MARKER
new_src = new_src[:positions[1]] + INSERT + new_src[positions[1]+len(MARKER):]

# Recompute TelecallingDashboard position (text length changed)
positions2 = [m.start() for m in re.finditer(re.escape(MARKER), new_src)]
print("\nAfter SalesDashboard insertion:", len(positions2), "markers remain")
old_tele = new_src[positions2[0]:positions2[0]+len(MARKER)]
assert old_tele == MARKER
new_src = new_src[:positions2[0]] + INSERT + new_src[positions2[0]+len(MARKER):]

# Write back
with open(file_path, "w") as f:
    f.write(new_src)

print("\nDone. Now verify with grep:")
