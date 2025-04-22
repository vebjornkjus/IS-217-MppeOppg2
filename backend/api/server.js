import express from 'express';
import cors from 'cors'; // Importer cors
import apiRoutes from './apiRoutes.js';

const app = express();

// Aktiver CORS for alle origins (eller konfigurer mer spesifikt ved behov)
app.use(cors());

// Use JSON parsing (hvis du trenger å motta JSON i POST/PUT requests)
app.use(express.json());

// Mount the API routes under /api
app.use('/api', apiRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server (server.js) is running on http://localhost:${PORT}`);
});
