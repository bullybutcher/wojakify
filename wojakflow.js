//paste into text area in opencvdemo.html when opened with Live Server
function ramerDouglasPeucker(points, epsilon) {
    if (points.length < 3) return points;
    
    let dmax = 0;
    let index = 0;
    let end = points.length - 1;
    
    for (let i = 1; i < end; i++) {
        let d = perpendicularDistance(points[i], points[0], points[end]);
        if (d > dmax) {
            index = i;
            dmax = d;
        }
    }
    
    if (dmax > epsilon) {
        let recResults1 = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
        let recResults2 = ramerDouglasPeucker(points.slice(index), epsilon);
        return recResults1.slice(0, -1).concat(recResults2);
    } else {
        return [points[0], points[end]];
    }
}

function perpendicularDistance(point, lineStart, lineEnd) {
    let dx = lineEnd.x - lineStart.x;
    let dy = lineEnd.y - lineStart.y;
    let mag = dx * dx + dy * dy;
    
    if (mag === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    
    let u = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / mag;
    u = Math.max(0, Math.min(1, u));
    
    let x = lineStart.x + u * dx;
    let y = lineStart.y + u * dy;
    
    return Math.hypot(point.x - x, point.y - y);
}

function rasterToVector(imageData, width, height, epsilon) {
    let vectors = [];
    let visited = new Set();

    function getPixel(x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) return 255;
        return imageData[y * width + x];
    }

    function traceContour(startX, startY) {
        let contour = [];
        let x = startX, y = startY;
        let directions = [
            [1, 0], [1, 1], [0, 1], [-1, 1],
            [-1, 0], [-1, -1], [0, -1], [1, -1]
        ];
        let dirIndex = 0;

        do {
            contour.push({ x, y });
            visited.add(y * width + x);
            
            let foundNext = false;
            for (let i = 0; i < directions.length; i++) {
                let newIndex = (dirIndex + i) % directions.length;
                let [dx, dy] = directions[newIndex];
                let newX = x + dx, newY = y + dy;
                
                if (getPixel(newX, newY) === 0 && !visited.has(newY * width + newX)) {
                    x = newX;
                    y = newY;
                    dirIndex = (newIndex + 6) % 8; 
                    foundNext = true;
                    break;
                }
            }
            if (!foundNext) break;
        } while (x !== startX || y !== startY);
        
        if (contour.length > 5) {
            let simplifiedContour = ramerDouglasPeucker(contour, epsilon);
            vectors.push(simplifiedContour);
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (getPixel(x, y) === 0 && !visited.has(y * width + x)) {
                traceContour(x, y);
            }
        }
    }
    return vectors;
}

function drawVectorsOnCanvas(vectors, canvasId, width, height) {
    let canvas = document.getElementById(canvasId);
    canvas.width = width;
    canvas.height = height;
    
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    
    vectors.forEach(row => {
        ctx.beginPath();
        ctx.moveTo(row[0].x, row[0].y);
        row.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.stroke();
    });
}

let src = cv.imread("canvasInput");
const gray = new cv.Mat();
cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

// Apply bilateral filter to smooth the image
const filtered = new cv.Mat();
cv.bilateralFilter(gray, filtered, 9, 75, 75);

// Apply adaptive thresholding
const thresholded = new cv.Mat();
cv.adaptiveThreshold(filtered, thresholded, 255, 
                     cv.ADAPTIVE_THRESH_GAUSSIAN_C, 
                     cv.THRESH_BINARY, 23, 3);

// Morphological closing to simplify contours
const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
const closed = new cv.Mat();
cv.morphologyEx(thresholded, closed, cv.MORPH_CLOSE, kernel);

// Convert OpenCV Mat to raw pixel array
let pixelArray = new Uint8ClampedArray(closed.data);
let vectorizedOutput = rasterToVector(pixelArray, closed.cols, closed.rows, 0.5);

function vectorToSVG(vectorizedOutput, width, height) {
    let svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" stroke="black" fill="none">`;
    let svgPaths = vectorizedOutput.map(row => {
        if (row.length < 2) return ""; // Ignore isolated points
        let pathData = `M${row[0].x},${row[0].y} ` + row.map(p => `L${p.x},${p.y}`).join(" ");
        return `<path d="${pathData}" stroke-width="2"/>`;
    }).join("\n");
    let svgFooter = `</svg>`;
    
    return svgHeader + "\n" + svgPaths + "\n" + svgFooter;
}

function saveAsSVG(vectorizedOutput, width, height, filename = "output.svg") {
    let svgContent = vectorToSVG(vectorizedOutput, width, height);
    let blob = new Blob([svgContent], { type: "image/svg+xml" });
    let url = URL.createObjectURL(blob);

    // Trigger the download without adding elements to the DOM
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            let a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
        })
        .catch(console.error);
}

function drawBezierVectorsOnCanvas(vectors, canvasId, width, height) {
    let canvas = document.getElementById(canvasId);
    canvas.width = width;
    canvas.height = height;
    
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1.5; // Adjust this to change thickness

    vectors.forEach(points => {
        if (points.length < 2) return; // Skip if not enough points

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length - 2; i++) {
            let xc = (points[i].x + points[i + 1].x) / 2;
            let yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }

        // Ensure last point connects smoothly
        let last = points.length - 1;
        ctx.quadraticCurveTo(points[last - 1].x, points[last - 1].y, points[last].x, points[last].y);


        ctx.lineCap = "round";  // Makes line ends round
        ctx.lineJoin = "round";  // Makes line connections round
        ctx.stroke();
    });
}


//saveAsSVG(vectorizedOutput, src.width, src.height, "jakquiad.svg");

drawVectorsOnCanvas(vectorizedOutput, "canvasOutput", closed.cols, closed.rows);


// Suppose 'gapCanvas' is your canvas with the final lines
let gapMat = cv.imread('canvasOutput');

let sara = new cv.Mat();

// Larger kernel or multiple iterations
let kornel = cv.Mat.ones(3, 3, cv.CV_8U);

cv.morphologyEx(gapMat, sara, cv.MORPH_CLOSE, kornel, new cv.Point(-1, -1), 1);

let nipis = new cv.Mat();
// Increase iterations if lines are still broken
cv.erode(sara, nipis, kornel, new cv.Point(-1, -1), 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());


cv.imshow('canvasOutput', nipis);

// Convert OpenCV Mat to raw pixel array
//let pxlArray = new Uint8ClampedArray(nipis.data);
//let revectorizedOutput = rasterToVector(pxlArray, nipis.cols, nipis.rows,1);

//drawBezierVectorsOnCanvas(revectorizedOutput, "canvasOutput", closed.cols, closed.rows);

gapMat.delete();
sara.delete();
nipis.delete();
kornel.delete();


// Cleanup
src.delete();
gray.delete();
filtered.delete();
thresholded.delete();
kernel.delete();
closed.delete();
