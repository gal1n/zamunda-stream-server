// Импортиране на необходими библиотеки
const express = require('express');
const WebTorrent = require('webtorrent');
const cors = require('cors');

// Създаване на инстанция на express приложението
const app = express();
const client = new WebTorrent();

// Използване на CORS за разрешаване на заявки от различни домейни
app.use(cors());

// Порт, на който ще работи сървърът
const PORT = process.env.PORT || 3000;

// Рут за обработка на stream заявките
app.get('/stream', (req, res) => {
  const magnet = req.query.magnet;
  
  // Проверка дали има magnet линк
  if (!magnet) return res.status(400).send('Липсва magnet линк');
  
  console.log('⏳ Добавям торент:', magnet);

  // Добавяне на torrent към клиента
  client.add(magnet, torrent => {
    const file = torrent.files.find(f => f.name.match(/\.(mp4|mkv|webm|avi)$/i));
    
    // Проверка дали има видео файл в торента
    if (!file) return res.status(404).send('Не е намерен видео файл');
    
    console.log('▶️ Стрийм файл:', file.name);
    
    // Настройки за Content-Type за видео
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');

    // Проверка за range заявки (за продължително буфериране)
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
});

// Слушане на порта
app.listen(PORT, () => {
  console.log(`✅ WebTorrent сървърът работи на http://localhost:${PORT}`);
});
