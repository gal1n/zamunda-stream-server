
const SERVER_URL = 'https://zamunda-stream-server.onrender.com';
const player = videojs('videoPlayer');
const logArea = document.getElementById('log');
const fileListArea = document.getElementById('fileList');

function log(msg) {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.textContent = `[${time}] ${msg}`;
  logArea.appendChild(entry);
  logArea.scrollTop = logArea.scrollHeight;
}

document.getElementById('magnetBtn').onclick = () => {
  const magnet = document.getElementById('magnetInput').value.trim();
  if (!magnet) return alert('Въведи magnet линк');
  fetchFileList(magnet);
};

async function fetchFileList(magnetURI) {
  log('🔗 Изпращам magnet линк към сървъра: ' + magnetURI);
  try {
    const res = await fetch(`${SERVER_URL}/get-files?magnet=${encodeURIComponent(magnetURI)}`);
    const data = await res.json();
    if (!Array.isArray(data.files)) {
      log('❌ Грешка: Невалиден списък с файлове');
      return;
    }
    log('🎬 Налични видео файлове: ' + data.files.join(', '));
    displayFileList(data.files, magnetURI);
  } catch (err) {
    log('❌ Грешка: ' + err);
  }
}

function displayFileList(files, magnetURI) {
  fileListArea.innerHTML = '';
  files.forEach(file => {
    const btn = document.createElement('button');
    btn.textContent = `▶️ Пусни: ${file}`;
    btn.onclick = () => {
      const videoURL = `${SERVER_URL}/stream?magnet=${encodeURIComponent(magnetURI)}&filename=${encodeURIComponent(file)}`;
      log('📽️ Стартирам видео: ' + file);
      player.src({ type: 'video/mp4', src: videoURL });
      player.play();
    };
    fileListArea.appendChild(btn);
  });
}
