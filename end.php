<?php
session_start();
include('./connection.php');

if (isset($_POST['game_id']) && isset($_POST['result'])) {
    $game_id = $_POST['game_id'];
    $result = $_POST['result'];  // 'white', 'black', or 'Draw'

    $stmt = $conn->prepare("UPDATE games SET winner = ? WHERE id = ?");
    $stmt->bind_param("ss", $result, $game_id);  // 'ss' means two strings

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to update game status.']);
    }

    $stmt->close();
    mysqli_close($conn);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request.']);
}
?>
