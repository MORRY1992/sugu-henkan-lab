const search=document.querySelector('#tool-search');
if(search){
 const cards=[...document.querySelectorAll('[data-search]')];
 const filters=[...document.querySelectorAll('[data-filter]')];
 let category='all';
 function update(){
  const q=search.value.trim().toLocaleLowerCase('ja');let n=0;
  for(const card of cards){const data=card.dataset.search;const inCategory=category==='all'||(category==='Web'?/ Web | QR /.test(data):data.includes(' '+category+' '));const hit=inCategory&&data.toLocaleLowerCase('ja').includes(q);card.hidden=!hit;if(hit)n++;}
  document.querySelector('#search-result').textContent=q||category!=='all'?`${n}件のツールが見つかりました。`:'';
  document.querySelector('#search-empty').hidden=n!==0;
  for(const button of filters){const active=button.dataset.filter===category;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
 }
 search.addEventListener('input',update);
 for(const button of filters)button.addEventListener('click',()=>{category=button.dataset.filter;update();});
 document.querySelector('#clear-search').addEventListener('click',()=>{search.value='';category='all';update();search.focus();});
}
