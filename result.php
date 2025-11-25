<?php
session_start();
include('./connection.php');

if (!isset($_SESSION['username'])) {
    header("Location: welcome.php");
    exit();
}

if (isset($_GET['game_id']) && isset($_GET['winner'])) {
    $game_id = $_GET['game_id'];
    $winner = $_GET['winner'];

    $stmt = $conn->prepare("SELECT player_white, player_black, created_at FROM games WHERE id = ?");
    $stmt->bind_param("s", $game_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $game = $result->fetch_assoc();
        $player_white = $game['player_white'];
        $player_black = $game['player_black'];
        $created_at = $game['created_at'];

        echo "<h1>Game Result</h1>";
        echo "<p>Game ID: $game_id</p>";
        echo "<p>Player White: $player_white</p>";
        echo "<p>Player Black: $player_black</p>";
        echo "<p>Game started at: $created_at</p>";
        echo "<p><strong>Winner: $winner</strong></p>";
    } else {
        echo "Game not found.";
    }

    $stmt->close();
} else {
    echo "Invalid game or winner information.";
}
?>

<a href="index.php">Back to Play</a>
