import { NextResponse } from 'next/server';

function mulberry32(a:number){return function(){a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function pick(total:number,count=15,seed:number){const rng=mulberry32(seed); const arr=Array.from({length:total},(_,i)=>i); for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr.slice(0,Math.min(count,total));}

const QUESTIONS = [
  { id:'d1', module:'Diabetes', prompt:'Welcher Wert ist der Langzeitwert?', options:['CRP','HbA1c','LDL'], answer:1 },
  { id:'d2', module:'Diabetes', prompt:'Typ-1-Diabetes ist…', options:['Insulinresistenz','Autoimmun','Überinsulinämie'], answer:1 },
  { id:'d3', module:'Diabetes', prompt:'Hypoglykämie-Symptom?', options:['Schwitzen','Gewichtszunahme','Juckreiz'], answer:0 },
  { id:'d4', module:'Diabetes', prompt:'Nüchtern-Glukose für Diagnose?', options:['≥126 mg/dl','≥100 mg/dl','≥200 mg/dl'], answer:0 },
  { id:'d5', module:'Diabetes', prompt:'Schnellstes Insulin?', options:['Basal','Bolus','Intermediär'], answer:1 },
  { id:'h1', module:'Herzinsuffizienz', prompt:'Klassifikation der Belastbarkeit?', options:['WHO','NYHA','RKI'], answer:1 },
  { id:'h2', module:'Herzinsuffizienz', prompt:'Typisch bei Rechtsherzinsuffizienz?', options:['Lungenödem','Halsvenenstauung','Hämoptysen'], answer:1 },
  { id:'h3', module:'Herzinsuffizienz', prompt:'Basistherapie?', options:['ACE-Hemmer','Antibiotika','NSAR'], answer:0 },
  { id:'h4', module:'Herzinsuffizienz', prompt:'Leitsymptom Linksherzinsuffizienz?', options:['Beinödem','Dyspnoe','Aszites'], answer:1 },
  { id:'r1', module:'Pflegerecht', prompt:'Würde des Menschen?', options:['GG Art. 1','BGB §433','IfSG §28'], answer:0 },
  { id:'r2', module:'Pflegerecht', prompt:'Pflegeberufegesetz regelt…', options:['Ausbildung & Kompetenzen','Dienstzeiten','Steuern'], answer:0 },
  { id:'r3', module:'Pflegerecht', prompt:'Schweigepflichtbruch erlaubt…', options:['Nie','Nur mit Einwilligung/Grundlage','Immer'], answer:1 },
  { id:'c1', module:'COPD', prompt:'AHA-Symptome stehen für…', options:['Auswurf, Husten, Atemnot','Asthma, Husten, Auswurf','Atemnot, Herzschmerz, Auswurf'], answer:0 },
  { id:'c2', module:'COPD', prompt:'Häufigste Ursache?', options:['Rauchen','Allergie','Viren'], answer:0 },
  { id:'c3', module:'COPD', prompt:'Wichtigster Test?', options:['Spirometrie','Blutbild','Urinstatus'], answer:0 },
  { id:'m1', module:'Medikamente', prompt:'First-Pass-Effekt betrifft…', options:['Niere','Leber','Lunge'], answer:1 },
  { id:'m2', module:'Medikamente', prompt:'i.m. bedeutet…', options:['intramuskulär','intramedullär','intramural'], answer:0 },
  { id:'m3', module:'Medikamente', prompt:'5-R-Regel enthält…', options:['Farbe','Patient/Medikament/Dosis/Zeit/Weg','Packungsgröße'], answer:1 },
  { id:'x1', module:'Gemischt', prompt:'Pflegeziel Diabetes?', options:['Gewichtszunahme','QoL erhalten & Spätfolgen vermeiden','Insulin absetzen'], answer:1 },
  { id:'x2', module:'Gemischt', prompt:'Pflege-Tipp COPD?', options:['Lippenbremse','Flach atmen','Liegen'], answer:0 },
];

export async function GET(req: Request){
  try{
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const key = date || new Date().toISOString().slice(0,10);
    const seed = parseInt(key.replace(/-/g,''),10);
    const idx = pick(QUESTIONS.length, 15, seed);
    const qs = idx.map(i=>QUESTIONS[i]).filter(Boolean);
    return NextResponse.json({ date: key, questions: qs });
  }catch(e){
    return NextResponse.json({ error:'unexpected error' }, { status:500 });
  }
}
