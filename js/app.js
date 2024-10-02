/**
 * Base video scrubber from [https://github.com/ghepting/javascript-video-scrubber]
 */

let file;
let frameIndex = 1;
let codec;
let step = 1;         // Visible frame
let targetStep = 1;   // Frame to animate to
let mousePos;                 // Global X position of the mouse
let frames = [];        // All stored frames for quick access (Change this most likely)
let scrubPos;                 // Position of the video

const CHUNK_SIZE = (1024 * 1024) // 1MB Chunk
const videoPlayer = document.getElementById('video_player');

// Scrubbing using the mouse's x position
onmousemove = (event) => {
  scrubPos = Math.round((screen.width / videoPlayer.duration) * event.x).clamp(0, videoPlayer.duration);
  frameBufferCheck(scrubPos);
}

// Support all browser types and fallbacks
window.requestAnimationFrame = (
  function () {
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60);
      }
  });

  // Start animation loop
  // animationLoop();

/**
 * Main animation loop
 */
function animationLoop() {
  requestAnimationFrame(animationLoop);
  targetStep = Math.max(Math.round(mousePos / Math.round(window.innerWidth / frames.length)), 1);
  if (targetStep !== step) {
    step += (targetStep - step) / 5;
  }
  changeFrame();
}

/**
 * Loads in a new frame when scrubbing
 */
function changeFrame() {
  const currStep = Math.round(step);
  // Ensure frames are loaded
  if (frames.length <= 0) { /* Get frames or load video */
  }
  // Check if image exists, is downloaded, and is ready
  if (!frames[currStep] || !frames[currStep].complete) {
    return;
  }
  // Ensure differing frames & set new frame source
  if (videoPlayer.attr('src') !== frames[currStep].src) {
    videoPlayer.attr('src', frames[currStep].src);
  }
}

/**
 * Update video source
 * @param source
 */
async function sourceChanged(source) {
  if (!source) { return; }
  file = source.files[0];
  const arrayBuf = await readFileAsArrayBuffer(file)
  const tracks = muxjs.mp4.probe.tracks(new Uint8Array(arrayBuf));
  codec = tracks[0].codec;
  console.log("CODEC : " + codec);
  const sourceURL = URL.createObjectURL(source.files[0]);
  videoPlayer.setAttribute('src', sourceURL);
  generateImageBuffer(0);
}

/**
 * Checks if the scrub position is still within the buffer's bounds
 *
 * Padding is the size (In frames, based on the frame density) that is offset
 * from each side of the buffer until the buffer is re-calculated
 * In the future the control device's velocity maximum will be taken into account to
 * automatically calculate this.
 * @param scrubPos The position in the video
 * @param bufferSize The size of the frame data buffer
 * @param padding Extra space on each size of the buffer (lazy load?)
 */
function frameBufferCheck(
  scrubPos,
  bufferSize,
  padding
) { }

/**
 * Clamps a number to a range
 * @param min The minimum range
 * @param max The maximum range
 * @returns {number} The number clamped to {@link min} <= {@link number} <= {@link max}
 */
Number.prototype.clamp = function (min, max) {
  return Math.min(Math.max(this, min), max);
}

// =====================================================================================================================
//  IMAGE HANDLING
// =====================================================================================================================
/**
 * Generates an image buffer depending on the velocity and position of the {@link scrubPos}
 * @param scrubPos
 */
function generateImageBuffer(scrubPos) {
  if (!file) {
    return;
  }
  readFileChunk(0);
}

/**
 * Reads a chunk of video data from a file
 * @param index The chunk index in the video
 */
function readFileChunk(index) {
  if (index * CHUNK_SIZE >= file.size) {
    return null; // Read an odd-sized chunk here instead
  }
  const start = index * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, file.size);
  const chunk = file.slice(start, end);
  readFileAsArrayBuffer(chunk)
    .then(buffer => {
      return decodeChunk(buffer).then(r => { return r; });
    })
}

/**
 * Reads in a video file as an array buffer
 * @param blob The file to read
 */
function readFileAsArrayBuffer(blob) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => resolve(event.target.result);
    fileReader.onerror = (error) => reject(error);
    fileReader.readAsArrayBuffer(blob);
  });
}

/**
 * Decodes a chunk of video data
 * @param chunk The chunk to be decoded
 */
async function decodeChunk(chunk) {
  const decoder = new VideoDecoder({
    output: handleFrame,
    error: (e) => console.error(e)
  });
  decoder.configure({codec: "avc1.42E01E"});
  const encodedChunk = new EncodedVideoChunk({
    type: "key",
    timestamp: 0,
    data: new Uint8Array(chunk)
  });
  decoder.decode(encodedChunk);
}

/**
 * Called when a frame is processed
 * @param frame The frame being loaded/handled
 */
async function handleFrame(frame) {
  const img = await createImageBitmap(frame);
  frames.push(img);
  console.log("[FRAME" + frameIndex + "ADDED]");
  frameIndex++;
}
