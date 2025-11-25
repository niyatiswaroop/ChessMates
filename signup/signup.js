document.getElementById("signupForm").addEventListener("submit", function(event) {
    event.preventDefault(); 

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (username === "" || email === "" || password === "" || confirmPassword === "") {
        document.getElementById("errorMessage").textContent = "All fields are required!";
    } else if (password !== confirmPassword) {
        document.getElementById("errorMessage").textContent = "Passwords do not match!";
    } else {
        document.getElementById("errorMessage").textContent = "";

        const formData = new FormData(document.getElementById("signupForm"));
        fetch("signup.php", {
            method: "POST",
            body: formData
        })
        .then(response => response.text())
        .then(data => {
            document.getElementById("errorMessage").textContent = data;
            if (data.includes("Signup successful")) {
                window.location.href = "welcome.html";
            }
        })
        .catch(error => {
            console.error("Error:", error);
            document.getElementById("errorMessage").textContent = "An error occurred.";
        });
    }
});
