document.addEventListener('DOMContentLoaded', function() {
    const signupButton = document.querySelector(".signup-text a");
    const signinButton = document.querySelector(".sign-in-button");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    
    // Check if user is already logged in
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
        // Could redirect to dashboard here
        console.log("User already logged in:", currentUser);
    }

    if (signupButton) {
        signupButton.addEventListener("click", function (event) {
            event.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (email && password) {
                if (password.length < 8) {
                    alert("Password must be at least 8 characters long.");
                    return;
                }

                let users = JSON.parse(localStorage.getItem("users")) || {};
                if (users[email]) {
                    alert("User already exists! Please log in instead.");
                } else {
                    users[email] = { 
                        password, 
                        statistics: { 
                            donations: 0, 
                            visits: 1,
                            joined: new Date().toISOString(),
                            lastLogin: new Date().toISOString()
                        } 
                    };
                    localStorage.setItem("users", JSON.stringify(users));
                    alert("Sign-up successful! You can now log in.");
                }
            } else {
                alert("Please enter email and password.");
            }
        });
    }

    if (signinButton) {
        signinButton.addEventListener("click", function (event) {
            event.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                alert("Please enter both email and password.");
                return;
            }

            let users = JSON.parse(localStorage.getItem("users")) || {};
            if (users[email] && users[email].password === password) {
                users[email].statistics.visits += 1;
                users[email].statistics.lastLogin = new Date().toISOString();
                localStorage.setItem("users", JSON.stringify(users));
                localStorage.setItem("currentUser", email);
                
                alert("Login successful! Redirecting to dashboard...");
                window.location.href = "dashboard.html";
            } else {
                alert("Invalid credentials! Please try again.");
            }
        });
    }

    // Add logout functionality
    const logoutButton = document.getElementById("logout-btn");
    if (logoutButton) {
        logoutButton.addEventListener("click", function() {
            localStorage.removeItem("currentUser");
            alert("You have been logged out successfully.");
            window.location.href = "index.html";
        });
    }
});

// Function to check login status - can be called from any page
function checkLoginStatus() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
        // Redirect to login page if not logged in
        window.location.href = "login.html";
        return false;
    }
    return true;
}

// Function to get current user data
function getCurrentUserData() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return null;
    
    const users = JSON.parse(localStorage.getItem("users")) || {};
    return users[currentUser] || null;
}