// Game page. The server decides everything (seats, turns, legality, clocks,
// results) and sends the full game state over Socket.IO after every change.
// This page draws that state and sends the player's moves. It checks moves
// with the same chess.js the server uses, only to snap illegal drags back
// immediately; the server still validates every move it receives.

const gameId = location.pathname.split('/').filter(Boolean).pop();
const PIECE_IMAGES = '/img/chesspieces/wikipedia/{piece}.png';

const socket = io();
let myColor = null;      // 'w', 'b', or null when watching
let state = null;        // latest state from the server
let stateReceivedAt = 0; // when it arrived, for counting the clock down locally
let game = new Chess();  // local copy of the position
let pendingPromotion = null;

const board = Chessboard('myBoard', {
    draggable: true,
    position: 'start',
    pieceTheme: PIECE_IMAGES,
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: () => board.position(game.fen()),
});
window.addEventListener('resize', () => board.resize());

// ---- Connection ----

socket.on('connect', joinGame); // also runs again after a reconnect
socket.on('disconnect', () => showNotice('Connection lost. Reconnecting...'));
socket.on('connect_error', (err) => {
    if (err.message === 'Not signed in') {
        location.href = '/signin/?next=' + encodeURIComponent(location.pathname);
    } else {
        showNotice('Cannot reach the server. Retrying...');
    }
});
socket.on('state', applyState);

function joinGame() {
    socket.emit('join', gameId, (res) => {
        if (!res.ok) {
            $('#status').text(res.error || 'Could not open this game');
            showNotice('');
            return;
        }
        myColor = res.color;
        board.orientation(myColor === 'b' ? 'black' : 'white');
        showNotice(myColor ? '' : 'You are watching this game.');
        applyState(res.state);
    });
}

// ---- Moving pieces ----

function canMove() {
    return state && state.status === 'active' && myColor && state.turn === myColor && !pendingPromotion;
}

function onDragStart(source, piece) {
    return canMove() && piece[0] === myColor;
}

function onDrop(source, target) {
    const legal = game.moves({ square: source, verbose: true }).filter((m) => m.to === target);
    if (legal.length === 0) return 'snapback';

    if (legal.some((m) => m.promotion)) {
        askPromotion(source, target);
        return 'snapback'; // the piece is placed once a promotion piece is chosen
    }
    game.move({ from: source, to: target });
    sendMove({ from: source, to: target });
}

function sendMove(move) {
    socket.emit('move', move, (res) => {
        if (!res.ok) {
            showNotice(res.error);
            if (res.state) applyState(res.state); // undo the preview
        }
    });
}

function askPromotion(from, to) {
    pendingPromotion = { from, to };
    const choices = $('#promotionChoices').empty();
    for (const piece of ['q', 'r', 'b', 'n']) {
        $('<img>')
            .attr('src', PIECE_IMAGES.replace('{piece}', myColor + piece.toUpperCase()))
            .attr('alt', { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[piece])
            .on('click', () => {
                $('#promotion').prop('hidden', true);
                pendingPromotion = null;
                game.move({ from, to, promotion: piece });
                board.position(game.fen());
                sendMove({ from, to, promotion: piece });
            })
            .appendTo(choices);
    }
    $('#promotion').prop('hidden', false);
}

$('#promotionCancel').on('click', () => {
    $('#promotion').prop('hidden', true);
    pendingPromotion = null;
});

// ---- Drawing the state ----

function applyState(next) {
    state = next;
    stateReceivedAt = performance.now();

    game = new Chess();
    for (const san of state.history) game.move(san);
    if (board.fen() !== state.fen.split(' ')[0]) board.position(state.fen);

    renderPlayers();
    renderStatus();
    renderHistory();
    renderClocks();

    const playing = myColor && (state.status === 'waiting' || state.status === 'active');
    $('#resignBtn').prop('hidden', !playing).text(state.status === 'waiting' ? 'Cancel Game' : 'Resign');
    $('#invite').prop('hidden', state.status !== 'waiting');
    $('#inviteLink').val(location.origin + '/game/' + state.id);
}

// Your card at the bottom, your opponent's on top; when watching, White at the bottom
function seats() {
    const bottom = myColor || 'w';
    return { bottom, top: bottom === 'w' ? 'b' : 'w' };
}

function renderPlayers() {
    const { top, bottom } = seats();
    for (const [id, color] of [['#topPlayer', top], ['#bottomPlayer', bottom]]) {
        const name = color === 'w' ? state.white : state.black;
        const card = $(id);
        card.find('.player-name').text(name || 'Waiting for opponent...');
        card.find('.player-color').text((color === 'w' ? 'White' : 'Black') + (color === myColor ? ' (you)' : ''));
        card.toggleClass('to-move', state.status === 'active' && state.turn === color);
    }
}

function renderStatus() {
    let text;
    if (state.status === 'waiting') {
        text = 'Waiting for an opponent';
    } else if (state.status === 'active') {
        const side = state.turn === 'w' ? 'White' : 'Black';
        if (!myColor) text = side + ' to move';
        else text = state.turn === myColor ? 'Your move' : "Opponent's move";
        if (state.inCheck) text += ' - Check!';
    } else if (state.status === 'aborted') {
        text = 'Game cancelled';
    } else if (state.winner === 'draw') {
        text = 'Draw by ' + state.endReason;
    } else {
        const youWon = myColor && state.winner === (myColor === 'w' ? state.white : state.black);
        const youLost = myColor && !youWon;
        text = (youWon ? 'You won' : youLost ? 'You lost' : state.winner + ' wins') + ' by ' + state.endReason;
    }
    $('#status').text(text);
}

function renderHistory() {
    const body = $('#moveHistoryTable tbody').empty();
    const history = state.history;
    for (let i = 0; i < history.length; i += 2) {
        $('<tr>')
            .append($('<td>').text(i / 2 + 1))
            .append($('<td>').text(history[i]))
            .append($('<td>').text(history[i + 1] || ''))
            .appendTo(body);
    }
    const panel = $('.move-history')[0];
    panel.scrollTop = panel.scrollHeight;
}

function formatTime(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

// Counts the running clock down between server updates; the server's clock
// is the one that actually ends the game
function renderClocks() {
    if (!state) return;
    const clocks = { ...state.clocks };
    if (state.running) clocks[state.running] -= performance.now() - stateReceivedAt;
    const { top, bottom } = seats();
    for (const [id, color] of [['#topPlayer', top], ['#bottomPlayer', bottom]]) {
        $(id).find('.clock')
            .text(formatTime(clocks[color]))
            .toggleClass('running', state.running === color)
            .toggleClass('low', clocks[color] < 30000);
    }
}
setInterval(renderClocks, 200);

// ---- Buttons ----

$('#resignBtn').on('click', () => {
    const waiting = state.status === 'waiting';
    if (!confirm(waiting ? 'Cancel this game?' : 'Are you sure you want to resign?')) return;
    socket.emit('resign', null, (res) => {
        if (!res.ok) showNotice(res.error);
    });
});

$('#newGameBtn').on('click', async () => {
    const response = await fetch('/api/games', { method: 'POST' });
    if (response.ok) location.href = (await response.json()).url;
    else showNotice('Could not create a game.');
});

$('#copyBtn').on('click', async () => {
    const input = $('#inviteLink')[0];
    try {
        await navigator.clipboard.writeText(input.value);
        $('#copyBtn').text('Copied!');
        setTimeout(() => $('#copyBtn').text('Copy'), 1500);
    } catch (err) {
        input.select(); // clipboard blocked: select it so the user can copy
    }
});

function showNotice(text) {
    $('#notice').text(text || '');
}
