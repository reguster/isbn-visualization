// const BACKEND_URL = 'http://localhost:9000';
const BACKEND_URL = 'https://isbn-vis-backend.asdk.eu.org';
const API_CALL_COOLDOWN_PERIOD = 200;

document.getElementById('isbns').addEventListener('contextmenu', event => event.preventDefault());

const viewer = OpenSeadragon({
    id: "isbns",
    prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/5.0.1/images/",
    tileSources: "./images/DZI/all_isbns_with_holdings/all_isbns_with_holdings.dzi",
    maxZoomPixelRatio: 300,
    imageSmoothingEnabled: false,
    preload: true,
    showFullPageControl: false,
    showZoomControl: false,
    showHomeControl: false,
    showRotationControl: false,
    showSequenceControl: false,
    crossOriginPolicy: 'Anonymous',
    showNavigator: !('ontouchstart' in window || navigator.maxTouchPoints) && window.innerWidth >= 500,
    navigatorPosition: "ABSOLUTE",
    navigatorTop: "60px",
    navigatorLeft: "20px",
    navigatorHeight: "120px",
    navigatorWidth: "150px",
    navigatorAutoFade: true,
});

const annoConfig = {
    widgets: [
        'COMMENT'
    ],
    gigapixelMode: true,
}
const anno = OpenSeadragon.Annotorious(viewer, annoConfig);

const loader = createLoader();
document.body.appendChild(loader);

viewer.addHandler('open', () => loader.style.display = 'block');
viewer.addHandler('tile-loaded', () => loader.style.display = 'none');

