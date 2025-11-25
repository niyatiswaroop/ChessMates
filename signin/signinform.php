<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link rel="stylesheet" href="style2.css">
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <img src="../img/chess.png" alt="Chess Logo" />
        </div>
        <h2>Login to CHESSMATES</h2>
        <form id="loginForm" method="POST" action="signin.php">
            <div class="input-group">
                <label for="username">EMAIL:</label>
                <input type="text" id="email" name="email" required placeholder="Enter your EMAIL id">
            </div>
            <div class="input-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required placeholder="Enter your password">
            </div>
            <input type="submit" class="loginButton" name="signin">
            <p id="errorMessage" class="error-message"></p>
        </form>
        <p class="signup-link">Don't have an account? <a href="../signup/signuppage.php">Sign Up</a></p>
    </div>

    <script src="script2.js"></script>
</body>
</html>
