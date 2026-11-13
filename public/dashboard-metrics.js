import {activityDay} from './learning-activity.js';
import {reviewStats} from './review-scheduler.js';
export function dashboardMetrics(sources = [], profile = {}, activity = {}, now = Date.now()) {
  const items=Array.isArray(sources)?sources:[];
  const names=new Set([...(Array.isArray(profile.subjects)?profile.subjects:[]),...items.map(s=>s.subject)].filter(v=>typeof v==='string' && v.trim()));
  const events=Array.isArray(activity.events)?activity.events:[];
  const today=activityDay(now);
  const week=Array.from({length:7},(_,index)=>{
    const day=new Date(Date.parse(today+'T00:00:00Z')-(6-index)*86400000).toISOString().slice(0,10);
    return {day,count:events.filter(e=>e.day===day).length};
  });
  return {subjects:names.size, notes:items.filter(s=>typeof s.notes==='string' && s.notes.trim()).length,
    exams:items.reduce((n,s)=>n+(Array.isArray(s.exams)?s.exams.filter(e=>e.submittedAt).length:0),0),
    week,recent:events.slice(-5).reverse(),
    reviewSourceId:items.find(source=>Array.isArray(source.deck) && reviewStats(source.deck,source.reviews || {},now).due>0)?.id || null};
}
