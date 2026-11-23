const art = (() => {
/* Original vector illustrations, drawn for Flora Keep. No remote assets. */
let illustrationNumber = 0;
const escapeAttribute = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const potColors = {
  clay:['#ddb293','#bf8569','#a97055'],sage:['#c1c8af','#92a084','#788e73'],
  cream:['#f4eddb','#ded0b5','#c7b895'],pink:['#e4b9b1','#c99388','#ae796c'],
};
const lightPositions = {dawn:-1,day:-.45,sunset:1,night:.38};
const broadLeaves = new Set(['daisy','lavender','mint','orchid','rose','sunflower','tulip']);
const svgNamespace='http://www.w3.org/2000/svg';

function definitions(p,pot,treatment='watercolor') {
  const c = Object.hasOwn(potColors,pot)?potColors[pot]:potColors.clay;
  if(treatment==='cutout'){
    return '<defs>'+Object.entries({
      leaf:'#73906a',deep:'#47715c',light:'#a7bb81',pot:c[1],petal:'#f1e7d7',
      pink:'#c9868c',violet:'#9c86b0',gold:'#c79a53',yellow:'#dfba61',
    }).map(([name,color])=>`<linearGradient id="${p}${name}"><stop stop-color="${color}"/><stop offset="1" stop-color="${color}"/></linearGradient>`).join('')+'</defs>';
  }
  return `<defs>
    <linearGradient id="${p}leaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#93b68b"/><stop offset=".43" stop-color="#54896a"/><stop offset="1" stop-color="#2d614d"/></linearGradient>
    <linearGradient id="${p}deep" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="#719b73"/><stop offset=".55" stop-color="#397057"/><stop offset="1" stop-color="#244f3e"/></linearGradient>
    <linearGradient id="${p}light" x1="0" y1="0" x2="1" y2=".6"><stop stop-color="#b7ca9a"/><stop offset="1" stop-color="#689570"/></linearGradient>
    <linearGradient id="${p}pot" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${c[1]}"/><stop offset=".28" stop-color="${c[0]}"/><stop offset=".68" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>
    <linearGradient id="${p}petal" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#fffef5"/><stop offset=".65" stop-color="#f7f3de"/><stop offset="1" stop-color="#d7d9bf"/></linearGradient>
    <linearGradient id="${p}pink" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#f1beb5"/><stop offset=".5" stop-color="#d98f91"/><stop offset="1" stop-color="#b8657d"/></linearGradient>
    <linearGradient id="${p}violet" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c3b5d7"/><stop offset=".5" stop-color="#a38dbb"/><stop offset="1" stop-color="#79679a"/></linearGradient>
    <radialGradient id="${p}gold"><stop stop-color="#e4b64c"/><stop offset=".75" stop-color="#d5a137"/><stop offset="1" stop-color="#c5942e"/></radialGradient>
    <linearGradient id="${p}yellow" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#f5d670"/><stop offset=".7" stop-color="#e5b341"/><stop offset="1" stop-color="#d89c2d"/></linearGradient>
  </defs>`;
}

function leaf(p, x, y, size, angle = 0, fill = 'leaf', slender = 1) {
  const age=fill==='light'?'young':fill==='deep'?'mature':'grown';
  const gloss=age==='young'?'<path d="M2 -36Q12 -44 4 -58" fill="none" stroke="#eef3ca" stroke-opacity=".52" stroke-width="2.4" stroke-linecap="round"/>':'';
  return `<g class="leaf-organ" data-leaf-age="${age}" transform="translate(${x} ${y}) rotate(${angle}) scale(${size / 60} ${size / 60})">
    <path d="M0 0C${-38 * slender} -17 ${-34 * slender} -48 0 -68C${28 * slender} -48 ${34 * slender} -18 0 0Z" fill="url(#${p}${fill})"/>
    <path d="M0 0Q-3 -32 0 -61M-1 -17L${-17 * slender} -30M-2 -31L${-19 * slender} -45M-2 -20L${17 * slender} -35M-2 -37L${12 * slender} -49" fill="none" stroke="#d3dfb7" stroke-opacity="${age==='young'?.67:age==='mature'?.3:.45}" stroke-width="1"/>
    ${gloss}
  </g>`;
}

function originalPot(p) {
  return `<ellipse cx="160" cy="344" rx="67" ry="8" fill="#344e34" opacity=".055"/><ellipse cx="160" cy="343" rx="49" ry="4" fill="#344e34" opacity=".07"/>
    <path d="M111 276L123 330Q126 341 160 342Q194 341 197 330L209 276Z" fill="url(#${p}pot)"/>
    <path d="M122 289L132 326Q134 331 141 332" stroke="#fff8df" stroke-opacity=".22" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M111 276Q160 288 209 276L208 283Q160 295 112 283Z" fill="#74533f" opacity=".15"/>
    <path d="M108 267Q160 258 212 267L211 278Q160 291 109 278Z" fill="url(#${p}pot)"/>
    <ellipse cx="160" cy="267" rx="52" ry="10" fill="#bc9777"/>
    <ellipse cx="160" cy="267" rx="44" ry="6.8" fill="#635044"/>
    <ellipse cx="160" cy="268" rx="37" ry="4.4" fill="#51463b"/>
    <path d="M112 271Q160 283 208 271" stroke="#fff4d7" stroke-opacity=".3" fill="none" stroke-width="1.5"/>
    <g fill="#9b8065" opacity=".6"><ellipse cx="132" cy="268" rx="3" ry="1.2"/><ellipse cx="183" cy="269" rx="2" ry="1"/><ellipse cx="168" cy="264" rx="2" ry=".8"/></g>`;
}

function stem(path, width = 3, color = '#608365') {
  return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}

function daisyFlower(p, x, y, scale = 1, rotation = 0) {
  let petals = '';
  for (let n = 0; n < 13; n++) petals += `<path transform="rotate(${n * 360 / 13})" d="M-3 -5C-9 -14 -8 -31 -2 -34C5 -36 8 -17 3 -5Z" fill="url(#${p}petal)" stroke="#e0dfc9" stroke-width=".4"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">${petals}<circle r="10" fill="url(#${p}gold)"/>${Array.from({length: 15}, (_, i) => `<circle cx="${Math.cos(i * 2.4) * Math.sqrt(i) * 2}" cy="${Math.sin(i * 2.4) * Math.sqrt(i) * 2}" r=".8" fill="#a98129" opacity=".48"/>`).join('')}</g>`;
}

function daisy(p,seed=0) {
  const branch=seed%17-8;
  let s = stem('M159 268C170 210 147 155 159 83') + stem(`M164 230Q118 193 ${104+branch} 141`, 2.8) + stem(`M162 207Q192 177 ${212-branch} 127`, 2.5);
  s += leaf(p, 160, 232, 45, -56, 'leaf', .55) + leaf(p, 160, 204, 46, 65, 'light', .48) + leaf(p, 146, 207, 33, -74, 'light', .45) + leaf(p, 164, 170, 33, 58, 'leaf', .45) + leaf(p, 121, 181, 29, -60, 'leaf', .4) + leaf(p, 185, 172, 25, 65, 'light', .45);
  s += daisyFlower(p, 159, 86, 1.04, -12+branch) + daisyFlower(p, 104+branch, 141, .75, 14) + daisyFlower(p, 212-branch, 126, .78, 7);
  return s;
}

function lavender(p,seed=0) {
  let s = '';
  const spikes = [[113,110,-17,.8],[136,76,-8,1],[162,64,2,1.08],[189,90,13,.94],[210,128,24,.72],[91,152,-25,.61],[174,126,6,.7]];
  for (const [index,[x,y,a,sc]] of spikes.entries()) {
    const tilt=(seed>>>(index*3))%9-4;
    s += stem(`M160 268Q${x + 8} 193 ${x} ${y + 21}`, 2, '#849a79');
    for (let j=0;j<4;j++) {
      const ly = 243 - j*23, lx = 160 + (x - 160)*(268-ly)/(268-y);
      s += leaf(p,lx,ly,20+j*1.2,-45 + a,'light',.2) + leaf(p,lx,ly-7,22,43+a,'leaf',.22);
    }
    let petals='';
    for(let n=0;n<9;n++) {
      const yy=n*6-28, xx=(n%2?1:-1)*(4+(n>5?-1:0));
      petals+=`<ellipse cx="${xx}" cy="${yy}" rx="5.4" ry="7" transform="rotate(${n%2?30:-30} ${xx} ${yy})" fill="url(#${p}violet)"/><path d="M${xx-1} ${yy-4}l1 -1" stroke="#e0d3ea" stroke-width="1.3" stroke-linecap="round" opacity=".65"/>`;
    }
    s += `<g transform="translate(${x} ${y}) rotate(${a+tilt}) scale(${sc})">${petals}<ellipse cx="0" cy="-31" rx="3" ry="5" fill="#b1a0cb"/></g>`;
  }
  return s;
}

function sunflower(p) {
  let s=stem('M161 269Q153 208 165 108',5,'#628360');
  s+=leaf(p,160,234,73,-63,'leaf',.9)+leaf(p,160,202,67,60,'light',1)+leaf(p,165,166,44,-48,'leaf',.85);
  let petals='';
  for(let i=0;i<20;i++) petals+=`<path transform="rotate(${i*18})" d="M-4 -20Q-16 -41 -6 -60Q8 -56 10 -35L4 -20Z" fill="url(#${p}yellow)" stroke="#d4a63d" stroke-width=".45"/>`;
  let seeds='';
  for(let i=0;i<115;i++) {const r=Math.sqrt(i)*2.05; seeds+=`<circle cx="${Math.cos(i*2.39996)*r}" cy="${Math.sin(i*2.39996)*r}" r="1.15" fill="${i%3?'#876641':'#b18b4c'}"/>`;}
  s+=`<g transform="translate(166 104) rotate(-12)">${petals}<circle r="25" fill="#65503a"/><circle r="22" fill="#72583c"/>${seeds}</g>`;
  return s;
}

function tulip(p) {
  let s=stem('M160 268Q156 189 155 114',4)+stem('M168 265Q195 210 205 156',3);
  s+=`<path d="M158 268C105 229 91 171 109 145C107 202 159 217 158 268Z" fill="url(#${p}leaf)"/><path d="M164 267C172 215 219 191 232 174C228 220 192 249 164 267Z" fill="url(#${p}light)"/><path d="M155 262Q120 200 109 154M169 263Q211 218 228 181" fill="none" stroke="#bfd2a0" opacity=".5" stroke-width="1"/>`;
  function bloom(x,y,sc,rot){return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})"><path d="M-25 -44Q-24 -9 0 2Q29 -11 25 -45Q7 -37 0 -52Q-10 -34 -25 -44Z" fill="url(#${p}pink)"/><path d="M-29 -48C-39 -5 -16 10 0 9C11 -11 -5 -38 -29 -48Z" fill="#dda1a1"/><path d="M27 -48C38 -6 19 10 0 9C-8 -10 7 -39 27 -48Z" fill="url(#${p}pink)"/><path d="M-26 -43Q-25 -8 -5 5M23 -42Q26 -10 8 4" fill="none" stroke="#f4c8be" stroke-width="1.2" opacity=".6"/></g>`;}
  return s+bloom(155,117,1.12,-8)+bloom(205,156,.7,17);
}

function mint(p) {
  let s=stem('M159 269Q148 179 158 89',3.5)+stem('M154 240Q118 193 109 153',2.6)+stem('M158 220Q191 174 199 136',2.6);
  for(const [x,y,sz,a] of [[157,248,61,-60],[158,236,63,63],[152,205,57,-65],[155,190,56,61],[155,155,48,-55],[157,143,47,60],[158,113,33,-44],[158,106,31,37],[118,187,36,-64],[117,181,35,35],[188,166,36,66],[188,164,32,-32]]) {
    s += leaf(p,x,y,sz,a, a<0?'leaf':'light',.72);
  }
  return s;
}

function cactus(p) {
  let s='';
  for (const [x,y,w,h,ang] of [[126,249,19,84,-17],[196,247,23,117,16],[160,263,34,167,0]]) {
    let spines='';
    for(let row=0;row<Math.floor(h/17);row++)for(let col=-1;col<=1;col++){
      const xx=x+col*w*.65, yy=y-h+17+row*17+(col===0?7:0);
      spines+=`<g stroke="#e8dfb1" stroke-width=".85" stroke-linecap="round" opacity=".78"><path d="M${xx-3} ${yy-3}l6 6M${xx+3} ${yy-3}l-6 6M${xx} ${yy-4}v8"/></g>`;
    }
    s+=`<g transform="rotate(${ang} ${x} ${y})"><rect x="${x-w}" y="${y-h}" width="${w*2}" height="${h}" rx="${w}" fill="url(#${p}leaf)"/><path d="M${x-w*.52} ${y-6}V${y-h+w}Q${x-w*.45} ${y-h+6} ${x} ${y-h+3}M${x+w*.42} ${y-7}V${y-h+w}" stroke="#c0c89b" stroke-width="2" opacity=".5" fill="none"/>${spines}</g>`;
  }
  s+=`<g transform="translate(158 96)"><path d="M0 4C-21 0 -25 -10 -16 -13C-11 -24 -3 -21 0 -15C5 -27 15 -22 16 -14C27 -9 16 2 0 4Z" fill="url(#${p}pink)"/><circle cy="-7" r="4" fill="#e1be64"/></g>`;
  return s;
}

function rose(p) {
  let s=stem('M161 269Q154 200 162 117',3.8)+stem('M158 219Q118 194 111 166',2.5)+stem('M161 190Q198 158 202 128',2.5);
  s += leaf(p,159,248,61,-65,'deep',.72)+leaf(p,159,222,57,64,'leaf',.75)+leaf(p,147,210,44,-62,'leaf',.7)+leaf(p,159,172,38,-61,'light',.7)+leaf(p,191,158,30,60,'deep',.65);
  function flower(x,y,scale){return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 25L-25 32L-15 13L-30 3L-10 -2L5 -9L17 4L31 8L19 19L19 33Z" fill="#61815c"/><path d="M-25 10C-43 -6 -32 -28 -15 -28C-5 -42 15 -37 22 -27C45 -24 46 -2 30 10C24 31 -3 38 -14 24C-28 27 -35 18 -25 10Z" fill="url(#${p}pink)"/><path d="M-26 5Q-18 -18 3 -12Q24 -28 28 -4Q32 19 8 23Q-13 30 -18 12" fill="#d58b98" stroke="#eab0b1" stroke-width="2.5"/><path d="M-15 6Q-22 -13 -3 -21Q17 -24 21 -8Q22 9 9 16Q-3 22 -15 6Z" fill="#bf758a"/><path d="M-14 4Q-3 -11 10 -10Q25 -4 9 13Q-9 16 -14 4Z" fill="#e4a1a8"/><path d="M-4 7Q-15 -8 0 -12Q14 -13 12 0Q9 9 -4 7Z" fill="#b56981"/><path d="M-2 5Q-5 -6 4 -5L7 0" stroke="#eab2b3" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;}
  return s+flower(161,99,1.02)+flower(203,123,.57)+flower(108,164,.55);
}

function monsteraLeaf(p,x,y,size,angle,fill='deep',seed=0) {
  const left=-12+seed%7,right=19+(seed>>>3)%9,vertical=seed%9-4;
  const id=p+'fenestration-'+x+'-'+y;
  const outline='M0 0C-5 -9 -29 -8 -47 -33C-58 -48 -57 -64 -52 -75L-27 -54L-49 -83C-39 -96 -29 -96 -22 -93L-8 -63L-16 -97C-3 -103 7 -98 12 -91C24 -102 41 -91 46 -78L20 -55L51 -69C59 -55 52 -39 43 -31L15 -31L36 -22C24 -11 9 -8 0 0Z';
  const holes=fill==='light'?'':`<defs><mask id="${id}" x="-65" y="-105" width="130" height="110" maskUnits="userSpaceOnUse"><rect x="-65" y="-105" width="130" height="110" fill="white"/><ellipse cx="${left}" cy="${-52+vertical}" rx="3" ry="8" transform="rotate(-21 ${left} ${-52+vertical})" fill="black"/><ellipse cx="${right}" cy="${-51-vertical}" rx="3" ry="7" transform="rotate(24 ${right} ${-51-vertical})" fill="black"/></mask></defs>`;
  return `<g class="leaf-organ" data-leaf-age="${fill==='light'?'young':'mature'}" transform="translate(${x} ${y}) rotate(${angle}) scale(${size/100})">${holes}<g${holes?` mask="url(#${id})"`:''}><path d="${outline}" fill="url(#${p}${fill})"/>
  <path d="M0 -2Q4 -42 10 -86M3 -24L-27 -45M5 -43L-33 -68M5 -30L34 -47M8 -58L32 -77" fill="none" stroke="#b2c79b" stroke-width="1.1" opacity=".58"/></g></g>`;
}

function monstera(p,seed=0) {
  let s=stem('M161 268Q144 197 112 148',3.7)+stem('M163 267Q165 193 204 145',3.8)+stem('M160 266Q139 160 153 101',4)+stem('M159 266Q114 233 99 213',3)+stem('M164 266Q205 218 223 204',3.5);
  s += monsteraLeaf(p,151,107,88,-12,'leaf',seed)+monsteraLeaf(p,111,153,89,-46,'deep',seed>>>5)+monsteraLeaf(p,204,149,91,46,'leaf',seed>>>10)+monsteraLeaf(p,99,216,70,-66,'light')+monsteraLeaf(p,222,208,72,64,'deep',seed>>>15);
  return s;
}

function sprout(p, growth) {
  return stem('M160 270Q154 235 162 214',2.7)+leaf(p,159,240,27+growth*50,-59,'leaf',.78)+leaf(p,160,228,30+growth*35,48,'light',.75)+`<path d="M157 268Q160 263 164 268" fill="#9d8c5a"/>`;
}

const drawings={daisy,lavender,sunflower,tulip,mint,cactus,rose,monstera,fern,orchid,aloe};


function originalBeeArt(className='') {
  const p=`fk-bee-${++illustrationNumber}-`;
  return `<svg class="${escapeAttribute(className)}" viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs><linearGradient id="${p}body" x1="24" y1="32" x2="74" y2="72" gradientUnits="userSpaceOnUse"><stop stop-color="#f8db89"/><stop offset="1" stop-color="#d5a849"/></linearGradient></defs><path d="M44 42C19 36 14 17 24 14C37 8 46 28 49 41" fill="#e4eadf" stroke="#becfbd" stroke-width="1.2"/><path d="M51 39C50 15 63 7 69 15C77 28 61 41 51 45" fill="#f4f1dd" stroke="#c9d5c3" stroke-width="1.2"/><path d="M24 55L15 60L25 64" fill="#665b42"/><ellipse cx="47" cy="54" rx="25" ry="20" transform="rotate(-13 47 54)" fill="url(#${p}body)"/><path d="M33 36Q26 53 36 71M46 34Q40 52 51 73" stroke="#665a3f" stroke-width="7"/><ellipse cx="67" cy="49" rx="15" ry="16" transform="rotate(-15 67 49)" fill="#eed48c"/><path d="M62 35Q56 25 52 26M72 35Q73 22 78 23" stroke="#665a3f" stroke-width="2" stroke-linecap="round"/><circle cx="53" cy="26" r="2.3" fill="#665a3f"/><circle cx="78" cy="23" r="2.3" fill="#665a3f"/><circle cx="66" cy="46" r="2.1" fill="#4c4e36"/><circle cx="75" cy="45" r="1.8" fill="#4c4e36"/><path d="M69 53Q73 56 76 51" stroke="#67583e" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="64" cy="52" rx="3" ry="1.5" fill="#e8a17f" opacity=".6"/><path d="M45 72L44 78M58 69L61 75" stroke="#665a3f" stroke-width="2" stroke-linecap="round"/></svg>`;
}

/* Second edition: growth has its own silhouettes, specimens their own stable seed. */
function seedFor(value) { let seed=2166136261; for(const char of String(value))seed=Math.imul(seed^char.charCodeAt(0),16777619); return seed>>>0; }
function safeChoice(value,choices,fallback){return choices.includes(value)?value:fallback;}
function bud(p,x,y,size=1,color='leaf') {return `<g data-organ="bud" transform="translate(${x} ${y}) scale(${size})"><path d="M0 12C-22 -1 -16 -23 0 -34C17 -23 23 -2 0 12Z" fill="url(#${p}${color})"/><path d="M0 11Q-4 -10 0 -27" stroke="#d3dfb7" stroke-width="1.5" fill="none" opacity=".7"/></g>`;}
function fern(p,count=7) {
 let art='';
 for(let k=0;k<count;k++){
  const angle=(k-(count-1)/2)*20, len=130+(k%3)*16;
  let frond=stem(`M0 0Q-7 ${-len*.5} 0 ${-len}`,2,'#75926b');
  for(let i=1;i<11;i++){
   const y=-i*len/12,size=(1-i/14)*35;
   frond+=leaf(p,-3,y,size,-75,'leaf',.35)+leaf(p,-3,y-2,size,75,'light',.35);
  }
  art+=`<g transform="translate(160 268) rotate(${angle})">${frond}</g>`;
 }
 return art;
}
function orchid(p,stage='mature') {
 let art=leaf(p,160,263,90,-74,'deep',1.12)+leaf(p,161,262,83,73,'leaf',1.1)+leaf(p,159,253,63,-37,'light',.95)+stem('M160 263Q190 194 168 100Q157 63 203 56',3.5,'#6e7f52');
 const positions=[[183,71,1],[172,116,.91],[180,156,.75],[199,59,.65]];
 for(let i=0;i<positions.length;i++){
  const [x,y,sc]=positions[i];
  if(stage==='buds'){art+=bud(p,x,y,sc*.5,'pink');continue;}
  art+=`<g transform="translate(${x} ${y}) scale(${sc})" data-organ="flower"><ellipse cx="-17" cy="-10" rx="19" ry="14" transform="rotate(28 -17 -10)" fill="#ecd9e9"/><ellipse cx="17" cy="-10" rx="19" ry="14" transform="rotate(-28 17 -10)" fill="#f5e6ef"/><path d="M0 -4C-18 -21 -11 -39 0 -34C14 -40 21 -16 0 -4Z" fill="#e3c5de"/><path d="M-1 1Q-24 23 -28 9Q-35 -2 -10 -5M1 1Q23 23 28 9Q35 -2 10 -5" fill="#d8afd1"/><path d="M-11 2Q0 -8 11 2L5 18H-5Z" fill="#b16b9d"/><circle cy="1" r="4" fill="#ebc262"/></g>`;
 }
 return art;
}
function aloe(p,count=9) {
 let art='';
 for(let k=0;k<count;k++){
  const angle=(k-(count-1)/2)*14, height=115+(k%4)*19;
  art+=`<g transform="translate(160 270) rotate(${angle})"><path d="M0 0C-36 -24 -28 ${-height*.55} -9 ${-height}C-3 ${-height*.62} 30 -32 0 0Z" fill="url(#${p}${k%2?'light':'leaf'})"/><path d="M-2 -6Q-9 ${-height*.5} -9 ${-height+10}" stroke="#d8e3b8" stroke-opacity=".6" fill="none"/>${Array.from({length:8},(_,i)=>`<path d="M${-17+i*.7} ${-20-i*11}l-5 -3 4 7M${12-i*1.5} ${-20-i*11}l5 -3 -4 7" fill="#bfd4aa"/>`).join('')}</g>`;
 }
 return art;
}
function youngPlant(p,speciesId,growth){
 const stalk=stem('M160 268Q148 211 161 168',3);
 if(speciesId==='fern')return fern(p,growth<.3?3:5);
 if(speciesId==='aloe')return aloe(p,growth<.3?3:5);
 if(speciesId==='cactus')return `<rect x="137" y="175" width="46" height="94" rx="23" fill="url(#${p}leaf)"/>${Array.from({length:5},(_,i)=>`<path d="M148 ${190+i*15}l6 5m-6 0 6-5M167 ${196+i*14}l6 5m-6 0 6-5" stroke="#e8dfb1" stroke-width="1.2"/>`).join('')}`;
 if(speciesId==='orchid')return leaf(p,160,265,69,-68,'deep',1.15)+leaf(p,160,265,73,65,'leaf',1.15)+(growth>.35?leaf(p,160,254,47,-18,'light',.8):'');
 if(speciesId==='monstera')return stalk+leaf(p,158,230,68,-58,'deep',1.1)+leaf(p,160,194,72,49,'leaf',1.1)+(growth>.32?monsteraLeaf(p,160,169,56,-8,'light'):'');
 const thin=['lavender','tulip'].includes(speciesId);
 let art=stalk;
 const count=growth<.3?3:5;
 for(let i=0;i<count;i++)art+=leaf(p,158,250-i*16,32+i*3,i%2?53:-57,i%2?'light':'leaf',thin?.28:.72);
 return art;
}
function buddingPlant(p,speciesId){
 if(speciesId==='fern')return fern(p,7);
 if(speciesId==='aloe')return aloe(p,7);
 if(speciesId==='mint'||speciesId==='monstera')return drawings[speciesId](p);
 if(speciesId==='orchid')return orchid(p,'buds');
 if(speciesId==='cactus')return cactus(p).replace(/<g transform="translate\(158 96\)">[\s\S]*?<\/g>$/,'')+bud(p,158,96,.36,'pink');
 let art=stem('M160 268Q153 181 160 112',3.5)+leaf(p,158,235,56,-56,'leaf',speciesId==='lavender'?.3:.7)+leaf(p,158,207,57,56,'light',speciesId==='lavender'?.3:.7);
 if(speciesId==='lavender')for(let i=-2;i<=2;i++)art+=stem(`M160 267Q${160+i*20} 180 ${160+i*20} ${121+Math.abs(i)*13}`,2)+bud(p,160+i*20,121+Math.abs(i)*13,.38,'violet');
 else art+=bud(p,160,114,speciesId==='sunflower'?.85:.7,['rose','tulip'].includes(speciesId)?'pink':'leaf');
 return art;
}
function validCustomPot(pot){return !!(pot&&Array.isArray(pot.profile)&&pot.profile.length===5&&pot.profile.every(v=>Number.isFinite(v)&&v>=22&&v<=68)&&typeof pot.color==='string'&&/^#[a-f\d]{6}$/i.test(pot.color));}
function safeHex(color,fallback='#b98770'){return typeof color==='string'&&/^#[a-f\d]{6}$/i.test(color)?color:fallback;}
function soilSurface(y,radius,height,saturation){
 const n=Number.isFinite(saturation)?Math.max(0,Math.min(100,saturation)):40;
 const surface=n<35?'dry':n>=75?'wet':'soft';
 const segment=radius*.38,tip=radius*.64;
 const cracks=`<path d="M${160-tip} ${y}l${segment*.54} -1.5 ${segment*.47} 2  ${segment*.3} -2m${segment*.3} .3 ${segment*.7} 1.9 ${segment*.8} -2m-${segment*.65} 2.1l.4 1.5" stroke="#d1aa82" stroke-width=".7" opacity=".76" fill="none"/>`;
 const sheen=`<path d="M${160-tip} ${y}q${segment} -3 ${2*segment} -.5m${segment*.82} 1q${segment*.55} .4 ${segment*.91} -.7" stroke="#e1bd8c" stroke-width=".85" stroke-linecap="round" opacity=".68" fill="none"/>`;
 const flecks=Math.round(radius/16);
 const grains=Array.from({length:flecks},(_,index)=>`<ellipse cx="${160-radius*.65+(index+.5)*radius*1.3/flecks}" cy="${y+index%2-1}" rx="1.6" ry=".65" fill="#d6af86" opacity=".5"/>`).join('');
 return `<g class="soil-surface" data-moisture="${Math.round(n)}" data-soil="${surface}"><ellipse cx="160" cy="${y}" rx="${radius}" ry="${height}" fill="#bfa080"/><ellipse cx="160" cy="${y}" rx="${radius}" ry="${height}" fill="#372b24" opacity="${(.28+n*.0065).toFixed(3)}"/>${surface==='dry'?cracks:surface==='wet'?sheen:grains}</g>`;
}
function contactShadow(light,radius,custom=false){
 const direction=lightPositions[light]??lightPositions.day;
 const shift=direction*(light==='night'?20:28);
 const reach=radius+20+Math.abs(direction)*15;
 const shadow=`<ellipse data-shadow="${light}" cx="${160+shift}" cy="343" rx="${reach}" ry="8" fill="#183b30" opacity="${light==='night'?.2:.08}"/>`;
 return shadow+`<g class="pot-contact" data-contact-shadow="${custom?'sculpted':'stock'}"><ellipse cx="160" cy="348" rx="${radius+11}" ry="3" fill="#353c29" opacity=".24"/><ellipse cx="160" cy="345" rx="${radius+9}" ry="4" fill="#c9b08c" data-pot-tray="true"/><ellipse cx="160" cy="343.5" rx="${radius-2}" ry="2" fill="#232e21" opacity=".24"/></g>`;
}
function windowReflection(x=133,y=293){
 return `<g class="pot-window-reflection" fill="none" stroke="#fff9e7" stroke-linecap="round" opacity=".39"><path d="M${x} ${y}q-2 8 1 17m3-21q-1 10 2 18m-7-11q4 1 7 0" stroke-width="1.2"/><path d="M${x+8} ${y+3}q-.7 8 1 14" stroke-width=".7" opacity=".75"/></g>`;
}
function customPotSurface(p,bodyPath,customPot) {
 const id=String(p).replace(/[^A-Za-z0-9_-]/g,'').slice(0,130)+'-ceramic-surface';
  const color=safeHex(customPot.color);
 const candidate=customPot.glazeColor;
 const glaze=customPot.finish==='glaze'&&typeof candidate==='string'&&/^#[a-f\d]{6}$/i.test(candidate)&&candidate!==color;
 const border=Number.isFinite(customPot.glazeBorder)?Math.max(15,Math.min(85,customPot.glazeBorder)):50;
 const pattern=['dots','leaves','stripes'].includes(customPot.pattern)?customPot.pattern:'';
 const scale=Number.isFinite(customPot.patternScale)?Math.max(.5,Math.min(2,customPot.patternScale)):1;
 const angle=Number.isFinite(customPot.patternAngle)?Math.max(-180,Math.min(180,customPot.patternAngle)):0;
 const marks={
   dots:'<circle cx="4" cy="4" r="1.6"/><circle cx="11" cy="10" r="1.1"/>',
   leaves:'<path d="M3 11Q1 3 9 3Q10 8 3 11ZM11 15Q8 8 15 7Q17 13 11 15Z"/>',
   stripes:'<path d="M1 0H3V18H1ZM8 0H9V18H8ZM15 0H17V18H15Z"/>'
 };
 const gradient=glaze?`<linearGradient id="${id}-glaze" x2="0" y2="1">
   <stop stop-color="${color}"/><stop offset="${Math.max(0,border-4)}%" stop-color="${color}"/>
   <stop offset="${Math.min(100,border+4)}%" stop-color="${candidate}"/><stop offset="100%" stop-color="${candidate}"/>
 </linearGradient>`:'';
 const tile=pattern?`<pattern id="${id}-pattern" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle}) scale(${scale})">
   <g fill="#fff9e6" opacity=".62">${marks[pattern]}</g>
 </pattern>`:'';
 const fill=glaze?`url(#${id}-glaze)`:color;
  return `<defs>${gradient}${tile}</defs><path d="${bodyPath}" fill="${fill}"/>${pattern?`<path d="${bodyPath}" fill="url(#${id}-pattern)"/>`:''}${validCustomPot(customPot)?ceramicThrowingRings(customPot.profile):''}`;
}
const potteryHeights=[267,282,300,320,338];
function ceramicThrowingRings(radii){
 const lines=potteryHeights.slice(1,4).map((y,index)=>{
  const radius=radii[index+1]-4,delta=2+index%2;
  return `<path d="M${160-radius} ${y-1}Q153 ${y+delta} ${160+radius} ${y}" fill="none" stroke="#805944" stroke-width=".75" opacity=".23"/><path d="M${160-radius+1} ${y}Q150 ${y+delta+1} ${160+radius-1} ${y+1}" fill="none" stroke="#fff0d1" stroke-width=".65" opacity=".2"/>`;
 });
 return '<g class="ceramic-throwing-rings">'+lines.join('')+'</g>';
}
function customPotRim(raw) {
 if(!validCustomPot(raw))return '';
 const radius=raw.profile[0];
 return `<path class="pot-handmade-rim" d="M${160-radius} 267q${radius} -18 ${radius*2} 0q-${radius+5} 17 -${radius*2} 0Z" fill="${raw.color}" stroke="#806953" stroke-opacity=".3"/>`;
}

function styledPot(p,shape,material,light,wet,moisture,customPot,treatment){
 const hydration=wet?100:moisture;
 if(validCustomPot(customPot)){
    const radii=customPot.profile;
    const points=radii.map((r,i)=>`${160-r},${potteryHeights[i]}`).join('L');
    const right=radii.slice().reverse().map((r,i)=>`${160+r},${potteryHeights[4-i]}`).join('L');
   const body=`M${points}Q160 349 ${160+radii[4]} 338L${right}Z`;
    const reflection=customPot.finish==='glaze'&&light==='dawn'?windowReflection(168-radii[2]):'';
    const shadow=treatment==='cutout'?'':contactShadow(light,radii[4],true);
    return shadow+`<g data-pot-material="custom" data-pot-shape="sculpted">${customPotSurface(p,body,customPot)}<path d="M${160-radii[0]+10} 282Q${160-radii[2]+7} 306 ${160-radii[4]+12} 329" stroke="#fff6dc" stroke-width="${customPot.finish==='glaze'?7:2}" opacity="${customPot.finish==='glaze'?.4:.15}" fill="none"/>${customPotRim(customPot)}${soilSurface(267,radii[0]-6,6,hydration)}${reflection}</g>`;
 }
 const shadow=treatment==='cutout'?'':contactShadow(light,shape==='bowl'?45:38);
 let form;
 if(shape==='tall')form=`<path d="M121 266H199L189 333Q160 350 131 333Z" fill="url(#${p}pot)"/><ellipse cx="160" cy="267" rx="40" ry="8" fill="#ba9777"/><ellipse cx="160" cy="268" rx="34" ry="5" fill="${wet?'#46352b':'#675046'}"/>`;
 else if(shape==='bowl')form=`<path d="M99 285Q102 340 160 342Q218 340 221 285Z" fill="url(#${p}pot)"/><ellipse cx="160" cy="283" rx="61" ry="12" fill="#ba9777"/><ellipse cx="160" cy="282" rx="52" ry="8" fill="${wet?'#46352b':'#675046'}"/>`;
 else form=originalPot(p).replace(/<ellipse cx="160" cy="344"[^>]*\/><ellipse cx="160" cy="343"[^>]*\/>/,'').replace('fill="#635044"',`fill="${wet?'#46352b':'#635044'}"`);
 let texture='';
  if(material==='glaze')texture='<path d="M131 288Q126 311 140 325" stroke="#fffdf4" stroke-width="7" stroke-linecap="round" opacity=".38"/><path d="M143 290v13" stroke="#fff" stroke-width="2" opacity=".45"/>'+(light==='dawn'?windowReflection():'');
 if(material==='paper')texture='<path d="M129 283L139 331M145 285l7 53M163 285v53M181 284l-8 54M195 281l-10 51" stroke="#856846" stroke-opacity=".2"/><path d="M121 296h78m-73 14h68m-64 14h60" stroke="#fae6bf" stroke-opacity=".27"/>';
 if(material==='clay')texture=Array.from({length:22},(_,i)=>`<circle cx="${130+(i*23)%60}" cy="${289+(i*17)%42}" r="${.5+(i%3)*.3}" fill="${i%2?'#f6dac1':'#80664e'}" opacity=".18"/>`).join('');
 if(material==='painted')texture='<path d="M128 310Q160 288 193 310M129 316Q160 294 191 316" stroke="#faf1db" stroke-width="2" fill="none"/>'+Array.from({length:5},(_,i)=>`<g transform="translate(${137+i*12} ${315+(i%2)*6})"><path d="M0 6V-5M0 1Q-9-8-6-8Q0-7 0 1M0-1Q8-11 8-5Q6 1 0 2" stroke="#426b54" stroke-width="1.6" fill="none"/></g>`).join('');
 const soilY=shape==='bowl'?282:268,soilRX=shape==='bowl'?51:shape==='tall'?33:43;
 const soil=soilSurface(soilY,soilRX,shape==='bowl'?7:5,hydration);
 return shadow+`<g data-pot-shape="${shape}" data-pot-material="${material}">${form}${texture}${soil}</g>`;
}

const macroFrames={
 daisy:[111,42,101,90],lavender:[105,17,112,112],sunflower:[94,34,146,138],
 tulip:[105,56,108,88],mint:[97,86,123,116],cactus:[116,71,86,78],
 rose:[109,44,124,121],monstera:[83,36,164,158],fern:[72,57,174,152],
 orchid:[127,18,115,112],aloe:[87,107,149,149],
};
const flowerProfiles={
 daisy:'<path d="M-63-16Q-56 3-43 5Q-27 10-7 1Q-31-4-63-16ZM63-16Q56 3 43 5Q27 10 7 1Q31-4 63-16Z" fill="#f2e9cf" stroke="#b9ad8d" stroke-width="1.2"/><path d="M-42-6Q0-34 42-6Q27 10 0 13Q-27 10-42-6Z" fill="#d6aa4e"/>',
 sunflower:'<path d="M-80-17Q-47-17-26 7Q-68 16-80-17ZM80-17Q47-17 26 7Q68 16 80-17Z" fill="#e6b85b" stroke="#bd9349" stroke-width="1.4"/><path d="M-47-1Q-24-39 47-20Q56-8 46 5Q8 18-47-1Z" fill="#7e5a3d"/>',
 tulip:'<path d="M-53-62Q-31-25 0-52Q29-24 54-62Q62-14 7 13Q-50 9-53-62Z" fill="#d88d86" stroke="#ae6a68" stroke-width="1.2"/><path d="M-50-62Q-26-55 7 13Q-29-2-50-62ZM54-62Q30-54 7 13Q40-3 54-62Z" fill="#f0b0a1"/>',
 rose:'<path d="M-58-26Q-30-56 31-47Q57-37 60-19Q34 14 1 15Q-44 13-58-26Z" fill="#c77988" stroke="#a26075" stroke-width="1.15"/><path d="M-58-26Q-22-36-11-12Q-1-47 31-47Q44-32 19-19Q40-29 60-19Q39 6 1 15Q-42 10-58-26Z" fill="#e9a5a4" stroke="#bc7884" stroke-width="1.3"/>',
 orchid:'<path d="M-45-50Q-18-63 0-41Q10-69 45-49Q55-26 18-7Q7 11-14 5Q-40-1-45-50Z" fill="#e0bdcf" stroke="#b592a8" stroke-width="1.25"/><path d="M-10-13Q16-3 38-14Q40 9 17 15Q0 13-10-13Z" fill="#a86499"/>',
};
function hasFlowerProfile(speciesId){return Object.hasOwn(flowerProfiles,speciesId);}
function profilePetalView(speciesId,p){
 const profile=flowerProfiles[speciesId];
 const closed=['daisy','sunflower'].includes(speciesId);
 const pollen=Array.from({length:closed?11:5},(_,i)=>{
   const x=(i-(closed?5:2))*(closed?5.5:6);
   const y=-15-Math.max(0,8-Math.abs(x)*.32)-(closed?0:7);
   return `<path d="M${x} ${y+9}v-7" stroke="#73613c" stroke-linecap="round"/><ellipse cx="${x}" cy="${y}" rx="2.5" ry="1.6" fill="#f0cf73"/>`;
 }).join('');
 return `<svg viewBox="0 0 320 290" xmlns="${svgNamespace}" role="img" aria-label="Цветок сбоку" data-art-view="profile" data-species="${escapeAttribute(speciesId)}">${definitions(p,'cream')}<rect x="2" y="2" width="316" height="286" rx="12" fill="#f2eddf"/>${notebookMarks(320,290)}<path d="M70 109H245M160 40V246" stroke="#8a9376" stroke-opacity=".19" stroke-dasharray="3 7"/><g transform="translate(160 125)">${stem('M-4 104Q-10 56 0 6',5.5)}${leaf(p,-5,72,74,-61,'leaf',.62)}<path d="M-34-1Q-17 14 0 22Q20 12 34-1" fill="#8b9f70" stroke="#6e8661" stroke-width="1.6"/>${closed?'':pollen}${profile}${closed?pollen:''}</g></svg>`;
}
function plantVisualStage(growth) {
 return growth<.12?'sprout':growth<.55?'leaves':growth<.88?'buds':'mature';
}
function plantArt(speciesId,{id='',growth=1,pot:potColor='clay',className='',shape='classic',material='clay',light='day',season='summer',variant,wet=false,moisture,customPot,bloomPhase=1,treatment='watercolor',view='full',air='still'}={}) {
 const p=`fk-art-${++illustrationNumber}-${String(id).replace(/[^a-zA-Z0-9_-]/g,'')}-`;
  if(view==='profile'&&hasFlowerProfile(speciesId))return profilePetalView(speciesId,p);
  const selectedLight=Object.hasOwn(lightPositions,light)?light:'day';
  const selectedView=view==='macro'?'macro':'full';
  const selectedTreatment=treatment==='cutout'?'cutout':'watercolor';
  const g=selectedView==='macro'?1:Math.max(0,Math.min(1,Number.isFinite(growth)?growth:1));
 const seed=seedFor(variant??`${id||speciesId}:${speciesId}`),tilt=(seed%9)-4;
 const stage=plantVisualStage(g);
 const selectedShape=safeChoice(shape,['classic','tall','bowl'],'classic'), selectedMaterial=safeChoice(material,['clay','glaze','paper','painted'],'clay');
  const matureArt=()=>{
    const draw=Object.hasOwn(drawings,speciesId)?drawings[speciesId]:daisy;
    return ['daisy','lavender','monstera'].includes(speciesId)?draw(p,seed):draw(p);
  };
  if(view==='cyanotype'){
    // Preserve the drawing's alpha (including the holes in a monstera leaf).
    // Map its colours into a narrow range of blue-paper and ivory highlights.
    const exposure='<feColorMatrix type="matrix" values=".09 .27 .04 0 .58   .07 .20 .03 0 .70   .05 .14 .02 0 .74   0 0 0 1 0"/>';
    return `<svg viewBox="18 0 284 281" xmlns="${svgNamespace}" fill="none" aria-hidden="true" focusable="false" data-art-view="cyanotype" data-species="${escapeAttribute(speciesId)}" data-variant="${seed%97}">${definitions(p,'cream','cutout')}<defs><filter id="${p}expose" color-interpolation-filters="sRGB">${exposure}</filter></defs><g transform="rotate(${tilt} 160 268)" filter="url(#${p}expose)">${matureArt()}</g></svg>`;
  }
  let botanical=stage==='sprout'?sprout(p,g):stage==='leaves'?youngPlant(p,speciesId,g):stage==='buds'?buddingPlant(p,speciesId):matureArt();
 if(stage==='mature'&&bloomPhase<.3&&!['mint','monstera','fern','aloe'].includes(speciesId))botanical=buddingPlant(p,speciesId);
  const newLeaf=stage==='leaves'&&g>=.34&&!['cactus','aloe','fern','orchid'].includes(speciesId);
  const extraLeaf=newLeaf?leaf(p,158,228,13+(g-.34)*35,-40,'light',.75)
    :(seed%3===1&&g>.6&&!['cactus','aloe','fern','orchid'].includes(speciesId))?leaf(p,159,244,29,-72,'light',.6):'';
 const bowlShift=selectedShape==='bowl'&&!validCustomPot(customPot)?16:0;
  const lighting=selectedTreatment==='watercolor'&&(selectedLight==='night'||selectedLight==='sunset')?`<defs><filter id="${p}lighting" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="${selectedLight==='night'?.63:1.07}"/><feFuncG type="linear" slope="${selectedLight==='night'?.74:.96}"/><feFuncB type="linear" slope="${selectedLight==='night'?.8:.87}"/></feComponentTransfer></filter></defs>`:'';
 const lit=lighting?` filter="url(#${p}lighting)"`:'';
 const water=wet?`<path class="watering-arc" d="M250 158Q222 180 174 261" stroke="#83adb5" stroke-width="2.2" opacity=".55" stroke-dasharray="5 7"/><g class="watering-stream" fill="#8ab4be" opacity=".75">${[0,1,2,3,4].map(i=>`<ellipse cx="${196-i*7}" cy="${218+i*10}" rx="2" ry="4"/>`).join('')}</g>`:'';
  const scarce=selectedView==='full'&&broadLeaves.has(speciesId)&&!wet&&Number.isFinite(moisture)&&moisture<48;
  const compression=scarce?Math.max(.86,1-(48-moisture)/350).toFixed(3):1;
  const frame=selectedView==='macro'&&Object.hasOwn(macroFrames,speciesId)?macroFrames[speciesId]:[0,0,320,360];
  const [x,y,w,h]=frame;
  const macroPaper=selectedView==='macro'?`<defs><radialGradient id="${p}close-paper"><stop stop-color="#faf3e2"/><stop offset="1" stop-color="#dce6cb"/></radialGradient></defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${p}close-paper)"/>`:'';
  const silhouette=`translate(0 ${bowlShift}) rotate(${tilt} 160 268) translate(0 ${(268*(1-compression)).toFixed(2)}) scale(1 ${compression})`;
  const shade=lightPositions[selectedLight];
  const cast=selectedTreatment==='watercolor'&&selectedView==='full'?`<defs><filter id="${p}leaf-shadow" x="-40%" y="-30%" width="200%" height="180%"><feColorMatrix values="0 0 0 0 .2 0 0 0 0 .3 0 0 0 0 .2 0 0 0 .09 0"/><feGaussianBlur stdDeviation="2"/></filter></defs><g class="leaf-cast-shadow" data-light-direction="${shade}" transform="translate(${shade*22} 14) skewX(${shade*11})" filter="url(#${p}leaf-shadow)"><use href="#${p}silhouette"/></g>`:'';
  const pot=selectedView==='full'?styledPot(p,selectedShape,selectedMaterial,selectedLight,wet,moisture,customPot,selectedTreatment):'';
  const label=selectedView==='macro'?'role="img" aria-label="Крупный план растения"':'aria-hidden="true" focusable="false"';
  return `<svg class="${escapeAttribute(className)}" data-species="${escapeAttribute(speciesId)}" data-stage="${stage}" data-variant="${seed%97}" data-season="${escapeAttribute(season)}" data-art-treatment="${selectedTreatment}" data-art-view="${selectedView}" data-air="${air==='wind'?'wind':'still'}" data-droop="${scarce}" viewBox="${frame.join(' ')}" fill="none" xmlns="${svgNamespace}" ${label}>${definitions(p,potColor,selectedTreatment)}${macroPaper}${lighting}${cast}<g${lit}>${pot}<g id="${p}silhouette" class="botanical-silhouette" transform="${silhouette}"><g class="botanical-foliage">${botanical}${extraLeaf}</g></g>${water}</g></svg>`;
}

function beeArt(className='',mood='happy') {
 if(className&&typeof className==='object'){mood=className.mood||mood;className=className.className||'';}
 mood=safeChoice(mood,['happy','sleep','curious','watering','waiting','hint','complete'],'happy');
 let art=originalBeeArt(className).replace('<svg ',`<svg data-mood="${escapeAttribute(mood)}" `);
 if(mood==='sleep')art=art.replace('<circle cx="66" cy="46" r="2.1" fill="#4c4e36"/><circle cx="75" cy="45" r="1.8" fill="#4c4e36"/>','<path d="M63 46q3 4 6 0m3-1q3 4 6 0" stroke="#4c4e36" stroke-width="1.5" fill="none"/>').replace('</svg>','<text x="81" y="23" font-family="serif" font-size="13" fill="#7d8d72">z</text></svg>');
 if(mood==='curious')art=art.replace('M69 53Q73 56 76 51','M69 53Q73 51 76 53').replace('</svg>','<path d="M85 27q5-8 8-1q1 4-4 6m0 5v1" stroke="#98a177" stroke-width="1.4" stroke-linecap="round"/></svg>');
 if(mood==='watering')art=art.replace('</svg>','<g fill="#84acba"><ellipse cx="83" cy="68" rx="3" ry="5"/><ellipse cx="89" cy="78" rx="2" ry="4"/></g></svg>');
 if(mood==='waiting'){
  art=art.replace('M69 53Q73 56 76 51','M68 53Q72 54 76 53')
   .replace('M45 72L44 78M58 69L61 75','M45 71Q45 78 52 78M58 69Q61 77 67 76')
   .replace('</svg>','<path d="M37 82q14 3 30-1" stroke="#8c9a7b" stroke-opacity=".56" stroke-linecap="round"/></svg>');
 }
 if(mood==='hint'){
  art=art.replace('</defs>','</defs><g transform="rotate(10 51 51)">')
   .replace('M45 72L44 78M58 69L61 75','M45 72L44 78M59 69Q69 73 75 66')
   .replace('</svg>','</g><path d="M86 19l2-5m1 9 5-2" stroke="#b2985c" stroke-width="1.6" stroke-linecap="round"/></svg>');
 }
 if(mood==='complete'){
  art=art.replace('</defs>','</defs><g transform="rotate(-9 48 52) translate(0 -1)">')
   .replace('M69 53Q73 56 76 51','M67 52Q71 60 78 50')
   .replace('M45 72L44 78M58 69L61 75','M43 69l-9 3m21-4 8 4')
   .replace('</svg>','</g><path d="M82 13v10m-5-5h10m9 16v6m-3-3h6" stroke="#bc9250" stroke-width="1.7" stroke-linecap="round"/></svg>');
 }
 return art;
}

const scenePalettes={
 day:['#f4eee0','#d6dfc8','#faf3dd','#c8d9c3'],dawn:['#f0e1d8','#d9e2cb','#f7dbbc','#cbb6a0'],
 sunset:['#eedac7','#d6c5a8','#edbe90','#c3ac9b'],night:['#2b3b34','#182a28','#3b4d61','#465a4c'],
};
function sceneConfiguration(options){
 const scene=safeChoice(options.scene,['window','balcony','desk'],'window');
 const defaultOutside={window:'courtyard',balcony:'roofs',desk:'grove'}[scene];
 const weather=safeChoice(options.weather,['clear','rain','snow'],'clear');
 return {
  scene,weather,outside:safeChoice(options.outside,['courtyard','roofs','grove'],defaultOutside),
  light:safeChoice(options.light,['day','dawn','sunset','night'],'day'),
  season:safeChoice(options.season,['spring','summer','autumn','winter'],'summer'),
  air:scene==='balcony'||weather==='rain'?'wind':'still',
 };
}
function apertureShape(scene){
 if(scene==='balcony')return '<path d="M0 0h820v403H0Z"/>';
 if(scene==='desk')return '<rect x="48" y="51" width="274" height="246" rx="15"/>';
 return '<path d="M112 407V165Q112 43 410 36Q708 43 708 165V407Z"/>';
}
function skyline(outside,season,light){
 const color=light==='night'?'#213b3c':season==='autumn'?'#b18c62':'#7d9c7c';
 const trees=outside==='roofs'?'':`<path d="M25 225H382V160Q307 149 262 169Q211 146 159 169Q74 138 25 160Z" fill="${color}" opacity=".27"/>`;
 const tree=(x,y,w)=>`<g transform="translate(${x} ${y}) scale(${w})"><path d="M0 125q9-63 7-118m-4 69q15-12 29-27m-28 10-19-23" stroke="#675f4e" stroke-width="5" fill="none"/><path d="M-34 33Q-46 13-31 6Q-35-20-12-17Q3-37 21-18Q44-24 42 1Q70 10 54 35Q39 55 18 46Q-13 68-34 33Z" fill="${color}"/></g>`;
 if(outside==='grove'){
  const silhouettes=Array.from({length:11},(_,i)=>{
   const x=38+i*35,y=76+i%3*17,k=1+i%4*.2;
   return `<path d="M${x} ${y}l-${26*k} ${101*k}h${52*k}Z" fill="${color}" opacity="${.22+i%4*.13}"/>`;
  }).join('');
  return trees+silhouettes;
 }
 const cottages=Array.from({length:outside==='roofs'?7:3},(_,i)=>{
  const x=15+i*(outside==='roofs'?57:113),y=126+(i%3)*17;
  const trim=light==='night'?'#68795a':'#d9ceab',wall=light==='night'?'#385051':'#b8b69a';
  return `<path d="M${x} ${y}l28-23 34 23v64h-62Z" fill="${wall}"/><path d="M${x-5} ${y+4}l33-31 39 31Z" fill="${color}" opacity=".93"/><path d="M${x+15} ${y+11}h9v14h-9zm21 0h9v14h-9Z" fill="${trim}"/>`;
 }).join('');
 return trees+cottages+(outside==='courtyard'?tree(123,69,1.05)+tree(315,90,.79):'');
}
function daySky(config,p){
 const {light,scene,outside,season,weather}=config;
 const box=scene==='desk'?[48,51,274,246]:[0,0,820,407];
 const [x,y,w,h]=box;
 let sky=`<rect x="0" y="0" width="820" height="407" fill="url(#${p}glass)"/><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 400 220" preserveAspectRatio="none"><g data-scene-depth="distance" data-skyline="${outside}">${skyline(outside,season,light)}</g></svg>`;
 if(light!=='night'&&weather==='clear'){
  const x=scene==='desk'?197:light==='sunset'?219:573,y=light==='day'?90:136;
  sky+=`<circle cx="${x}" cy="${y}" r="${light==='day'?29:39}" data-sun-position="${light}" fill="#fff5d1" opacity=".68"/>`;
 }
 if(light==='night')sky+='<path d="M613 70a22 22 0 1 0 21 29a23 23 0 0 1-21-29Z" fill="#f4deb1"/><path d="M539 91h3m99-46h5m-134 72h4m106 16h5m39-43h4" stroke="#e9e1c3" stroke-width="2" stroke-linecap="round"/>';
 if(season==='spring')sky+='<path d="M81 317q92-34 220 6q134-48 227 3q144-41 268-5" stroke="#dcb4b8" stroke-width="16" stroke-opacity=".52" stroke-dasharray="4 14" stroke-linecap="round" fill="none"/>';
 if(season==='autumn')sky+='<path d="M192 162l-4 9l8-2zm313 20l-8 3l5 5zm-164 55l-5 9l8-2zm199-118l-6 4l5 4zm21 167l-5 9l9-4Z" data-autumn-plane="far" fill="#be935f" opacity=".61"/>';
 if(season==='winter'||weather==='snow')sky+='<path d="M0 365q120-32 200-9t190 11t214-21t216 15v46H0Z" fill="#edf3e6" opacity=".74"/>';
 if(weather==='rain'){
  sky+=`<g class="scene-rain" stroke="#71929b" stroke-opacity=".59" stroke-width="1.5">${Array.from({length:27},(_,i)=>`<path d="M${15+i*87%780} ${24+i*41%338}l-6 15"/>`).join('')}</g>`;
  if(scene!=='balcony')sky+='<g class="scene-glass-rain" fill="#f3faf1" stroke="#77979e" stroke-width="1.15" opacity=".82"><path d="M147 221c-8 11-5 18 1 18c6 0 8-8-1-18ZM585 145c-10 14-7 24 2 23c9-3 6-13-2-23ZM639 292c-7 8-5 16 2 13c4-2 2-8-2-13ZM108 144c-6 7-4 11 0 11c6-2 4-6 0-11Z"/></g>';
 }
 if(weather==='snow')sky+=`<g class="scene-snow" fill="#fdfcf4" opacity=".85">${Array.from({length:23},(_,i)=>`<circle cx="${15+i*71%780}" cy="${20+i*53%350}" r="${1+i%3}"/>`).join('')}</g>`;
 return sky;
}
function indoorTrim(config,p){
 const {light,scene,season,weather}=config;
 const frame=light==='night'?'#647259':'#abb79d';
 if(scene==='balcony'){
  const snow=weather==='snow'||season==='winter'?'<path d="M0 337q42-9 86-4q92 4 189-1q96-5 178 0q190 8 367-1v10H0Z" data-snow-settled="rail" fill="#f4f6ec"/>':'';
  return '<path d="M0 346H820M40 349v68m91-68v68m91-68v68m91-68v68m91-68v68m91-68v68m91-68v68m91-68v68m91-68v68" stroke="#798a71" stroke-width="9"/>'+snow;
 }
 if(scene==='desk'){
  const halo=light==='night'?`<ellipse cx="666" cy="392" rx="160" ry="56" data-lamp-glow="true" fill="url(#${p}lamplight)"/><path d="M626 149H716L782 399H570Z" opacity=".34" fill="url(#${p}lamplight)"/>`:'';
  return `<g fill="none" stroke="${frame}" stroke-width="7"><rect x="48" y="51" width="274" height="246" rx="15"/><path d="M185 52V296M48 170h273"/></g>${halo}<path d="M678 149v234m-33 1h66" stroke="${frame}" stroke-width="8" stroke-linecap="round"/><path d="M628 151h92l-18-42h-56Z" fill="${light==='night'?'#f5d28d':'#b89d69'}" stroke="#ad915e" stroke-width="2"/>`;
 }
 const frost=weather==='snow'||season==='winter'?'<path d="M112 404q27-10 64-7t59-1t73 4t105-4t123 2t92-1t80-1v13H112Z" data-snow-settled="sill" fill="#f7faef"/>':'';
 return `<path d="M112 407V165Q112 43 410 36Q708 43 708 165V407ZM410 38V404M114 196H706" fill="none" stroke="${frame}" stroke-width="8"/><path d="M120 402V166Q121 52 410 44Q699 52 700 166V400" fill="none" stroke="#fffbe9" stroke-opacity=".45" stroke-width="2"/>${frost}`;
}
function atmosphere(config,p,width,height){
 const {light,scene,season}=config;
 const color=scenePalettes[light];
 const glass=p+'exterior';
 const friezeHeight=Math.min(height,width*500/820);
 const rays=light==='night'?'':`<g class="window-rays" opacity="${light==='dawn'?.28:.14}" fill="#fff9dc"${light==='sunset'?' transform="translate(820 0) scale(-1 1)"':''}><path d="M445 43L160 425h135L561 64Z"/><path d="M650 62L404 448h77L693 101Z"/></g>`;
 const foreground=season==='autumn'?'<g data-autumn-plane="near" fill="#b77d53" stroke="#a66d4b" stroke-width=".9"><path d="M683 330q23-18 42-8q-9 22-34 22Z"/><path d="M92 364q-25-8-36 11q24 12 36-11z"/><path d="M637 385q-21-12-31 5q19 16 31-5z"/></g>':'';
 return `<defs><linearGradient id="${p}back" x2="1" y2="1"><stop stop-color="${color[0]}"/><stop offset="1" stop-color="${color[1]}"/></linearGradient><linearGradient id="${p}glass" x2="0" y2="1"><stop stop-color="${color[2]}"/><stop offset="1" stop-color="${color[3]}"/></linearGradient><radialGradient id="${p}lamplight"><stop stop-color="#f5d58a" stop-opacity=".9"/><stop offset="1" stop-color="#d6ae70" stop-opacity="0"/></radialGradient><clipPath id="${glass}">${apertureShape(scene)}</clipPath></defs><rect width="${width}" height="${height}" fill="url(#${p}back)"/><g transform="scale(${width/820} ${friezeHeight/500})"><g data-scene-depth="exterior" clip-path="url(#${glass})">${daySky(config,p)}</g>${rays}<g data-scene-depth="interior">${indoorTrim(config,p)}</g><g data-scene-depth="foreground">${foreground}</g></g>`;
}
function decorations(items,p,width,y){
 const decor=Array.isArray(items)?items:[];let result='';
 if(decor.includes('stones'))result+=`<g><ellipse cx="${width*.12}" cy="${y+7}" rx="19" ry="7" fill="#aaa994"/><ellipse cx="${width*.16}" cy="${y+5}" rx="12" ry="9" fill="#c5bba4"/></g>`;
 if(decor.includes('label'))result+=`<path d="M${width*.83} ${y-35}v40" stroke="#aa946c" stroke-width="4"/><rect x="${width*.83-33}" y="${y-58}" width="66" height="31" rx="4" fill="#e4d6b4"/><path d="M${width*.83-20} ${y-46}h40m-33 8h26" stroke="#b4a47b"/>`;
 if(decor.includes('tools'))result+=`<path d="M${width*.89} ${y-5}l30-28" stroke="#b1966f" stroke-width="6"/><path d="M${width*.89+27} ${y-31}l18-7 7 10-19 8Z" fill="#879c80"/>`;
 return result;
}

function windowsillEnvironment(options={}) {
 const config=sceneConfiguration(options);
 const customScene=config.scene!=='window'||config.outside!=='courtyard'||options.platform==='stone'||options.shelf!=='medium'||options.decor?.length;
 if(!customScene)return '';
 const p=`fk-sill-${++illustrationNumber}-`,width=820,height=500;
 const y=({high:366,low:433})[options.shelf]||400;
 const surface=options.platform==='stone'?'#989c90':'#af7856';
 const face=options.platform==='stone'?'#636f67':'#80523a';
 return `<svg class="sill-setting" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" xmlns="${svgNamespace}" aria-hidden="true">${atmosphere(config,p,width,height)}<path d="M0 ${y-3}h820v17H0Z" fill="${surface}"/><path d="M0 ${y+14}h820v${height-y}H0Z" fill="${face}"/>${decorations(options.decor,p,width,y)}</svg>`;
}

function gardenArt(options={}) {
 const p=`fk-scene-${++illustrationNumber}-`,width=820,height=500,config=sceneConfiguration(options);
 const fallbackPlants=[{id:'hero-lavender',speciesId:'lavender',growth:1},{id:'hero-monstera',speciesId:'monstera',growth:1},{id:'hero-daisy',speciesId:'daisy',growth:1}];
 const plants=Array.isArray(options.plants)&&options.plants.length?options.plants.slice(0,3):fallbackPlants;
 const frames=[[180,136,255,287],[355,42,340,383],[561,156,234,264]];
 const shelfLevel=safeChoice(options.shelf,['low','medium','high'],'medium');
 const shelfOffset={low:30,medium:0,high:-40}[shelfLevel],shelfY=420+shelfOffset,supportHeight=60-shelfOffset;
 const shelf=options.platform==='stone'?'#a6aea0':'#c7b18e';
 const pots=plants.map((plant,i)=>{
  const [x,y,w,h]=frames[i];
  return plantArt(plant.speciesId,{...options,...config,id:plant.id,growth:plant.growth,moisture:plant.moisture,variant:plant.lineageId||plant.id,pot:options.pot||['cream','clay','sage'][i],...options.appearance?.[plant.id]})
   .replace('<svg ',`<svg x="${x}" y="${y+shelfOffset}" width="${w}" height="${h}" `);
 }).join('');
 const sill=`<g class="wooden-sill" data-scene-depth="shelf" data-shelf-support="${supportHeight}"><path d="M170 ${shelfY-8}H779l11 8H160Z" fill="#e5d5ae"/><path d="M160 ${shelfY}H790v20H160Z" fill="${shelf}"/><path d="M170 ${shelfY+7}Q360 ${shelfY+3} 550 ${shelfY+8}T780 ${shelfY+6}M200 ${shelfY+14}Q460 ${shelfY+18} 740 ${shelfY+13}" stroke="#72583e" opacity=".16"/><path d="M180 ${shelfY+20}v${supportHeight}m585-${supportHeight}v${supportHeight}" stroke="${shelf}" stroke-width="18"/></g>`;
 const bee=config.light==='night'?'sleep':options.mood||'happy';
 return `<svg data-scene="${config.scene}" data-weather="${config.weather}" data-outside="${config.outside}" data-shelf="${shelfLevel}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="${svgNamespace}" aria-hidden="true">${atmosphere(config,p,width,height)}${sill}${pots}${decorations(options.decor,p,width,439+shelfOffset)}${beeArt('',bee).replace('<svg ','<svg x="664" y="62" width="77" height="70" ')}</svg>`;
}

function greenhouseArt(plants=[],options={}) {
 const specimens=Array.isArray(plants)?plants.slice(0,100):[];
 const columns=Math.min(5,Math.max(1,Math.floor(Number(options.columns)||3))),rows=Math.max(1,Math.ceil(specimens.length/columns));
 const shelfLevel=safeChoice(options.shelf,['low','medium','high'],'medium');
 const supportHeight={low:14,medium:28,high:70}[shelfLevel],shelfOffset=supportHeight-28;
 // Keep each plant's drawing and pot baseline the same size. The supports and
 // space between levels change, so height selection never changes plant growth.
 const width=1020,inset=56,cell=(width-inset*2)/columns,rowHeight=280+shelfOffset,artHeight=320,height=rows*rowHeight+100;
 const p=`fk-greenhouse-${++illustrationNumber}-`,shelf=options.platform==='stone'?'#a6aea0':'#c4ad88';
 const config=sceneConfiguration(options);
 const sideColor=config.light==='night'?'#425043':'#c5c8ac';
 let result=atmosphere(config,p,width,height);
 result+=`<g data-greenhouse-walls="panoramic" fill="${sideColor}"><path d="M0 0h55l15 84v${height-149}l-70 65Z" opacity=".57"/><path d="M1020 0h-55l-15 84v${height-149}l70 65Z" opacity=".72"/><path d="M5 ${height-8}L70 ${height-65}H950l65 57" stroke="#657963" stroke-width="2" fill="none" opacity=".42"/></g>`;
 for(let row=0;row<rows;row++){
  const shelfY=row*rowHeight+322;
   result+=`<g data-shelf-row="${row}" data-shelf-support="${supportHeight}"><path d="M69 ${shelfY-7}H951l21 7H48Z" fill="#dfcdac"/><path d="M48 ${shelfY}H972v15H48Z" fill="${shelf}"/><path d="M60 ${shelfY+15}v${supportHeight}m900-${supportHeight}v${supportHeight}" stroke="${shelf}" stroke-width="12"/></g>`;
 }
 result+=specimens.map((plant,index)=>{
   const x=inset+index%columns*cell,y=Math.floor(index/columns)*rowHeight+10,appearance=options.appearance?.[plant.id]||plant.appearance||{};
   return plantArt(plant.speciesId,{...options,...config,...appearance,id:plant.id,growth:plant.growth,moisture:plant.moisture,variant:plant.lineageId||plant.id}).replace('<svg ',`<svg x="${x}" y="${y}" width="${cell}" height="${artHeight}" `);
 }).join('');
 result+=decorations(options.decor,p,width,height-30);
 return `<svg data-greenhouse-count="${specimens.length}" data-scene="${config.scene}" data-weather="${config.weather}" data-outside="${config.outside}" data-shelf="${shelfLevel}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="${svgNamespace}" aria-hidden="true">${result}</svg>`;
}

function studyArt(speciesId,mode='leaf',{labels=true,comparison=false}={}) {
 if(mode==='profile'||mode==='macro')return plantArt(speciesId,{view:mode});
 const p=`fk-study-${++illustrationNumber}-`;
 let art=definitions(p,'cream')+'<rect width="520" height="340" rx="14" fill="#f2f3e7"/>';
 if(typeof notebookMarks==='function')art+=notebookMarks(520,340);
 const note=(x,y,text)=>`<text x="${x}" y="${y}" class="study-annotation-text" font-family="Arial, sans-serif" font-size="13" fill="#385643">${escapeAttribute(text)}</text>`;
 const callout=([text,labelX,labelY,joinX,anchorX,anchorY])=>
  `<g class="study-callout"><path d="M${labelX} ${labelY+6}H${joinX}L${anchorX} ${anchorY}" stroke="#55745c" stroke-width="1.3"/><circle cx="${anchorX}" cy="${anchorY}" r="2.6" fill="#385643" stroke="#f6f7ed" stroke-width="1"/>${note(labelX,labelY,text)}</g>`;
 let annotations;
 if(mode==='roots'){
  art+='<path d="M30 128H490v180H30Z" fill="#c6ad8d"/><path d="M30 128H490" stroke="#927a59" stroke-width="3"/><path d="M260 129V62" stroke="#719260" stroke-width="5"/>'+leaf(p,260,85,47,-53,'leaf',speciesId==='tulip'?.24:.8)+leaf(p,260,74,43,53,'light',speciesId==='tulip'?.24:.8);
  if(speciesId==='tulip')art+='<path d="M260 121C215 135 225 182 260 183C295 182 305 135 260 121Z" fill="#e0cca4"/><path d="M260 126Q243 150 260 179Q278 150 260 126" stroke="#b6976c" fill="none"/>';
  const aerial=speciesId==='orchid';
  for(let i=0;i<7;i++){const x=260+(i-3)*19,y=183+(i%3)*30;art+=`<path d="M260 ${speciesId==='tulip'?180:130}Q${x} 158 ${x} ${y}T${x+(i-3)*9} ${255+(i%2)*30}" stroke="${aerial?'#c2c7aa':'#ead8b8'}" stroke-width="${aerial?4:2.5}" fill="none"/>`;for(let j=0;j<3;j++)art+=`<path d="M${x} ${y+j*15}l${i%2?15:-15} 12" stroke="#ead8b8" stroke-width="1.2"/>`;}
  annotations=[
   ['Поверхность почвы',36,101,154,191,128],
   [aerial?'Корни с веламеном':'Боковые корни',360,220,349,306,207],
   [speciesId==='tulip'?'Луковица':'Тонкие корни',47,253,130,speciesId==='tulip'?248:215,speciesId==='tulip'?158:237],
  ];
 }else{
  if(speciesId==='monstera')art+=monsteraLeaf(p,259,283,214,0,'leaf');
  else if(speciesId==='fern')art+=`<g transform="translate(44 35) scale(1.35 .95)">${fern(p,1)}</g>`;
  else if(speciesId==='cactus')art+='<rect x="205" y="70" width="110" height="225" rx="53" fill="#87a77b"/>'+Array.from({length:9},(_,i)=>`<path d="M${226+i%3*28} ${100+Math.floor(i/3)*64}l8 9m-8 0 8-9m-4-4v17" stroke="#e8dfb1" stroke-width="2"/>`).join('');
  else art+=leaf(p,260,290,200,0,'leaf',['tulip','lavender','aloe'].includes(speciesId)?.35:.95);
  const narrow=['tulip','lavender','aloe'].includes(speciesId);
  annotations=[
   [speciesId==='cactus'?'Колючки':speciesId==='fern'?'Край вайи':'Край листа',365,121,352,speciesId==='cactus'?286:narrow?279:307,speciesId==='fern'?194:145],
   [speciesId==='cactus'?'Ареола':speciesId==='fern'?'Ось вайи':'Средняя жилка',31,197,120,speciesId==='cactus'?230:259,speciesId==='cactus'?169:191],
   [speciesId==='cactus'?'Стебель':'Основание',365,273,350,speciesId==='cactus'?295:259,274],
  ];
  if(comparison)art+='<path class="study-comparison-axis" d="M260 49v254" stroke="#f5f3d9" stroke-width="2.4" stroke-dasharray="5 5"/><path d="M260 49v254" stroke="#315748" stroke-width="1.1" stroke-dasharray="5 5"/>';
 }
 const title=mode==='roots'?'Условное строение корней':speciesId==='cactus'?'Стебель и ареолы кактуса':'Лист: форма и строение';
 if(labels)art+=note(32,32,title)+annotations.map(callout).join('');
 const description=labels?` aria-describedby="${p}description"`:'';
 return `<svg class="study-annotation" viewBox="0 0 520 340" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}"${description}>${labels?`<desc id="${p}description">${annotations.map(([text])=>escapeAttribute(text)).join('. ')}.</desc>`:''}${art}</svg>`;
}

/* Small original illustrations for the botanical interface. */
function notebookMarks(width,height){
 const right=width-21,bottom=height-18;
 return `<g data-notebook-marks="true" stroke="#858d70" opacity=".27" fill="none" stroke-linecap="round"><path d="M20 50q-1-20 2-27q14-1 37 1m${right-76} 0q14-2 31 1l-1 34M22 ${bottom-39}q-1 23 1 35l35 2m${right-76} 0q17 1 36-2q2-15 0-32" stroke-width=".8"/><path d="M27 48l5 1m-3-9 7 1m${width-75} ${height-143} 6-.8m-8 7 8-1" stroke-width=".7"/></g>`;
}
function brandMark({color='currentColor'}={}){
 const stroke=color==='currentColor'?color:safeHex(color,'#27483b');
 return `<svg class="flora-monochrome-mark" viewBox="0 0 64 64" xmlns="${svgNamespace}" aria-hidden="true" focusable="false"><g fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><circle cx="32" cy="32" r="29"/><path d="M32 52V29m0 15Q11 41 14 31q14 0 18 13m0 1q12-18 21-12q-9 13-21 12M31 29q-14-4-15-11q9-4 16 7q-5-12-1-17q9 3 4 18q7-11 17-9q-2 8-15 12"/><path d="M29 28q3 3 7 0"/></g></svg>`;
}
function botanicalOrnament({color='currentColor'}={}){
 const stroke=color==='currentColor'?color:safeHex(color,'#5f7757');
 return `<svg class="flora-ornament" viewBox="0 0 260 42" xmlns="${svgNamespace}" aria-hidden="true"><g fill="none" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 25q72 12 114-6h26q42 18 114 6"/><path d="M18 27Q29 13 54 18q-13-1-18-6q12-5 20 5q-10-10 1-14q10 6 5 14q7-12 15-8q4 8-10 11q14-5 20 3q-16 6-26-2q-26-9-43 6"/><path d="M84 22q5-12 19-9q-3 11-19 9m92 0q-5-12-19-9q3 11 19 9"/><path d="M255 25q-22-3-45-6m43 6q-4-7-13-11m5 7q-1-11-8-14m0 12q-1-11-9-15m0 12q-2-10-10-13m2 14q-9-7-17-5m24 7q-3 8-10 9m19-7q-3 9-11 13m19-10q0 9-7 12"/><path d="M130 22q-8-9-17-4q5 11 17 4q12 7 17-4q-9-5-17 4m0 1q-8-8 0-17q8 9 0 17m0 0q-7 9 0 15q7-6 0-15Z"/></g></svg>`;
}
function emptyState(kind='herbarium'){
 const drawings={
  herbarium:'<rect x="37" y="20" width="104" height="104" rx="6" fill="#f5edda" stroke="#ad9e7d"/><path d="M47 32H130V112H47Z" fill="none" stroke="#bba880" stroke-dasharray="3 3"/><path d="M85 99V48m0 24q-28 2-26-18q23 2 26 18m1 10q15-24 34-15q-13 15-34 15" stroke="#839873" stroke-width="1.5" fill="#cbd4aa"/><path d="M97 104h21m-21 4h26" stroke="#b6a381"/>',
  journal:'<path d="M87 123Q56 113 17 116V36Q54 29 87 43q35-14 72-7v80q-34-4-72 7Z" fill="#f4e9d0" stroke="#ad9e7d" stroke-width="1.4"/><path d="M87 43v80M31 59q22-2 40 4m-40 10q22-2 40 4m-41 10q23-2 40 4" stroke="#a7987a" fill="none"/><path d="M113 98q17-18 17-38q-18 12-17 38m2-9q10-10 14-27" stroke="#809270" fill="#bbcaa3" stroke-width="1.6"/>',
  exhibit:'<path d="M21 92H159l-11 17H34Z" fill="#d4bc95" stroke="#a99474" stroke-width="1.2"/><path d="M41 108v17m99-17v17" stroke="#baa17c" stroke-width="7"/><path d="M57 32H128V88H57Z" fill="#f8f1db" stroke="#ad9e7d" stroke-width="2"/><path d="M65 40h55v40H65Z" fill="none" stroke="#a5b393" stroke-dasharray="3 3"/><path d="M76 74l17-19l14 14l10-10" fill="none" stroke="#91a17e"/>',
 };
 const sketch=Object.hasOwn(drawings,kind)?kind:'herbarium';
 return `<svg class="botanical-empty-art" data-art-empty="${sketch}" viewBox="0 0 180 140" xmlns="${svgNamespace}" aria-hidden="true"><ellipse cx="90" cy="123" rx="68" ry="10" fill="#789070" opacity=".13"/>${drawings[sketch]}</svg>`;
}
function potTopView({shape='classic',pot='clay',customPot}={}){
 const stock=safeChoice(shape,['classic','tall','bowl'],'classic');
 const profile=validCustomPot(customPot);
 const width=profile?35+customPot.profile[0]*.6:{classic:60,tall:45,bowl:75}[stock];
 const c=profile?customPot.color:(Object.hasOwn(potColors,pot)?potColors[pot]:potColors.clay)[1];
 return `<svg class="pot-top-view" viewBox="0 0 180 112" xmlns="${svgNamespace}" role="img" aria-label="Горшок сверху" data-pot-top="${profile?'sculpted':stock}"><path d="M90 93V19M18 56h144" stroke="#8d9b83" stroke-opacity=".42" stroke-dasharray="2.5 4"/><ellipse cx="90" cy="56" rx="${width}" ry="${width*.42}" fill="${c}" stroke="#6e5b4a" stroke-opacity=".47" stroke-width="1.2"/><ellipse cx="90" cy="56" rx="${width-8}" ry="${(width-8)*.42}" fill="#806750"/><ellipse cx="90" cy="55" rx="${width-12}" ry="${(width-12)*.40}" fill="#655241"/><path d="M${90-width} 90H${90+width}m-${width*2} -4v8m${width*2} -8v8" stroke="#55725b" stroke-width="1.2" fill="none"/></svg>`;
}
function materialSamples(color){
 const tone=safeHex(color);
 const id=`fk-material-${++illustrationNumber}-`;
 const finishes=['Глина','Матовая глазурь','Глянцевая глазурь'];
 const textures=[
  '<g fill="#705244" opacity=".38"><circle cx="25" cy="28" r="1.4"/><circle cx="60" cy="47" r="1.2"/><circle cx="73" cy="37" r="1.5"/><circle cx="41" cy="61" r="1.1"/><circle cx="80" cy="56" r="1.2"/></g><path d="M26 38q25 3 57-1m-58 11q18 3 33 1" stroke="#eac1a1" fill="none" opacity=".38"/>',
  `<rect x="9" y="13" width="102" height="65" rx="10" fill="url(#${id}matte)"/>`,
  `<rect x="9" y="13" width="102" height="65" rx="10" fill="url(#${id}gloss)"/><path d="M25 25q0 17 4 31m3-31q0 14 3 20" stroke="#fff5d7" stroke-opacity=".62" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
 ];
 const tiles=finishes.map((finish,index)=>`<g data-finish="${index}" transform="translate(${index*120} 0)"><rect x="9" y="16" width="102" height="65" rx="11" fill="#324735" opacity=".16"/><rect x="9" y="13" width="102" height="65" rx="10" fill="${tone}"/>${textures[index]}<text x="60" y="102" text-anchor="middle" font-size="12" font-family="system-ui, sans-serif" fill="currentColor">${finish}</text></g>`).join('');
 return `<svg class="ceramic-material-samples" viewBox="0 0 360 116" xmlns="${svgNamespace}" role="img" aria-label="Один цвет на глине, матовой и глянцевой глазури"><defs><linearGradient id="${id}matte"><stop stop-color="#fff7ed" stop-opacity=".24"/><stop offset=".94" stop-color="#523b30" stop-opacity=".17"/></linearGradient><linearGradient id="${id}gloss"><stop stop-color="#fff7ed" stop-opacity=".16"/><stop offset=".21" stop-color="#fff5d9" stop-opacity=".53"/><stop offset=".34" stop-color="#fff8ef" stop-opacity=".07"/><stop offset="1" stop-color="#523b30" stop-opacity=".31"/></linearGradient></defs>${tiles}</svg>`;
}
function seedPacketArt(){
 return `<svg class="seed-packet-art" viewBox="0 0 200 148" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="105" cy="132" rx="79" ry="8" fill="#4d6340" opacity=".08"/><g transform="rotate(-12 64 74)"><rect x="25" y="21" width="79" height="109" rx="7" fill="#e9d9b9" stroke="#bca882"/><path d="M25 37h79M25 115h79" stroke="#c9b28b" stroke-dasharray="3 3"/><rect x="35" y="47" width="59" height="55" rx="25" fill="#f7f0de"/><path d="M65 95V63m0 17Q38 78 48 63Q61 62 65 80m0-8Q84 47 85 65Q81 76 65 78" stroke="#698568" fill="#b6c6a0" stroke-width="2"/><path d="M47 29h35" stroke="#8d9775" stroke-width="2"/></g><path d="M114 92h55l-7 31q-20 10-40 0Z" fill="#c3977c"/><ellipse cx="141" cy="92" rx="28" ry="6" fill="#e1b699"/><ellipse cx="141" cy="91" rx="21" ry="4" fill="#665441"/><path d="M141 90V69q-19 4-20-13q15-4 20 13q4-20 19-17q3 14-19 17" fill="#9ab48a" stroke="#628160" stroke-width="2"/><g fill="#b48f54"><ellipse cx="99" cy="134" rx="4" ry="2"/><ellipse cx="110" cy="137" rx="3" ry="2"/></g></svg>`;
}
function careBlossomArt(open=false){
 return `<svg class="care-blossom ${open?'is-open':''}" data-care-complete="${open}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M40 68V39M40 58Q16 61 24 45Q37 46 40 58M40 55Q61 55 59 42Q46 41 40 55" fill="#9bad7a" stroke="#6f8d61" stroke-width="2"/>${open?Array.from({length:8},(_,i)=>`<ellipse class="care-petal" cx="40" cy="22" rx="8" ry="14" transform="rotate(${i*45} 40 35)" fill="#f2dfb1" stroke="#d9bc79" stroke-width=".7"/>`).join('')+'<circle cx="40" cy="35" r="8" fill="#be8f44"/>':'<path d="M40 42C20 32 29 19 40 13C54 21 59 34 40 42Z" fill="#a8b68b"/><path d="M40 40V20" stroke="#6d8a5a"/>'}</svg>`;
}

 return Object.freeze({
  plantArt,hasFlowerProfile,customPotSurface,customPotRim,potTopView,materialSamples,beeArt,gardenArt,greenhouseArt,windowsillEnvironment,
  studyArt,plantVisualStage,brandMark,botanicalOrnament,emptyState,seedPacketArt,careBlossomArt,
 });
})();
