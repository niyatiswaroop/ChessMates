<?php
session_start();
include('./connection.php');

// if (!isset($_SESSION['username'])) {
//     header("Location: ../welcome/welcome.php");
//     exit();
// }

$username = $_SESSION['username'];

if (isset($_POST['game_id']) && isset($_POST['player'])) {
    $game_id = $_POST['game_id'];
    $player_resigning = $_POST['player'];

    $stmt = $conn->prepare("SELECT player_white, player_black FROM games WHERE id = ?");
    $stmt->bind_param("s", $game_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $game = $result->fetch_assoc();
        $player_white = $game['player_white'];
        $player_black = $game['player_black'];

        if ($player_resigning == $player_white) {
            $winner = $player_black;
        } else {
            $winner = $player_white;
        }

        $update_stmt = $conn->prepare("UPDATE games SET winner = ? WHERE id = ?");
        $update_stmt->bind_param("ss", $winner, $game_id);

        if ($update_stmt->execute()) {
            echo "<script>
                    alert('$player_resigning has resigned. Winner: $winner');
                    window.location.href = './welcome/welcome.php'; // Redirect to the welcome page or any page you prefer
                  </script>";
        } else {
            echo "Error updating the game winner: " . $update_stmt->error;
        }
    } else {
        echo "Game not found.";
    }

    $stmt->close();
} else {
    echo "Invalid request.";
}

$conn->close();
?>
