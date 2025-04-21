
const express = require('express');
const WebTorrent = require('webtorrent');
const cors = require('cors');

const app = express();
const client = new WebTorrent();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get('/get-files', (req, res) => {
  const magnet = req.query.magnet;
  if (!magnet) return res.status(400).json({ error: 'Липсва magnet линк' });

  console.log('⏳ Добавям торент за списък с файлове:', magnet);

  client.add(magnet, { destroyStoreOnDestroy: true }, torrent => {
    const videoFiles = torrent.files.filter(f => f.name.match(/\.(mp4|mkv|webm|avi)$/i));
    const fileList = videoFiles.map(file => file.name);
    console.log('🎬 Налични видео файлове:', fileList);
    return res.json({ files: fileList });
  });
});

app.get('/stream', (req, res) => {
  const magnet = req.query.magnet;
  const filename = req.query.filename;
  if (!magnet || !filename) return res.status(400).send('Липсва magnet линк или име на файл');

  console.log('⏳ Добавям торент за стрийм:', magnet);

  client.add(magnet, torrent => {
    const file = torrent.files.find(f => f.name === filename);
    if (!file) return res.status(404).send('Файлът не е намерен в торента');

    console.log('▶️ Стрийм файл:', file.name);

    const range = req.headers.range;
    const contentType = 'video/mp4';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

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
});

app.listen(PORT, () => {
  console.log(`✅ WebTorrent сървърът работи на http://localhost:${PORT}`);
});
