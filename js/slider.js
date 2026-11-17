// Hero slider
(function(){
  var slider = document.getElementById('hSliderWrap');
  if(!slider) return;

  var slides = slider.querySelectorAll('.slide');
  var dots = slider.querySelectorAll('.h-dot');
  var cur = 0;
  var timer;
  if(!slides.length) return;

  function go(n){
    cur = (n + slides.length) % slides.length;
    slides.forEach(function(slide, i){
      slide.classList.toggle('on', i === cur);
    });
    dots.forEach(function(dot, i){
      dot.classList.toggle('h-dot-a', i === cur);
    });
  }

  function resetTimer(){
    clearInterval(timer);
    timer = setInterval(function(){ go(cur + 1); }, 6000);
  }

  window.hSlide = function(direction){
    go(cur + direction);
    resetTimer();
  };

  dots.forEach(function(dot, i){
    dot.addEventListener('click', function(){
      if(i < slides.length){
        go(i);
        resetTimer();
      }
    });
  });

  resetTimer();
})();
