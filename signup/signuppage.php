<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up</title>
    <link rel="stylesheet" href="signup.css">
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <img src="../img/chess.png" alt="Chess Logo" />
        </div>
        <h2>Sign Up for CHESSMATES</h2>
        <?php if (!empty($errorMessage)): ?>
            <p class="error-message"><?php echo $errorMessage; ?></p>
        <?php endif; ?>

        <form id="signupForm" method="POST" action="signup.php">
            <div class="input-group">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required placeholder="Enter your username" value="<?php echo isset($_POST['username']) ? htmlspecialchars($_POST['username']) : ''; ?>">
            </div>
            <div class="input-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required placeholder="Enter your email" value="<?php echo isset($_POST['email']) ? htmlspecialchars($_POST['email']) : ''; ?>">
            </div>
            <div class="input-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required placeholder="Create a password">
            </div>
            <div class="input-group">
                <label for="confirmPassword">Confirm Password:</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required placeholder="Confirm your password">
            </div>
            <input type="submit" name="signupButton" id="signupButton">
        </form>
        <p class="login-link">Already have an account? <a href="../signin/signinform.php">Login</a></p>
    </div>

</body>
</html>