function createLoader() {
    const loader = document.createElement('div');
    loader.id = 'osd-loader';
    loader.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        display: none;
        background: rgba(255, 255, 255, 0.8);
        padding: 10px;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    `;
    loader.innerHTML = '<span>Loading...</span>';
    return loader;
}

let currentDataset = document.getElementById('dataset-selector').value;

function getAnnotationsKey(dataset) {
    return `annotations_${dataset}`;
}

function changeDataset(dataset) {
    saveAnnotations(); // Save old dataset
    loader.style.display = 'block';
    const tileSource = `./images/DZI/${dataset}/${dataset}.dzi`;
    viewer.clearOverlays();
    document.getElementById('right-menu').style.display = 'none';
    document.body.classList.remove('menu-open');
    viewer.addOnceHandler('open', () => viewer.clearOverlays());
    viewer.open(tileSource);
    currentDataset = dataset; // Update current dataset
    anno.clearAnnotations(); // Clear old annotations
    loadAnnotations(); // Load new dataset
}

function allowRightClick(viewer, webPoint) {
    return viewer.viewport.getZoom() > 500;
}

viewer.addHandler('canvas-contextmenu', async event => {
    if (!('ontouchstart' in window || navigator.maxTouchPoints) && allowRightClick(viewer, event.position)) {
        await showRightMenu(event);
    }
});

let isPanning = false;
let isAnnotationClicked = false;

viewer.addHandler('canvas-drag', () => {
    isPanning = true;
    viewer.container.style.cursor = 'grabbing';
    tooltip.style.display = 'none'; // Hide tooltip when panning
});

viewer.addHandler('canvas-release', () => {
    setTimeout(() => {
        isPanning = false;
        viewer.container.style.cursor = 'default';
    }, 10);
});

function saveAnnotations() {
    const annotations = anno.getAnnotations();
    localStorage.setItem(getAnnotationsKey(currentDataset), JSON.stringify(annotations));
}

function loadAnnotations() {
    const savedAnnotations = localStorage.getItem(getAnnotationsKey(currentDataset));
    if (savedAnnotations) {
        const annotations = JSON.parse(savedAnnotations);
        annotations.forEach(annotation => anno.addAnnotation(annotation));
    }
}

anno.on('clickAnnotation', function (annotation, element) {
    isAnnotationClicked = true;
    anno.panTo(annotation, [false]);
});
anno.on('cancelSelected', function (selection) {
    isAnnotationClicked = false;
});
anno.on('deleteAnnotation', function (annotation) {
    isAnnotationClicked = false;
    saveAnnotations();
})
anno.on('updateAnnotation', function (annotation, previous) {
    isAnnotationClicked = false;
    saveAnnotations();
});
anno.on('createAnnotation', function (annotation, overrideId) {
    isAnnotationClicked = false;
    saveAnnotations();
});
anno.on('startSelection', function (point) {
    viewer.container.style.cursor = 'crosshair';
});
anno.on('createSelection', function (selection) {
    viewer.container.style.cursor = 'default';
});

let shiftButtonPressed = false;
document.addEventListener('keydown', event => {
    if (event.key === 'Shift') {
        viewer.container.style.cursor = 'crosshair';
        shiftButtonPressed = true;
    }
    if ((event.ctrlKey && event.altKey && (event.key === 'l' || event.key === 'L'))) {
        anno.clearAnnotations();
        localStorage.removeItem(getAnnotationsKey(currentDataset));
    }
});

document.addEventListener('keyup', event => {
    if (event.key === 'Shift') {
        viewer.container.style.cursor = 'default';
        shiftButtonPressed = false;
    }
});

viewer.addHandler('canvas-click', async event => {
    if (!('ontouchstart' in window || navigator.maxTouchPoints) && viewer.viewport.getZoom() > 500 && !isPanning && !isAnnotationClicked) {
        await showRightMenu(event);
    }
});

viewer.addHandler('canvas-press', async event => {
    if ('ontouchstart' in window || navigator.maxTouchPoints) {
        let isDragging = false;
        let isPinching = false;
        const pressTimer = setTimeout(async () => {
            if (!isDragging && !isPinching && allowRightClick(viewer, event.position) && !isPanning) {
                await showRightMenu(event);
            }
        }, 500);

        viewer.addHandler('canvas-drag', () => {
            isDragging = true;
            clearTimeout(pressTimer);
        });

        viewer.addHandler('canvas-release', () => {
            clearTimeout(pressTimer);
            isDragging = false;
        });

        viewer.addHandler('canvas-pinch', () => {
            isPinching = true;
            clearTimeout(pressTimer);
        });
    }
});

async function showRightMenu(event) {
    if ('ontouchstart' in window || navigator.maxTouchPoints) {
        document.getElementById('home-btn').style.display = 'none';
        document.getElementById('toggle-pixel-identifier').style.display = 'none';
    }
    const webPoint = event.position;
    if (!allowRightClick(viewer, webPoint)) {
        return;
    }
    document.getElementById('isbns').style.width = '70vw';
    const viewportPoint = viewer.viewport.pointFromPixel(webPoint);
    const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

    const x = Math.floor(imagePoint.x);
    const y = Math.floor(imagePoint.y);

    setTimeout(() => {
        viewer.viewport.panTo(viewportPoint, false);
        tooltip.style.display = 'none';
    }, 100);

    const position = y * 50000 + x;

    if (x < 0 || x >= 50000 || y < 0 || y >= 40000) {
        tooltip.style.display = 'none';
        return;
    }

    const isbnWithoutCheckDigit = 978000000000 + position;
    const sum = Array.from(isbnWithoutCheckDigit.toString().slice(0, 12))
        .reduce((acc, digit, i) => acc + (i % 2 === 0 ? +digit : +digit * 3), 0);
    const checkDigit = (10 - (sum % 10)) % 10;

    const isbn = isbnWithoutCheckDigit * 10 + checkDigit;
    const formattedIsbn = `${isbn.toString().slice(0, 3)}-${isbn.toString().slice(3, 4)}-${isbn.toString().slice(4, 7)}-${isbn.toString().slice(7, 12)}-${isbn.toString().slice(12)}`;

    let country = 'Unknown';
    for (const [key, value] of Object.entries(COUNTRIES)) {
        if (formattedIsbn.startsWith(key)) {
            country = value;
            break;
        }
    }

    const rightMenu = document.getElementById('right-menu');
    rightMenu.style.display = 'block';
    setTimeout(() => {
        rightMenu.classList.add('open');
    }, 10); // Slight delay to ensure the display change is applied
    document.getElementById('toggle-dark-mode').style.display = 'none';
    document.getElementById('help-btn').style.display = 'none';
    document.body.classList.add('menu-open');

    document.querySelector('#right-menu .loader').style.display = 'block';
    document.getElementById('right-menu-content').innerHTML = '';
    const coverContainer = document.getElementById('cover-container');
    const coverImage = document.getElementById('cover-image');
    const placeholder = document.getElementById('placeholder');
    coverContainer.style.display = 'none';
    coverImage.style.display = 'none';
    placeholder.style.display = 'none';

    viewer.clearOverlays();
    const canvas = viewer.drawer.canvas;
    const context = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const pixelData = context.getImageData(webPoint.x * dpr, webPoint.y * dpr, 1, 1).data;
    // Calculate contrasting color by inverting the color
    const borderColor = `rgba(${255 - pixelData[0]}, ${255 - pixelData[1]}, ${255 - pixelData[2]}, 0.8)`;
    if (viewer.viewport.getZoom() >= 500) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            border: 2px solid ${borderColor}; 
            width: 10px; 
            height: 10px; 
            position: absolute; 
            box-sizing: border-box;
            background-color: rgb(0, 183, 255);
            background: linear-gradient(
            to bottom right, 
            transparent calc(50% - 1px), 
            ${borderColor} calc(50% - 1px), 
            ${borderColor} calc(50% + 1px), 
            transparent calc(50% + 1px)
            ),
            linear-gradient(
            to bottom left, 
            transparent calc(50% - 1px), 
            ${borderColor} calc(50% - 1px), 
            ${borderColor} calc(50% + 1px), 
            transparent calc(50% + 1px)
            );
        `;
        viewer.addOverlay({
            element: overlay,
            location: viewer.viewport.imageToViewportRectangle(x, y, 1, 1),
        });
    }

    const cachedData = await getOpenLibraryDataFromCache(isbn.toString());

    if (cachedData) {
        displayRightMenuContent(cachedData);
        return;
    }

    let details = `
            <p><strong>ISBN:</strong> ${isbn}</p>
            <p><strong>Country:</strong> ${country}</p>
        `;
    document.getElementById('right-menu-content').innerHTML = details;

    if (!('ontouchstart' in window || navigator.maxTouchPoints) && pixelData[0] == 0 && pixelData[1] == 0 && pixelData[2] == 0) {
        document.querySelector('#right-menu .loader').style.display = 'none';
        return;
    }

    let publisher = '';
    const isbn13 = isbn.toString();
    let cachedPublisher = null;
    let prefix = '';

    // Check cache for publisher information
    for (let i = isbn13.length; i > 0; i--) {
        prefix = isbn13.slice(0, i);
        cachedPublisher = await getPublisherFromCache(prefix);
        if (cachedPublisher) {
            publisher = cachedPublisher.publisher;
            break;
        }
    }

    try {
        const [openLibraryResponse, oclcResponse] = await Promise.all([
            fetch(`https://openlibrary.org/isbn/${isbn}.json`),
            fetch(`${BACKEND_URL}/getOCLCHoldingsData?isbn13=${isbn}`)
        ]);

        if (openLibraryResponse.ok) {
            const data = await openLibraryResponse.json();
            let authorNames = [];
            if (data.authors && data.authors.length > 0) {
                authorNames = (await Promise.all(data.authors.map(async author => {
                    try {
                        const authorResponse = await fetch(`https://openlibrary.org${author.key}.json`);
                        if (authorResponse.ok) {
                            const authorData = await authorResponse.json();
                            return authorData.name;
                        }
                        return null;
                    } catch (error) {
                        return null;
                    }
                }))).filter(name => name !== null);
            }

            const openLibraryData = {
                isbn: isbn.toString(),
                title: data.title,
                authors: authorNames,
                publish_date: data.publish_date,
                publishers: data.publishers,
                number_of_pages: data.number_of_pages,
                country: country,
                oclc_number: null,
                total_holding_count: null
            };

            displayRightMenuContent(openLibraryData);
            addOpenLibraryDataToCache(openLibraryData);
        } else {
            console.error('Failed to fetch ISBN data');
            details = `
                    <p><strong>ISBN:</strong> ${isbn}</p>
                    <p><strong>Country:</strong> ${country}</p>
                    ${publisher ? `<p><strong>Publisher:</strong> ${publisher}</p>` : ''}
                    <p><a href="https://annas-archive.org/search?q=${isbn}" target="_blank">Search on Anna's Archive</a></p>
                `;
            document.getElementById('right-menu-content').innerHTML = details;
        }

        if (oclcResponse.ok) {
            const oclcData = await oclcResponse.json();
            let oclcDetails = '';
            if (oclcData.oclc_number) {
                oclcDetails += `<p><strong>OCLC ID:</strong> ${oclcData.oclc_number}</p>`;
            }
            if (oclcData.total_holding_count !== undefined && oclcData.total_holding_count !== null) {
                oclcDetails += `<p><strong>Holdings:</strong> ${oclcData.total_holding_count}</p>`;
            }
            document.getElementById('right-menu-content').innerHTML += oclcDetails;
        } else {
            console.error('Failed to fetch OCLC holdings data');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        details = `
                <p><strong>ISBN:</strong> ${isbn}</p>
                <p><strong>Country:</strong> ${country}</p>
                ${publisher ? `<p><strong>Publisher:</strong> ${publisher}</p>` : ''}
                <p><a href="https://annas-archive.org/search?q=${isbn}" target="_blank">Search on Anna's Archive</a></p>
            `;
        document.getElementById('right-menu-content').innerHTML = details;
    } finally {
        const coverImageUrl = `https://images.isbndb.com/covers/${String(isbn).slice(-4, -2)}/${String(isbn).slice(-2)}/${isbn}.jpg`;
        const imageResponse = await fetch(coverImageUrl, { mode: 'no-cors' });
        if (imageResponse.status === 200 || imageResponse.type === 'opaque') {
            coverImage.onload = () => {
                const isImageInvalid = coverImage.naturalWidth === 1 && coverImage.naturalHeight === 1;
                placeholder.style.display = isImageInvalid ? 'flex' : 'none';
                placeholder.textContent = isImageInvalid ? '' : '';
                coverContainer.style.display = 'flex';
                coverImage.style.display = isImageInvalid ? 'none' : 'block';
                document.querySelector('#right-menu .loader').style.display = 'none'; // Move this line here
            };
            coverImage.onerror = () => {
                placeholder.style.display = 'flex';
                placeholder.textContent = '';
                document.querySelector('#right-menu .loader').style.display = 'none'; // Move this line here
            };
            coverImage.src = coverImageUrl;
        } else {
            console.error('Failed to fetch cover image');
            placeholder.style.display = 'flex';
            placeholder.textContent = '';
            document.querySelector('#right-menu .loader').style.display = 'none'; // Move this line here
        }

        // Add search metadata section
        const searchMetadataSection = `
                    <div id="search-metadata">
                    <br>
                        <h3>Metadata</h3>
                        <ul>
                            <li><a href="https://annas-archive.org/search?index=meta&q=${isbn}" target="_blank">Anna's Archive</a></li><br>
                            <li><a href="https://search.worldcat.org/search?q=bn%3A${isbn}" target="_blank">WorldCat</a></li><br>
                            <li><a href="https://isbndb.com/book/${isbn}" target="_blank">ISBNdb</a></li>
                        </ul>
                    </div>
                `;
        document.getElementById('right-menu-content').innerHTML += searchMetadataSection;
    }
}


