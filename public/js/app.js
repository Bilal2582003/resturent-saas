// Placeholder for admin-wide JS. Add small UX helpers here.
document.querySelectorAll('.flash').forEach((f) => {
  setTimeout(() => f.style.transition = 'opacity .4s', 2600);
  setTimeout(() => f.style.opacity = '0', 3000);
  setTimeout(() => f.remove(), 3500);
});