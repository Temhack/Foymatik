// Föy tipine göre ölçüm satırlarını ve seri cihaz adlarını tek noktadan yönetir.
export const REQUIRED_ROWS = {two:2, three:3, laser:4, scale:5};

export function normalizeRecord(record){
  if (!record || !Array.isArray(record.devices)) return record;
  const expected = REQUIRED_ROWS[record.type] || 2;
  return {...record, devices: record.devices.map(device => {
    const measurements = Array.isArray(device.measurements) ? device.measurements : [];
    if (measurements.length >= expected) return device;
    return {...device, measurements:[...measurements, ...Array.from({length:expected-measurements.length},()=>({ref:'',reading:''}))]};
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