async function displayRightMenuContent(data) {
    let details = `<h1>${data.title || ''}</h1>`;
    if (data.isbn) details += `<p><strong>ISBN:</strong> ${data.isbn}</p>`;
    if (data.country) details += `<p><strong>Country:</strong> ${data.country}</p>`;
    if (data.authors && data.authors.length > 0) details += `<p><strong>Authors:</strong> ${data.authors.map(author => `<a href="https://annas-archive.org/search?q=${author}" target="_blank">${author}</a>`).join(', ')}</p>`;
    if (data.publish_date) details += `<p><strong>Publish Date:</strong> ${data.publish_date}</p>`;
    if (data.publishers && data.publishers.length > 0) details += `<p><strong>Publishers:</strong> ${data.publishers.join(', ')}</p>`;
    if (data.number_of_pages !== undefined) {
        details += `<p><strong>Number of Pages:</strong> ${data.number_of_pages}</p>`;
    }
    details += `<p><a href="https://annas-archive.org/search?q=${data.isbn}" target="_blank">Search on Anna's Archive</a></p>`;
    if (data.oclc_number) {
        details += `<p><strong>OCLC ID:</strong> ${data.oclc_number}</p>`;
    }
    if (data.total_holding_count !== undefined && data.total_holding_count !== null) {
        details += `<p><strong>Holdings:</strong> ${data.total_holding_count}</p>`;
    }
    document.getElementById('right-menu-content').innerHTML = details;

    const coverImageUrl = `https://images.isbndb.com/covers/${String(data.isbn).slice(-4, -2)}/${String(data.isbn).slice(-2)}/${data.isbn}.jpg`;
    const coverImage = document.getElementById('cover-image');
    const placeholder = document.getElementById('placeholder');
    const coverContainer = document.getElementById('cover-container');

    coverImage.onload = () => {
        const isImageInvalid = coverImage.naturalWidth === 1 && coverImage.naturalHeight === 1;
        placeholder.style.display = isImageInvalid ? 'flex' : 'none';
        placeholder.textContent = isImageInvalid ? '' : '';
        coverContainer.style.display = 'flex';
        document.querySelector('#right-menu .loader').style.display = 'none';
        coverImage.style.display = isImageInvalid ? 'none' : 'block';
    };
    coverImage.onerror = () => {
        placeholder.style.display = 'flex';
        placeholder.textContent = '';
        document.querySelector('#right-menu .loader').style.display = 'none';

    };
    coverImage.src = coverImageUrl;

}

function closeRightMenu() {
    const rightMenu = document.getElementById('right-menu');
    if (!('ontouchstart' in window || navigator.maxTouchPoints)) {
        document.getElementById('isbns').style.width = '80vw';
    }
    rightMenu.classList.remove('open');
    setTimeout(() => {
        rightMenu.style.display = 'none';
        document.body.classList.remove('menu-open');
    }, 300); // Match the duration of the CSS transition

    if ('ontouchstart' in window || navigator.maxTouchPoints) {
        document.getElementById('home-btn').style.display = 'block';
        if (document.getElementById('pixel-identifier-chart').style.display == 'none')
            document.getElementById('toggle-pixel-identifier').style.display = 'block';
    }
}

document.querySelector('#right-menu .close-btn').addEventListener('click', () => {
    closeRightMenu();
});

function updateVisibleBooks(forcedValue = 0) {
    const visibleBooksElement = document.getElementById('visible-books-number');
    if (forcedValue !== 0) {
        visibleBooksElement.textContent = `${forcedValue}`;
        return;
    }
    const bounds = viewer.viewport.getBounds(true);
    const minX = Math.floor(bounds.x * 50000);
    const maxX = Math.floor((bounds.x + bounds.width) * 50000);
    const minY = Math.floor(bounds.y * 50000);
    const maxY = Math.floor((bounds.y + bounds.height) * 50000);
    let visibleISBNs = (maxX - minX) * (maxY - minY);
    if (visibleISBNs > 2000000000) {
        visibleISBNs = 2000000000;
    }
    visibleBooksElement.textContent = `${visibleISBNs}`;
}

function getISBNFromCoordinates(x, y) {
    // Clamp coordinates to valid ranges
    x = Math.max(0, Math.min(49999, x));
    y = Math.max(0, Math.min(39999, y));

    const position = y * 50000 + x;
    const isbnWithoutCheckDigit = 978000000000 + position;
    const sum = Array.from(isbnWithoutCheckDigit.toString().slice(0, 12))
        .reduce((acc, digit, i) => acc + (i % 2 === 0 ? +digit : +digit * 3), 0);
    const checkDigit = (10 - (sum % 10)) % 10;
    const isbn = isbnWithoutCheckDigit * 10 + checkDigit;
    return isbn;
}

