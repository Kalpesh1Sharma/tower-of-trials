'use client';
import {useEffect,useRef} from 'react';
import {endingForFloor,storyTitleForFloor} from '@/lib/story';
type Props={floor:number;xp:number;streak:number;onClose:()=>void;onOpenStory:()=>void;isReplay?:boolean;isPreview?:boolean};
export default function TowerEnding({floor,xp,streak,onClose,onOpenStory,isReplay=false,isPreview=false}:Props){
 const closeButton=useRef<HTMLButtonElement|null>(null);
 const previousFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  previousFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const prevOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  closeButton.current?.focus();
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();
   if(event.key==='Tab'){
    const modal=document.querySelector<HTMLElement>('[data-tower-ending]');
    const elements=Array.from(modal?.querySelectorAll<HTMLElement>('button:not([disabled])')??[]);
    if(!elements.length)return;
    const first=elements[0],last=elements[elements.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',onKey);
  return ()=>{document.body.style.overflow=prevOverflow;document.removeEventListener('keydown',onKey);previousFocus.current?.focus();};
 },[onClose]);
 return <div className="ending-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="ending-panel" data-tower-ending role="dialog" aria-modal="true" aria-labelledby="ending-title" aria-describedby="ending-story">
   <button className="ending-close" ref={closeButton} onClick={onClose} aria-label="Close floor ending">×</button>
   <div className="ending-rings" aria-hidden="true"><span>✧</span></div>
   <div className="eyebrow">{isPreview?'STORY PREVIEW · NO REWARDS':`FLOOR ${floor.toString().padStart(2,'0')} CLEARED`} · {storyTitleForFloor(floor).toUpperCase()}</div>
   <h2 id="ending-title">The gate opens<span className="gold-mark">.</span></h2>
   <p className="ending-lead">Two trials conquered. The tower reveals another secret.</p>
   <blockquote id="ending-story" className="ending-fragment">“{endingForFloor(floor)}”</blockquote>
   <div className="ending-rewards"><div><span>{isPreview?'Example reward':isReplay?'Daily reward':'Earned today'}</span><strong>{isPreview?'100 XP (demo)':'+100 XP'}</strong></div><div><span>Current total</span><strong>{xp} XP</strong></div><div><span>Current streak</span><strong>{streak} {streak===1?'day':'days'}</strong></div></div>
   <p className="ending-next">{isPreview?'This preview cannot change progress, streaks or XP.':`Floor ${floor+1} awaits at the next daily reset.`}</p>
   <button className="action-button full" onClick={onClose}>Continue the ascent <span>→</span></button>
   <button className="outline-button ending-secondary" onClick={onOpenStory}>Read the Chronicle</button>
  </section>
 </div>;
}
