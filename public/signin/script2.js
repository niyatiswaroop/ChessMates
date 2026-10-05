// The server sends failed sign-ins back here as ?error=...&email=...&next=...
const params = new URLSearchParams(location.search);
document.getElementById("errorMessage").textContent = params.get("error") || "";
document.getElementById("email").value = params.get("email") || "";

// Keep ?next= (e.g. a game invite link) when signing in or switching to sign-up
const next = params.get("next");
if (next) {
    document.getElementById("next").value = next;
    document.getElementById("signupLink").href = "../signup/?next=" + encodeURIComponent(next);
}