function getColorFromCoordinates(x, y) {
    const webpoint = viewer.viewport.imageToViewerElementCoordinates(new OpenSeadragon.Point(x, y));
    const canvas = viewer.drawer.canvas;
    const context = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const pixelData = context.getImageData(webpoint.x * dpr, webpoint.y * dpr, 1, 1).data;
    const color = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, ${pixelData[3] / 255})`;

    return { color, pixelData };
}

function analyzeVisibleColors() {
    if (('ontouchstart' in window || navigator.maxTouchPoints)) {
        return;
    }
    if (viewer.viewport.getZoom() < 50) {
        document.getElementById('available-books-percentage').style.display = 'none';
        return;
    }
    document.getElementById('available-books-percentage').style.display = 'block';
    const bounds = viewer.viewport.getBounds(true);
    const minX = Math.floor(bounds.x * 50000);
    const maxX = Math.floor((bounds.x + bounds.width) * 50000);
    const minY = Math.floor(bounds.y * 50000);
    const maxY = Math.floor((bounds.y + bounds.height) * 50000);

    const totalPixels = (maxX - minX + 1) * (maxY - minY + 1);
    const step = Math.ceil(Math.sqrt(totalPixels / 5000));

    let greenCount = 0;
    let green2Count = 0;
    let orangeCount = 0;
    let yellowCount = 0;
    let redCount = 0;
    let blackCount = 0;
    let whiteCount = 0;
    let totalCount = 0;

    for (let x = minX; x <= maxX; x += step) {
        for (let y = minY; y <= maxY; y += step) {
            const { pixelData } = getColorFromCoordinates(x, y);
            totalCount++;
            if (pixelData[0] === 0 && pixelData[1] === 0 && pixelData[2] === 0) {
                blackCount++;
            } else if (pixelData[0] === 50 && pixelData[1] === 255 && pixelData[2] === 50) {
                greenCount++;
            } else if (pixelData[0] === 255 && pixelData[1] === 50 && pixelData[2] === 50) {
                redCount++;
            } else if (pixelData[0] === 50 && pixelData[1] === 179 && pixelData[2] === 50) {
                green2Count++;
            } else if (pixelData[0] === 255 && pixelData[1] === 127 && pixelData[2] === 0) {
                orangeCount++;
            } else if (pixelData[0] === 255 && pixelData[1] === 255 && pixelData[2] === 0) {
                yellowCount++;
            } else if (pixelData[0] === 255 && pixelData[1] === 255 && pixelData[2] === 255) {
                whiteCount++;
            }
        }
    }

    if ((document.getElementById('dataset-selector').value === 'all_isbns')) {
        let availableBooksPercentage = ((greenCount / (greenCount + redCount)) * 100).toFixed(2);
        let availableInDatasetPercentage = (((greenCount + redCount) / totalCount) * 100).toFixed(2);
        if (greenCount === 0) {
            availableBooksPercentage = 0;
        }
        if (greenCount + redCount === 0) {
            availableInDatasetPercentage = 0;
        }
        document.getElementById('available-books-percentage').innerHTML = `Available in Dataset / Total: ~ ${availableInDatasetPercentage}% <br> Available on Anna's Archive: ~ ${availableBooksPercentage}% `;
    } else if ((document.getElementById('dataset-selector').value === 'all_isbns_with_holdings')) {
        let availableBooksPercentage = ((green2Count / (green2Count + redCount + orangeCount + yellowCount)) * 100).toFixed(2);
        let atRiskPercentage = ((redCount / (redCount + orangeCount + yellowCount)) * 100).toFixed(2);
        let rarePercentage = ((orangeCount / (redCount + orangeCount + yellowCount)) * 100).toFixed(2);
        let availableInDatasetPercentage = (((greenCount + redCount + orangeCount + yellowCount) / totalCount) * 100).toFixed(2);
        [green2Count, redCount, orangeCount, availableInDatasetPercentage].forEach((count, i) => {
            if (count === 0) [availableBooksPercentage, atRiskPercentage, rarePercentage, availableInDatasetPercentage][i] = 0;
        });
        document.getElementById('available-books-percentage').innerHTML = `Available in Dataset / Total: ~ ${availableInDatasetPercentage}% <br> Available on Anna's Archive: ~ ${availableBooksPercentage}%${totalPixels <= 5000 ?
            `<br>Rare (<10 holdings): ~ ${orangeCount}<br>At Risk (<5 holdings): ~ ${redCount}` :
            `<br>Rare / Unavailable (<10 holdings): ~ ${rarePercentage}%<br>At Risk / Unavalable (<5 holdings): ~ ${atRiskPercentage}%`
            }`;
    } else {
        let availableBooksPercentage = ((whiteCount / (whiteCount + blackCount)) * 100).toFixed(2);
        if (whiteCount === 0) {
            availableBooksPercentage = 0;
        }
        document.getElementById('available-books-percentage').textContent = `Available in Dataset: ~ ${availableBooksPercentage}%`;
    }
}

// Add elements to display corner values
const cornerValues = {
    topLeft: document.getElementById('top-left-corner'),
    topRight: document.getElementById('top-right-corner'),
    bottomLeft: document.getElementById('bottom-left-corner'),
    bottomRight: document.getElementById('bottom-right-corner')
};

cornerValues.topLeft.style.top = '1em';
cornerValues.topLeft.style.left = '4em';

cornerValues.topRight.style.top = '1em';
cornerValues.topRight.style.right = '1em';

cornerValues.bottomLeft.style.bottom = '1em';
cornerValues.bottomLeft.style.left = '1em';

cornerValues.bottomRight.style.bottom = '1em';
cornerValues.bottomRight.style.right = '1em';

function updateCornerValues() {
    const bounds = viewer.viewport.getBounds(true);
    const minX = Math.floor(bounds.x * 50000);
    const maxX = Math.floor((bounds.x + bounds.width) * 50000);
    const minY = Math.floor(bounds.y * 50000);
    const maxY = Math.floor((bounds.y + bounds.height) * 50000);

    const topLeft = getISBNFromCoordinates(minX, minY);
    const topRight = getISBNFromCoordinates(maxX, minY);
    const bottomLeft = getISBNFromCoordinates(minX, maxY);
    const bottomRight = getISBNFromCoordinates(maxX, maxY);

    cornerValues.topLeft.textContent = `${topLeft}`;
    cornerValues.topRight.textContent = `${topRight}`;
    cornerValues.bottomLeft.textContent = `${bottomLeft}`;
    cornerValues.bottomRight.textContent = `${bottomRight}`;
}

