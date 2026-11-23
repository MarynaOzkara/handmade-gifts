(function(){
  function getNewProds(){
    var custom = [];
    try{ custom = JSON.parse(localStorage.getItem('motty_custom_products'))||[]; }catch(e){}
    // Sort by addedAt desc, take latest 3
    return custom.sort(function(a,b){ return (b.addedAt||0)-(a.addedAt||0); }).slice(0,3);
  }
  var wrap = document.getElementById('newProdsSlider');
  if(!wrap) return;
  var prods = getNewProds();
  if(!prods.length){ wrap.closest('section').style.display='none'; return; }
  wrap.innerHTML = prods.map(function(p){
    return '<div class="np-slide" onclick="Catalog.openModal(\''+p.id+'\')">'+
      '<div style="aspect-ratio:1;overflow:hidden;border-radius:12px;margin-bottom:14px">'+
        '<img src="'+(p.images&&p.images[0]?p.images[0]:'')+'" alt="'+p.title+'" style="width:100%;height:100%;object-fit:cover;transition:transform .4s" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">'+
      '</div>'+
      '<div style="padding:0 4px">'+
        '<div style="font-size:11px;color:var(--mute);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">'+catName(p.cat)+'</div>'+
        '<div style="font-size:15px;font-weight:500;margin-bottom:6px;line-height:1.3">'+p.title+'</div>'+
        '<div style="display:flex;align-items:center;gap:8px">'+
          '<span style="font-size:16px;font-weight:600;color:var(--acc)">'+fmt(p.price)+'</span>'+
          (p.old?'<span style="font-size:12px;color:var(--mute);text-decoration:line-through">'+fmt(p.old)+'</span>':'')+ 
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
})();
