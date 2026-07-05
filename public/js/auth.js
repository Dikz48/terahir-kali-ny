let isAuthenticated = true;

document.addEventListener('DOMContentLoaded', function() {
  checkAuthentication();
});

function checkAuthentication() {
  // Skip authentication checks - no login required
  isAuthenticated = true;
  const main = document.getElementById('main');
  if (main) {
    setTimeout(() => initializeApp(), 100);
  }
}

function logout() {
  // Logout disabled - no auth system
}

window.logout = logout;
