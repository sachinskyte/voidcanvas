// Main elements
const intro = document.querySelector('.intro');
const startButton = document.querySelector('.start-button');
const canvasContainer = document.querySelector('.canvas-container');
const canvas = document.getElementById('canvas');
const toolbar = document.querySelector('.toolbar');
const pencilTool = document.getElementById('pencil-tool');
const textTool = document.getElementById('text-tool');
const eraserTool = document.getElementById('eraser-tool');
const saveButton = document.getElementById('save-button');
const clearButton = document.getElementById('clear-button');
const textCursor = document.getElementById('text-cursor');
const textOverlay = document.getElementById('text-overlay');

// Canvas context
const ctx = canvas.getContext('2d');

// Drawing state
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentTool = 'pencil';

// Text input state
let isTyping = false;
let currentText = '';
let cursorPosition = 0;
let textX = 0;
let textY = 0;
const maxLineWidth = 500; // Maximum width for text wrapping

// Initialize
function init() {
    resizeCanvas();
    bindEvents();
    
    // Initialize canvas with white background
    fillCanvasBackground();
}

// Fill canvas with white background
function fillCanvasBackground() {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Start button event listener
startButton.addEventListener('click', () => {
    intro.style.display = 'none';
    toolbar.style.display = 'flex';
    
    // Request fullscreen if available
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log("Fullscreen request failed:", err);
        });
    }
});

// Bind all event listeners
function bindEvents() {
    // Tool selection
    pencilTool.addEventListener('click', () => {
        setTool('pencil');
    });

    textTool.addEventListener('click', () => {
        setTool('text');
    });

    eraserTool.addEventListener('click', () => {
        setTool('eraser');
    });

    // Clear button
    clearButton.addEventListener('click', () => {
        // Fill with white instead of clearing to transparent
        fillCanvasBackground();
        
        // Also clear any text input
        endTextInput();
    });

    // Save button
    saveButton.addEventListener('click', saveCanvas);

    // Drawing events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('touchstart', handleTouchStart);
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove);
    
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('touchend', stopDrawing);
    
    canvas.addEventListener('mouseout', stopDrawing);

    // Text input events
    document.addEventListener('keydown', handleKeyDown);
    
    // Canvas click for text positioning
    canvas.addEventListener('click', handleCanvasClick);

    // Window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Auto-hide toolbar when not used for a while
    let toolbarTimeout;
    document.addEventListener('mousemove', () => {
        toolbar.style.opacity = '0.8';
        clearTimeout(toolbarTimeout);
        toolbarTimeout = setTimeout(() => {
            if (!toolbar.matches(':hover')) {
                toolbar.style.opacity = '0.15';
            }
        }, 3000);
    });
}

// Set the current tool
function setTool(tool) {
    // If changing from text tool, finish any text input
    if (currentTool === 'text' && isTyping) {
        finishTextInput();
    }
    
    currentTool = tool;
    
    // Update UI
    [pencilTool, textTool, eraserTool].forEach(toolBtn => {
        toolBtn.classList.remove('active');
    });

    // Set active tool
    if (tool === 'pencil') {
        pencilTool.classList.add('active');
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        canvas.style.cursor = 'crosshair';
    } else if (tool === 'text') {
        textTool.classList.add('active');
        canvas.style.cursor = 'text';
    } else if (tool === 'eraser') {
        eraserTool.classList.add('active');
        ctx.lineWidth = 20;
        ctx.strokeStyle = '#fff';
        canvas.style.cursor = 'crosshair';
    }
}

// Resize the canvas to match window size
function resizeCanvas() {
    // Save the current drawing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Set canvas dimensions to match the window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Fill with white background
    fillCanvasBackground();
    
    // Restore the drawing
    ctx.putImageData(imageData, 0, 0);
    
    // Set canvas styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (currentTool === 'pencil') {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
    } else if (currentTool === 'eraser') {
        ctx.lineWidth = 20;
        ctx.strokeStyle = '#fff';
    }
}

// Mouse/Touch event handlers
function handleMouseDown(e) {
    if (currentTool === 'text') {
        if (isTyping) {
            finishTextInput();
        }
        startTextInput(e.offsetX, e.offsetY);
    } else {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
    }
}

function handleCanvasClick(e) {
    if (currentTool === 'text' && !isTyping) {
        startTextInput(e.offsetX, e.offsetY);
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        if (currentTool === 'text') {
            if (isTyping) {
                finishTextInput();
            }
            startTextInput(x, y);
        } else {
            isDrawing = true;
            [lastX, lastY] = [x, y];
        }
    }
}

function handleMouseMove(e) {
    if (!isDrawing || currentTool === 'text') return;
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing || currentTool === 'text') return;
    
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        [lastX, lastY] = [x, y];
    }
}

function stopDrawing() {
    isDrawing = false;
}

// Text input functions
function startTextInput(x, y) {
    isTyping = true;
    currentText = '';
    cursorPosition = 0;
    textX = x;
    textY = y;
    
    // Clear previous text overlay
    textOverlay.textContent = '';
    
    // Position and show the cursor
    updateCursorPosition();
    textCursor.style.display = 'block';
    textOverlay.style.display = 'block';
    
    // Set initial position for text overlay
    textOverlay.style.left = `${x}px`;
    textOverlay.style.top = `${y - 16}px`; // Adjust for text baseline

    // Set max width for text overlay to enable wrapping
    textOverlay.style.maxWidth = `${maxLineWidth}px`;
    textOverlay.style.wordWrap = 'break-word';
}

