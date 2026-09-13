document.querySelector('.menu-toggle')?.addEventListener('click',()=>document.querySelector('.nav')?.classList.toggle('open'));
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.nav')?.classList.remove('open')));

function sendBooking(e){
  e.preventDefault();
  const v=id=>(document.getElementById(id)?.value||'').trim();
  const attribution=getEnquiryAttribution();
  const details=[
    'Hello Ciao Mobility, I would like to request a quotation.',
    '',
    'Service: '+v('service'),
    'Pickup: '+v('pickup'),
    'Drop-off: '+v('dropoff'),
    'Date: '+(v('date')||'To be confirmed'),
    'Time: '+(v('time')||'To be confirmed'),
    'Passengers: '+v('passengers'),
    'Luggage: '+(v('luggage')||'Not provided'),
    'Flight number: '+(v('flight')||'Not applicable / not provided'),
    '',
    'Name: '+v('name'),
    'Phone / WhatsApp: '+v('phone'),
    'Email: '+(v('email')||'Not provided'),
    '',
    'Additional requirements: '+(v('message')||'None')
  ];
  if(attribution)details.push('', 'Enquiry source: '+attribution);
  window.location.href='https://wa.me/971585698871?text='+encodeURIComponent(details.join('\n'));
  return false;
}

function safeSourceValue(value,maxLength=100){
  return (value||'').replace(/[\r\n<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,maxLength);
}

function captureBookingSource(){
  try{
    if(!sessionStorage.getItem('ciao_landing_page')){
      sessionStorage.setItem('ciao_landing_page',safeSourceValue(window.location.pathname||'/',140));
      const referrer=document.referrer?new URL(document.referrer):null;
      if(referrer&&referrer.origin!==window.location.origin)sessionStorage.setItem('ciao_referrer',safeSourceValue(referrer.hostname));
      const params=new URLSearchParams(window.location.search);
      for(const key of ['utm_source','utm_medium','utm_campaign']){
        const value=safeSourceValue(params.get(key));
        if(value)sessionStorage.setItem('ciao_'+key,value);
      }
    }
  }catch(_){}
}

function getEnquiryAttribution(){
  try{
    const labels=[
      ['ciao_landing_page','Landing page'],
      ['ciao_utm_source','Source'],
      ['ciao_utm_medium','Medium'],
      ['ciao_utm_campaign','Campaign'],
      ['ciao_referrer','Referrer']
    ];
    return labels.map(([key,label])=>{
      const value=safeSourceValue(sessionStorage.getItem(key),140);
      return value?label+': '+value:'';
    }).filter(Boolean).join(' | ');
  }catch(_){return '';}
}

function routeLabel(value){
  const special={dxb:'DXB',dwc:'DWC',shj:'SHJ',auh:'AUH',jbr:'JBR'};
  return value.split('-').map(word=>special[word]||word.charAt(0).toUpperCase()+word.slice(1)).join(' ');
}

function inferJourneyContext(pathname){
  const path=(pathname||'').replace(/^\//,'');
  const airportOrigins=[
    [/^dxb-airport-to-(.+)-transfer\.html$/,'Dubai International Airport (DXB)'],
    [/^auh-airport-to-(.+)-transfer\.html$/,'Zayed International Airport (AUH)'],
    [/^sharjah-airport-to-(.+)-transfer\.html$/,'Sharjah International Airport (SHJ)'],
    [/^dwc-airport-to-(.+)-transfer\.html$/,'Al Maktoum International Airport (DWC)']
  ];
  for(const [pattern,pickup] of airportOrigins){
    const match=path.match(pattern);
    if(match)return {service:'Airport Transfer',pickup,dropoff:routeLabel(match[1])};
  }
  if(path==='dubai-airport-to-abu-dhabi-transfer.html')return {service:'Airport Transfer',pickup:'Dubai International Airport (DXB)',dropoff:'Abu Dhabi'};
  if(path==='abu-dhabi-airport-to-dubai-transfer.html')return {service:'Airport Transfer',pickup:'Zayed International Airport (AUH)',dropoff:'Dubai'};
  if(path==='dxb-to-dwc-airport-transfer.html')return {service:'Airport Transfer',pickup:'Dubai International Airport (DXB)',dropoff:'Al Maktoum International Airport (DWC)'};
  if(path==='dxb-to-abu-dhabi-airport-transfer.html')return {service:'Airport Transfer',pickup:'Dubai International Airport (DXB)',dropoff:'Zayed International Airport (AUH)'};
  if(path==='shj-to-dxb-airport-transfer.html')return {service:'Airport Transfer',pickup:'Sharjah International Airport (SHJ)',dropoff:'Dubai International Airport (DXB)'};
  let match=path.match(/^dubai-to-(.+)-private-transfer\.html$/);
  if(match)return {service:'Inter-Emirate Transfer',pickup:'Dubai',dropoff:routeLabel(match[1])};
  if(path==='abu-dhabi-to-dubai-private-transfer.html')return {service:'Inter-Emirate Transfer',pickup:'Abu Dhabi',dropoff:'Dubai'};
  if(path==='dubai-hotel-to-airport-transfer.html')return {service:'Airport Transfer',pickup:'Dubai hotel or address',dropoff:'Dubai airport (DXB or DWC)'};
  if(/^chauffeur-service|^chauffeur-services|^hourly-full-day-chauffeur/.test(path))return {service:'Chauffeur Service'};
  if(/airport/.test(path))return {service:'Airport Transfer'};
  if(/inter-emirate/.test(path))return {service:'Inter-Emirate Transfer'};
  return {};
}

function prefillBookingContext(){
  const form=document.querySelector('.booking-form');
  if(!form)return;
  let context={};
  try{
    const referrer=new URL(document.referrer);
    if(referrer.origin===window.location.origin)context=inferJourneyContext(referrer.pathname);
  }catch(_){}
  const params=new URLSearchParams(window.location.search);
  const allowedServices=['Airport Transfer','Chauffeur Service','Inter-Emirate Transfer'];
  const requestedService=params.get('service');
  if(allowedServices.includes(requestedService))context.service=requestedService;
  if(params.get('pickup'))context.pickup=params.get('pickup').slice(0,120);
  if(params.get('dropoff'))context.dropoff=params.get('dropoff').slice(0,120);
  for(const id of ['service','pickup','dropoff']){
    const field=document.getElementById(id);
    if(field&&context[id]&&!field.value)field.value=context[id];
  }
  const summary=[context.service,context.pickup&&context.dropoff?context.pickup+' → '+context.dropoff:context.pickup||context.dropoff].filter(Boolean).join(' · ');
  const notice=document.getElementById('journey-context');
  if(notice&&summary){notice.textContent='Journey selected: '+summary;notice.hidden=false;}
}

document.addEventListener('DOMContentLoaded',()=>{
  captureBookingSource();
  prefillBookingContext();
  const logo='assets/ciao-logo.svg';
  const brand=document.querySelector('.brand');
  if(brand){brand.innerHTML=`<img src="${logo}" alt="CIAO Mobility Services" width="180" height="90" decoding="async" fetchpriority="high">`;brand.style.width='190px';brand.style.height='82px';brand.style.padding='0';brand.style.overflow='visible';const img=brand.querySelector('img');img.style.width='180px';img.style.height='90px';img.style.objectFit='contain';img.style.display='block';}
  const footerLogo=document.querySelector('footer > div:first-child');
  if(footerLogo){footerLogo.innerHTML=`<img src="${logo}" alt="CIAO Mobility Services" width="190" height="95" loading="lazy" decoding="async">`;const img=footerLogo.querySelector('img');img.style.width='190px';img.style.height='95px';img.style.objectFit='contain';img.style.display='block';}
});