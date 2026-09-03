document.querySelector('.menu-toggle')?.addEventListener('click',()=>document.querySelector('.nav')?.classList.toggle('open'));
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.nav')?.classList.remove('open')));
function sendBooking(e){e.preventDefault();const v=id=>document.getElementById(id)?.value||'';const subject=encodeURIComponent('Ciao Mobility Transfer Request - '+v('name'));const body=encodeURIComponent(`Name: ${v('name')}\nPhone / WhatsApp: ${v('phone')}\nEmail: ${v('email')}\nPassengers: ${v('passengers')}\nPickup: ${v('pickup')}\nDrop-off: ${v('dropoff')}\nDate: ${v('date')}\nTime: ${v('time')}\n\nMessage:\n${v('message')}`);window.location.href=`mailto:contact@ciaomobility.me?subject=${subject}&body=${body}`;return false;}

document.addEventListener('DOMContentLoaded',()=>{
  const logo='assets/ciao-logo.svg';
  const brand=document.querySelector('.brand');
  if(brand){brand.innerHTML=`<img src="${logo}" alt="CIAO Mobility Services">`;brand.style.width='190px';brand.style.height='82px';brand.style.padding='0';brand.style.overflow='visible';const img=brand.querySelector('img');img.style.width='180px';img.style.height='90px';img.style.objectFit='contain';img.style.display='block';}
  const footerLogo=document.querySelector('footer > div:first-child');
  if(footerLogo){footerLogo.innerHTML=`<img src="${logo}" alt="CIAO Mobility Services">`;const img=footerLogo.querySelector('img');img.style.width='190px';img.style.height='95px';img.style.objectFit='contain';img.style.display='block';}
});