// Throttle function to limit the rate of function calls
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function (...args) {
        const context = this;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function () {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

// Throttle analyzeVisibleColors to ensure it doesn't get called more than once per second
const throttledAnalyzeVisibleColors = throttle(analyzeVisibleColors, 300);

viewer.addHandler('zoom', () => {
    if (viewer.viewport.getZoom() > 50) {
        viewer.gestureSettingsMouse.clickToZoom = false;
        viewer.container.style.cursor = isPanning ? 'grabbing' : 'pointer';
    } else {
        viewer.gestureSettingsMouse.clickToZoom = true;
        viewer.container.style.cursor = isPanning ? 'grabbing' : 'default';
    }
    updateVisibleBooks();
    updateCornerValues();
    throttledAnalyzeVisibleColors();
});

viewer.addHandler('pan', () => {
    if (isPanning) {
        viewer.container.style.cursor = 'grabbing';
    } else {
        viewer.container.style.cursor = viewer.viewport.getZoom() > 50 ? 'pointer' : 'default';
    }
    updateVisibleBooks();
    updateCornerValues();
    throttledAnalyzeVisibleColors();
});

document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

function handleFullscreenChange() {
    const rightMenu = document.getElementById('right-menu');
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        rightMenu.style.display = 'block';
    } else {
        rightMenu.style.display = 'none';
    }
    viewer.viewport.resize();
    viewer.forceRedraw();
    updateVisibleBooks();
}

document.getElementById('home-btn').addEventListener('click', () => {
    viewer.viewport.goHome();
    updateVisibleBooks(2000000000);
});

document.addEventListener('DOMContentLoaded', function () {
    const coverImage = document.getElementById('cover-image');
    const placeholder = document.getElementById('placeholder');
    const coverContainer = document.getElementById('cover-container');

    coverImage.addEventListener('load', function () {
        const isImageInvalid = coverImage.naturalWidth === 1 && coverImage.naturalHeight === 1;
        coverImage.style.display = isImageInvalid ? 'none' : 'block';
        placeholder.style.display = isImageInvalid ? 'flex' : 'none';
        coverContainer.style.display = 'flex';
    });

    const datasetSelector = document.getElementById('dataset-selector');
    datasetSelector.addEventListener('change', function () {
        const selectedDataset = this.value;
        changeDataset(selectedDataset);
        updateColorBoxes(selectedDataset);
    });

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenBtn.innerHTML = '<span class="material-icons">fullscreen_exit</span>';
        } else {
            fullscreenBtn.innerHTML = '<span class="material-icons">fullscreen</span>';
        }
        viewer.viewport.resize();
        viewer.forceRedraw();
    });
    document.addEventListener('webkitfullscreenchange', () => {
        if (document.webkitFullscreenElement) {
            fullscreenBtn.innerHTML = '<span class="material-icons">fullscreen_exit</span>';
        } else {
            fullscreenBtn.innerHTML = '<span class="material-icons">fullscreen</span>';
        }
        viewer.viewport.resize();
        viewer.forceRedraw();
    });
    document.addEventListener('mozfullscreenchange', () => {
        if (document.mozFullScreenElement) {
            fullscreenBtn.innerHTML = '<span class="material-icons">fullscreen_exit</span>';
        } else {
            fullscreenBtn.innerHTML = '<span class="material-icons">fullscreen</span>';
        }
        viewer.viewport.resize();
        viewer.forceRedraw();
    });
    document.addEventListener('MSFullscreenChange', () => {
        if (document.msFullscreenElement) {
            fullscreenBtn.innerHTML = '<span class="material-icons">fullscreen_exit</span>';
        } else {
            fullscreenBtn.innerHTML = '<span class="material-icons">fullscreen</span>';
        }
        viewer.viewport.resize();
        viewer.forceRedraw();
    });

    const closeBtn = document.querySelector('#right-menu .close-btn');
    closeBtn.addEventListener('click', () => {
        closeRightMenu();
    });

    const countrySelector = document.getElementById('country-selector');
    const addedCountries = new Set();
    const countriesArray = Object.entries(COUNTRIES).map(([key, value]) => ({ key, value }));
    countriesArray.sort((a, b) => a.value.localeCompare(b.value));
    for (const { key, value } of countriesArray) {
        if (!addedCountries.has(value)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = value;
            countrySelector.appendChild(option);
            addedCountries.add(value);
        }
    }

    document.getElementById('country-selector').addEventListener('change', function () {
        const selectedCountry = this.value;
        viewer.clearOverlays();
        if (selectedCountry) {
            highlightCountry(selectedCountry, false);
            zoomToCountry(selectedCountry);
        }
    });

    updateVisibleBooks();
    updateCornerValues();
    updateColorBoxes(document.getElementById('dataset-selector').value);
    document.getElementById('toggle-pixel-identifier').innerHTML = '<span class="material-icons">expand_less</span>';

    // Hide pixel identifier chart if mobile device or width less than 1500px
    if (window.innerWidth < 1500 || 'ontouchstart' in window || navigator.maxTouchPoints) {
        document.getElementById('pixel-identifier-chart').style.display = 'none';
        document.getElementById('toggle-pixel-identifier').style.display = 'block';
        document.getElementById('toggle-pixel-identifier').innerHTML = '<span class="material-icons">expand_more</span>';
    }

    loadAnnotations();

    // Check if the user has seen the help modal before
    const hasSeenHelpModal = localStorage.getItem('hasSeenHelpModal');
    if (!hasSeenHelpModal) {
        document.getElementById('help-modal').style.display = 'block';
        localStorage.setItem('hasSeenHelpModal', 'true');
    }
});

const tooltip = document.getElementById('isbn-tooltip');
let hoverOverlay = null;
let countryOverlay = null;
let hoverPublisherOverlay = null;
let db;
const request = indexedDB.open("ISBNCache", 2); // Increment the version number to 2

request.onupgradeneeded = event => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("publishers")) {
        const objectStore = db.createObjectStore("publishers", { keyPath: "prefix" });
        objectStore.createIndex("isbn", "isbn", { unique: true });
    }
    if (!db.objectStoreNames.contains("openLibrary")) {
        const objectStore = db.createObjectStore("openLibrary", { keyPath: "isbn" });
    }
};

request.onsuccess = event => {
    db = event.target.result;
};

request.onerror = event => {
    console.error("IndexedDB error:", event.target.errorCode);
};

const hoverPublisherHighlightCheckbox = document.getElementById('hover-publisher-highlight-checkbox');

