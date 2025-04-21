import express from 'express';
import WebTorrent from 'webtorrent';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const client = new WebTorrent();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Старт на WebTorrent клиента
app.post('/start-torrent', (req, res) => {
  const { torrentFile, magnetLink } = req.body;

  if (!torrentFile && !magnetLink) {
    return res.status(400).json({ error: 'Не е предоставен нищо за стартиране на торент.' });
  }

  const startTorrent = torrentFile ? client.add(torrentFile) : client.add(magnetLink);

  startTorrent.on('ready', () => {
    console.log('Торентът е стартиран и е готов за стриймване.');
    res.json({ message: 'Торентът е успешно стартиран.' });
  });

  startTorrent.on('error', (err) => {
    console.error('Грешка при стартиране на торента:', err);
    res.status(500).json({ error: 'Грешка при стартиране на торента.' });
  });
});

// Връща всички файлове в торента
app.get('/torrent-files', (req, res) => {
  const torrent = client.torrents[0];  // Само първия добавен торент
  if (!torrent) {
    return res.status(404).json({ error: 'Няма добавени торенти.' });
  }

  const files = torrent.files.map(file => ({
    name: file.name,
    length: file.length,
    type: file.mimetype || 'unknown',
  }));
  res.json({ files });
});

// Стрийминг на файловете от торента
app.get('/stream/:filename', (req, res) => {
  const filename = req.params.filename;
  const torrent = client.torrents[0];
  if (!torrent) {
    return res.status(404).json({ error: 'Няма добавени торенти.' });
  }

  const file = torrent.files.find(f => f.name === filename);
  if (!file) {
    return res.status(404).json({ error: 'Файлът не е намерен в торента.' });
  }

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
    const chunkSize = (end - start) + 1;

    const fileStream = file.createReadStream({ start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${file.length}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': file.type
    });

    fileStream.pipe(res);
  } else {
    const fileStream = file.createReadStream();
    res.writeHead(200, { 'Content-Type': file.type });
    fileStream.pipe(res);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сървърът работи на порт ${PORT}`);
});
