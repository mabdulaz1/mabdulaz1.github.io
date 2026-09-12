document.querySelector('.menu-toggle')?.addEventListener('click',()=>document.querySelector('.nav')?.classList.toggle('open'));
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.nav')?.classList.remove('open')));

function sendBooking(e){
  e.preventDefault();
  const v=id=>(document.getElementById(id)?.value||'').trim();
  const details=[
    'Hello Ciao Mobility, I would like to request a transfer.',
    '',
    'Name: '+v('name'),
    'Phone / WhatsApp: '+v('phone'),
    'Email: '+v('email'),
    'Passengers: '+v('passengers'),
    'Pickup: '+v('pickup'),
    'Drop-off: '+v('dropoff'),
    'Date: '+(v('date')||'To be confirmed'),
    'Time: '+(v('time')||'To be confirmed'),
    '',
    'Additional details: '+(v('message')||'None')
  ];
  window.location.href='https://wa.me/971585698871?text='+encodeURIComponent(details.join('\n'));
  return false;
}

document.addEventListener('DOMContentLoaded',()=>{
  const logo='assets/ciao-logo.svg';
  const brand=document.querySelector('.brand');
  if(brand){brand.innerHTML=`<img src="${logo}" alt="CIAO Mobility Services">`;brand.style.width='190px';brand.style.height='82px';brand.style.padding='0';brand.style.overflow='visible';const img=brand.querySelector('img');img.style.width='180px';img.style.height='90px';img.style.objectFit='contain';img.style.display='block';}
  const footerLogo=document.querySelector('footer > div:first-child');
  if(footerLogo){footerLogo.innerHTML=`<img src="${logo}" alt="CIAO Mobility Services">`;const img=footerLogo.querySelector('img');img.style.width='190px';img.style.height='95px';img.style.objectFit='contain';img.style.display='block';}
});