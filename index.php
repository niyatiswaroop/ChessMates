<?php 
session_start();
include('./connection.php');

if (!isset($_SESSION['username'])) {
    header("Location: welcome.php");
    exit();
}

$username = $_SESSION['username'];

function generateRandomGameID() {
    return bin2hex(random_bytes(16));
}

function gameIdExists($conn, $game_id) {
    $stmt = $conn->prepare("SELECT COUNT(*) FROM games WHERE id = ?");
    $stmt->bind_param("s", $game_id);
    $stmt->execute();
    $stmt->bind_result($count);
    $stmt->fetch();
    $stmt->close();

    return $count > 0; 
}

function getRandomSide() {
    return rand(0, 1) == 0 ? 'white' : 'black';
}

if (isset($_POST['play_now'])) {
    do {
        $game_id = generateRandomGameID(); 
    } while (gameIdExists($conn, $game_id));

    $player_side = getRandomSide();
    $opponent_side = ($player_side === 'white') ? 'black' : 'white';

    $stmt = $conn->prepare("INSERT INTO games (id, player_white, player_black) VALUES (?, ?, ?)");

    if ($player_side === 'white') {
        $player_white = $username;
        $player_black = 'Guest';
    } else {
        $player_white = 'Guest';
        $player_black = $username;
    }

    $stmt->bind_param("sss", $game_id, $player_white, $player_black);

    if ($stmt->execute()) {
        header("Location: index.php?game_id=$game_id");
        exit();
    } else {
        echo "Error creating new game: " . $stmt->error;
    }
    $stmt->close();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chess Game</title>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js" crossorigin="anonymous"></script>
    <link rel="stylesheet" href="lib/chessboardjs/css/chessboard-1.0.0.min.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="game-container">
        <div class="sidebar">
            <div class="player-info">
                <div class="player player-white">
                    <img src="https://img.icons8.com/?size=100&id=kDoeg22e5jUY&format=png&color=000000" alt="Player White" class="player-avatar" id="player1-avatar">
                    <h3 id='player1-name'><?php echo $username; ?></h3>
                    <p>Rating: 800</p>
                </div>
                <div class="player player-black">
                    <img src="https://imgs.search.brave.com/pg0fHjPd0VyE2jT6AhP1KPg9UUIy4g-ouz7b9Ut9u6U/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tYWdu/dXNjYXJsc2VuLmNv/bS9zdGF0aWMvaW1n/L2Jpby9tYWdudXMt/cHJvZmlsZS5qcGc" alt="Player Black" class="player-avatar" id="player2-avatar">
                    <h3 id="player2-name">GUEST</h3>
                    <p>Rating: 2882</p>
                </div>
            </div>
            <div class="game-controls">
                <button id="resetBtn" class="btn">Reset Game</button>
                <!--  <button id="resignBtn" class="btn">Resign</button> -->
                <form action="resign.php" method="POST" id="resignForm">
                    <input type="hidden" name="game_id" value="<?php echo $game_id; ?>">
                    <input type="hidden" name="player" value="<?php echo $username; ?>">
                    <button type="submit" id="resignBtn" class="btn">Resign</button>
                </form>
                <!-- <button id="drawBtn" class="btn">Offer Draw</button> -->
                 <form method="POST" action="">
                    <button type="submit" name="play_now" class="btn" id="newGameBtn">New Game</button>
                </form>
            </div>
        </div>
        
        <div id="myBoard" class="chessboard-container"></div>
        <div id="timer">
            <span id="white-timer">00:00</span> - <span id="black-timer">00:00</span>
        </div>

        <div class="move-history">
            <div id="gameStatus" class="game-status">
                <p id="status">White to move</p>
            </div>
            <h4>Move History</h4>
            <table id="moveHistoryTable">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>White</th>
                        <th>Black</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>

    <script src="./lib/chessboardjs/js/chessboard-1.0.0.min.js"></script>
    <script src="script.js"></script>
    <script>
     var gameId = "<?php echo isset($game_id)? $game_id: ''; ?>";
    </script>
</body>
</html>
