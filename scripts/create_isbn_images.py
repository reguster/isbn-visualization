import bencodepy
import PIL.Image
import PIL.ImageChops
import struct
import tqdm
import zstandard
import os
import json

# Get the latest from the `codes_benc` directory in `aa_derived_mirror_metadata`:
# https://annas-archive.org/torrents#aa_derived_mirror_metadata
input_filename = './data/aa_isbn13_codes_20241204T185335Z.benc.zst'

# file is provided graciously by @orangereporter 
# at https://software.annas-archive.li/AnnaArchivist/annas-archive/-/issues/244#note_2886
oclc_holdings_filename = './data/oclc_holdings_per_position.jsonl' 

os.makedirs("images", exist_ok=True) # Create the 'images' directory if it doesn't exist
isbn_data = bencodepy.bread(zstandard.ZstdDecompressor().stream_reader(open(input_filename, 'rb')))
smaller_scale = 50
min_holdings = 10
very_less_holdings = 5

def color_image(image, packed_isbns_binary, color=None, addcolor=None, scale=1):
    packed_isbns_ints = struct.unpack(f'{len(packed_isbns_binary) // 4}I', packed_isbns_binary)
    isbn_streak = True # Alternate between reading `isbn_streak` and `gap_size`.
    position = 0 # ISBN (without check digit) is `978000000000 + position`.
    for value in tqdm.tqdm(packed_isbns_ints):
        if isbn_streak:
            for _ in range(0, value):
                x = (position // scale) % image.width
                y = (position // scale) // image.width
                if color is not None:
                    image.putpixel((x, y), color)
                else:
                    image.putpixel((x, y), addcolor + image.getpixel((x,y)))
                position += 1
        else: # Reading `gap_size`.
            position += value
        isbn_streak = not isbn_streak

print("### Generating images/*_isbns_smaller.png...")
for prefix, packed_isbns_binary in isbn_data.items():
    filename = f"images/{prefix.decode()}_isbns_smaller.png"
    print(f"Generating {filename}...")
    prefix_isbns_png_smaller = PIL.Image.new("F", (50000//smaller_scale, 40000//smaller_scale), 0.0)
    color_image(prefix_isbns_png_smaller, packed_isbns_binary, addcolor=1.0/float(smaller_scale*smaller_scale), scale=(smaller_scale*smaller_scale))
    prefix_isbns_png_smaller.point(lambda x: x * 255).convert("L").save(filename)

print("### Generating images/all_isbns_smaller.png...")
all_isbns_png_smaller_red = PIL.Image.new("F", (50000//smaller_scale, 40000//smaller_scale), 0.0)
all_isbns_png_smaller_green = PIL.Image.new("F", (50000//smaller_scale, 40000//smaller_scale), 0.0)
for prefix, packed_isbns_binary in isbn_data.items():
    if prefix == b'md5':
        continue
    print(f"Adding {prefix.decode()} to images/all_isbns_smaller.png")
    color_image(all_isbns_png_smaller_red, packed_isbns_binary, addcolor=1.0/float(smaller_scale*smaller_scale), scale=(smaller_scale*smaller_scale))
print(f"Adding md5 to images/all_isbns_smaller.png")
color_image(all_isbns_png_smaller_green, isbn_data[b'md5'], addcolor=1.0/float(smaller_scale*smaller_scale), scale=(smaller_scale*smaller_scale))
PIL.Image.merge('RGB', (
    PIL.ImageChops.subtract(all_isbns_png_smaller_red.point(lambda x: x * 255).convert("L"), all_isbns_png_smaller_green.point(lambda x: x * 255).convert("L")),
    all_isbns_png_smaller_green.point(lambda x: x * 255).convert("L"),
    PIL.Image.new('L', all_isbns_png_smaller_red.size, 0),
)).save("images/all_isbns_smaller.png")

print("### Generating *_isbns.png...")
for prefix, packed_isbns_binary in isbn_data.items():
    filename = f"images/{prefix.decode()}_isbns.png"
    print(f"Generating {filename}...")
    prefix_isbns_png = PIL.Image.new("1", (50000, 40000), 0)
    color_image(prefix_isbns_png, packed_isbns_binary, color=1)
    prefix_isbns_png.save(filename)

print("### Generating images/all_isbns.png...")
all_isbns_png = PIL.Image.new("RGB", (50000, 40000), (0,0,0))
for prefix, packed_isbns_binary in isbn_data.items():
    if prefix == b'md5':
        continue
    print(f"Adding {prefix.decode()} to images/all_isbns.png")
    color_image(all_isbns_png, packed_isbns_binary, color=(255,50,50))
print(f"Adding md5 to images/all_isbns.png")
color_image(all_isbns_png, isbn_data[b'md5'], color=(50,255,50))

all_isbns_png.save("images/all_isbns.png")


# Load OCLC holdings data
oclc_holdings = {}
with open(oclc_holdings_filename, 'r') as f:
    for line in f:
        position, holdings = json.loads(line)
        oclc_holdings[position] = holdings


# Update image with OCLC holdings data
print("### generating image with OCLC holdings data...")
all_isbns_with_holdings_png = PIL.Image.new("RGB", (50000, 40000), (0,0,0))
for prefix, packed_isbns_binary in isbn_data.items():
    if prefix == b'md5':
        continue
    print(f"Adding {prefix.decode()} to images/all_isbns_with_holdings.png")
    color_image(all_isbns_with_holdings_png, packed_isbns_binary, color=(255,255,0)) # Bright Yellow
print(f"Adding md5 to images/all_isbns_with_holdings.png")
color_image(all_isbns_with_holdings_png, isbn_data[b'md5'], color=(50,179,50)) # Greenish

print(f"Adding holdings data to images/all_isbns_with_holdings.png")
for position, holdings in tqdm.tqdm(oclc_holdings.items()):
    x = position % all_isbns_with_holdings_png.width
    y = position // all_isbns_with_holdings_png.width
    current_color = all_isbns_with_holdings_png.getpixel((x, y))
    if current_color == (255, 255, 0):
        if holdings < min_holdings and holdings >= very_less_holdings:
            all_isbns_with_holdings_png.putpixel((x, y), (255, 127, 0))  # Orange
        elif holdings < very_less_holdings:
            all_isbns_with_holdings_png.putpixel((x, y), (255, 50, 50))  # Red

all_isbns_with_holdings_png.save("images/all_isbns_with_holdings.png")

print("Done.")
