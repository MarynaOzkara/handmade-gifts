var quizStep = 0, quizAnswers = {};
var QUIZ_OPTS = [
  [['q1_opt1','q1_opt1s','parents'],['q1_opt2','q1_opt2s','partner'],
   ['q1_opt3','q1_opt3s','friend'],['q1_opt4','q1_opt4s','child'],
   ['q1_opt5','q1_opt5s','colleague'],['q1_opt6','q1_opt6s','other']],
  [['q2_opt1','q2_opt1s','birthday'],['q2_opt2','q2_opt2s','anniversary'],
   ['q2_opt3','q2_opt3s','any'],['q2_opt4','q2_opt4s','newyear'],
   ['q2_opt5','q2_opt5s','march8'],['q2_opt6','q2_opt6s','halloween']],
  [['q3_opt1','','u500'],['q3_opt2','','u1000'],
   ['q3_opt3','','u2000'],['q3_opt4','','over2000'],
   ['q3_opt5','q3_opt5s','any']],
];
function renderQuizOpts(){
  QUIZ_OPTS.forEach(function(step, si){
    var wrap = document.getElementById('qOpts'+si);
    if(!wrap) return;
    wrap.innerHTML = step.map(function(opt){
      var lk=opt[0], sk=opt[1], val=opt[2];
      var sel = quizAnswers[si]===val ? 'selected' : '';
      return '<div class="quiz-option ' + sel + '" onclick="selectQuizOpt(' + si + ',\'' + val + '\',this)">' +
        '<h5>' + t(lk) + '</h5>' +
        (t(sk) ? '<p>' + t(sk) + '</p>' : '') +
      '</div>';
    }).join('');
  });
}
function selectQuizOpt(step, val, el){
  quizAnswers[step] = val;
  document.querySelectorAll('#qOpts'+step+' .quiz-option').forEach(function(o){o.classList.remove('selected');});
  el.classList.add('selected');
  setTimeout(function(){ quizNext(); }, 320);
}
function quizNext(){
  if(quizStep < 2){ quizStep++; showQuizStep(); }
  else { showQuizResults(); }
}
function quizPrev(){
  if(quizStep > 0){ quizStep--; showQuizStep(); }
}
function quizSkip(){ quizAnswers[quizStep] = 'any'; quizNext(); }
function showQuizStep(){
  [0,1,2,3].forEach(function(i){
    var el = document.getElementById('qs'+i);
    if(el) el.classList.toggle('show', i===quizStep);
  });
  var pcts = [33,66,100];
  var fill = document.getElementById('quizProgressFill');
  if(fill) fill.style.width = (pcts[quizStep]||100) + '%';
  var lbl = document.getElementById('quizProgressLabel');
  if(lbl) lbl.textContent = (currentLang==='en' ? 'Step ' : 'Крок ') + (quizStep+1) + (currentLang==='en' ? ' of 3' : ' із 3');
  var prev = document.getElementById('quizPrevBtn');
  if(prev) prev.style.display = quizStep > 0 ? 'inline-flex' : 'none';
  var skip = document.getElementById('quizSkipBtn');
  if(skip) skip.style.display = quizStep < 3 ? 'inline-block' : 'none';
  var nav = document.getElementById('quizNav');
  if(nav) nav.style.display = 'flex';
}
function showQuizResults(){
  [0,1,2].forEach(function(i){
    var el = document.getElementById('qs'+i);
    if(el) el.classList.remove('show');
  });
  var res = document.getElementById('qs3');
  if(res) res.classList.add('show');
  var nav = document.getElementById('quizNav');
  if(nav) nav.style.display = 'none';
  var fill = document.getElementById('quizProgressFill');
  if(fill) fill.style.width = '100%';
  var lbl = document.getElementById('quizProgressLabel');
  if(lbl) lbl.textContent = currentLang==='en' ? 'Results' : 'Результати';

  var who = quizAnswers[0]||'any', occ = quizAnswers[1]||'any', bud = quizAnswers[2]||'any';
  var results = MOTTY_PRODUCTS.slice();

  if(bud==='u500')      results = results.filter(function(p){return p.price < 500;});
  else if(bud==='u1000') results = results.filter(function(p){return p.price < 1000;});
  else if(bud==='u2000') results = results.filter(function(p){return p.price < 2000;});
  else if(bud==='over2000') results = results.filter(function(p){return p.price >= 2000;});

  if(occ==='halloween') results = results.filter(function(p){return p.cat==='holidays';});
  if(who==='child')     results = results.filter(function(p){return ['figures','holidays'].includes(p.cat);});
  else if(who==='partner') results = results.filter(function(p){return ['jewelry','personal'].includes(p.cat);});
  else if(who==='colleague') results = results.filter(function(p){return ['decor','figures'].includes(p.cat);});

  results.sort(function(a,b){return b.rating-a.rating;});
  results = results.slice(0,6);

  var countEl = document.getElementById('quizResultCount');
  if(countEl){
    var foundTxt = t('quiz_found').replace('{n}', results.length);
    countEl.textContent = results.length ? foundTxt : '';
  }

  var tagsEl = document.getElementById('quizResultTags');
  if(tagsEl){
    tagsEl.innerHTML = [0,1,2].map(function(si){
      var ans = quizAnswers[si]; if(!ans || ans==='any') return '';
      var opts = QUIZ_OPTS[si], opt = opts.find(function(o){return o[2]===ans;}); if(!opt) return '';
      return '<div class="quiz-result-tag">' + t(opt[0]) + ' <button onclick="quizAnswers[' + si + ']=' + "'any'" + ';showQuizResults()">' + t('quiz_change') + ' ×</button></div>';
    }).join('');
  }

  var grid = document.getElementById('quizResultGrid');
  var noRes = document.getElementById('quizNoResults');
  if(!results.length){
    if(grid) grid.innerHTML = '';
    if(noRes) noRes.style.display = 'block';
    return;
  }
  if(noRes) noRes.style.display = 'none';
  if(grid){
    grid.innerHTML = results.map(function(p){
      return '<div class="quiz-result-card" onclick="Catalog.openModal(\'' + p.id + '\');closeQuiz()">' +
        '<img src="' + p.images[0] + '" alt="' + p.title + '">' +
        '<div class="quiz-result-card-body"><h5>' + p.title + '</h5><div class="price">' + fmt(p.price) + '</div></div>' +
      '</div>';
    }).join('');
  }
}
function openQuiz(){
  quizStep = 0; quizAnswers = {};
  renderQuizOpts(); showQuizStep();
  document.getElementById('quizOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeQuiz(){
  document.getElementById('quizOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function handleQuizOverlayClick(e){
  if(e.target === document.getElementById('quizOverlay')) closeQuiz();
}
function startQuiz(who){
  openQuiz();
  if(who){
    var whoMap = {child:'child',woman:'partner',couple:'partner',mom:'parents',dad:'parents',friend:'friend'};
    quizAnswers[0] = whoMap[who] || 'other';
    quizStep = 1; showQuizStep(); renderQuizOpts();
  }
}

// ── ORDER QUIZ ──