function highlightCountryRange(startX, startY, endX, endY, fromHover = true) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        width: ${endX - startX + 1}px;
        height: ${endY - startY + 1}px;
        position: absolute;
        background-color: rgba(0, 195, 255, 0.49);
    `;
    viewer.addOverlay({
        element: overlay,
        location: viewer.viewport.imageToViewportRectangle(startX, startY, endX - startX + 1, endY - startY + 1),
    });
    if (fromHover) {
        countryOverlay = overlay;
    }
}

function highlightCountry(countryCode, fromHover = true) {
    const countryPrefix = countryCode.replace('-', '');
    const ranges = Object.entries(COUNTRIES)
        .filter(([key, value]) => value === COUNTRIES[countryCode])
        .map(([key, value]) => {
            const prefix = key.replace('-', '');
            const startPosition = parseInt(prefix.padEnd(12, '0')) - 978000000000;
            const endPosition = parseInt(prefix.padEnd(12, '9')) - 978000000000;

            const startX = startPosition % 50000;
            const startY = Math.floor(startPosition / 50000);
            const endX = endPosition % 50000;
            const endY = Math.floor(endPosition / 50000);

            return { startX, startY, endX, endY };
        });

    ranges.forEach(({ startX, startY, endX, endY }) => {
        highlightCountryRange(startX, startY, endX, endY, fromHover);
    });
}

const hoverHighlightCheckbox = document.getElementById('hover-country-highlight-checkbox');

document.getElementById('hover-country-highlight-checkbox').addEventListener('change', function () {
    if (!this.checked) {
        viewer.clearOverlays();
    }
});

const requestOptions = {
    method: "GET",
    redirect: "follow"
};

function getPublisherFromCache(prefix) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["publishers"], "readonly");
        const objectStore = transaction.objectStore("publishers");
        const request = objectStore.get(prefix);

        request.onsuccess = event => resolve(event.target.result);
        request.onerror = event => reject(event.target.errorCode);
    });
}

function addPublisherToCache(data) {
    const transaction = db.transaction(["publishers"], "readwrite");
    const objectStore = transaction.objectStore("publishers");
    objectStore.add(data);
}

function getOpenLibraryDataFromCache(isbn) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["openLibrary"], "readonly");
        const objectStore = transaction.objectStore("openLibrary");
        const request = objectStore.get(isbn);

        request.onsuccess = event => resolve(event.target.result);
        request.onerror = event => reject(event.target.errorCode);
    });
}

function addOpenLibraryDataToCache(data) {
    const transaction = db.transaction(["openLibrary"], "readwrite");
    const objectStore = transaction.objectStore("openLibrary");
    objectStore.add(data);
}

let lastApiCallTime = 0;

const mouseTracker = new OpenSeadragon.MouseTracker({
    element: viewer.container,
    moveHandler: throttle(async function (event) {
        if (isPanning) {
            return;
        }
        if (document.querySelector('.a9s-annotation:hover') || shiftButtonPressed || document.querySelector('.openseadragon-container .navigator:hover')) {
            updateTooltipDisplay(false);
            viewer.clearOverlays();
            return;
        }
        const webPoint = event.position;
        const viewportPoint = viewer.viewport.pointFromPixel(webPoint);
        const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

        const x = Math.floor(imagePoint.x);
        const y = Math.floor(imagePoint.y);

        const position = y * 50000 + x;
        if (x < 0 || x >= 50000 || y < 0 || y >= 40000) {
            updateTooltipDisplay(false);
            if (countryOverlay) {
                viewer.removeOverlay(countryOverlay);
                countryOverlay = null;
            }
            if (hoverPublisherOverlay) {
                viewer.removeOverlay(hoverPublisherOverlay);
                hoverPublisherOverlay = null;
            }
            return;
        }
        const isbnWithoutCheckDigit = 978000000000 + position;

        const sum = Array.from(isbnWithoutCheckDigit.toString().slice(0, 12))
            .reduce((acc, digit, i) => acc + (i % 2 === 0 ? +digit : +digit * 3), 0);
        const checkDigit = (10 - (sum % 10)) % 10;

        const isbn = isbnWithoutCheckDigit * 10 + checkDigit;

        const countrySelector = document.getElementById('country-selector');
        const selectedCountry = countrySelector.value;
        if (selectedCountry || !hoverHighlightCheckbox.checked) {
            if (viewer.viewport.getZoom() < 50) {
                updateTooltipDisplay(false);
                if (countryOverlay) {
                    viewer.removeOverlay(countryOverlay);
                    countryOverlay = null;
                }
                return;
            }
        }

        let country = 'Unknown';
        for (const [key, value] of Object.entries(COUNTRIES)) {
            if (isbn.toString().startsWith(key.replace('-', ''))) {
                country = value;
                if (viewer.viewport.getZoom() < 50) {
                    viewer.clearOverlays();
                    highlightCountry(key);
                    tooltip.innerHTML = `Country</b>: ${country}`;
                    updateTooltipDisplay(true, { x: webPoint.x, y: webPoint.y });
                }
                break;
            }
        }

        const canvas = viewer.drawer.canvas;
        const context = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const pixelData = context.getImageData(webPoint.x * dpr, webPoint.y * dpr, 1, 1).data;
        let message = '';
        if ((document.getElementById('dataset-selector').value === 'all_isbns_with_holdings') &&
            (pixelData[0] === 255 && pixelData[1] === 50 && pixelData[2] === 50)) {
            message = 'At Risk, held by < 5 Libraries <br>Not available on Anna\'s Archive';;
        } else if ((pixelData[0] === 255 && pixelData[1] === 50 && pixelData[2] === 50) ||
            (pixelData[0] === 255 && pixelData[1] === 255 && pixelData[2] === 0)) {
            message = 'Not available on Anna\'s Archive';
        } else if ((pixelData[0] === 50 && pixelData[1] === 255 && pixelData[2] === 50) ||
            (pixelData[0] === 50 && pixelData[1] === 179 && pixelData[2] === 50)) {
            message = 'Available on Anna\'s Archive';
        } else if (pixelData[0] === 0 && pixelData[1] === 0 && pixelData[2] === 0) {
            message = 'ISBN doesn\'t exist';
        } else if (pixelData[0] === 255 && pixelData[1] === 255 && pixelData[2] === 255) {
            message = 'ISBN belongs to the dataset';
        } else if (pixelData[0] === 255 && pixelData[1] === 127 && pixelData[2] === 0) {
            message = 'Held by < 10 Libraries <br>Not available on Anna\'s Archive';
        }

        let publisher = '';
        const isbn13 = isbn.toString();
        let cachedPublisher = null;
        let prefix = '';
        let publisherNotFound = true;

        // Check cache for publisher information
        for (let i = isbn13.length; i > 0; i--) {
            prefix = isbn13.slice(0, i);
            cachedPublisher = await getPublisherFromCache(prefix);
            if (cachedPublisher) {
                publisher = cachedPublisher.publisher;
                publisherNotFound = false;
                if (hoverPublisherHighlightCheckbox.checked && prefix != '') {
                    highlightPublisherRange(prefix);
                }
                break;
            }
        }

        const currentTime = Date.now();
        if (!cachedPublisher && viewer.viewport.getZoom() >= 50 && (currentTime - lastApiCallTime) >= API_CALL_COOLDOWN_PERIOD && !(pixelData[0] === 0 && pixelData[1] === 0 && pixelData[2] === 0)) {
            lastApiCallTime = currentTime;
            try {
                const response = await fetch(`${BACKEND_URL}/getPublisher?isbn13=${isbn13}`, requestOptions);
                const result = await response.json();
                publisher = result.publisher;
                prefix = result.prefix;
                tooltip.innerHTML = `<b>ISBN</b>: ${isbn}<br><b>Country</b>: ${country}${publisher ? `<br><b>Publisher</b>: ${publisher}` : ''}${message ? `<br>${message}` : ''}`;
                addPublisherToCache({ prefix: result.prefix, publisher: result.publisher });
                if (hoverPublisherHighlightCheckbox.checked && prefix != '') {
                    highlightPublisherRange(prefix);
                }
                publisherNotFound = false;
            } catch (error) {
                console.error('Error fetching publisher:', error);
            }
        }

        if (viewer.viewport.getZoom() >= 50) {
            if (publisherNotFound) {
                tooltip.innerHTML = `<b>ISBN</b>: ${isbn}<br><b>Country</b>: ${country}${message ? `<br>${message}` : ''}`;
            } else {
                tooltip.innerHTML = `<b>ISBN</b>: ${isbn}<br><b>Country</b>: ${country}${publisher ? `<br><b>Publisher</b>: ${publisher}` : ''}${message ? `<br>${message}` : ''}`;
            }
            updateTooltipDisplay(true, { x: webPoint.x, y: webPoint.y });
            document.getElementById('isbns').classList.add('hover-cursor');
        } else {
            document.getElementById('isbns').classList.remove('hover-cursor');
        }
        if (viewer.viewport.getZoom() >= 50) {
            if (hoverOverlay) {
                viewer.removeOverlay(hoverOverlay);
            }
            const overlay = document.createElement('div');
            // Calculate contrasting color by inverting the color
            const borderColor = `rgba(${255 - pixelData[0]}, ${255 - pixelData[1]}, ${255 - pixelData[2]}, 0.8)`;

            // Add cover image if zoom level is high enough and pixel is not black
            let overlayContent = '';
            if (viewer.viewport.getZoom() > 8000 && !(pixelData[0] === 0 && pixelData[1] === 0 && pixelData[2] === 0)) {
                overlayContent = `
                <img src="https://images.isbndb.com/covers/${String(isbn).slice(-4, -2)}/${String(isbn).slice(-2)}/${isbn}.jpg" 
                 style="width: 9em; height: 12em; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); object-fit: cover;"
                 onerror="this.style.display='none'">
            `;
            }

            overlay.style.cssText = `
            border: 3px solid ${borderColor};
            width: 10px; 
            height: 10px; 
            position: absolute;
            box-sizing: border-box;
            `;
            overlay.innerHTML = overlayContent;

            viewer.addOverlay({
                element: overlay,
                location: viewer.viewport.imageToViewportRectangle(x, y, 1, 1),
            });
            hoverOverlay = overlay;
            viewer.container.style.cursor = 'pointer';
        }
    }, 20),
    leaveHandler: function () {
        const countrySelector = document.getElementById('country-selector');
        if (!countrySelector.value && !document.body.classList.contains('menu-open')) {
            viewer.clearOverlays();
        }

        setTimeout(() => {
            updateTooltipDisplay(false);
            if (hoverOverlay) {
                viewer.removeOverlay(hoverOverlay);
                hoverOverlay = null;
            }
            if (countryOverlay) {
                viewer.removeOverlay(countryOverlay);
                countryOverlay = null;
            }
            if (hoverPublisherOverlay) {
                viewer.removeOverlay(hoverPublisherOverlay);
                hoverPublisherOverlay = null;
            }
        }, 100);

        document.getElementById('isbns').classList.remove('hover-cursor');
    }
});

function highlightPublisherRange(prefix) {
    if (hoverPublisherOverlay) {
        viewer.removeOverlay(hoverPublisherOverlay);
    }
    const startPosition = parseInt(prefix.padEnd(12, '0')) - 978000000000;
    const endPosition = parseInt(prefix.padEnd(12, '9')) - 978000000000;

    const startX = startPosition % 50000;
    const startY = Math.floor(startPosition / 50000);
    const endX = endPosition % 50000;
    const endY = Math.floor(endPosition / 50000);

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        width: ${endX - startX + 1}px;
        height: ${endY - startY + 1}px;
        position: absolute;
        background-color: rgba(255, 195, 0, 0.49);
    `;
    viewer.addOverlay({
        element: overlay,
        location: viewer.viewport.imageToViewportRectangle(startX, startY, endX - startX + 1, endY - startY + 1),
    });
    hoverPublisherOverlay = overlay;
}

