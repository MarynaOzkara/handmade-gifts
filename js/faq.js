var FAQ_DATA = [
  ['faq_q1','faq_a1'],['faq_q2','faq_a2'],['faq_q3','faq_a3'],
  ['faq_q4','faq_a4'],['faq_q5','faq_a5'],['faq_q6','faq_a6'],
];
function renderFaq(){
  var grid = document.getElementById('faqGrid');
  if(!grid) return;
  grid.innerHTML = FAQ_DATA.map(function(f,i){
    return '<div class="faq-item">' +
      '<button class="faq-q" onclick="toggleFaq(' + i + ')" id="faqBtn' + i + '">' +
        '<span>' + t(f[0]) + '</span>' +
        '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      '</button>' +
      '<div class="faq-a" id="faqA' + i + '"><div class="faq-a-inner">' + t(f[1]) + '</div></div>' +
    '</div>';
  }).join('');
}
function toggleFaq(i){
  var btn=document.getElementById('faqBtn'+i), ans=document.getElementById('faqA'+i);
  var open=btn.classList.contains('open');
  document.querySelectorAll('.faq-q').forEach(function(b){b.classList.remove('open');});
  document.querySelectorAll('.faq-a').forEach(function(a){a.classList.remove('open');});
  if(!open){ btn.classList.add('open'); ans.classList.add('open'); }
}
