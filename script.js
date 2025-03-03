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
const maxLineWidth = 500;
const fontSize = 20;
const fontFamily = '"Helvetica Neue", Arial, sans-serif';
const lineHeight = fontSize * 1.2;

// Text blocks storage
let textBlocks = [];
let editingBlockIndex = -1;

// Initialize
function init() {
    resizeCanvas();
    bindEvents();
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
    
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log("Fullscreen request failed:", err);
        });
    }
});

// Bind all event listeners
function bindEvents() {
    pencilTool.addEventListener('click', () => setTool('pencil'));
    textTool.addEventListener('click', () => setTool('text'));
    eraserTool.addEventListener('click', () => setTool('eraser'));
    clearButton.addEventListener('click', clearCanvas);
    saveButton.addEventListener('click', saveCanvas);
    
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    document.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', resizeCanvas);
    
    // Auto-hide toolbar
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

// Clear canvas
function clearCanvas() {
    fillCanvasBackground();
    endTextInput();
    textBlocks = [];
}

// Set the current tool
function setTool(tool) {
    if (currentTool === 'text' && isTyping) {
        saveCurrentTextBlock();
    }
    
    currentTool = tool;
    
    [pencilTool, textTool, eraserTool].forEach(toolBtn => {
        toolBtn.classList.remove('active');
    });

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

// Resize the canvas
function resizeCanvas() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    fillCanvasBackground();
    ctx.putImageData(imageData, 0, 0);
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (currentTool === 'pencil') {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
    } else if (currentTool === 'eraser') {
        ctx.lineWidth = 20;
        ctx.strokeStyle = '#fff';
    }
    
    redrawTextBlocks();
}

// Mouse/Touch event handlers
function handleMouseDown(e) {
    if (currentTool === 'text') {
        if (isTyping) {
            saveCurrentTextBlock();
        }
        
        const clickedBlockIndex = findTextBlockAt(e.offsetX, e.offsetY);
        
        if (clickedBlockIndex !== -1) {
            editTextBlock(clickedBlockIndex, e.offsetX, e.offsetY);
        } else {
            startTextInput(e.offsetX, e.offsetY);
        }
    } else {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
    }
}

function handleCanvasClick(e) {
    if (currentTool === 'text' && !isTyping) {
        const clickedBlockIndex = findTextBlockAt(e.offsetX, e.offsetY);
        
        if (clickedBlockIndex !== -1) {
            editTextBlock(clickedBlockIndex, e.offsetX, e.offsetY);
        } else {
            startTextInput(e.offsetX, e.offsetY);
        }
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
                saveCurrentTextBlock();
            }
            
            const touchedBlockIndex = findTextBlockAt(x, y);
            
            if (touchedBlockIndex !== -1) {
                editTextBlock(touchedBlockIndex, x, y);
            } else {
                startTextInput(x, y);
            }
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
    editingBlockIndex = -1;
    
    textOverlay.textContent = '';
    textOverlay.style.display = 'block';
    textOverlay.style.left = `${x}px`;
    textOverlay.style.top = `${y - fontSize}px`;
    textOverlay.style.font = `${fontSize}px ${fontFamily}`;
    textOverlay.style.maxWidth = `${maxLineWidth}px`;
    textOverlay.style.opacity = '1';
    
    textCursor.style.display = 'block';
    textCursor.style.left = `${x}px`;
    textCursor.style.top = `${y - fontSize}px`;
    
    // Start cursor blinking
    startCursorBlink();
}

// Cursor blinking
let cursorBlinkInterval;
function startCursorBlink() {
    clearInterval(cursorBlinkInterval);
    textCursor.style.visibility = 'visible';
    cursorBlinkInterval = setInterval(() => {
        textCursor.style.visibility = textCursor.style.visibility === 'visible' ? 'hidden' : 'visible';
    }, 500);
}

function stopCursorBlink() {
    clearInterval(cursorBlinkInterval);
    textCursor.style.visibility = 'hidden';
}

function updateCursorPosition() {
    const lines = currentText.split('\n');
    let currentLine = 0;
    let posInCurrentLine = 0;
    let charsTraversed = 0;
    
    // Find current line and position
    for (let i = 0; i < lines.length; i++) {
        if (charsTraversed + lines[i].length + 1 > cursorPosition) {
            currentLine = i;
            posInCurrentLine = cursorPosition - charsTraversed;
            break;
        }
        charsTraversed += lines[i].length + 1;
    }
    
    // Measure text width up to cursor position
    const lineText = lines[currentLine].substring(0, posInCurrentLine);
    ctx.font = `${fontSize}px ${fontFamily}`;
    const textWidth = ctx.measureText(lineText).width;
    
    // Position cursor
    const cursorX = textX + textWidth;
    const cursorY = textY + (currentLine * lineHeight);
    
    textCursor.style.left = `${cursorX}px`;
    textCursor.style.top = `${cursorY - fontSize}px`;
    textCursor.style.height = `${fontSize}px`;
    
    // Reset blinking
    startCursorBlink();
}

function handleKeyDown(e) {
    if (!isTyping) return;
    
    // Handle special keys
    if (e.key === 'Escape') {
        saveCurrentTextBlock();
        return;
    }
    
    if (e.key === 'Enter') {
        // Add newline
        currentText = currentText.substring(0, cursorPosition) + '\n' + currentText.substring(cursorPosition);
        cursorPosition++;
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
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        moveVertical(e.key === 'ArrowUp' ? -1 : 1);
    }
    else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Regular character input
        currentText = currentText.substring(0, cursorPosition) + e.key + currentText.substring(cursorPosition);
        cursorPosition++;
    }
    
    // Update displayed text
    textOverlay.textContent = currentText;
    updateCursorPosition();
    
    // Prevent default behavior
    e.preventDefault();
}

