/* Kencana Melati · checklist persetujuan di index.html (status disimpan di localStorage peramban) */
(() => {
  const KEY = 'kencana-melati-v20-checklist';
  const boxes = [...document.querySelectorAll('#ck input')];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  const upd = () => { const n = boxes.filter(b => b.checked).length; document.getElementById('ckp').textContent = n + ' dari ' + boxes.length + ' disetujui'; };
  boxes.forEach(b => { b.checked = !!saved[b.id]; b.addEventListener('change', () => { saved[b.id] = b.checked; try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} upd(); }); });
  upd();
})();
