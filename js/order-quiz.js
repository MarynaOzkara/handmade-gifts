var _oqStep = 0;
function openOrderQuiz(){
  _oqStep = 0;
  var steps = ['oqs0','oqs1','oqs2','oqs3','oqs-ok'];
  steps.forEach(function(id){ var el=document.getElementById(id); if(el){el.classList.remove('oq-show');} });
  var s0 = document.getElementById('oqs0'); if(s0) s0.classList.add('oq-show');
  _oqDots(); _oqNav();
  var ov = document.getElementById('orderQuizOverlay');
  ov.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeOrderQuiz(){
  document.getElementById('orderQuizOverlay').style.display = 'none';
  document.body.style.overflow = '';
}
function handleOQClick(e){
  if(e.target === document.getElementById('orderQuizOverlay')) closeOrderQuiz();
}
function oqSel(step, btn){
  document.querySelectorAll('#oqs'+step+' .oq-opt').forEach(function(b){b.classList.remove('oq-sel');});
  btn.classList.add('oq-sel');
  setTimeout(function(){ _oqStep = step + 1; _oqShowStep(); }, 280);
}
function oqBack(){
  if(_oqStep > 0){ _oqStep--; _oqShowStep(); }
}
function _oqShowStep(){
  var ids = ['oqs0','oqs1','oqs2','oqs3'];
  ids.forEach(function(id,i){ var el=document.getElementById(id); if(el) el.classList.toggle('oq-show', i===_oqStep); });
  _oqDots(); _oqNav();
}
function _oqDots(){
  var dots = document.querySelectorAll('#oqDots .oq-dot');
  dots.forEach(function(d,i){ d.classList.toggle('oq-dot-a', i <= _oqStep); });
}
function _oqNav(){
  var bk = document.getElementById('oqBackBtn');
  if(bk) bk.style.display = _oqStep > 0 ? 'inline-block' : 'none';
}
function oqSubmit(){
  var name = (document.getElementById('oqName')||{}).value || '';
  var phone = (document.getElementById('oqPhone')||{}).value || '';
  if(!name.trim() || !phone.trim()){ showToast("Будь ласка, заповніть ім&#39;я і телефон"); return; }
  ['oqs0','oqs1','oqs2','oqs3'].forEach(function(id){ var el=document.getElementById(id); if(el) el.classList.remove('oq-show'); });
  var nav = document.getElementById('oqNav'); if(nav) nav.style.display='none';
  var ok = document.getElementById('oqs-ok'); if(ok) ok.classList.add('oq-show');
  var dots = document.querySelectorAll('#oqDots .oq-dot');
  dots.forEach(function(d){ d.classList.add('oq-dot-a'); });
}
