'use client';
import React, { useEffect, useMemo, useState } from 'react';

function pad(n:number){return n.toString().padStart(2,'0');}
function dateKey(d = new Date()){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function seedFromDate(d = new Date()){return parseInt(`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`,10);}
function mulberry32(a:number){return function(){a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function pickDailyIndices(total:number,count=15,seed=seedFromDate()){const rng=mulberry32(seed);const arr=Array.from({length:total},(_,i)=>i);for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr.slice(0,Math.min(count,total));}
function startOfFortnight(d = new Date()){const y=d.getFullYear();const m=d.getMonth();const day=d.getDate();let startDay;if(day<=14)startDay=1;else if(day<=28)startDay=15;else startDay=29;return new Date(y,m,startDay);}
function addDays(d:Date,n:number){return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);}

type Q = { id:string; module:string; prompt:string; options:string[]; answer:number; explanation?:string };
type Attempt = { username:string; score:number; created_at?:string; challenge_date:string; user_id?:string; ts?:number };

function useLocalStorage<T>(key:string, initial:T){
  const [state,setState]=useState<T>(()=>{try{const raw=typeof window!=='undefined'?window.localStorage.getItem(key):null;return raw?JSON.parse(raw):initial;}catch{return initial;}});
  useEffect(()=>{try{if(typeof window!=='undefined')window.localStorage.setItem(key,JSON.stringify(state));}catch{}},[key,state]);
  return [state,setState] as const;
}

function aggregateScores(rows:Attempt[]){
  const map = new Map<string,{username:string;score:number;bestDaily:number;ts:number;user_id?:string}>();
  for(const r of rows){
    const key = r.user_id || `u:${r.username}`;
    const prev = map.get(key) || { username:r.username||'Anonym', score:0, bestDaily:0, ts:0, user_id:r.user_id };
    const ts = typeof r.created_at==='string' ? Date.parse(r.created_at) : (r.ts || Date.now());
    const score = r.score||0;
    const next = { ...prev, username:r.username||prev.username, user_id:r.user_id||prev.user_id, score: prev.score+score, bestDaily: Math.max(prev.bestDaily||0, score), ts: Math.max(prev.ts||0, ts) };
    map.set(key,next);
  }
  return Array.from(map.values()).sort((a,b)=>{
    if(b.score!==a.score) return b.score-a.score;
    if((b.bestDaily||0)!==(a.bestDaily||0)) return (b.bestDaily||0)-(a.bestDaily||0);
    return a.ts-b.ts;
  });
}

export default function App(){
  const [username,setUsername]=useLocalStorage('pf_username','');
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const [submitted,setSubmitted]=useState(false);
  const [boardRaw,setBoardRaw]=useState<Attempt[]>([]);
  const [questions,setQuestions]=useState<Q[]>([]);
  const today = dateKey();
  const seed = useMemo(()=>seedFromDate(new Date()),[]);
  const cycle = useMemo(()=>{ const start=startOfFortnight(new Date()); const end=addDays(start,13); return { startKey: dateKey(start), endKey: dateKey(end)};},[]);

  useEffect(()=>{
    fetch(`/api/daily?date=${today}`).then(r=>r.json()).then(j=>setQuestions(j.questions||[])).catch(()=>{});
  },[today]);

  async function loadBoard(){
    try{
      const res = await fetch(`/api/leaderboard?start=${cycle.startKey}&end=${cycle.endKey}`);
      if(res.ok){
        const { data } = await res.json();
        setBoardRaw(data||[]);
        setSubmitted(Boolean((data||[]).find((r:Attempt)=> r.username===username && r.challenge_date===today)));
        return;
      }
    }catch{}
    // fallback: local storage aggregation if API not configured
    const rawStr = typeof window!=='undefined' ? window.localStorage.getItem('pf_lb') : null;
    const lb = rawStr ? JSON.parse(rawStr) : {};
    const rows:Attempt[] = [];
    for(const k of Object.keys(lb)){ if(k>=cycle.startKey && k<=cycle.endKey){ rows.push(...(lb[k]||[]).map((r:any)=>({ ...r, challenge_date:k }))); } }
    setBoardRaw(rows);
    setSubmitted(Boolean((lb[today]||[]).find((r:any)=> r.username===username)));
  }
  useEffect(()=>{ loadBoard(); /* eslint-disable-next-line */ },[username, today, cycle.startKey, cycle.endKey]);

  function onChoose(qid:string, idx:number){ setAnswers(s=>({ ...s, [qid]: idx })); }

  async function onSubmit(){
    if(!String(username).trim()){ alert('Bitte Username eingeben'); return; }
    if(submitted){ alert('Heute schon teilgenommen'); return; }
    let score=0; for(const q of questions) if(answers[q.id]===q.answer) score++;
    // Try API submit (anonymous for demo; real app should require auth)
    try{
      const res = await fetch('/api/submit', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ username, score, date: today, seed }) });
      if(res.ok){ setSubmitted(true); await loadBoard(); return; }
    }catch{}
    // local fallback
    const rawStr = typeof window!=='undefined' ? window.localStorage.getItem('pf_lb') : null;
    const lb = rawStr ? JSON.parse(rawStr) : {};
    const todays = lb[today] || [];
    lb[today] = [...todays, { username, score, ts: Date.now() }];
    if(typeof window!=='undefined') window.localStorage.setItem('pf_lb', JSON.stringify(lb));
    setSubmitted(true);
    await loadBoard();
  }

  const board = useMemo(()=>aggregateScores(boardRaw),[boardRaw]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white grid place-items-center">🩺</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">PflegeFit</h1>
              <p className="text-xs text-slate-500 -mt-1">Interaktiv lernen. Prüfungsfit werden.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold">🏆 Daily Challenge - 15 Random Fragen</h2>
          <div className="flex items-center gap-3 mt-2">
            <input className="px-3 py-2 rounded-xl border text-sm" placeholder="Anzeigename" value={username} onChange={(e)=>setUsername(e.target.value)} />
            <span className="text-sm text-slate-500">Heute: {today}</span>
          </div>
          {!questions.length ? <p className="text-sm text-slate-500 mt-2">Lade Fragen…</p> : (
            <div className="mt-4 space-y-3">
              {questions.map((q, i)=>(
                <div key={q.id} className="rounded-xl border p-3">
                  <p className="font-medium">Frage {i+1}: {q.prompt} <span className="text-xs text-slate-500">({q.module})</span></p>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    {q.options.map((opt, j)=>(
                      <label key={j} className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer">
                        <input type="radio" name={q.id} checked={answers[q.id]===j} onChange={()=>onChoose(q.id,j)} /> {opt}
                      </label>
                    ))}
                  </div>
                  {answers[q.id]!=null && (
                    <div className={"mt-2 text-sm "+(answers[q.id]===q.answer?'text-green-600':'text-red-600')}>
                      {answers[q.id]===q.answer?'Richtig':'Falsch'}
                    </div>
                  )}
                </div>
              ))}
              <button className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm" onClick={onSubmit}>Daily absenden</button>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold">📈 14-Tage-Gesamtranking</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Username</th>
                  <th className="py-2 pr-4">Gesamt</th>
                  <th className="py-2 pr-4">Bestleistung</th>
                </tr>
              </thead>
              <tbody>
                {board.map((u,i)=>(
                  <tr key={(u.user_id||u.username)+'-'+u.ts} className="border-t">
                    <td className="py-2 pr-4">{i+1}</td>
                    <td className="py-2 pr-4">{u.username}</td>
                    <td className="py-2 pr-4">{u.score}</td>
                    <td className="py-2 pr-4">{u.bestDaily ?? '-'}</td>
                  </tr>
                ))}
                {board.length===0 && <tr className="border-t"><td className="py-2 pr-4" colSpan={4}>Noch keine Einträge.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
