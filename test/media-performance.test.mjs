import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../src/media.js',import.meta.url),'utf8');

function loadMedia(overrides={}) {
  return vm.runInNewContext(source+'\nmedia',{Uint8Array,Uint8ClampedArray,Blob,setTimeout,...overrides});
}

function fixtureFrames(width,height,count) {
  let seed=0xc041ca;
  return Array.from({length:count},(_,index)=>{
    const pixels=new Uint8ClampedArray(width*height*4);
    for(let offset=0;offset<pixels.length;offset+=4){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      pixels.set([seed>>>24,(seed>>>16)&255,seed&255,offset%20===0?seed>>>24:offset%36===0?0:255],offset);
    }
    return index%2===0?pixels:{data:pixels};
  });
}

test('GIF output matches the original through alpha, palette and sub-block boundaries',()=>{
  const {encodeGIF}=loadMedia();
  const cases=[
    [201,3,2,'65158bfdd8ebe40336a0a9fc704955db47ba1078b4f48c3e97c7958cc3c1533e'],
    [7,1,16,'cdd63c22a216434ecba2ba57380842e9f30e7f148a6b12ad55c4a2dc0695552f'],
    [640,639,1,'c65e8c4f7aa0f020198d514ef222a4110f2fdb60ff75a1a386818a617f391f66'],
  ];
  for(const [width,height,count,hash] of cases){
    const bytes=encodeGIF(fixtureFrames(width,height,count),width,height,37);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);
  }
});

function rasterizer() {
  let canvasCount=0,clearCount=0,canvasReads=0,transferSizes=null,workerTerminated=false;
  const blobs=new Map();
  const getFrameSVG=marker=>`<svg xmlns="http://www.w3.org/2000/svg" data-frame="${marker}"/>`;
  const urlFactory={
    createObjectURL(blob){const url=Symbol();blobs.set(url,blob);return url;},
    revokeObjectURL(url){blobs.delete(url);},
  };
  class Image {
    set src(url) {
      blobs.get(url).text().then(svg=>{this.drawRed=svg.includes('data-frame="red"');this.onload();});
    }
  }
  class Worker {
    constructor(url){this.source=blobs.get(url).text();}
    postMessage(data,transfers){
      const copied=structuredClone(data,{transfer:transfers});
      transferSizes=Array.from(transfers,buffer=>buffer.byteLength);
      this.source.then(program=>{
        const workerScope={Uint8Array,Uint8ClampedArray,postMessage:data=>this.onmessage({data}),onmessage:null};
        vm.runInNewContext(program,workerScope);
        workerScope.onmessage({data:copied});
      });
    }
    terminate(){workerTerminated=true;}
  }
  const document={
    createElement(type){
      assert.equal(type,'canvas');
      canvasCount++;
      const pixels=new Uint8ClampedArray(32*32*4);
      const ctx={
        clearRect(){clearCount++;pixels.fill(0);},
        drawImage(image){if(image.drawRed)pixels.set([255,0,0,255]);},
        getImageData(){canvasReads++;return {data:pixels.slice()};},
      };
      return {width:0,height:0,getContext:()=>ctx};
    },
  };
  return {
    media:loadMedia({Worker,Image,document,URL:urlFactory}),
    frames:[getFrameSVG('red'),getFrameSVG('transparent')],
    counts:()=>({canvasCount,clearCount,canvasReads,transferSizes,workerTerminated,openURLs:blobs.size}),
  };
}

test('animated export reuses and clears the canvas and transfers owned pixel buffers',async()=>{
  const {media,frames,counts}=rasterizer();
  const progress=[];
  const gif=await media.createAnimatedPostcard({frames,width:32,height:32,onProgress:value=>progress.push(value)});
  const first=new Uint8ClampedArray(32*32*4),next=first.slice();
  first.set([255,0,0,255]);
  assert.deepEqual(new Uint8Array(await gif.arrayBuffer()),media.encodeGIF([first,next],32,32));
  assert.deepEqual(progress,[.25,.5,.75,1]);
  assert.deepEqual(counts(),{canvasCount:1,clearCount:1,canvasReads:2,transferSizes:[0,0],workerTerminated:true,openURLs:0});
});

test('cancelling animated export stops before allocating the next frame buffer',async()=>{
  const {media,frames,counts}=rasterizer();
  const controller=new AbortController();
  await assert.rejects(media.createAnimatedPostcard({
    frames,width:32,height:32,signal:controller.signal,onProgress:()=>controller.abort(),
  }),{name:'AbortError'});
  assert.deepEqual(counts(),{canvasCount:1,clearCount:0,canvasReads:1,transferSizes:null,workerTerminated:false,openURLs:0});
});
