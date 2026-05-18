class RingtoneService {
  constructor() {
    this.audioCtx = null;
    this.ringInterval = null;
    this.oscillators = [];
  }

  startIncoming() {
    this.stop();
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const playRing = () => {
      if (!this.audioCtx) return;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc1.frequency.setValueAtTime(453, this.audioCtx.currentTime); 
      osc2.frequency.setValueAtTime(600, this.audioCtx.currentTime); 

      gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, this.audioCtx.currentTime + 0.1); 
      gainNode.gain.setValueAtTime(0.15, this.audioCtx.currentTime + 1.2);
      gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 1.4); 

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(this.audioCtx.currentTime + 1.4);
      osc2.stop(this.audioCtx.currentTime + 1.4);
      this.oscillators = [osc1, osc2];
    };

    playRing();
    this.ringInterval = setInterval(playRing, 2500); 
  }

  startOutgoing() {
    this.stop();
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const playDial = () => {
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime); 

      gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.08, this.audioCtx.currentTime + 0.05); 
      gainNode.gain.setValueAtTime(0.08, this.audioCtx.currentTime + 1.0);
      gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 1.1); 

      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 1.1);
      this.oscillators = [osc];
    };

    playDial();
    this.ringInterval = setInterval(playDial, 4000); 
  }

  stop() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    this.oscillators.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    this.oscillators = [];
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

export default new RingtoneService();
