const errorBox = document.getElementById('lobbyError');
let me = null;

async function api(path, options) {
    const response = await fetch(path, options);
    if (response.status === 401) {
        location.href = '/signin/?next=/welcome/';
        throw new Error('Not signed in');
    }
    if (!response.ok) throw new Error('Request failed');
    return response.json();
}

async function createGame() {
    errorBox.textContent = '';
    try {
        const game = await api('/api/games', { method: 'POST' });
        location.href = game.url;
    } catch (err) {
        errorBox.textContent = 'Could not create a game. Please try again.';
    }
}

document.getElementById('playNowBtn').addEventListener('click', createGame);
document.getElementById('navPlay').addEventListener('click', (event) => {
    event.preventDefault();
    createGame();
});

// Accepts a full invite link (".../game/<id>") or just the 32-character ID
document.getElementById('joinForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const match = document.getElementById('joinInput').value.match(/[0-9a-f]{32}/i);
    if (match) {
        location.href = '/game/' + match[0].toLowerCase();
    } else {
        errorBox.textContent = "That doesn't look like a game link or ID.";
    }
});

const RESULT_LABELS = {
    won: 'Won',
    lost: 'Lost',
    draw: 'Draw',
    active: 'In progress',
    waiting: 'Waiting for opponent',
    aborted: 'Aborted',
};

function cell(text) {
    const td = document.createElement('td');
    td.textContent = text;
    return td;
}

function renderGames(games) {
    const body = document.getElementById('gamesBody');
    body.innerHTML = '';
    if (games.length === 0) {
        body.innerHTML = "<tr><td colspan='5'>No games yet. Press Play Now to start one.</td></tr>";
        return;
    }
    for (const game of games) {
        const row = document.createElement('tr');
        let result = RESULT_LABELS[game.result] || game.result;
        if (game.endReason && (game.result === 'won' || game.result === 'lost' || game.result === 'draw')) {
            result += ' (' + game.endReason + ')';
        }
        row.append(
            cell(game.opponent || '-'),
            cell(game.white === me ? 'White' : 'Black'),
            cell(new Date(game.createdAt).toLocaleString()),
            cell(result)
        );
        const open = document.createElement('td');
        // Games from the old PHP version have numeric IDs and can't be opened
        if (/^[0-9a-f]{32}$/.test(game.id)) {
            const link = document.createElement('a');
            link.href = '/game/' + game.id;
            link.className = 'game-link';
            link.textContent = game.result === 'active' || game.result === 'waiting' ? 'Resume' : 'View';
            open.appendChild(link);
        }
        row.appendChild(open);
        body.appendChild(row);
    }
}

(async function init() {
    try {
        me = (await api('/api/me')).username;
        document.getElementById('username').textContent = me;
        renderGames(await api('/api/games'));
    } catch (err) {
        document.getElementById('gamesBody').innerHTML = "<tr><td colspan='5'>Could not load your games.</td></tr>";
    }
})();
