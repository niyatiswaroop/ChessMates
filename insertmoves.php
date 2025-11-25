<?php
include('./connection.php');

function insertOrUpdateMoveHistory($game_id, $move_number, $white_move, $black_move) {
    global $conn;

    $game_id = (int)$game_id;  
    $move_number = (int)$move_number;  
    $white_move = $conn->real_escape_string($white_move); 
    $black_move = $conn->real_escape_string($black_move);

    $stmt = $conn->prepare("SELECT id FROM game_moves WHERE game_id = ? AND move_number = ?");
    $stmt->bind_param("ii", $game_id, $move_number);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        $update_stmt = $conn->prepare("UPDATE game_moves SET black_move = ? WHERE game_id = ? AND move_number = ?");
        $update_stmt->bind_param("sii", $black_move, $game_id, $move_number);

        if ($update_stmt->execute()) {
            echo "Move history updated successfully!";
        } else {
            echo "Error updating move history: " . $update_stmt->error;
        }
        $update_stmt->close();
    } else {
        $insert_stmt = $conn->prepare("INSERT INTO game_moves (game_id, move_number, white_move, black_move) VALUES (?, ?, ?, ?)");
        $insert_stmt->bind_param("iiss", $game_id, $move_number, $white_move, $black_move);

        if ($insert_stmt->execute()) {
            echo "Move history saved successfully!";
        } else {
            echo "Error saving move history: " . $insert_stmt->error;
        }
        $insert_stmt->close();
    }

    $stmt->close();
}


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['game_id'], $_POST['move_number'], $_POST['white_move'], $_POST['black_move'])) {
        $game_id = $_POST['game_id'];
        $move_number = $_POST['move_number'];
        $white_move = $_POST['white_move'];
        $black_move = $_POST['black_move'];

        insertOrUpdateMoveHistory($game_id, $move_number, $white_move, $black_move);
    } else {
        echo "Error: Missing parameters!";
    }
}else{
    echo "Error: Invalid request method!";
}
$conn->close();
?>