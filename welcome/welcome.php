<?php
session_start();
include('../connection.php');

if (isset($_SESSION['username'])) {
    $username = $_SESSION['username'];
} else {
    $username = "Guest";
}

$query = "SELECT id, created_at ,winner
          FROM games 
          WHERE player_white = '$username' OR player_black = '$username'
          ORDER BY created_at DESC 
          LIMIT 5"; 
$result = mysqli_query($conn, $query);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Chessmates</title>
    <link rel="stylesheet" href="welcome.css">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
<header>
    <nav>
        <div class="logo">
            <a href="#">
                <img src="../img/chess.png" alt="Chessmates" class="logoimg">
            </a>
            ChessMates
        </div>
        <ul class="nav-links">
            <li><a href="#">Home</a></li>
            <li><a href="../index.php">Play</a></li>
            <li><a href="#Learn">Learn</a></li>
            <li><a href="#Community">Community</a></li>
            <li><a href="#news">News</a></li>
        </ul>
        <div class="auth-buttons">
            <a href="logout.php" class="btn btn-logout">Log Out</a>
        </div>
    </nav>
</header>

<main>
    <div class="main-content">
        <section class="profile">
            <img src="https://img.icons8.com/?size=100&id=kDoeg22e5jUY&format=png&color=000000" alt="Player Image"> <!-- Add player image path -->
            <h1>Welcome, <?php echo htmlspecialchars($username); ?>!</h1>
            <p>We are excited to have you on Chessmates! Ready to start playing?</p>
            <!-- <a href="../index.php" class="btn btn-playnow">Play Now</a> -->
            <!-- <a href="../index.php" class="btn btn-playnow" id="playNowBtn">Play Now</a> -->
            <form method="POST" action="../index.php">
                <button type="submit" name="play_now" class="btn btn-playnow" id="playNowBtn">Play Now</button>
            </form>
        </section>

        <section class="past-games">
            <h2>Past Games</h2>
            <table class="games-table">
                <thead>
                    <tr>
                        <th>Game ID</th>
                        <!-- <th>Player (White)</th>
                        <th>Player (Black)</th> -->
                        <th>Game Date</th>
                        <th>winner</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    if (mysqli_num_rows($result) > 0) {
                        while ($row = mysqli_fetch_assoc($result)) {
                            echo "<tr>";
                            echo "<td>" . $row['id'] . "</td>";
                            // echo "<td>" . htmlspecialchars($row['player_white']) . "</td>";
                            // echo "<td>" . htmlspecialchars($row['player_black']) . "</td>";
                            echo "<td>" . $row['created_at'] . "</td>";
                            if($row['winner']){
                                echo "<td>" .$row['winner']."</td>";
                            }else{
                                echo "<td> ABORTED </td>";
                            }
                            echo "</tr>";
                        }
                    } else {
                        echo "<tr><td colspan='4'>No past games found.</td></tr>";
                    }
                    ?>
                </tbody>
            </table>
        </section>
    </div>
</main>

<footer>
    <p>&copy; 2024 Chessmates. All rights reserved.</p>
    <ul>
        <li><a href="#">Privacy Policy</a></li>
        <li><a href="#">Terms of Service</a></li>
        <li><a href="#">Contact</a></li>
    </ul>
</footer>

</body>
</html>