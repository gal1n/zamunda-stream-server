
// server.js - минималистичен WebTorrent бекенд за стриймване на .torrent и magnet линкове
const express = require('express');
const WebTorrent = require('webtorrent');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const client = new WebTorrent();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

let currentTorrent = null;

// Ендпойнт за зареждане на .torrent файл (локално или от Zamunda)
app.post('/upload-torrent', (req, res) => {
  const torrentPath = req.body.path;
  if (!torrentPath) return res.status(400).send('Missing torrent path');

  if (currentTorrent) {
    currentTorrent.destroy();
  }

  currentTorrent = client.add(torrentPath, torrent => {
    const videoFiles = torrent.files.filter(file => file.name.endsWith('.mp4') || file.name.endsWith('.mkv'));
    console.log('🎬 Видео файлове:', videoFiles.map(f => f.name));
    res.json(videoFiles.map(f => f.name));
  });

  currentTorrent.on('error', err => {
    console.error('❌ Torrent error:', err);
    res.status(500).send('Torrent error');
  });
});

// Ендпойнт за зареждане на magnet линк
app.post('/magnet', (req, res) => {
  const magnet = req.body.magnet;
  if (!magnet) return res.status(400).send('Missing magnet link');

  if (currentTorrent) {
    currentTorrent.destroy();
  }

  currentTorrent = client.add(magnet, torrent => {
    const videoFiles = torrent.files.filter(file => file.name.endsWith('.mp4') || file.name.endsWith('.mkv'));
    console.log('🎬 Видео файлове:', videoFiles.map(f => f.name));
    res.json(videoFiles.map(f => f.name));
  });

  currentTorrent.on('error', err => {
    console.error('❌ Torrent error:', err);
    res.status(500).send('Torrent error');
  });
});

// Ендпойнт за стриймване на избран файл
app.get('/stream/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!currentTorrent) return res.status(404).send('No active torrent');

  const file = currentTorrent.files.find(f => f.name === filename);
  if (!file) return res.status(404).send('File not found');

  const range = req.headers.range;
  if (!range) {
    res.status(400).send('Requires Range header');
    return;
  }

  const positions = range.replace(/bytes=/, '').split('-');
  const start = parseInt(positions[0], 10);
  const fileSize = file.length;
  const end = positions[1] ? parseInt(positions[1], 10) : fileSize - 1;
  const chunksize = (end - start) + 1;

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunksize,
    'Content-Type': 'video/mp4'
  });

  const stream = file.createReadStream({ start, end });
  stream.pipe(res);
});

app.listen(PORT, () => {
  console.log(`✅ WebTorrent сървърът е активен на http://localhost:${PORT}`);
});
