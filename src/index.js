import express from 'express';

const app = express();
const PORT = 8000;

// Middleware: parse incoming JSON request bodies
app.use(express.json());

// Root GET route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Live Sports Dashboard!' });
});

// Start server and log the URL
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
