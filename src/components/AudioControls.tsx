'use client';
type Props={musicEnabled:boolean;sfxEnabled:boolean;audioError:string;resumeAvailable?:boolean;toggleMusic:()=>void;toggleSfx:()=>void};
export default function AudioControls({musicEnabled,sfxEnabled,audioError,resumeAvailable=false,toggleMusic,toggleSfx}:Props){
 return <div className="audio-wrap">
  <div className="audio-controls" aria-label="Optional game audio controls" role="group">
   <button className={`audio-toggle ${musicEnabled?'is-on':''}`} aria-pressed={musicEnabled} aria-label={musicEnabled?'Turn music off':resumeAvailable?'Resume ambient music':'Turn music on'} title={musicEnabled?'Turn music off':resumeAvailable?'Resume ambient music':'Turn music on'} onClick={toggleMusic}><span aria-hidden="true">♫</span><span className="audio-word">Music</span><span aria-hidden="true" className="toggle-status">{musicEnabled?'On':resumeAvailable?'Resume':'Off'}</span></button>
   <button className={`audio-toggle ${sfxEnabled?'is-on':''}`} aria-pressed={sfxEnabled} aria-label={sfxEnabled?'Turn sound effects off':'Turn sound effects on'} title={sfxEnabled?'Turn sound effects off':'Turn sound effects on'} onClick={toggleSfx}><span aria-hidden="true">♪</span><span className="audio-word">SFX</span><span aria-hidden="true" className="toggle-status">{sfxEnabled?'On':'Off'}</span></button>
  </div>
  {audioError&&<span className="audio-notice" role="status">{audioError}</span>}
 </div>;
}
