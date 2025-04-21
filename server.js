const express = require('express');
const WebTorrent = require('webtorrent');
const cors = require('cors');

const app = express();
const client = new WebTorrent();
app.use(cors());

const PORT = process.env.PORT || 3000;

const torrents = new Map(); // За кеширане на добавени торенти

app.get('/get-files', (req, res) => {
  const magnet = req.query.magnet;
  if (!magnet) return res.status(400).send('Липсва magnet линк');

  console.log('⏳ Добавям торент:', magnet);

  // Проверка дали вече е добавен
  if (torrents.has(magnet)) {
    const torrent = torrents.get(magnet);
    const videoFiles = torrent.files.filter(f => f.name.match(/\.(mp4|mkv|webm|avi)$/i));
    console.log('🎬 Кеширани файлове:', videoFiles.map(f => f.name));
    return res.json(videoFiles.map(f => f.name));
  }

  client.add(magnet, torrent => {
    const videoFiles = torrent.files.filter(f => f.name.match(/\.(mp4|mkv|webm|avi)$/i));
    if (videoFiles.length === 0) return res.status(404).send('Няма видео файлове в торента');

    torrents.set(magnet, torrent);
    console.log('🎬 Налични файлове:', videoFiles.map(f => f.name));

    return res.json(videoFiles.map(f => f.name));
  });
});

app.get('/stream', (req, res) => {
  const magnet = req.query.magnet;
  const filename = req.query.filename;

  if (!magnet || !filename) return res.status(400).send('Липсва magnet линк или име на файл');

  const torrent = torrents.get(magnet);
  if (!torrent) return res.status(404).send('Торентът не е зареден. Моля, първо извикайте /get-files');

  const file = torrent.files.find(f => f.name === filename);
  if (!file) return res.status(404).send('Файлът не е намерен в торента');

  console.log('▶️ Стрийм файл:', file.name);

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Accept-Ranges', 'bytes');

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${file.length}`);
    res.setHeader('Content-Length', end - start + 1);
    file.createReadStream({ start, end }).pipe(res);
  } else {
    res.setHeader('Content-Length', file.length);
    file.createReadStream().pipe(res);
  }
});

app.listen(PORT, () => {
  console.log(`✅ WebTorrent сървърът работи на http://localhost:${PORT}`);
});
