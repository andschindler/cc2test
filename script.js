// URLs der Audiodateien, die den jeweiligen Instrumenten zugeordnet sind
const audioUrls = {
  mic: "https://cdn.glitch.global/deaad1b3-c137-49a3-b9f1-f506e217d6d8/Michael%20Jackson%20Loop-vocals.mp3?v=1750764233292",
  guitar: "https://cdn.glitch.global/deaad1b3-c137-49a3-b9f1-f506e217d6d8/Michael%20Jackson%20Loop-bass.mp3?v=1750764228420",
  drums: "https://cdn.glitch.global/deaad1b3-c137-49a3-b9f1-f506e217d6d8/Michael%20Jackson%20Loop-drums.mp3?v=1750764225146",
};

// Erstelle einen AudioContext, der für die Web Audio API notwendig ist
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Objekt zum Speichern von Audio-bezogenen Objekten (Buffer, GainNode, etc.) für jedes Instrument
const audioObjects = {};

/**
 * Lädt und konfiguriert eine Audiodatei für ein bestimmtes Instrument.
 * @param {string} name - Name des Instruments (z.B. 'mic')
 * @param {string} modelSelector - CSS-Selector des zugehörigen 3D-Modells in der Szene
 */
async function loadAudio(name, modelSelector) {
  const response = await fetch(audioUrls[name]);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = await audioContext.decodeAudioData(arrayBuffer);

  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.0;

  const panner = audioContext.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'linear';
  panner.maxDistance = 10;
  panner.rolloffFactor = 1.5;

  const model = document.querySelector(modelSelector);
  const position = model.getAttribute('position');
  panner.setPosition(position.x, position.y, position.z);

  audioObjects[name] = { buffer, gainNode, model, panner };
  gainNode.connect(panner).connect(audioContext.destination);
}

/**
 * Schaltet den Klang eines Instruments ein oder aus (Lautstärke 1 oder 0)
 * @param {string} name - Name des Instruments
 */
function toggleSound(name) {
  const obj = audioObjects[name];
  obj.gainNode.gain.value = obj.gainNode.gain.value > 0 ? 0.0 : 1.0;
}

/**
 * Startet die Wiedergabe aller Audios gleichzeitig.
 * @param {string} nameToUnmute - Name des Instruments, das zu Beginn hörbar sein soll
 */
async function startAllSounds(nameToUnmute) {
  if (audioContext.state === 'suspended') await audioContext.resume();
  await Promise.all([
    loadAudio('mic', '#micModel'),
    loadAudio('guitar', '#guitarModel'),
    loadAudio('drums', '#drumsModel'),
  ]);

  const startTime = audioContext.currentTime + 0.1;

  Object.keys(audioObjects).forEach((name) => {
    const obj = audioObjects[name];
    const source = audioContext.createBufferSource();
    source.buffer = obj.buffer;
    source.loop = true;
    source.connect(obj.gainNode);
    source.start(startTime);
    obj.source = source;
    obj.gainNode.gain.value = name === nameToUnmute ? 1.0 : 0.0;
  });
}

let hasStarted = false;
document.querySelectorAll('.interactive').forEach((model) => {
  model.addEventListener('click', async (e) => {
    const modelId = e.target.id;
    const name = modelId.replace('Model', '');

    if (!hasStarted) {
      hasStarted = true;
      await startAllSounds(name);
    } else {
      toggleSound(name);
    }
  });
});
