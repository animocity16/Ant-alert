import struct, zlib, base64

def create_png(size, bg_color=(29, 158, 117)):
    def write_chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    
    pixels = []
    cx, cy = size // 2, size // 2
    r = size // 2
    
    for y in range(size):
        row = b'\x00'
        for x in range(size):
            dx, dy = x - cx, y - cy
            dist = (dx*dx + dy*dy) ** 0.5
            if dist <= r:
                row += bytes(bg_color) + b'\xff'
            else:
                row += b'\x00\x00\x00\x00'
        pixels.append(row)
    
    raw = b''.join(pixels)
    compressed = zlib.compress(raw)
    
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    ihdr = write_chunk(b'IHDR', ihdr_data)
    idat = write_chunk(b'IDAT', compressed)
    iend = write_chunk(b'IEND', b'')
    
    return sig + ihdr + idat + iend

for sz in [192, 512]:
    with open(f'/home/claude/ant-alert/icon-{sz}.png', 'wb') as f:
        f.write(create_png(sz))
    print(f'icon-{sz}.png created')
