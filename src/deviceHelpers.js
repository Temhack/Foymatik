// Föy tipine göre ölçüm satırlarını ve seri cihaz adlarını tek noktadan yönetir.
export const REQUIRED_ROWS = {two:2, three:3, laser:4, scale:5};

export function normalizeRecord(record){
  if (!record || !Array.isArray(record.devices)) return record;
  const expected = REQUIRED_ROWS[record.type] || 2;
  return {...record, devices: record.devices.map(device => {
    const measurements = Array.isArray(device.measurements) ? device.measurements : [];
    const filled = measurements.length >= expected ? measurements :
      [...measurements, ...Array.from({length:expected-measurements.length},()=>({ref:'',reading:''}))];
    if(record.type!=='scale')return {...device,measurements:filled};
    // Eski kayıtların boş oran alanlarını da bir defaya mahsus kapasiteden doldur.
    const loads = updateScaleLoads(device.loads||[], '', device.range||'');
    return {...device,measurements:filled,...(loads?{loads}:{})};
  })};
}

export function inferSeries(asset){
  const match = String(asset || '').match(/^(.*?)(\d+)$/);
  return match ? {prefix:match[1], start:match[2]} : {prefix:'IST-MT',start:'11'};
}

export function buildSeries({prefix,start,end,existingNames=[]}){
  const p = String(prefix ?? '').trim();
  const firstText = String(start ?? '').trim();
  const lastText = String(end ?? '').trim();
  if (!p) throw Error('Cihaz adı ön ekini gir. Örnek: ist-mt');
  if (!/^\d+$/.test(firstText) || !/^\d+$/.test(lastText)) throw Error('Başlangıç ve bitiş pozitif tam sayı olmalı.');
  const first = Number(firstText),last = Number(lastText);
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first<0 || last<first) throw Error('Bitiş numarası başlangıçtan küçük olamaz.');
  if (last-first+1 > 200) throw Error('Tek seferde en fazla 200 cihaz oluşturabilirsin.');
  const used = new Set(existingNames.map(x=>String(x).trim().toLowerCase()));
  const names = [];
  for(let i=first; i<=last; i++){
    const name = p+String(i).padStart(firstText.length,'0');
    const key = name.toLowerCase();
    if(!used.has(key)){ names.push(name);used.add(key); }
  }
  return names;
}

export function isEmptyDevice(device){
  if(!device) return false;
  const fields = ['asset','reference','operator','date','brand','serial','location','range','resolution','notes','repeatLoad','eccentricLoad'];
  return fields.every(k=>!String(device[k]||'').trim()) &&
    (device.measurements||[]).every(r=>!String(r.ref||'').trim()&&!String(r.reading||'').trim()) &&
    ['adjusted','repeat','eccentric','loads'].every(k=>(device[k]||[]).every(v=>!String(v||'').trim()));
}

// Terazinin en büyük kapasitesini al: "15 kg", "6/15 kg", "15.000 g".
// Birim yazılmamışsa sessizce kg varsaymayız: yanlış kalibrasyon yükü tehlikelidir.
export function capacityGrams(range){
  const input=String(range??'').trim().toLowerCase().replace(/\s+/g,'');
  const unit=(input.match(/(kg|kilogram|gr|gram|g|ton|tonne|t)$/)||[])[1];
  if(!unit)return null;
  const part=input.slice(0,-unit.length).split('/').at(-1);
  if(!part || !/^[0-9]+(?:[.,][0-9]+)*$/.test(part))return null;
  // Nokta binlik ayracı ise: 15.000; virgül ondalık ise: 15,5
  // 15.000 g = 15000 g; 15.000 kg = 15 kg kabul edilir.
  const numeric = ['g','gr','gram'].includes(unit) && /^\d{1,3}(?:\.\d{3})+$/.test(part)
    ? part.replace(/\./g,'')
    : part.replace(',', '.');
  if(!/^\d+(?:\.\d+)?$/.test(numeric))return null;
  const amount=Number(numeric);
  const factor={kg:1000,kilogram:1000,gr:1,gram:1,g:1,ton:1000000,tonne:1000000,t:1000000}[unit];
  return Number.isFinite(amount)&&amount>0 ? amount*factor:null;
}

function formatGrams(n){return String(Number(n.toFixed(5))).replace('.',',')}
export function suggestedScaleLoads(range){
  const max=capacityGrams(range);
  return max===null ? null : ['',.25,.50,.75,1].map((p,i)=>i===0?'':formatGrams(max*p));
}

// Manuel düzeltilen yükleri koru; sadece boş veya önceki aralıktan otomatik gelenleri yenile.
export function updateScaleLoads(currentLoads, oldRange, newRange){
  const previous=suggestedScaleLoads(oldRange);
  const next=suggestedScaleLoads(newRange);
  return Array.from({length:5},(_,i)=>{
    const present=String(currentLoads?.[i]??'');
    if(i===0)return present;
    const normalized=s=>String(s).trim().replace(',', '.');
    if(!present.trim() || (previous && normalized(present)===normalized(previous[i]))) return next?.[i]??'';
    return present;
  });
}

// Sadece kaynak/referans alanları; varlık no, gösterge ve ayar sonrası ASLA kopyalanmaz.
export function copyReferenceFields(target,source,type){
  if(!target||!source)return target;
  const measurements=(target.measurements||[]).map((row,i)=>({
    ...row,ref:source.measurements?.[i]?.ref??''
  }));
  const common={...target,reference:source.reference||'',measurements};
  if(type!=='scale')return common;
  return {...common,
    loads:Array.from({length:5},(_,i)=>source.loads?.[i]??''),
    repeatLoad:source.repeatLoad||'',eccentricLoad:source.eccentricLoad||''
  };
}
