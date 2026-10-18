// Procedural stadium noise. No audio files, network calls or playback before a user gesture.
export function ambience() {
  let ctx, gain;
  return async volume => {
    if (!ctx && volume > 0) {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      ctx = new Audio(); gain = ctx.createGain(); gain.gain.value = 0;
      const buffer = ctx.createBuffer(1, ctx.sampleRate*3, ctx.sampleRate), x = buffer.getChannelData(0);
      for (let i=0;i<x.length;i++) x[i]=Math.random()*2-1;
      const source=ctx.createBufferSource(), filter=ctx.createBiquadFilter();
      filter.type='lowpass';filter.frequency.value=900;source.buffer=buffer;source.loop=true;
      source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start();
      document.addEventListener('visibilitychange',()=>{if(document.hidden)ctx.suspend();else if(gain.gain.value>0)ctx.resume();});
    }
    if (!ctx) return;
    if(volume>0)await ctx.resume();
    gain.gain.setTargetAtTime(volume/100*0.18,ctx.currentTime,0.15);
    if(!volume)await ctx.suspend();
  };
}
