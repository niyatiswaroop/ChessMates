// Sign-up, sign-in and sign-out. The forms post here directly; errors go back
// to the form page as ?error=... so the pages work without extra JavaScript.
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

// Only same-site paths, so ?next= can't send people to another website
function safeNext(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

function backTo(page, params) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return `/${page}/${query ? `?${query}` : ''}`;
}

// The session ID is replaced on sign-in so an old cookie can't be reused
function logIn(req, username) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.username = username;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

async function signup(req, res, next) {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const nextUrl = safeNext(req.body.next);
  const fail = (error) => res.redirect(backTo('signup', { error, username, email, next: nextUrl }));

  if (!USERNAME_PATTERN.test(username)) {
    return fail('Username must be 3-30 characters: letters, numbers, dots, dashes or underscores.');
  }
  if (!EMAIL_PATTERN.test(email)) return fail('Please enter a valid email address.');
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password !== confirmPassword) return fail('Passwords do not match.');

  try {
    const [taken] = await pool.query(
      'SELECT username, email FROM userinfo WHERE username = ? OR LOWER(email) = ?',
      [username, email]
    );
    if (taken.some((u) => u.email.toLowerCase() === email)) return fail('That email is already registered.');
    if (taken.length > 0) return fail('That username is taken.');

    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO userinfo (username, email, password) VALUES (?, ?, ?)', [
      username,
      email,
      hash,
    ]);
    await logIn(req, username);
    res.redirect(nextUrl || '/welcome/');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail('That username is taken.');
    next(err);
  }
}

async function signin(req, res, next) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const nextUrl = safeNext(req.body.next);

  try {
    const [rows] = await pool.query('SELECT username, password FROM userinfo WHERE LOWER(email) = ?', [email]);
    // Hashes made by the old PHP version start with $2y$; bcryptjs verifies them as-is
    if (rows.length !== 1 || !(await bcrypt.compare(password, rows[0].password))) {
      return res.redirect(backTo('signin', { error: 'Invalid email or password.', email, next: nextUrl }));
    }
    await logIn(req, rows[0].username);
    res.redirect(nextUrl || '/welcome/');
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('chessmates.sid');
    res.redirect('/landing/');
  });
}

// Pages: send signed-out visitors to sign in, then back here (so invite links work)
function requireLogin(req, res, next) {
  if (req.session.username) return next();
  res.redirect(backTo('signin', { next: req.originalUrl }));
}

function requireLoginApi(req, res, next) {
  if (req.session.username) return next();
  res.status(401).json({ error: 'Not signed in' });
}

module.exports = { signup, signin, logout, requireLogin, requireLoginApi, safeNext };
