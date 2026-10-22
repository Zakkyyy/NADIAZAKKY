/* Kencana Melati v1 · checklist persetujuan (localStorage) */
(function(){
  var box=document.getElementById('ck'), out=document.getElementById('ckp'), key='kencana-melati-checklist';
  var inputs=[].slice.call(box.querySelectorAll('input[type=checkbox]'));
  var saved={}; try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(e){saved={};}
  function upd(){var n=inputs.filter(function(i){return i.checked;}).length;out.textContent=n+' dari '+inputs.length+' disetujui';}
  inputs.forEach(function(i){ if(saved[i.id]) i.checked=true; i.addEventListener('change',function(){ saved[i.id]=i.checked; try{localStorage.setItem(key,JSON.stringify(saved));}catch(e){} upd(); }); });
  upd();
})();
