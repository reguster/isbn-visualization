#!/bin/bash

# Static tile size
TILE_SIZE=2048

# Input and output file paths
INPUT_PATH="./images/PNG"
OUTPUT_PATH="./images/DZI"

# Iterate over all PNG files in the $INPUT_PATH folder
for file in $INPUT_PATH/*.png; do
    echo "Processing file: $file"

    # Get the base name of the file (without extension)
    base_name=$(basename "$file" .png)
    echo "Base name: $base_name"

    # Use the static tile size
    tile_size=$TILE_SIZE
    echo "Using static tile size: $tile_size"

    # Run the dzsave command
    echo "Running dzsave command..."
    # {path_for_windows}/vips/bin/vips.exe dzsave "$file" "$OUTPUT_PATH/$base_name/$base_name" --suffix .png --vips-progress --tile-size $tile_size --overlap 0
    vips dzsave "$file" "$OUTPUT_PATH/$base_name/$base_name" --suffix .png --vips-progress --tile-size $tile_size --overlap 0

    echo "Processed $file with tile size $tile_size"
done