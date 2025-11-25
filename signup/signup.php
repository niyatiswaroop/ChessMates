<?php
include('../connection.php');
if (isset($_POST['signupButton'])) {
  $username = mysqli_real_escape_string($conn, $_POST['username']);
  $email = mysqli_real_escape_string($conn, $_POST['email']);
  $password = mysqli_real_escape_string($conn, $_POST['password']);
  $cpassword = mysqli_real_escape_string($conn, $_POST['confirmPassword']);

  $sql_user_check = "SELECT * FROM userinfo WHERE username='$username'";
  $result_user = mysqli_query($conn, $sql_user_check);
  $count_user = mysqli_num_rows($result_user);

  $sql_email_check = "SELECT * FROM userinfo WHERE email='$email'";
  $result_email = mysqli_query($conn, $sql_email_check);
  $count_email = mysqli_num_rows($result_email);

  if ($count_user == 0 && $count_email == 0) {

    if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
      // email validate hoga tabhi password verify hoga.
      // echo "The email address $email is valid.";

      if ($password === $cpassword) {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $sql_insert = "INSERT INTO userinfo (username, email, password) VALUES ('$username', '$email', '$hash')";
        $result_insert = mysqli_query($conn, $sql_insert);

        //non hashed password for the admin(CONFIDENTIAL).
        // $sql_info = "INSERT INTO userinfo (email, password) VALUES ('$email', '$cpassword') ";
        // mysqli_query($conn, $sql_info);

        if ($result_insert) {
          header("Location: ../landing/landing.php"); //yahan pe landing page connect hoga
          exit;
        } else {
          echo '<script>
          alert("Failed to sign up. Please try again.");
          window.location.href = "signuppage.php";
          </script>';
        }
      } else {
        echo '<script>
            alert("Passwords do not match.");
            window.location.href = "signuppage.php";
            </script>';
      }
    } else {
      // email validate nhi hoga to vapis bhej dega signup page pr.
      echo '<script>
          alert("Email format is not correct. Please enter correct email.");
          window.location.href = "signuppage.php";
          </script>';
    }

  } else {
    // if ($count_user > 0) {
    //   echo '<script>
    //       alert("Username already exists!");
    //       window.location.href = "signuppage.php";
    //       </script>';
    // }
    if ($count_email > 0) {
      echo '<script>
          alert("Email already exists!");
          window.location.href = "signuppage.php";
          </script>';
    }
  }
}

?>
