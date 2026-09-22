// Mobiles Hamburger-Menü: blendet die Sidebar per Klick ein/aus.
function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  var backdrop = document.querySelector('.sidebar-backdrop');
  if (!sidebar || !backdrop) return;
  sidebar.classList.toggle('open');
  backdrop.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', function() {
  var backdrop = document.querySelector('.sidebar-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', toggleSidebar);
  }
  // Menü automatisch schließen, wenn ein Link darin angeklickt wird
  var sidebarLinks = document.querySelectorAll('.sidebar nav a, .sidebar .lang-switch a');
  sidebarLinks.forEach(function(link) {
    link.addEventListener('click', function() {
      var sidebar = document.querySelector('.sidebar');
      var backdrop = document.querySelector('.sidebar-backdrop');
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
    });
  });
});
