const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Create uploads folder if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }
  res.json({ 
    message: 'File uploaded successfully', 
    filename: req.file.originalname,
    filepath: req.file.filename 
  });
});

// List files endpoint
app.get('/files', (req, res) => {
  fs.readdir('uploads', (err, files) => {
    if (err) return res.status(500).send('Error reading files');
    res.json(files);
  });
});

// Download endpoint
app.get('/download/:filename', (req, res) => {
  const filepath = path.join('uploads', req.params.filename);
  res.download(filepath);
});

app.delete('/delete/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'uploads', filename);
    
    fs.unlink(filepath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Delete failed' });
        }
        res.json({ success: true });
    });
});

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = 2020;
const HOST = '0.0.0.0'; // Bind to all network interfaces

app.listen(PORT, HOST, () => {
  const ip = getLocalIP();
  console.log(`\n✓ Server running at http://${ip}:${PORT}`);
  console.log(`✓ Use http://${ip}:${PORT} on your phone\n`);
});
