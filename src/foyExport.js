import {jsPDF} from 'jspdf';
import {normalizeRecord} from './deviceHelpers.js';

// Native Canvas: no DOM screenshot, external images, fonts or popups.
const W=794,H=1123;
const safe=s=>String(s||'foy').replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_-]+/g,'-').slice(0,55);
const txt=v=>String(v??'');
const date=s=>s&&String(s).includes('-')?String(s).split('-').reverse().join('.'):txt(s);
const configs={two:{cols:2,rows:2},three:{cols:3,rows:3},laser:{cols:3,rows:4},scale:{cols:1,rows:5}};
function canvasPage(){const canvas=document.createElement('canvas');canvas.width=W*2;canvas.height=H*2;const c=canvas.getContext('2d');if(!c)throw Error('Canvas kullanılamıyor');c.scale(2,2);c.fillStyle='#fff';c.fillRect(0,0,W,H);c.fillStyle='#111';c.strokeStyle='#151515';c.lineWidth=1.25;return {canvas,c}}
function text(c,s,x,y,size=13,bold=false,max=500,align='left'){c.font=`${bold?'bold ':''}${size}px Arial, sans-serif`;c.fillStyle='#101010';c.textAlign=align;c.textBaseline='middle';let line=txt(s);while(c.measureText(line).width>max&&line.length>3)line=line.slice(0,-2);c.fillText(line,x,y);c.textAlign='left'}
function line(c,x,y,w,h=0){c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y+h);c.stroke()}
function rect(c,x,y,w,h){c.strokeRect(x,y,w,h)}
function cell(c,s,x,y,w,h,opt={}){rect(c,x,y,w,h);text(c,s,x+(opt.center?w/2:7),y+h/2,opt.size||12,!!opt.bold,w-12,opt.center?'center':'left')}
function wrapLines(c,value,maxWidth,fontSize=12,maxLines=4){
  c.font=`${fontSize}px Arial, sans-serif`;
  const result=[];
  const paragraphs=txt(value).replace(/\r/g,'').split('\n');
  for(const paragraph of paragraphs){
    const words=paragraph.split(/\s+/).filter(Boolean);
    if(!words.length){result.push('');continue;}
    let current='';
    for(const word of words){
      const candidate=current?current+' '+word:word;
      if(c.measureText(candidate).width<=maxWidth){current=candidate;continue;}
      if(current){result.push(current);current='';}
      let remainder=word;
      while(remainder.length>1 && c.measureText(remainder).width>maxWidth){
        let n=1;while(n<remainder.length && c.measureText(remainder.slice(0,n+1)).width<=maxWidth)n++;
        result.push(remainder.slice(0,n));remainder=remainder.slice(n);
      }
      current=remainder;
    }
    if(current)result.push(current);
  }
  if(result.length>maxLines){const visible=result.slice(0,maxLines);let last=visible[maxLines-1];while(last.length>0&&c.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);visible[maxLines-1]=last+'…';return visible;}
  return result;
}
function instrument(c,d,rec,x,y,w,h,laser){
  const triple=rec.type==='three';
  const compact=!laser && h<260;
  const metaH=compact?(triple?23:24):36;
  const noteH=compact?(triple?34:56):(!laser?Math.max(20,h-144-60-((d.measurements||[]).length*44)):20);
  const label=w*.40;
  const meta=[['Tarih',date(d.date||rec.date)],['Varlık No',d.asset],['Referans',d.reference||rec.reference],['Kal. Yapan',d.operator||rec.operator]];
  meta.forEach((r,i)=>{cell(c,r[0],x,y+i*metaH,label,metaH,{bold:true,size:compact?10:10});cell(c,r[1],x+label,y+i*metaH,w-label,metaH,{size:compact?11:12})});
  const notesY=y+metaH*4;
  rect(c,x,notesY,w,noteH);
  const noteSize=compact?12:11;
  const lineH=compact?13:14;
  const available=Math.max(1,Math.floor((noteH-8)/lineH));
  wrapLines(c,d.notes,w-14,noteSize,available).forEach((t,i)=>text(c,t,x+7,notesY+8+i*lineH+lineH/2,noteSize,false,w-14));
  const headY=notesY+noteH;
  const headerH=compact?36:60;
  const upperH=headerH/2;
  cell(c,'Ref Değer',x,headY,w*.48,headerH,{center:true,bold:true,size:compact?10:11});
  cell(c,'Test Cihazı',x+w*.48,headY,w*.52,upperH,{center:true,bold:true,size:compact?10:11});
  cell(c,'Gösterge Değeri',x+w*.48,headY+upperH,w*.52,upperH,{center:true,bold:true,size:compact?9:10});
  let yy=headY+headerH;
  const rows=d.measurements||[];
  const lazerBar=laser&&rows.length>2?28:0;
  const rh=compact?(triple?(y+h-yy-lazerBar)/Math.max(1,rows.length):22):Math.min(44,Math.max(22,(y+h-yy-lazerBar)/Math.max(1,rows.length)));
  rows.forEach((r,i)=>{if(laser&&i===2){cell(c,'LAZER',x,yy,w,28,{center:true,bold:true,size:12});yy+=28;}
    cell(c,r.ref,x,yy,w*.48,rh,{center:true,size:compact?12:13});
    cell(c,r.reading,x+w*.48,yy,w*.52,rh,{center:true,size:compact?12:13});yy+=rh;
  });
  if(yy<y+h-0.5)rect(c,x,yy,w,y+h-yy);
}
function scalePage(c,d,rec){const x=55,w=W-110; text(c,'TERAZİ KALİBRASYON FORMU',W/2,112,20,true,600,'center');let y=146;const info=[['Varlık No',d.asset,'Kullanım Yeri',d.location],['Marka / Model',d.brand,'Seri No',d.serial],['Çalışma Aralığı',d.range,'Çözünürlük',d.resolution],['Kalibrasyon Tarihi',date(d.date||rec.date),'Ölçümü Yapan',d.operator||rec.operator]];info.forEach(r=>{const a=w*.23,b=w*.27;cell(c,r[0],x,y,a,33,{bold:true,size:11});cell(c,r[1],x+a,y,b,33);cell(c,r[2],x+a+b,y,a,33,{bold:true,size:11});cell(c,r[3],x+a+b+a,y,b,33);y+=33});cell(c,'Açıklama: '+txt(d.notes),x,y,w,64);y+=77;cell(c,'KALİBRASYONDA KULLANILAN REFERANSLAR: '+txt(d.reference||rec.reference),x,y,w,38,{bold:true,size:11});y+=50;cell(c,'GÖSTERGE HATASI TESTİ',x,y,w,33,{center:true,bold:true});y+=33;const ws=[100,215,185,w-500];['Seviye','Uygulanan Yük','Gösterge Değeri','Ayar Sonrası'].forEach((n,i)=>cell(c,n,x+ws.slice(0,i).reduce((a,b)=>a+b,0),y,ws[i],35,{bold:true,size:11}));y+=35;['Min','25%','50%','75%','100%'].forEach((name,i)=>{const r=(d.measurements||[])[i]||{};[name,d.loads?.[i]||r.ref,r.reading,d.adjusted?.[i]].forEach((v,j)=>cell(c,v,x+ws.slice(0,j).reduce((a,b)=>a+b,0),y,ws[j],38,{size:12}));y+=38});y+=13;cell(c,'TEKRARLANABİLİRLİK TESTİ — Yük: '+txt(d.repeatLoad),x,y,w,33,{center:true,bold:true});y+=33;(d.repeat||[]).slice(0,5).forEach((v,i)=>{cell(c,'Ölçüm '+(i+1),x,y,180,33);cell(c,v,x+180,y,w-180,33);y+=33});y+=13;cell(c,'MERKEZ DIŞI YÜKLEME TESTİ — Yük: '+txt(d.eccentricLoad),x,y,w,33,{center:true,bold:true});y+=33;(d.eccentric||[]).slice(0,5).forEach((v,i)=>{cell(c,'Konum '+(i+1),x,y,180,33);cell(c,v,x+180,y,w-180,33);y+=33});}
export function renderFoyPages(record){
 record=normalizeRecord(record);
 const cfg=configs[record.type]||configs.two;
 // 2'li/3'lü föylerde A4 üzerinde dört cihaz sırası; 3'lü föyde üç ölçüm satırı bulunur.
 const per=record.type==='scale'?1:cfg.cols*(record.type==='laser'?2:4);
 const batches=[];
 for(let i=0;i<record.devices.length;i+=per)batches.push(record.devices.slice(i,i+per));
 return batches.map((batch,page)=>{
  const {canvas,c}=canvasPage();
  const compact=record.type==='two'||record.type==='three';
  text(c,txt(record.title||'Kalibrasyon Föyü').toLocaleUpperCase('tr-TR'),W/2,compact?28:57,compact?15:19,true,710,'center');
  text(c,date(record.date)+(record.customer?' · '+record.customer:''),W-44,compact?46:88,compact?10:11,false,350,'right');
  line(c,42,compact?59:106,W-84);
  if(record.type==='scale'){
   scalePage(c,batch[0],record);
  }else{
   const left=43,top=compact?73:135,gap=compact?8:10;
   const cw=(W-86-gap*(cfg.cols-1))/cfg.cols;
   const blockH=compact?233:415;
   batch.forEach((d,i)=>{
    const col=i%cfg.cols,row=Math.floor(i/cfg.cols);
    instrument(c,d,record,left+col*(cw+gap),top+row*(blockH+gap),cw,blockH,record.type==='laser');
   });
  }
  line(c,42,H-67,W-84);
  text(c,`Ölçüm kayıt föyü · ${page+1} / ${batches.length}`,44,H-48,10);
  text(c,txt(record.operator?'Ölçümü yapan: '+record.operator:''),W-44,H-48,10,false,300,'right');
  return canvas;
 });
}
const toBlob=(canvas,type)=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Görsel oluşturulamadı')),type,0.95));
export async function makeExportFiles(record,kind){const cs=renderFoyPages(record);if(kind==='png'){const b=await toBlob(cs[0],'image/png');return [{blob:b,name:safe(record.title)+'-1.png',mime:'image/png'}]};if(kind==='pdf'){const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});for(let i=0;i<cs.length;i++){if(i)pdf.addPage();pdf.addImage(cs[i].toDataURL('image/jpeg',.86),'JPEG',0,0,210,297,undefined,'FAST')}return [{blob:pdf.output('blob'),name:safe(record.title)+'.pdf',mime:'application/pdf'}]};throw Error('Bilinmeyen çıktı türü')}
