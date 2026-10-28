/* BUILD 6.9 / 原创连续配乐《熄灯后的春天》：32 小节，D 大调，92 BPM。 */
(() => {
  "use strict";
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), midi=(n)=>440*Math.pow(2,(n-69)/12);
  const DEFAULTS={music:.65,sfx:.55,voice:.85,muted:false};
  const CHORDS=[
    {root:38,notes:[62,66,69,73]}, {root:35,notes:[59,62,66,69]},
    {root:31,notes:[55,59,62,66]}, {root:33,notes:[57,61,64,71]},
    {root:38,notes:[62,66,69,76]}, {root:30,notes:[54,57,61,64]},
    {root:31,notes:[55,59,62,66]}, {root:33,notes:[57,61,64,69]}
  ];
  const MELODY=[
    [[0,74,2],[2,78,1],[4,81,2],[6,78,2]], [[0,78,2],[3,76,1],[4,74,2],[6,73,2]],
    [[0,71,2],[2,74,2],[5,78,1],[6,76,2]], [[0,73,2],[3,76,1],[4,81,2],[7,78,1]],
    [[0,78,2],[2,81,1],[4,83,2],[6,81,2]], [[0,81,2],[3,78,1],[4,76,2],[6,73,2]],
    [[0,74,3],[3,71,1],[4,69,2],[6,71,2]], [[0,73,2],[2,76,2],[5,73,1],[6,69,2]]
  ];
  const MIX={
    menu:{pad:.8,keys:.85,melody:.75,bass:.5,drums:.18,shimmer:.4,pulse:0},
    day:{pad:.55,keys:.85,melody:.85,bass:.8,drums:.65,shimmer:.45,pulse:0},
    night:{pad:.9,keys:.45,melody:.7,bass:.85,drums:.5,shimmer:.65,pulse:.12},
    rest:{pad:.85,keys:.85,melody:.65,bass:.45,drums:.12,shimmer:.45,pulse:0},
    reward:{pad:.6,keys:1,melody:.95,bass:.7,drums:.7,shimmer:.9,pulse:0},
    boss:{pad:.65,keys:.5,melody:.8,bass:1,drums:1,shimmer:.25,pulse:.8},
    paused:{pad:.7,keys:.35,melody:.4,bass:.3,drums:.06,shimmer:.2,pulse:0},
    ending:{pad:.9,keys:.9,melody:.85,bass:.45,drums:.12,shimmer:.6,pulse:0}
  };
  class Engine {
    constructor(config={}) {
      this.config=Object.assign({bpm:92,lookahead:.3},config);this.config.bpm=clamp(Number(this.config.bpm)||92,60,140);this.config.lookahead=clamp(Number(this.config.lookahead)||.3,.15,.6);this.context=null;this.scene="menu";this.step=0;this.nextNote=0;
      this.sources=new Set();this.voiceBuffers=new Map();this.voiceHistory=[];this.voiceToken=0;this.voiceSource=null;
      this.settings={...DEFAULTS};this.scheduledNotes=0;this.recentSfx={};this.duckUntil=0;this.unlocked=false;
      try{const saved=JSON.parse(localStorage.getItem("wildroot-audio")||"null");if(saved){for(const k of ["music","sfx","voice"])if(Number.isFinite(saved[k]))this.settings[k]=clamp(saved[k],0,1);this.settings.muted=Boolean(saved.muted);}}catch{}
      document.addEventListener("visibilitychange",()=>{if(!this.context)return;if(document.hidden){this.context.suspend().catch(()=>{});}else if(this.unlocked)this.context.resume().then(()=>this.schedule()).catch(()=>{});});
    }
    get enabled(){return !this.settings.muted;}
    set enabled(value){this.setSetting("muted",!value);}
    init() {
      if(!this.context){
        try{
          const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
          this.context=new AudioContext();const c=this.context;
          this.master=c.createGain();this.master.gain.value=.86;
          this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-9;this.compressor.knee.value=12;this.compressor.ratio.value=5;this.compressor.attack.value=.008;this.compressor.release.value=.18;
          this.master.connect(this.compressor).connect(c.destination);
          this.musicBus=c.createGain();this.sfxBus=c.createGain();this.voiceBus=c.createGain();
          this.musicBus.connect(this.master);this.sfxBus.connect(this.master);this.voiceBus.connect(this.master);
          this.analyser=c.createAnalyser();this.analyser.fftSize=512;this.master.connect(this.analyser);
          this.layers={};for(const [name,value]of Object.entries(MIX[this.scene])){const g=c.createGain();g.gain.value=value;g.connect(this.musicBus);this.layers[name]=g;}
          this.delay=c.createDelay(1);this.delay.delayTime.value=.26;this.echoGain=c.createGain();this.echoGain.gain.value=.18;
          this.layers.melody.connect(this.delay);this.delay.connect(this.echoGain).connect(this.musicBus);
          const harmonics=[0,1,.31,.12,.055,.018,.008];this.keyWave=c.createPeriodicWave(new Float32Array(harmonics.length),new Float32Array(harmonics));
          const pad=[0,1,.10,.035,.012];this.padWave=c.createPeriodicWave(new Float32Array(pad.length),new Float32Array(pad));
          this.noise=c.createBuffer(1,c.sampleRate*.3,c.sampleRate);const noise=this.noise.getChannelData(0);let seed=1427;
          for(let i=0;i<noise.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;noise[i]=(seed/2147483648)*.8;}
          this.applySettings();
        }catch(error){this.error=String(error);return;}
      }
      if(navigator.userActivation&&!navigator.userActivation.hasBeenActive)return;
      this.unlocked=true;
      if(this.context.state==="suspended")this.context.resume().then(()=>this.schedule()).catch(()=>{});
      if(!this.scheduler){this.nextNote=this.context.currentTime+.07;this.scheduler=setInterval(()=>this.schedule(),40);this.schedule();}
    }
    ramp(param,value,seconds=.12){const t=this.context.currentTime;param.cancelScheduledValues(t);param.setTargetAtTime(value,t,Math.max(.015,seconds/3));}
    setSetting(key,value){if(!(key in DEFAULTS))return;this.settings[key]=key==="muted"?Boolean(value):clamp(Number(value)||0,0,1);try{localStorage.setItem("wildroot-audio",JSON.stringify(this.settings));}catch{}if(this.context)this.applySettings();if(this.settings.muted||this.settings.voice===0)this.stopVoice();}
    applySettings(){this.ramp(this.master.gain,this.settings.muted?0:.86,.08);this.ramp(this.sfxBus.gain,this.settings.sfx);this.ramp(this.voiceBus.gain,this.settings.voice);this.ramp(this.musicBus.gain,this.settings.music*(this.duckUntil>this.context.currentTime?.36:1));}
    setScene(scene){if(!MIX[scene])scene="menu";if(scene===this.scene)return;this.scene=scene;if(!this.context)return;for(const [name,value]of Object.entries(MIX[scene]))this.ramp(this.layers[name].gain,value,1.2);}
    note(layer,note,time,duration,volume=.08,kind="key",pan=0){
      const c=this.context,o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();
      o.frequency.value=midi(note);if(kind==="pad")o.setPeriodicWave(this.padWave);else if(kind==="bass")o.type="triangle";else if(kind==="pulse")o.type="sawtooth";else o.setPeriodicWave(this.keyWave);
      const filter=c.createBiquadFilter();filter.type="lowpass";filter.frequency.value=kind==="pad"?1400:kind==="pulse"?900:kind==="bass"?650:kind==="bell"?4800:3200;
      const attack=kind==="pad"?.28:kind==="bass"?.018:.009,release=kind==="pad"?.7:kind==="bell"?.45:.14;
      g.gain.setValueAtTime(.0001,time);g.gain.linearRampToValueAtTime(volume,time+Math.min(attack,duration*.4));g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume*(kind==="pad"?.72:.24)),time+duration);g.gain.exponentialRampToValueAtTime(.0001,time+duration+release);
      p.pan.value=pan;o.connect(filter).connect(g).connect(p).connect(this.layers[layer]);
      this.sources.add(o);o.onended=()=>{this.sources.delete(o);o.disconnect();filter.disconnect();g.disconnect();p.disconnect();};o.start(time);o.stop(time+duration+release+.02);this.scheduledNotes++;
    }
    percussion(kind,time,volume){
      const c=this.context,g=c.createGain();let source,filter;
      if(kind==="kick"){source=c.createOscillator();source.type="sine";source.frequency.setValueAtTime(125,time);source.frequency.exponentialRampToValueAtTime(43,time+.13);source.connect(g);}
      else {source=c.createBufferSource();source.buffer=this.noise;filter=c.createBiquadFilter();filter.type="highpass";filter.frequency.value=kind==="brush"?1800:5800;source.connect(filter).connect(g);}
      const length=kind==="kick"?.19:kind==="brush"?.14:.055;
      g.gain.setValueAtTime(.0001,time);g.gain.linearRampToValueAtTime(volume,time+.004);g.gain.exponentialRampToValueAtTime(.0001,time+length);g.connect(this.layers.drums);
      this.sources.add(source);source.onended=()=>{this.sources.delete(source);source.disconnect();g.disconnect();filter?.disconnect();};source.start(time);source.stop(time+length+.01);
    }
    schedule(){
      if(!this.context||this.context.state!=="running"||document.hidden||!this.unlocked)return;
      const c=this.context,beat=60/clamp(this.config.bpm,60,140),tick=beat/2;
      if(this.nextNote<c.currentTime-.1){const skipped=Math.ceil((c.currentTime-this.nextNote)/tick);this.step+=skipped;this.nextNote+=skipped*tick;}
      while(this.nextNote<c.currentTime+this.config.lookahead){this.compose(this.step++,this.nextNote,tick);this.nextNote+=tick;}
      if(this.duckUntil&&c.currentTime>this.duckUntil){this.duckUntil=0;this.ramp(this.musicBus.gain,this.settings.music,.7);}
    }
    compose(step,time,tick){
      const bar=Math.floor(step/8)%32,pos=step%8,chord=CHORDS[bar%8],intro=bar<4,outro=bar>=28;
      if(pos===0){for(let i=0;i<4;i++)this.note("pad",chord.notes[i]-12,time,8*tick,.037,"pad",(i-1.5)*.28);}
      if([0,3,4,6].includes(pos)){const i=[0,2,1,3,2,1,3,2][pos];this.note("keys",chord.notes[i],time,.8*tick,intro||outro?.065:.08,"key",pos%2?.3:-.3);}
      if(pos===0||pos===4)this.note("bass",chord.root+(pos===4&&bar%2?7:0),time,3.4*tick,.13,"bass");
      const phrase=MELODY[(bar+(bar>=20?4:0))%8];
      for(const [at,n,length]of phrase)if(pos===at&&(!intro||pos===0||pos===4)&&(!outro||pos<5))this.note("melody",n-(intro?12:0),time,length*tick*.93,.115,"bell",.08);
      if(pos===2||pos===6)this.note("shimmer",chord.notes[(bar+pos)%4]+12,time,1.5*tick,.035,"bell",pos===2?-.55:.55);
      if(pos===0||pos===4)this.percussion("kick",time,intro||outro?.075:.14);
      if(pos===2||pos===6)this.percussion("brush",time,intro||outro?.025:.065);
      if(pos%2===1)this.percussion("shaker",time,pos===7?.025:.016);
      this.note("pulse",chord.root+12+(pos%2?7:0),time,tick*.55,pos%2?.045:.075,"pulse",pos%2?.2:-.2);
    }
    tone(freq,length=.06,type="square",volume=.035,slide=0){
      if(!this.enabled||this.settings.sfx===0)return;this.init();if(!this.context||!this.unlocked)return;
      const c=this.context,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+length);
      g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(g).connect(this.sfxBus);o.start(t);o.stop(t+length+.01);o.onended=()=>{o.disconnect();g.disconnect();};
    }
    allowSfx(id,interval){const t=this.context?.currentTime||0;if(this.recentSfx[id]!==undefined&&t-this.recentSfx[id]<interval)return false;this.recentSfx[id]=t;return true;}
    async voiceBuffer(id){
      if(this.voiceBuffers.has(id))return this.voiceBuffers.get(id);
      const clip=window.WILDROOT_VOICES?.[id];if(!clip)return null;
      const task=(async()=>{const bytes=Uint8Array.from(atob(clip.audio.split(",")[1]),(x)=>x.charCodeAt(0));return this.context.decodeAudioData(bytes.buffer);})();
      this.voiceBuffers.set(id,task);try{return await task;}catch{this.voiceBuffers.delete(id);return null;}
    }
    async speak(id){
      this.init();this.stopVoice();const token=++this.voiceToken;
      if(!this.context||!this.unlocked||!this.enabled||this.settings.voice===0)return false;
      const buffer=await this.voiceBuffer(id);if(!buffer||token!==this.voiceToken||!this.enabled||this.settings.voice===0)return false;
      const c=this.context,source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;
      gain.gain.setValueAtTime(0,c.currentTime);gain.gain.linearRampToValueAtTime(1,c.currentTime+.015);gain.gain.setValueAtTime(1,c.currentTime+Math.max(.02,buffer.duration-.12));gain.gain.linearRampToValueAtTime(0,c.currentTime+buffer.duration);
      source.connect(gain).connect(this.voiceBus);this.voiceSource=source;this.voiceId=id;this.duckUntil=c.currentTime+buffer.duration+.2;this.ramp(this.musicBus.gain,this.settings.music*.36,.12);
      this.voiceHistory.push(id);if(this.voiceHistory.length>12)this.voiceHistory.shift();
      source.onended=()=>{source.disconnect();gain.disconnect();if(this.voiceSource===source){this.voiceSource=null;this.voiceId=null;}};source.start();return true;
    }
    stopVoice(){this.voiceToken++;if(this.voiceSource){try{this.voiceSource.stop();}catch{}this.voiceSource=null;this.voiceId=null;}if(this.context){this.duckUntil=0;this.ramp(this.musicBus.gain,this.settings.music,.5);}}
    snapshot(){let rms=0;if(this.analyser){const values=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(values);rms=Math.sqrt(values.reduce((s,v)=>s+v*v,0)/values.length);}return {context:this.context?.state||"locked",unlocked:this.unlocked,scene:this.scene,bar:Math.floor(this.step/8)%32,loopSeconds:32*4*60/this.config.bpm,scheduledNotes:this.scheduledNotes,activeSources:this.sources.size,settings:{...this.settings},voice:this.voiceId||null,voiceHistory:[...this.voiceHistory],ducked:Boolean(this.context&&this.duckUntil>this.context.currentTime),rms,error:this.error||null};}
  }
  window.WildrootAudio={Engine,CHORDS,MELODY,MIX};
})();
