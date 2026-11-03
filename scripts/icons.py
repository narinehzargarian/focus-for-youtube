"""Draws the extension icons: a play button inside a focus ring. Uses only the standard library."""
import math
import pathlib
import struct
import zlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "icons"


def png(size):
    blue = (6, 95, 212)
    rows = []
    c = (size - 1) / 2
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            # Anti-aliasing: average four samples per pixel.
            coverage_ring = coverage_play = 0.0
            for sx, sy in ((0.25, 0.25), (0.75, 0.25), (0.25, 0.75), (0.75, 0.75)):
                px, py = x + sx - 0.5, y + sy - 0.5
                r = math.hypot(px - c, py - c)
                outer, inner = size * 0.47, size * 0.37
                if inner <= r <= outer:
                    coverage_ring += 0.25
                # A triangle pointing right, centered.
                u = (px - c) / size
                v = (py - c) / size
                if -0.13 <= u <= 0.17 and abs(v) <= (0.17 - u) * 0.58:
                    coverage_play += 0.25
            alpha = min(1.0, coverage_ring + coverage_play)
            row += bytes((*blue, round(alpha * 255)))
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


OUT.mkdir(exist_ok=True)
for size in (16, 48, 128):
    (OUT / f"icon{size}.png").write_bytes(png(size))
    print("wrote", OUT / f"icon{size}.png")
