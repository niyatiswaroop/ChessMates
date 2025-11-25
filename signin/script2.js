    document.getElementById("loginForm").addEventListener("submit", function(event) {
        //event.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        if (username === "" || password === "") {
            document.getElementById("errorMessage").textContent = "Both fields are required!";
        } else {
            document.getElementById("errorMessage").textContent = "";
            alert("Login successful!");
            // window.location.href = "dashboard.html";
        }
    });