function updateCursorPosition() {
    // Create a temporary span to measure text width
    const tempSpan = document.createElement('span');
    tempSpan.style.font = '16px "Helvetica Neue", Arial, sans-serif';
    tempSpan.style.position = 'absolute';
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.whiteSpace = 'pre-wrap';
    tempSpan.style.wordWrap = 'break-word';
    tempSpan.style.maxWidth = `${maxLineWidth}px`;
    
    // Insert text up to cursor position
    tempSpan.textContent = currentText.substring(0, cursorPosition);
    document.body.appendChild(tempSpan);
    
    // Get the position of the cursor
    const range = document.createRange();
    const textNode = tempSpan.firstChild;
    
    if (textNode) {
        range.setStart(textNode, cursorPosition);
        range.setEnd(textNode, cursorPosition);
        const rect = range.getBoundingClientRect();
        
        // Calculate position relative to text start
        const textOverlayRect = textOverlay.getBoundingClientRect();
        const offsetX = rect.left - textOverlayRect.left;
        const offsetY = rect.top - textOverlayRect.top;
        
        // Position the cursor
        textCursor.style.left = `${textX + offsetX}px`;
        textCursor.style.top = `${textY - 16 + offsetY}px`;
    } else {
        // If there's no text yet, position at the start
        textCursor.style.left = `${textX}px`;
        textCursor.style.top = `${textY - 16}px`;
    }
    
    // Clean up
    document.body.removeChild(tempSpan);
}

function handleKeyDown(e) {
    if (!isTyping) return;
    
    // Handle special keys
    if (e.key === 'Escape') {
        endTextInput();
        return;
    }
    
    if (e.key === 'Enter') {
        if (e.shiftKey) {
            // Add newline
            currentText = currentText.substring(0, cursorPosition) + '\n' + currentText.substring(cursorPosition);
            cursorPosition++;
        } else {
            // Finish text input
            finishTextInput();
            return;
        }
    } 
    else if (e.key === 'Backspace') {
        if (cursorPosition > 0) {
            currentText = currentText.substring(0, cursorPosition - 1) + currentText.substring(cursorPosition);
            cursorPosition--;
        }
    }
    else if (e.key === 'Delete') {
        if (cursorPosition < currentText.length) {
            currentText = currentText.substring(0, cursorPosition) + currentText.substring(cursorPosition + 1);
        }
    }
    else if (e.key === 'ArrowLeft') {
        if (cursorPosition > 0) {
            cursorPosition--;
        }
    }
    else if (e.key === 'ArrowRight') {
        if (cursorPosition < currentText.length) {
            cursorPosition++;
        }
    }
    else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Regular character input
        currentText = currentText.substring(0, cursorPosition) + e.key + currentText.substring(cursorPosition);
        cursorPosition++;
    }
    
    // Update displayed text
    textOverlay.textContent = currentText;
    updateCursorPosition();
    
    // Prevent default behavior for handled keys
    e.preventDefault();
}

function finishTextInput() {
    if (currentText.trim() !== '') {
        drawTextToCanvas();
    }
    endTextInput();
}

function endTextInput() {
    isTyping = false;
    textCursor.style.display = 'none';
    textOverlay.style.display = 'none';
    textOverlay.textContent = ''; // Clear the text overlay
    currentText = '';
}

function drawTextToCanvas() {
    ctx.font = '16px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#000';
    
    // Create a temporary element to measure wrapped text
    const tempDiv = document.createElement('div');
    tempDiv.style.font = ctx.font;
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.width = `${maxLineWidth}px`;
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.style.wordWrap = 'break-word';
    tempDiv.textContent = currentText;
    document.body.appendChild(tempDiv);
    
    // Measure line heights
    const computedStyle = window.getComputedStyle(tempDiv);
    const lineHeight = parseInt(computedStyle.lineHeight) || 20;
    
    // Generate wrapped text lines using canvas context
    const words = currentText.split(' ');
    let line = '';
    const lines = [];
    
    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxLineWidth && i > 0) {
            lines.push(line);
            line = words[i] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    
    // Handle manual line breaks
    const finalLines = [];
    lines.forEach(line => {
        const segments = line.split('\n');
        segments.forEach((segment, index) => {
            finalLines.push(segment);
        });
    });
    
    // Draw text to canvas
    finalLines.forEach((line, index) => {
        ctx.fillText(line, textX, textY + index * lineHeight);
    });
    
    // Clean up
    document.body.removeChild(tempDiv);
}

// Save canvas as PNG with white background
function saveCanvas() {
    // If currently typing, finish the text first
    if (isTyping) {
        finishTextInput();
    }
    
    // Create temporary canvas to ensure white background
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // Fill with white background
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw original canvas content
    tempCtx.drawImage(canvas, 0, 0);
    
    // Save as PNG
    const link = document.createElement('a');
    link.download = 'voidcanvas.png';
    link.href = tempCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialize the app
init();