# ISBN Visualization

# Overview

This application visualizes ISBN data on a large canvas. You can interact with the canvas to explore different datasets, view detailed information about specific ISBNs, and more. The visualization is designed to help you understand the distribution and availability of books across various datasets.

Go to [Features](#features) section for more details and screenshots.


# Frontend

The frontend of this application is built using vanilla JavaScript and CSS. The frontend code is located in the `frontend` folder. To start the frontend, you need to run a Python server that serves the static files.

### Starting the Frontend

1. **Navigate to the Frontend Directory:**
    Open your terminal at the root of this project directory and navigate to the frontend directory.

    ```sh
    cd ./frontend
    ```

2. **Modify the Backend URL:**
    Open the `scripts/script.js` file and update the `BACKEND_URL` variable at the top of the file with the backend URL you want to use, such as `http://localhost:9000`.

    ```javascript
    const BACKEND_URL = 'http://localhost:9000';
    ```

3. **Run the Python Server:**
    Execute the following command to start the Python server. This will serve the static files from the `frontend` folder.

    ```sh
    python server.py
    ```

    The server will start at `0.0.0.0:5500`. You can open your web browser and go to `http://0.0.0.0:5500` to view the application.

### Required Images Folder

The frontend requires an `images` folder containing the dataset images. These images can be generated using the `convert_png_to_dzi.sh` script. Make sure to follow the instructions in the [Scripts](#scripts) section to generate and place the images correctly.


# Backend

The backend is a lightweight Flask application with SQLite integration. Located in the `backend` folder, it provides two GET APIs:

- `/getPublisher`: Returns publisher data for a given ISBN13
- `/getOCLCHoldingsData`: Returns OCLC holdings data for a given ISBN13

### Database

The backend uses two SQLite databases located in `backend/db/`:
- `isbn_oclc_holdings.db`: Stores OCLC holdings information
- `isbn_publisher.db`: Stores publisher information

### Starting the Backend

1. **Install Dependencies:**
    ```sh
    pip install -r requirements.txt
    ```

2. **Ensure Database Files:**
    Make sure both SQLite database files exist in `backend/db/`. You can create them using the scripts:
    - [`convert_isbngrp_dataset_to_db.py`](#convert_isbngrp_dataset_to_dbpy)
    - [`convert_isbn_oclc_dataset_to_db.py`](#convert_isbn_oclc_dataset_to_dbpy)

3. **Run the Flask Server:**
    ```sh
    cd backend
    python app.py
    ```

The server will start at `:9000`


# Scripts

Various scripts can be found in the `scripts` folder. These scripts serve multiple purposes, such as generating the required DZI images for the frontend and creating the SQLite database files for the backend.
Before running any scripts, ensure you have installed the required dependencies:

```sh
pip install -r requirements.txt
```

-----

### `create_isbn_images.py`
This script is a modification of the original script found [here](https://software.annas-archive.li/AnnaArchivist/annas-archive/-/blob/6fdd4e92a95bfb55cce28d1faab67a91b7b10b5e/isbn_images/make_isbn_images.py).

#### Modifications
- Use black color for non-existent ISBNs.
- Added code to include WorldCat/OCLC holding data in the `all_isbns` image. Added different color pixels for the same accoring to the number of holdings.

#### Prerequisites
To run this script, you need two files in the `./scripts/data` directory:
1. `aa_isbn13_codes_20241204T185335Z.benc.zst`: Found [here](https://software.annas-archive.li/AnnaArchivist/annas-archive/-/blob/6fdd4e92a95bfb55cce28d1faab67a91b7b10b5e/isbn_images/aa_isbn13_codes_20241204T185335Z.benc.zst). It can be generated using the code [here](https://software.annas-archive.li/AnnaArchivist/annas-archive/-/blob/369f1ae1074d8545eaeaf217ad690e505ef1aad1/allthethings/cli/views.py?page=2#L1244-1319).
2. `oclc_holdings_per_position.jsonl`: Graciously provided by [@orangereporter](https://software.annas-archive.li/orangereporter) in this comment [here](https://software.annas-archive.li/AnnaArchivist/annas-archive/-/issues/244#note_2886).

#### Usage
After obtaining both files, you can run the script to generate the raw PNG images for all datasets. These uncompressed large PNG images are necessary for creating the DZI images for the frontend.

-----

### `convert_png_to_dzi.sh`

This script converts raw PNG images into Deep Zoom Image (DZI) format, enabling efficient display of large images in the frontend. The script utilizes the `vips` image processing library.

#### Prerequisites

- Install the `vips` library on your system before running this script.

#### Configuration

The script uses these default values which can be modified:

```sh
TILE_SIZE=2048    # Size of individual tiles
INPUT_PATH="./images/PNG"    # Source directory for PNG files
OUTPUT_PATH="./images/DZI"   # Output directory for DZI files
```

#### Tile Size Considerations

The `TILE_SIZE` parameter affects performance and quality:

- **Larger tiles (e.g., 2048)**
    - Fewer total tiles
    - Larger individual file sizes
    - Fewer network requests

- **Smaller tiles**
    - More total tiles
    - Smaller individual file sizes
    - More network requests

The default value of 2048 provides a good balance between quality and performance.

#### Usage

1. Place your raw PNG images in the `./images/PNG` directory
2. Run the script:
     ```sh
     chmod +x ./convert_png_to_dzi.sh
     ./convert_png_to_dzi.sh
     ```

The script will generate DZI images in separate folders under `./images/DZI`, one for each dataset.

Move the `DZI` folder to the `frontend/images` directory.

-----

### `make_isbn_oclc_dataset.py`

This script converts the OCLC/WorldCat dataset into a JSONL file containing `isbn13`, `oclc_number`, and `holdings_count`. It processes over 2 billion lines of data to create the required stripped-down JSONL file.

#### Prerequisites

- Download the WorldCat dataset ZST file from [Anna's Archive](https://annas-archive.org/torrents/worldcat).
- Place the file in the `./data` directory.
- Update the `file_path` variable in the script to point to the file.

#### Usage

Run the script using the following command:

```sh
python make_isbn_oclc_dataset.py
```

**Note:** This script can take a long time to run, depending on your system. It may use a large amount of memory (approximately 35GB) and take around 10 hours to complete.

-----

### `convert_isbn_oclc_dataset_to_db.py`

This script converts the JSONL file `./data/isbn_oclc_holding.jsonl.seekable` into an SQLite database for use in the backend. It reads the JSONL file row by row and creates an SQLite database with the required schema.

#### Prerequisites

You also need the file `oclc_holdings_per_position.jsonl`, graciously provided by [@orangereporter](https://software.annas-archive.li/orangereporter) at this [comment](https://software.annas-archive.li/AnnaArchivist/annas-archive/-/issues/244#note_2886), in the `./data` directory. This file is used for validation to ensure no data is missed by me. Just to be double safe.

#### Usage

Once both files are in the `./data` directory, run the script with:

```sh
python convert_isbn_oclc_dataset_to_db.py
```

After the script completes, you will have a `isbn_oclc_holdings.db` file in the `./data` directory. Move this database file to the `backend/db` directory.

-----

### `convert_isbngrp_dataset_to_db.py`

This script converts the `isbngrp` dataset into an SQLite database for use in the backend. It reads the dataset row by row and creates an SQLite database with the required schema.

#### Prerequisites

You will need the file `isbngrp.jsonl.seekable` in the `./data` directory. This file can be found at Anna's Archive [here](https://annas-archive.org/torrents/other_metadata).

#### Usage

Once you have the file in the `./data` directory, you can run the script with:

```sh
python convert_isbngrp_dataset_to_db.py
```

After the script completes, you will have a `isbn_publisher.db` file in the `./data` directory. Move this database file to the `backend/db` directory.


# Features

Controls
--------

*   **Dataset Selector:** Use the dropdown to select different datasets to visualize. Each dataset represents a different collection of ISBNs, such as all ISBNs, ISBNs with holdings, or specific collections like Google Books or Internet Archive.

<p align="center">
    <img src="https://media-hosting.imagekit.io//11c0925d7a144d08/ezgif-416f862838944.gif?Expires=1832845054&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=lxFpc9bNx601zgV5vFuFV9EHy0ZE06VpcXqh3~L3MWgvOHPoIeE3lPj2qMTAkQ52GOOZT-EjkU~nvCwIAjz2DT7-Me9sQTcONCT8G~QZMw3pG8LFGToLanq9z1Uh75xGuPJgUQsZ5pFC-P4Y~0~JKFPCCq9X4kbSkABEDOudVjCI74wFeScZsuFCqnKoWkOIWGvfEltn1dWN33WfpXIaiFmOo-tEsXQlzqAE9YSmOidw4QoNvkpEvLFKgPyM8J4eU8So-69xSVRf7ONlvMjpRJUZ4yPfJszj0M2U2nXn10K7U6Zk~G75T0b9ko08LzbnPNuRo6lWGr665DWjFJhBrA__" width="800">
</p>

*   **ISBN Input:** Enter a 13-digit ISBN to jump directly to its location on the canvas. This allows you to quickly find and view detailed information about a specific book.

<p align="center">
    <img src="https://media-hosting.imagekit.io//baf0ff070e1f4ea9/ScreenRecording2025-01-30171541-ezgif.com-optimize.gif?Expires=1832845694&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=zmhWmCUiw0NSTQinHrT2u0hjQ2MSHCrNQBZ5rDvObQ9C4memlDI45IfR1KAUklg7-u0e1zJgFuKCbLFcuhuPiobR~N2HGexidWPDKRbT4Y3hepDV495fF7mHznlm1OmYNXdaNn48P0FJRy97kvvPbFCWBO-xQYSI-7fmu9tlHSl6KyW-QgzwJotzmmEEVl9Jgo1cHxJw18GwE6fJbr4U5crXV6p-C4DAeCBHciwd0m0fWmgFdxA7ERy5tVe4OK6V1Xmeu5Ai3NP2YuEFD1EuA0LX3Z4foAcYlnr2m5OBxm~HJiMLL25eoqTyy44ApZ-GbxOfiSyRLhajutxzT5mUNw__" width="800">
</p>

*   **Country Selector:** Select a country to highlight all ISBNs associated with that country. This feature helps you explore the geographical distribution of books.

<p align="center">
    <img src="https://media-hosting.imagekit.io//b4f201cb4772419e/ScreenRecording2025-01-30172102-ezgif.com-video-to-gif-converter.gif?Expires=1832846059&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=MSU~THQ63cx2rlk9~ZJiBXPTo-ku8~3MUW5F64Z3XD2Ax2e1K2FzB1P2u35yk3U8MNLdnAwW-e8QkSGAeqwB7IUL5CItwUhk-7fkDdLlIRUnWhJrgeR1WQlEn8uHwyNghDgddGcSS1-a4W5Ws60czD5s8Lj4YwBH1sB3q4nWGZ-C3dYEBnMwLEeFldDSW526EVYmw6iFZputRb1qJ0ywtoasCUgTJJowYH~CSnl44ZMtZEPKRgRUWLco3DU7XTba4uFKilGSlNgNCcJJ5~Dri-ZFIHe18gfFW0icrWO-LnmfwCu3K-QOsFBQdOedajcFCB1UjxjFxBsWMoapsr4bcA__" width="800">
</p>

*   **Highlight Country on Hover:** Check this box to highlight countries when you hover over ISBNs. This visual aid makes it easier to identify the origin of books.

<p align="center">
    <img src="https://media-hosting.imagekit.io//9c8fdd1659784fcb/ScreenRecording2025-01-30172102-ezgif.com-video-to-gif-converter.gif?Expires=1832846549&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=wSuHm9ty853uZrrp2TO1ZU3c46Ia3-9ZirE~39JhxAxGA-o1dGsdK~OPlEts-A9dJTf57bYNDvB-20UJsRPvkda-A-Nh2DhaLBHtnfjM8duKVIDUig~dcE~2VhEWslGUJI-WkXr5mYHOG8yN3dPCanq-QTSfIJh3wtZlioIFSxBoLLLx6dmQl9EyKW0b72gKBwD3mYVpw~TkkcNW6R~uwTNP101MxRu9DP9SJjJ8X14jP5-9W4gcgegT7fhAUe2-5mt9HuZnXe8NOB5TDgODrj9Dyq76UcSxK-E0XzkKF7XjTkQoGHnZpsTwe0jVbYfhnbp5hAT1b11HpBxCklfbsw__" width="800">
</p>

*   **Highlight Publisher on Hover:** Check this box to highlight publishers when you hover over ISBNs. This feature helps you see the distribution of books from specific publishers.

<p align="center">
    <img src="https://media-hosting.imagekit.io//12dab1ad81e94073/ScreenRecording2025-01-30172102-ezgif.com-video-to-gif-converter.gif?Expires=1832846628&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=lM-RP-1u-GYyeZW1J93rSLmJFym7BZmm9Xz4aP1uTVIZVRxNR~P-r38q5KrUPh98V3HzlQx0Lr3Rge0wvYXZ1xyGw1Xt1NvzZAIcVznU205Y2jMsFyFt32vffhgrV60EBvLc0Izk--5D9g1fnSsZGJ0VPjqFn5V3ymxZ0Kk0YP~DSl69i0AxZsC-~F~Jls5NdE1piD8hzT3vqQVKh832xlFB4VeuN2ZEK6dA8jv18uWaQaQ1-F4tiL58TF~~AV-gat9ro5wmmaYurGVn1W-rhTjHosBhWxBgUEEv7~G4huD6vqiTsDfAyJ65IIwUMmVENgvjPTG7-4VkSeGHnXvu5w__" width="800">
</p>

*   **Pixel Identifier Chart:** Click to show or hide the pixel identifier chart. This chart explains the color coding used in the visualization.

<p align="center">
    <img src="https://media-hosting.imagekit.io//d7f095ad37344e35/ScreenRecording2025-01-30172102-ezgif.com-video-to-gif-converter.gif?Expires=1832846754&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=vqZvnFshbi9axFGvfH2KTG3iamHlRsVxi1~8qOogDOc3WQOh71qsLmoOjcx6Ale6y2uQ~zr~HVXlxB4WYGIoE8t0SAwHllSQCiFjUI-AM~hDGGO-5WzaaHkYVi0lXzRiZSHFBUGBesUupaqs0rqnIhiG37Ru4Jf1P17TT0k3qLHMj9glC75gfEgZSk1-hoQAeOQRYAIsXTRehvR5OoiGmreLj2qD0QoYmESv-Ow6MjrGEacet5ok8eus50Gm8o5Y2kHsrdYboMtGnFR3FBo892-6DD1MnDbjiR1G0wKsG~L6bMFzrZlQ0SBo4FhzddnRn~QhrK9i0~rwP3V~4fBu6Q__" width="500">
</p>

*   **Toggle Dark Mode:** Click to switch between light and dark modes. Your preference is saved locally and will be applied the next time you visit the app.

<p align="center">
    <img src="https://media-hosting.imagekit.io//0b614616231b4bb8/ScreenRecording2025-01-30172102-ezgif.com-video-to-gif-converter.gif?Expires=1832846902&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=Vg8E09UmkemeAk5zUT1SYCTPptTZUZgSnpM0xX~NlmdN01fzLwjud3lI4t16xU0ZA71JD3wL8LqbjzAkBh93N2HV1041mNZYnNYR3eX2o4BKdKmzwP5VFgVQ0EY9uK8EV-xH8xKBDYMqPTS1E0~tbQRn5E7jUXVBWUVHws8FR~LSu3LjEj06BC2DAe8L-oUWfmcEltWERDZ54d926olt1Y2JKDYAwigmetsKQRUWu9eRmnm7ZbCpFMkqnGlBjlxZHcZjyyzq7xyGDsdniYrg4cLYBf4KBcKxl04b91iJwZ6btBBbWafOOYHEw8G-o6K3ZyMEnpgprRyflSj8zjYKJA__" width="800">
</p>

*   **Help Button:** Click to open a help modal. This modal provides detailed instructions and information about using the app. This modal is also shown by default when a user is visiting the app for the first time.

Interactions
------------

*   **Zoom:** Use the mouse wheel or pinch to zoom in and out. Zooming in allows you to see more detailed information about specific ISBNs, while zooming out gives you a broader view of the dataset.
*   **Pan:** Click and drag to move around the canvas. Panning helps you navigate the large visualization area.
*   **Click:** Left Click or Right-click on the specific pixel to open the right menu with detailed information about the ISBN at that location. This menu provides comprehensive details about the selected book.
*   **Annotations:** Press and hold shift key to draw annotations. Use the annotation tool to add comments to specific areas of the canvas Annotations are saved locally in your browser.

![Screen Recording 2025-01-30 174255.mp4](<https://media-hosting.imagekit.io//0835e7885c8e4799/Screen%20Recording%202025-01-30%20174255.mp4?Expires=1832847196&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=Eui8ZZUG6NUOLrCt2xjHahKncDarGdoC78FmIkBC6zD5cPbKIfdceDsqdcNZGM8dMpHrn19NAk734zFxWO9Tm0MBM~pOwwYW4KmKnl0hAPiz2z97WcKEwyPOlNorGQJhqbaiQ3kwFo9lfI~zur8yGbSJMzsonsKfA1t~njkkXnmU2Xv8Vec6dbEVdBCWtrghTHPiotHnRxQcCdGR-xGpjrXHqtRRHyiScIrzpFogxCbLGCTLyO2nxR0nAVxRYsITumFvY6dUjfdEk5TS50qO0PizW1VEd4z9xPW7BYNTKeSAY4X5ShV-Y2N1M38XXMYINsbf6E4fs49nyVMNO4~aHA__>)

*   **Show cover Image on ultra zoom:** When you ultra zoom in to a specific ISBN, the cover image of the book will be displayed on hover of the ISBN.
*   **Home Button:** Click to reset the view to the default zoom level. This is useful if you get lost or want to start over.

Current View Data Analytics
---------------------------

Present at top center of the canvas, it provides real-time analytics for books currently in view, helping you analyze the distribution and availability patterns across different regions of the dataset.

![Screen Recording 2025-01-30 175048.mp4](<https://media-hosting.imagekit.io//27e5c24df1d64b2d/Screen%20Recording%202025-01-30%20175048.mp4?Expires=1832847672&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=GIza2FHWDn6Em3GMdZEFFthls94rGNjC79hTvXtyKWAA1b8VG7Qp3Exkv3q08sEgNSJHxrpLpM06XCQpfossECjfGr~0gYzP3ItXnnaCImRvBkyfW1EuGGdE2wrQCpD20~TNrhLhMarRzXkcx7Clph0b0HNgeGKm5byiP3LNoR2YI-wiNlrSRwOFusckH0BHGLzkkeouZxufIYnSp5KzSDHUgCJP25E4TY~gXKwZHP~g3ksgzj2Aqqd2ofkKhzRc-lQwzO4N1tecxsa6meEDwPEfEyRezz4SORrIB3j5LYvgHEr8MhOffjMYfEu2YIOUnNgzrYJaBfTTnofhg6VhIA__>)


Right Menu
----------

<p align="center">
    <img src="https://media-hosting.imagekit.io//e623a82f9e24417b/Screenshot%202025-01-30%20175331.png?Expires=1832847827&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=TVAXj1yy5VzwyB2wkvIrMODBxDSUMFEXg-jq11guaQSm41qk9oilLpeKeALNjZq9oDFAQTyp6iaC2YBRzOn9vsLtop8sHZYhkwmHvoX4omi9QjimteHh7x3ae9NzslbERSi8RYX6qH4juB0ncG-J1VTraR9pra8h~F5hut5eMsB69y7wnIPHoYAg8MnQdWuk3FOg4VsbtOGxov9xIPPZld9b6ZyiV-hkIOOKqG6aqHj8-iCaF5efUXxLnFx-k57P4Y1gj~P6LfrusS2DmjothNwnma29-sUUkpbrcNe~~d2jxNZKjioLTvxNcJiRIUk1LqaGGkkSVv-SKzQYm8-FnQ__" width="500">
</p>


The right menu provides detailed information about the selected ISBN, including:

*   **ISBN:** The full ISBN number. This is the unique identifier for the book.
*   **Country:** The country associated with the ISBN. This information helps you understand the geographical origin of the book.
*   **Authors:** The authors of the book. This section lists all the authors who contributed to the book.
*   **Publish Date:** The publication date of the book. This information indicates when the book was published.
*   **Publishers:** The publishers of the book. This section lists the organizations responsible for publishing the book.
*   **Number of Pages:** The number of pages in the book. This information gives you an idea of the book's length.
*   **OCLC ID:** The OCLC ID if available. This identifier is used by libraries to catalog the book.
*   **Holdings:** The number of libraries holding the book (According to Worldcat). This information indicates the book's availability in libraries.
*   **Cover Image:** The cover image of the book if available. This visual aid helps you identify the book.

Corner Values
-------------

The corner values display the ISBNs at the top-left, top-right, bottom-left, and bottom-right corners of the visible area. These values update as you zoom and pan, providing a quick reference for the range of ISBNs in view.

Keyboard Shortcuts
------------------

*   **Shift:** Hold to enable crosshair cursor for precise annotation selection. This feature helps you make accurate annotations.
*   **Ctrl + Alt + L:** Clear all annotations. This shortcut allows you to quickly remove all annotations from the canvas.

Mobile Instructions
-------------------

The app is fully functional on mobile devices. Here are some tips for using the app on a mobile device:

*   **Zoom:** Pinch to zoom in and out. Or Double tap to zoom in.
*   **Pan:** Swipe to move around the canvas. This gesture helps you navigate the large visualization area.
*   **Long Press:** Long press on the specific pixel to open the right menu with detailed information about the ISBN at that location. This menu provides comprehensive details about the selected book.

Some functionalities are disabled on mobile devices, such as live view data analysis, country/publisher highlight and annotations.