// Handle vertical cursor movement
function moveVertical(direction) {
    const lines = currentText.split('\n');
    let currentLine = 0;
    let posInLine = 0;
    let charsTraversed = 0;
    
    // Find current line and position
    for (let i = 0; i < lines.length; i++) {
        if (charsTraversed + lines[i].length + 1 > cursorPosition) {
            currentLine = i;
            posInLine = cursorPosition - charsTraversed;
            break;
        }
        charsTraversed += lines[i].length + 1;
    }
    
    // Calculate target line
    const targetLine = Math.max(0, Math.min(lines.length - 1, currentLine + direction));
    if (targetLine === currentLine) return;
    
    // Calculate position in target line
    const targetLineLength = lines[targetLine].length;
    const targetPosInLine = Math.min(posInLine, targetLineLength);
    
    // Calculate new cursor position
    let newPosition = 0;
    for (let i = 0; i < targetLine; i++) {
        newPosition += lines[i].length + 1;
    }
    newPosition += targetPosInLine;
    
    cursorPosition = newPosition;
}

function saveCurrentTextBlock() {
    if (currentText.trim() !== '') {
        if (editingBlockIndex !== -1) {
            // Update existing block
            textBlocks[editingBlockIndex] = {
                x: textX,
                y: textY,
                text: currentText
            };
        } else {
            // Add new text block
            textBlocks.push({
                x: textX,
                y: textY,
                text: currentText
            });
        }
        
        // Redraw all text
        redrawCanvas();
    }
    
    endTextInput();
}

function endTextInput() {
    isTyping = false;
    stopCursorBlink();
    textCursor.style.display = 'none';
    textOverlay.style.display = 'none';
    textOverlay.textContent = '';
    currentText = '';
    editingBlockIndex = -1;
}

function redrawCanvas() {
    fillCanvasBackground();
    redrawTextBlocks();
}

function redrawTextBlocks() {
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = '#000';
    
    textBlocks.forEach(block => {
        drawTextBlock(block);
    });
}

function drawTextBlock(block) {
    const lines = block.text.split('\n');
    
    lines.forEach((line, index) => {
        const y = block.y + index * lineHeight;
        ctx.fillText(line, block.x, y);
    });
}

// Find text block at coordinates
function findTextBlockAt(x, y) {
    for (let i = textBlocks.length - 1; i >= 0; i--) {
        const block = textBlocks[i];
        const lines = block.text.split('\n');
        const blockHeight = lines.length * lineHeight;
        
        ctx.font = `${fontSize}px ${fontFamily}`;
        
        // Find max width of lines
        let maxWidth = 0;
        lines.forEach(line => {
            const lineWidth = ctx.measureText(line).width;
            maxWidth = Math.max(maxWidth, lineWidth);
        });
        
        // Check if point is within block bounds
        if (x >= block.x && x <= block.x + maxWidth &&
            y >= block.y - fontSize && y <= block.y + blockHeight - fontSize/2) {
            return i;
        }
    }
    
    return -1;
}

// Edit existing text block
function editTextBlock(blockIndex, clickX, clickY) {
    const block = textBlocks[blockIndex];
    
    // Set editing state
    editingBlockIndex = blockIndex;
    textX = block.x;
    textY = block.y;
    currentText = block.text;
    
    // Position cursor at click
    positionCursorAtPoint(clickX, clickY);
    
    // Show text for editing
    isTyping = true;
    textOverlay.textContent = currentText;
    textOverlay.style.font = `${fontSize}px ${fontFamily}`;
    textOverlay.style.left = `${textX}px`;
    textOverlay.style.top = `${textY - fontSize}px`;
    textOverlay.style.maxWidth = `${maxLineWidth}px`;
    textOverlay.style.display = 'block';
    textOverlay.style.opacity = '1';
    
    // Show cursor
    textCursor.style.display = 'block';
    updateCursorPosition();
    
    // Hide this block while editing
    const tempBlocks = [...textBlocks];
    tempBlocks.splice(blockIndex, 1);
    
    // Redraw without this block
    fillCanvasBackground();
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = '#000';
    
    tempBlocks.forEach(block => {
        drawTextBlock(block);
    });
}

// Position cursor at click point
function positionCursorAtPoint(x, y) {
    const lines = currentText.split('\n');
    
    // Calculate clicked line
    const lineIndex = Math.floor((y - (textY - fontSize)) / lineHeight);
    if (lineIndex < 0 || lineIndex >= lines.length) {
        cursorPosition = currentText.length;
        return;
    }
    
    // Find position in that line
    const line = lines[lineIndex];
    
    // Measure characters to find closest position
    ctx.font = `${fontSize}px ${fontFamily}`;
    
    let bestPos = 0;
    let bestDistance = Number.MAX_VALUE;
    
    for (let i = 0; i <= line.length; i++) {
        const textWidth = ctx.measureText(line.substring(0, i)).width;
        const charX = textX + textWidth;
        const distance = Math.abs(charX - x);
        
        if (distance < bestDistance) {
            bestDistance = distance;
            bestPos = i;
        }
    }
    
    // Calculate full position
    let fullPos = 0;
    for (let i = 0; i < lineIndex; i++) {
        fullPos += lines[i].length + 1;
    }
    fullPos += bestPos;
    
    cursorPosition = fullPos;
}

// Save canvas as PNG
function saveCanvas() {
    if (isTyping) {
        saveCurrentTextBlock();
    }
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);
    
    const link = document.createElement('a');
    link.download = 'voidcanvas.png';
    link.href = tempCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialize the app
init();