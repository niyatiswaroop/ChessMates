// Player reviews shown on the landing page, kept in data/reviews.json
const fs = require('fs/promises');
const path = require('path');

const FILE = process.env.REVIEWS_FILE || path.join(__dirname, '..', 'data', 'reviews.json');
const MAX_NAME = 60;
const MAX_TEXT = 500;

let writing = Promise.resolve(); // one write at a time so reviews aren't lost

async function read() {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return { reviews: [] };
    throw err;
  }
}

async function list(req, res, next) {
  try {
    res.json(await read());
  } catch (err) {
    next(err);
  }
}

async function add(req, res, next) {
  const name = String(req.body.review_name || '').trim().slice(0, MAX_NAME);
  const text = String(req.body.review_text || '').trim().slice(0, MAX_TEXT);
  if (!name || !text) return res.redirect('/landing/#reviews');

  // Stored as plain text; the landing page inserts it with textContent
  const job = writing.then(async () => {
    const data = await read();
    data.reviews.push({ text, name });
    await fs.writeFile(FILE, JSON.stringify(data, null, 4));
  });
  writing = job.catch(() => {});
  try {
    await job;
    res.redirect('/landing/#reviews');
  } catch (err) {
    next(err);
  }
}

module.exports = { list, add };