mouseTracker.setTracking(true);

document.getElementById('isbn-input').addEventListener('keypress', async function (event) {
    if (event.key === 'Enter') {
        handleIsbnInput(event.target.value);
    }
});

document.getElementById('isbn-input').addEventListener('input', async function (event) {
    if (event.inputType === 'insertText' && event.data === '\n') {
        handleIsbnInput(event.target.value);
    }
});

async function handleIsbnInput(isbnInput) {
    if (isbnInput.length === 13) {
        const isbnWithoutCheckDigit = isbnInput.slice(0, 12);
        const position = parseInt(isbnWithoutCheckDigit) - 978000000000;
        const x = position % 50000;
        const y = Math.floor(position / 50000);

        const viewportPoint = viewer.viewport.imageToViewportCoordinates(x + 0.5, y + 0.5);
        if (viewer.viewport.getZoom() >= 600) {
            viewer.viewport.zoomTo(0.5, viewportPoint, false);
            setTimeout(async () => {
                viewer.viewport.panTo(viewportPoint, true);
                viewer.viewport.zoomTo(900, viewportPoint, false);
                if ('ontouchstart' in window || navigator.maxTouchPoints) {
                    viewer.viewport.zoomTo(2000, viewportPoint, false);
                }
                setTimeout(async () => {
                    const webPoint = viewer.viewport.pixelFromPoint(viewportPoint);
                    // Get publisher info before showing right menu
                    try {
                        const response = await fetch(`${BACKEND_URL}/getPublisher?isbn13=${isbnInput}`, requestOptions);
                        const result = await response.json();
                        if (result.publisher && result.prefix) {
                            addPublisherToCache({ prefix: result.prefix, publisher: result.publisher });
                        }
                    } catch (error) {
                        console.error('Error fetching publisher:', error);
                    }
                    await showRightMenu({ position: webPoint });
                }, 1000);
            }, 800);
        } else {
            setTimeout(async () => {
                viewer.viewport.panTo(viewportPoint, true);
                viewer.viewport.zoomTo(900, viewportPoint, false);
                if ('ontouchstart' in window || navigator.maxTouchPoints) {
                    viewer.viewport.zoomTo(2000, viewportPoint, false);
                }
                setTimeout(async () => {
                    const webPoint = viewer.viewport.pixelFromPoint(viewportPoint);
                    // Get publisher info before showing right menu
                    try {
                        const response = await fetch(`${BACKEND_URL}/getPublisher?isbn13=${isbnInput}`, requestOptions);
                        const result = await response.json();
                        if (result.publisher && result.prefix) {
                            addPublisherToCache({ prefix: result.prefix, publisher: result.publisher });
                        }
                    } catch (error) {
                        console.error('Error fetching publisher:', error);
                    }
                    await showRightMenu({ position: webPoint });
                }, 1000);
            }, 200);
        }
    } else {
        alert('Please enter a valid 13-digit ISBN.');
    }
}

