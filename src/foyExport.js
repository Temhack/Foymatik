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
function scalePage(c,d,rec){
  // Tek cihaz = tam 1 A4, etiket alanı gerçek etiketi sonradan yapıştırmak için boş.
  const x=48, w=W-96, right=x+w;
  c.lineWidth=1.1;
  const titleY=44,titleH=39;
  cell(c,'TERAZİ KALİBRASYON FORMU',x,titleY,w,titleH,{bold:true,center:true,size:20});
  let y=titleY+titleH;
  const rowH=31;
  const leftLabel=148,leftValue=255,rightLabel=121,rightValue=w-leftLabel-leftValue-rightLabel;
  const info=[
    ['Varlık No:',d.asset,'Kullanım Yeri:',d.location],
    ['Marka / Modeli:',d.brand,'Sıcaklık / Nem:',rec.notes],
    ['Çalışma Aralığı:',d.range,'Seri No:',d.serial],
    ['Varlık Çözünürlüğü:',d.resolution,'Ölçümü Yapan:',d.operator||rec.operator],
    ['Kalibrasyon Tarihi:',date(d.date||rec.date),'Yapılan İş / Açıklama:','']
  ];
  info.forEach((r,i)=>{
    cell(c,r[0],x,y,leftLabel,rowH,{bold:true,size:11});
    cell(c,r[1],x+leftLabel,y,leftValue,rowH,{size:13});
    if(i===4){cell(c,r[2],x+leftLabel+leftValue,y,rightLabel+rightValue,rowH,{bold:true,center:true,size:11});}
    else{
      cell(c,r[2],x+leftLabel+leftValue,y,rightLabel,rowH,{bold:true,size:11});
      cell(c,r[3],x+leftLabel+leftValue+rightLabel,y,rightValue,rowH,{size:12});
    }
    y+=rowH;
  });
  const labelW=leftLabel+leftValue, noteW=w-labelW, noteH=105;
  rect(c,x,y,labelW,noteH);
  text(c,'Etiket Kontrolü:',x+7,y+17,12,true,labelW-14);
  // DİKKAT: Etiket kutusunun kalanına hiçbir metin, resim veya örnek etiket çizilmez.
  rect(c,x+labelW,y,noteW,noteH);
  const noteText=wrapLines(c,d.notes||'',noteW-18,12,6);
  noteText.forEach((t,i)=>text(c,t,x+labelW+9,y+19+i*16,12,false,noteW-18));
  y+=noteH;
  const band=(label)=>{
    c.fillStyle='#f2f3f4'; c.fillRect(x,y,w,26); c.fillStyle='#111';
    cell(c,label,x,y,w,26,{center:true,bold:true,size:13});
    y+=26;
  };
  band('KALİBRASYONDA KULLANILAN REFERANSLAR');
  cell(c,d.reference||rec.reference,x,y,w,32,{size:12});y+=32;
  band('GÖSTERGE HATASI TESTİ');
  // Başlıktaki ölçüm türleri orijinal örneğe uygun şekilde üç sütun.
  const widths=[216,242,w-458];
  const xs=[x,x+widths[0],x+widths[0]+widths[1]];
  ['Uygulanan Yük, L  [g]','Gösterge Değeri  I  [g]','Ayar Sonrası  I  [g]']
    .forEach((v,i)=>cell(c,v,xs[i],y,widths[i],31,{center:true,bold:true,size:11}));
  y+=31;
  const levels=['Min','25%','50%','75%','100%'];
  levels.forEach((name,i)=>{
    const r=(d.measurements||[])[i]||{};
    const rowY=y+i*31;
    cell(c,`${name}   ${d.loads?.[i]||''}`,xs[0],rowY,widths[0],31,{size:12});
    cell(c,r.reading||'',xs[1],rowY,widths[1],31,{size:13});
    cell(c,d.adjusted?.[i]||'',xs[2],rowY,widths[2],31,{size:13});
  });
  y+=5*31;
  band('TEKRARLANABİLİRLİK TESTİ');
  const left=w*.45, testRight=w-left;
  rect(c,x,y,left,195);
  text(c,'Uygulanan Yük, L  [g]',x+left/2,y+63,13,true,left-18,'center');
  text(c,'0,5 Max ≤ L ≤ Max',x+left/2,y+88,12,true,left-18,'center');
  text(c,d.repeatLoad||'',x+left/2,y+121,16,false,left-20,'center');
  cell(c,'Gösterge Değeri  I  [g]',x+left,y,testRight,31,{center:true,bold:true,size:12});
  (d.repeat||[]).slice(0,5).forEach((v,i)=>cell(c,v,x+left,y+31+i*32.8,testRight,32.8,{size:13}));
  y+=195;
  band('MERKEZ DIŞI YÜKLEME TESTİ');
  const loadW=218,measureW=186,diagramW=w-loadW-measureW;
  cell(c,'Uygulanan Yük, L  [g]',x,y,loadW,31,{bold:true,center:true,size:11});
  cell(c,'Gösterge Değeri  I  [g]',x+loadW,y,measureW,31,{bold:true,center:true,size:11});
  cell(c,'Konum',x+loadW+measureW,y,diagramW,31,{bold:true,center:true,size:12});
  y+=31;
  const eccH=5*36;
  rect(c,x,y,loadW,eccH);
  text(c,'Uygulanan Yük, L  [g]',x+loadW/2,y+56,12,true,loadW-16,'center');
  text(c,'L > Max / 3',x+loadW/2,y+80,12,true,loadW-16,'center');
  text(c,d.eccentricLoad||'',x+loadW/2,y+116,16,false,loadW-16,'center');
  (d.eccentric||[]).slice(0,5).forEach((v,i)=>{
    cell(c,String(i+1),x+loadW,y+i*36,30,36,{center:true,bold:true,size:12});
    cell(c,v,x+loadW+30,y+i*36,measureW-30,36,{size:13});
  });
  const diagX=x+loadW+measureW;
  rect(c,diagX,y,diagramW,eccH);
  // Beş konumlu yükleme çizimi: dikdörtgen ve dairesel terazi yüzeyleri.
  const bx=diagX+16,by=y+48,bw=132,bh=86,cx=bx+bw/2,cy=by+bh/2;
  rect(c,bx,by,bw,bh);
  line(c,bx,by,bw,bh);line(c,bx+bw,by,-bw,bh);
  line(c,cx,by,0,bh);line(c,bx,cy,bw,0);
  c.fillStyle='#fff';c.beginPath();c.arc(cx,cy,5,0,Math.PI*2);c.fill();c.stroke();
  const pts=[[cx,cy],[bx+29,by+24],[bx+29,by+62],[bx+103,by+24],[bx+103,by+62]];
  pts.forEach(([xx,yy],i)=>{c.beginPath();c.arc(xx,yy,3.5,0,2*Math.PI);c.fill();c.stroke();
    text(c,String(i+1),xx+(i===0?9: i===1||i===2?9:-15),yy+(i===0?-12:12),10,true,20);
  });
  const circleX=diagX+diagramW-49,circleY=cy,radius=39;
  c.beginPath();c.ellipse(circleX,circleY,37,46,0,0,Math.PI*2);c.stroke();
  line(c,circleX,circleY-46,0,92);
  line(c,circleX-37,circleY,74,0);
  [[-22,-27],[-22,27],[22,-27],[22,27]].forEach(([dx,dy])=>line(c,circleX,circleY,dx,dy));
  text(c,'1',circleX,circleY-7,10,true,12,'center');
  [[-21,-20,3],[-21,24,2],[21,-20,4],[21,24,5]].forEach(([dx,dy,n])=>text(c,String(n),circleX+dx,circleY+dy,10,true,10,'center'));
  // Son satır y = 1073; A4 kağıdın altından 50px güvenli pay.
}
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
  if(record.type==='scale'){
   scalePage(c,batch[0],record);
  }else{
   text(c,txt(record.title||'Kalibrasyon Föyü').toLocaleUpperCase('tr-TR'),W/2,compact?28:57,compact?15:19,true,710,'center');
   text(c,date(record.date)+(record.customer?' · '+record.customer:''),W-44,compact?46:88,compact?10:11,false,350,'right');
   line(c,42,compact?59:106,W-84);
   const left=43,top=compact?73:135,gap=compact?8:10;
   const cw=(W-86-gap*(cfg.cols-1))/cfg.cols;
   const blockH=compact?233:415;
   batch.forEach((d,i)=>{
    const col=i%cfg.cols,row=Math.floor(i/cfg.cols);
    instrument(c,d,record,left+col*(cw+gap),top+row*(blockH+gap),cw,blockH,record.type==='laser');
   });
  }
  if(record.type!=='scale'){
   line(c,42,H-67,W-84);
   text(c,`Ölçüm kayıt föyü · ${page+1} / ${batches.length}`,44,H-48,10);
   text(c,txt(record.operator?'Ölçümü yapan: '+record.operator:''),W-44,H-48,10,false,300,'right');
  }
  return canvas;
 });
}
const toBlob=(canvas,type)=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Görsel oluşturulamadı')),type,0.95));
export async function makeExportFiles(record,kind){const cs=renderFoyPages(record);if(kind==='png'){const b=await toBlob(cs[0],'image/png');return [{blob:b,name:safe(record.title)+'-1.png',mime:'image/png'}]};if(kind==='pdf'){const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});for(let i=0;i<cs.length;i++){if(i)pdf.addPage();pdf.addImage(cs[i].toDataURL('image/jpeg',.86),'JPEG',0,0,210,297,undefined,'FAST')}return [{blob:pdf.output('blob'),name:safe(record.title)+'.pdf',mime:'application/pdf'}]};throw Error('Bilinmeyen çıktı türü')}
