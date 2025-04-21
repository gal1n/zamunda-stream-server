const express = require('express');
const WebTorrent = require('webtorrent');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const client = new WebTorrent();

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Ендпойнт за получаване на файловете в торента
app.post('/torrent-files', express.json(), (req, res) => {
  const magnetLink = req.body.magnetLink;
  
  if (!magnetLink) {
    return res.status(400).json({ error: 'Magnet link is required.' });
  }

  client.add(magnetLink, torrent => {
    const files = torrent.files.map(file => ({
      name: file.name,
      length: file.length,
      type: file.mimetype || 'unknown',
    }));
    res.json({ files });
  });
});

// Ендпойнт за стрийминг на файл
app.get('/stream/:filename', (req, res) => {
  const filename = req.params.filename;
  const file = client.torrents[0].files.find(f => f.name === filename);

  if (!file) {
    return res.status(404).json({ error: 'File not found in the torrent.' });
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
  console.log(`Server is running on http://localhost:${PORT}`);
});
