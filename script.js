var board = null;
var game = new Chess();
var whiteTime = 300; // 5 minutes in seconds
var blackTime = 300; // 5 minutes in seconds
var whiteTimerInterval = null;
var blackTimerInterval = null;
var isWhiteTurn = true;

function init() {
    var config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
    };

    board = Chessboard('myBoard', config);
    updateStatus();
    resetTimer();
}

function onDragStart(source, piece) {
    if (game.game_over()) return false;

    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

function onDrop(source, target) {
    const move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';

    updateMoveHistory();
    updateStatus();
    startTimer();
}

function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    const moveColor = game.turn() === 'w' ? 'White' : 'Black';
    const status = game.in_checkmate()
        ? `Checkmate! ${moveColor} loses.`
        : game.in_draw()
        ? 'Draw!'
        : `${moveColor} to move`;
    $('#status').text(status);
}

function updateMoveHistory() {
    const history = game.history();
    const tableBody = document.querySelector('#moveHistoryTable tbody');
    tableBody.innerHTML = '';

    for (let i = 0; i < history.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = history[i] || '';
        const blackMove = history[i + 1] || '';
        const row = `<tr>
                        <td>${moveNumber}</td>
                        <td>${whiteMove}</td>
                        <td>${blackMove}</td>
                    </tr>`;
        tableBody.innerHTML += row;
        $.ajax({
            url: './insertmoves.php',
            type: 'POST',
            data: {
                game_id: 2,
                move_number: moveNumber,
                white_move: whiteMove,
                black_move: blackMove
            },
            success: function(response) {
                console.log("Move history saved to database: " + response);
            },
            error: function(xhr, status, error) {
                console.error("Error saving move history: " + error);
            }
        });
    }
}

$('#resetBtn').click(() => {
    game.reset();
    board.position('start');
    updateMoveHistory();
    updateStatus();
    resetTimer();
    isWhiteTurn = true;
});

function startTimer() {
    if (whiteTimerInterval !== null) clearInterval(whiteTimerInterval);
    if (blackTimerInterval !== null) clearInterval(blackTimerInterval);

    if (isWhiteTurn) {
        whiteTimerInterval = setInterval(function() {
            whiteTime--;
            $('#white-timer').text(formatTime(whiteTime));
            if (whiteTime <= 0) {
                gameOver('Black wins, White ran out of time');
            }
        }, 1000);
    } else {
        blackTimerInterval = setInterval(function() {
            blackTime--;
            $('#black-timer').text(formatTime(blackTime));
            if (blackTime <= 0) {
                gameOver('White wins, Black ran out of time');
            }
        }, 1000);
    }

    isWhiteTurn = !isWhiteTurn;
}

function resetTimer() {
    // Stop all timers and reset the time to 5 minutes
    clearInterval(whiteTimerInterval);
    clearInterval(blackTimerInterval);
    whiteTime = 300; // 5 minutes in seconds
    blackTime = 300; // 5 minutes in seconds
    $('#white-timer').text('05:00');
    $('#black-timer').text('05:00');
}

function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${padTime(minutes)}:${padTime(seconds)}`;
}

function padTime(time) {
    return time < 10 ? '0' + time : time;
}

// function gameOver(message) {
//     clearInterval(whiteTimerInterval);
//     clearInterval(blackTimerInterval);

//     // Determine the winner or if it's a draw
//     let result = '';
//     if (message.includes('White ran out of time')) {
//         result = 'black'; // Black wins
//     } else if (message.includes('Black ran out of time')) {
//         result = 'white'; // White wins
//     } else if (message.includes('Checkmate')) {
//         result = message.includes('White') ? 'black' : 'white'; // Winner is based on who lost
//     } else if (message === 'Draw!') {
//         result = 'draw'; // Draw condition
//     }

//     // Send the game result to the back-end via AJAX
//     $.ajax({
//         type: 'POST',
//         url: 'end.php',  // The PHP script that handles the game result
//         data: {
//             game_id: gameId,  // Use the JavaScript variable gameId here
//             result: result
//         },
//         success: function(response) {
//             alert('Game Over: ' + message);
//             window.location.href = 'welcome.php';  // Redirect to the welcome page or another page
//         },
//         error: function() {
//             alert('An error occurred. Please try again.');
//         }
//     });
// }

init();