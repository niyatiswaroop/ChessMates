<?php
session_start();
include('./connection.php');

$username = isset($_SESSION['username']) ? $_SESSION['username'] : 'Guest';

$game_id = uniqid();
$side = rand(0, 1) == 0 ? 'White' : 'Black';

$query = "INSERT INTO games (player_white, player_black) 
          VALUES ('" . ($side == 'White' ? $username : 'NULL') . "', 
                  '" . ($side == 'Black' ? $username : 'NULL') . "')";

if (mysqli_query($conn, $query)) {
    $game_id = mysqli_insert_id($conn);
    echo json_encode(['status' => 'success', 'game_id' => $game_id]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to create game']);
}

$conn->close();
?>
