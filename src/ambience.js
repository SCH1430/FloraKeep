const sceneAudio = (() => {
  let context, level, source, mode;
  function makeLoop(key,sampleRate) {
    const length=sampleRate*4;
    const buffer=context.createBuffer(1,length,sampleRate);
    const samples=buffer.getChannelData(0);
    let random=12345, slow=0, fast=0;
    for(let i=0;i<length;i++){
      random=(Math.imul(random,1664525)+1013904223)>>>0;
      const white=random/2147483648-1;
      slow=slow*.985+white*.015;
      fast=fast*.68+white*.32;
      const phase=i/length*Math.PI*2;
      const edge=Math.min(1,i/(sampleRate*.015),(length-1-i)/(sampleRate*.015));
      samples[i]=edge*(key==='rain'
        ? (fast*.58+slow*.24)*(.82+.18*Math.sin(phase*2))
        : slow*(.8+.34*Math.sin(phase)+.2*Math.sin(phase*3)));
    }
    return buffer;
  }
  function play(key,volume) {
    const Audio=globalThis.AudioContext || globalThis.webkitAudioContext;
    if(!Audio) return;
    if(key==='off'||volume===0) {
      stop();
      return;
    }
    if(!context) {
      context=new Audio();
      level=context.createGain();
      level.connect(context.destination);
    }
    if(mode!==key || !source) {
      if(source) source.stop();
      source=context.createBufferSource();
      source.buffer=makeLoop(key,context.sampleRate);
      source.loop=true;
      source.connect(level);
      source.start();
      mode=key;
    }
    level.gain.setTargetAtTime(volume,context.currentTime,.035);
    context.resume().catch(()=>{});
  }
  function suspend(){context?.suspend().catch(()=>{});}
  function stop(){
    if(!source)return;
    source.stop();
    source.disconnect();
    source=null;
    mode=null;
  }
  return {play,stop,suspend};
})();
