document.getElementById('hamburger').addEventListener('click', function(){
  this.classList.toggle('open');
  document.getElementById('mobileOverlay').classList.toggle('open');
  document.getElementById('mobilePanel').classList.toggle('open');
});
function closeMobile(){
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('mobileOverlay').classList.remove('open');
  document.getElementById('mobilePanel').classList.remove('open');
}
// Show mobile sidebar close btn on mobile
document.querySelectorAll('.mobile-sidebar-close').forEach(b => b.style.display = 'flex');