function updateColorBoxes(dataset) {
    const pixelIdentifierChart = document.getElementById('pixel-identifier-chart');
    pixelIdentifierChart.innerHTML = '';

    if (dataset === 'all_isbns') {
        pixelIdentifierChart.innerHTML = `
            <div class="pixel-identifier-item">
                <div class="color-box" style="background-color: rgb(0, 0, 0);"></div>
                <span>Unavailable in Dataset</span>
            </div>
            <div class="pixel-identifier-item">
                <div class="color-box" style="background-color: rgb(255, 50, 50);"></div>
                <span>Unavailable on Anna's Archive</span>
            </div>
            <div class="pixel-identifier-item">
                <div class="color-box" style="background-color: rgb(50, 255, 50);"></div>
                <span>Available on Anna's Archive</span>
            </div>
            <button class="close-btn-pixel-identifier material-icons">close</button>
        `;
    } else if (dataset === 'all_isbns_with_holdings') {
        pixelIdentifierChart.innerHTML = `
            <div class="pixel-identifier-item">
                <div class="color-box" style="background-color: rgb(0, 0, 0);"></div>
                <span>Unavailable in Dataset</span>
            </div>
            <div class="pixel-identifier-item">
                <div class="color-box" style="background-color: rgb(50, 179, 50);"></div>
                <span>Available on Anna's Archive</span>
            </div>
            <div class="pixel-identifier-item">
                <div class="color-box" style="background-color: rgb(255, 255, 0);"></div>
                <span>Unavailable on Anna's Archive</span>
            </div>
            <div class="pixel-identifier-item">
                <div class="color-box" style="background-color: rgb(255, 127, 0);"></div>
                <span>Rare and Unavailable (< 10 Holdings)</span>
            </div>
            <div class="pixel-identifier-item">
                <div class="color-box" style="background-color: rgb(255, 50, 50);"></div>
                <span>At risk and Unavailable (< 5 Holdings)</span>
            </div>
            <button class="close-btn-pixel-identifier material-icons">close</button>
        `;
    } else {
        pixelIdentifierChart.innerHTML = `
            <div class="pixel-identifier-item">
                <div class="color-box" style="background-color: rgb(0, 0, 0);"></div>
                <span>Unavailable in Dataset</span>
            </div>
            <div class="pixel-identifier-item">
                <div class="color-box" style="background-color: rgb(255, 255, 255);"></div>
                <span>Available in Dataset</span>
            </div>
            <button class="close-btn-pixel-identifier material-icons">close</button>
        `;
    }

    // Add event listener for the close button in the pixel identifier box
    document.querySelector('.close-btn-pixel-identifier').addEventListener('click', function () {
        document.getElementById('pixel-identifier-chart').style.display = 'none';
        document.getElementById('toggle-pixel-identifier').style.display = 'block';
        document.getElementById('toggle-pixel-identifier').innerHTML = '<span class="material-icons">expand_more</span>';
    });
}

document.getElementById('toggle-pixel-identifier').addEventListener('click', function () {
    const pixelIdentifierChart = document.getElementById('pixel-identifier-chart');
    if (pixelIdentifierChart.style.display === 'none') {
        pixelIdentifierChart.style.display = 'block';
        document.getElementById('toggle-pixel-identifier').style.display = 'none';
    }
});

const toggleDarkModeBtn = document.getElementById('toggle-dark-mode');
toggleDarkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const icon = document.getElementById('toggle-dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        icon.textContent = 'light_mode';
        localStorage.setItem('theme', 'dark');
    } else {
        icon.textContent = 'dark_mode';
        localStorage.setItem('theme', 'light');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('toggle-dark-mode').textContent = 'light_mode';
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('toggle-dark-mode').textContent = 'dark_mode';
    }
});

function zoomToCountry(countryCode) {
    const ranges = Object.entries(COUNTRIES)
        .filter(([, value]) => value === COUNTRIES[countryCode])
        .map(([key]) => {
            const prefix = key.replace('-', '');
            const startPosition = parseInt(prefix.padEnd(12, '0')) - 978000000000;
            const endPosition = parseInt(prefix.padEnd(12, '9')) - 978000000000;

            const startX = startPosition % 50000;
            const startY = Math.floor(startPosition / 50000);
            const endX = endPosition % 50000;
            const endY = Math.floor(endPosition / 50000);

            return { startX, startY, endX, endY };
        });

    if (ranges.length > 0) {
        const { startX, startY, endX, endY } = ranges[0];
        const centerX = (startX + endX) / 2;
        const areaHeight = endY - startY + 1;
        const centerY = startY + (areaHeight / 2); // Always use true center
        const areaWidth = endX - startX;

        let zoomLevel;
        if (areaHeight <= 50 && areaHeight > 5) {
            zoomLevel = 1200;

        } else if (areaHeight <= 250 && areaHeight > 50) {
            zoomLevel = 25;
        } else if (areaHeight <= 5) {
            zoomLevel = 5000;
        } else {
            zoomLevel = Math.max(1, Math.min(25000 / Math.max(areaWidth, areaHeight), 1000));
        }
        const viewportPoint = viewer.viewport.imageToViewportCoordinates(centerX, centerY);
        if (viewer.viewport.getZoom() >= 500) {
            // First zoom out completely
            viewer.viewport.zoomTo(0.5, null, false);
            // Then pan and zoom to the target after a delay
            setTimeout(() => {
                viewer.viewport.panTo(viewportPoint, false);
                setTimeout(() => {
                    viewer.viewport.zoomTo(zoomLevel, null, false);
                }, 400);
            }, 600);
        } else {
            viewer.viewport.panTo(viewportPoint, false);
            viewer.viewport.zoomTo(zoomLevel, null, false);
        }
    }
}

document.getElementById('help-btn').addEventListener('click', () => {
    document.getElementById('help-modal').style.display = 'block';
});

document.querySelector('#help-modal .close-btn').addEventListener('click', () => {
    document.getElementById('help-modal').style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === document.getElementById('help-modal')) {
        document.getElementById('help-modal').style.display = 'none';
    }
});

function updateTooltipDisplay(show, position = { x: 0, y: 0 }) {
    tooltip.style.display = show ? 'block' : 'none';
    tooltip.style.left = `${position.x + 10}px`;
    tooltip.style.top = `${position.y + 10}px`;
}