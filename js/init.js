document.addEventListener('DOMContentLoaded', async function(){
  await MottyDB.init();
  // Apply saved language (no Catalog.rerenderText yet)
  var savedLang = 'ua';
  try { savedLang = localStorage.getItem('motty_lang') || 'ua'; } catch(e){}
  currentLang = savedLang;
  document.querySelectorAll('[data-i18n]').forEach(function(el){
    var key = el.dataset.i18n;
    if(el.tagName === 'INPUT' && el.hasAttribute('placeholder')) el.placeholder = t(key);
    else el.innerHTML = t(key);
  });
  document.querySelectorAll('.lang-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.lang === savedLang);
  });

  // Init catalog (renders products, sidebar, etc.)
  Catalog.init();

  // Render FAQ after catalog init
  renderFaq();
});
