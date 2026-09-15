import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const output = fileURLToPath(new URL('./output/', import.meta.url))
const events = JSON.parse(await readFile(`${output}/mechanical-events.json`, 'utf8')).map(event => ({...event, at: (0.6 + (event.at - 0.6) / 1.65) * 1000})).filter(e => e.at >= 600 && e.at < 7000)
const browser = await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']})
try {
  const page = await browser.newPage()
  await page.goto(process.env.FLAPKIT_VIDEO_URL ?? 'http://127.0.0.1:5188/?capture')
  await page.waitForFunction(() => window.NativeSoundEngine && window.nativeSoundBank)
  const audio = await page.evaluate(async (events) => {
    const Engine = window.NativeSoundEngine
    Engine.prototype.schedule = window.nativeSoundSchedule
    const context = new AudioContext({sampleRate:48000})
    const workletSource = `class Capture extends AudioWorkletProcessor {
      process(inputs) {
        const channels = inputs[0];
        if (channels?.length) this.port.postMessage({frame:currentFrame, channels:channels.map(c=>c.slice())});
        return true;
      }
    } registerProcessor('film-capture', Capture);`
    const url = URL.createObjectURL(new Blob([workletSource], {type:'text/javascript'}))
    await context.audioWorklet.addModule(url)
    URL.revokeObjectURL(url)
    const capture = new AudioWorkletNode(context, 'film-capture')
    capture.connect(context.destination)
    const blocks = []
    capture.port.onmessage = e => blocks.push(e.data)
    const createCompressor = context.createDynamicsCompressor.bind(context)
    context.createDynamicsCompressor = () => {
      const compressor = createCompressor()
      compressor.connect(capture)
      return compressor
    }
    let origin = 0
    const engine = new Engine({context, bank:window.nativeSoundBank, now:()=>(context.currentTime-origin)*1000})
    if (!await engine.prepare()) throw new Error('Native sound bank failed to prepare')
    origin = context.currentTime + 0.25
    const originFrame = Math.round(origin * context.sampleRate)
    let index = 0
    const timer = setInterval(() => {
      const until = (context.currentTime - origin) * 1000 + 40
      const batch = []
      while(index < events.length && events[index].at <= until) batch.push(events[index++])
      engine.schedule(batch)
    }, 8)
    await new Promise(resolve => {
      const end = setInterval(() => {
        if (context.currentTime >= origin + 7.15) { clearInterval(end); resolve() }
      }, 20)
    })
    clearInterval(timer)
    const samples = new Float32Array(48000 * 7 * 2)
    for (const block of blocks) {
      for (let i = 0; i < block.channels[0].length; i++) {
        const frame = block.frame - originFrame + i
        if (frame < 0 || frame >= 48000 * 7) continue
        samples[frame * 2] = block.channels[0][i]
        samples[frame * 2 + 1] = (block.channels[1] ?? block.channels[0])[i]
      }
    }
    engine.destroy()
    await context.close()
    const pcm = new Uint8Array(samples.length * 2)
    const view = new DataView(pcm.buffer)
    samples.forEach((sample, i) => view.setInt16(i * 2, Math.round(Math.max(-1, Math.min(1, sample)) * 32767), true))
    let binary = ''
    for (let i=0; i<pcm.length; i+=8192) binary += String.fromCharCode(...pcm.subarray(i,i+8192))
    return {pcm:btoa(binary), blocks:blocks.length}
  }, events)
  const pcm = Buffer.from(audio.pcm, 'base64')
  const header = Buffer.alloc(44)
  header.write('RIFF',0); header.writeUInt32LE(pcm.length+36,4); header.write('WAVEfmt ',8)
  header.writeUInt32LE(16,16); header.writeUInt16LE(1,20); header.writeUInt16LE(2,22)
  header.writeUInt32LE(48000,24); header.writeUInt32LE(192000,28); header.writeUInt16LE(4,32)
  header.writeUInt16LE(16,34); header.write('data',36); header.writeUInt32LE(pcm.length,40)
  await writeFile(`${output}/native-sound.wav`, Buffer.concat([header,pcm]))
  console.log('Recorded native Flapkit SoundEngine output')
} finally { await browser.close() }
