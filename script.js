// ===== MATTER.JS ALIASES =====
const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

const gameContainer = document.getElementById('canvas-container');
const scoreValueEl  = document.getElementById('score-value');
const optionsContainer = document.getElementById('options-container');
const popupContainer   = document.getElementById('popup-container');

// ===== AUDIO =====
let audioCtx = null;
function playSound(freq, type, dur) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq*1.4, audioCtx.currentTime + dur*0.5);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + dur);
    } catch(e) {}
}
function playSuccess() { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playSound(f,'triangle',0.1),i*80)); }
function playMerge()   { playSound(420,'sine',0.12); }
function playError()   { playSound(160,'sawtooth',0.18); }
function playChest()   { [300,400,600,900,1200].forEach((f,i)=>setTimeout(()=>playSound(f,'square',0.08),i*100)); }
function playHint()    { playSound(880,'sine',0.08); setTimeout(()=>playSound(660,'sine',0.08),100); }

// ===== SEQ & FRUIT DATA =====
const SEQ = ['1/9','1/8','1','1/3','5','10','15','20','25','30','40','50','60','2/3','75','80','90','100'];
const FRUIT_DATA = {
    '1/9':{ emoji:'🫐', color:'#7c4dff', leaf:'🌿' },
    '1/8':{ emoji:'🍇', color:'#9c27b0', leaf:'🍃' },
    '1':  { emoji:'🍓', color:'#e91e63', leaf:'🍃' },
    '1/3':{ emoji:'🍑', color:'#ff7043', leaf:'🌿' },
    '5':  { emoji:'🍊', color:'#ff9800', leaf:'🍃' },
    '10': { emoji:'🍋', color:'#fdd835', leaf:'🌱' },
    '15': { emoji:'🍏', color:'#66bb6a', leaf:'🍃' },
    '20': { emoji:'🍐', color:'#aed581', leaf:'🌿' },
    '25': { emoji:'🫒', color:'#26c6da', leaf:'🍃' },
    '30': { emoji:'🍒', color:'#f06292', leaf:'🍃' },
    '40': { emoji:'🥝', color:'#8bc34a', leaf:'🌿' },
    '50': { emoji:'🍉', color:'#ef5350', leaf:'🌱' },
    '60': { emoji:'🥭', color:'#ffa726', leaf:'🍃' },
    '2/3':{ emoji:'🍍', color:'#ffee58', leaf:'🌿' },
    '75': { emoji:'🍌', color:'#fff176', leaf:'🌱' },
    '80': { emoji:'🍎', color:'#e53935', leaf:'🍃' },
    '90': { emoji:'🫒', color:'#558b2f', leaf:'🍃' },
    '100':{ emoji:'🍯', color:'#ffd700', leaf:'✨' }
};
function getFD(val)    { return FRUIT_DATA[val] || { emoji:'🍭', color:'#ff80ab', leaf:'🌸' }; }
function getColor(val) { return getFD(val).color; }
function getRadius(val){ const i=SEQ.indexOf(val); return i<0?22:22+i*3; } // Smaller than before

// ===== COLOR HELPERS =====
function shadeColor(hex, pct) {
    let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    r=Math.min(255,Math.max(0,r+Math.round(r*pct/100)));
    g=Math.min(255,Math.max(0,g+Math.round(g*pct/100)));
    b=Math.min(255,Math.max(0,b+Math.round(b*pct/100)));
    return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function lighten(hex, a) {
    let r=parseInt(hex.slice(1,3),16)+a,g=parseInt(hex.slice(3,5),16)+a,b=parseInt(hex.slice(5,7),16)+a;
    return '#'+[r,g,b].map(v=>Math.min(255,v).toString(16).padStart(2,'0')).join('');
}

// ===== REWARDS — types: jewelry, vacation, funny, tech, food, normal =====
const REWARDS = [
    // --- Ronit Yam Jewelry ---
    { id:'ry_necklace',  emoji:'🐚', imageFile:'assets/rewards/necklace.png',  type:'jewelry',  title:'תכשיט יוקרתי!',      name:'שרשרת צדף של רונית ים',          price:1000, story:'הצדף הזה שמע פעם את כל הסודות של הים, אבל הוא מבטיח לא לספר אם תענדי אותו יפה.' },
    { id:'ry_bracelet',  emoji:'📿', imageFile:'assets/rewards/bracelet.png',  type:'jewelry',  title:'תכשיט יוקרתי!',      name:'צמיד חרוזי ים של רונית ים',      price:800,  story:'כל חרוז כאן נצבע בנשיקה של דג זהב (אל תגלי לאף אחד).'  },
    { id:'ry_ring',      emoji:'💍', imageFile:'assets/rewards/ring.png',      type:'jewelry',  title:'טבעת יוקרתית!',      name:'טבעת כסף 925 עם ספיר ים',       price:1800, story:'הטבעת הזו כל כך נוצצת שהיא יכולה להחליף את הפנס של האייפון שלך.' },
    { id:'ry_earrings',  emoji:'💎', imageFile:'assets/rewards/earrings.png',  type:'jewelry',  title:'עגילים מהמם!',       name:'עגילי ים מרונית ים',               price:1200, story:'כשאת עונדת אותם, את יכולה לשמוע את הגלים אפילו באמצע רחוב הרצל.' },
    { id:'charm',        emoji:'🐚', imageFile:'assets/rewards/anchor.png',    type:'jewelry',  title:'תכשיט שייך לך!',   name:'קסם צדף — תליון צדף',                     price:400,  story:'הקסם הזה מבטיח שהמפתחות שלך לעולם לא יטבעו.'  },
    { id:'charm2',       emoji:'⚓', imageFile:'assets/rewards/anchor.png',    type:'jewelry',  title:'בייבי קיוט!',      name:'תכשיט עוגן כסף',                 price:550,  story:'עוגן קטן שיזכיר לך שתמיד יש לאן לחזור הביתה.'                 },
    
    // --- Tech ---
    { id:'airpods',      emoji:'🎧', imageFile:'assets/rewards/airpods.png',   type:'tech',     title:'Amazon Prime!',   name:'AirPods Pro 2nd gen',  price:5000, story:'ניסית להפעיל ביטול רעשים, פתאום הכל היה שקט כל כך.' },
    { id:'iphone',       emoji:'📱', imageFile:'assets/rewards/iphone.png',    type:'tech',     title:'סלולרי חדש!',     name:'iPhone 16 Pro',      price:12000, story:'האייפון הזה כל כך חכם שהוא כבר פתר בעצמו את השאלה הבאה.' },

    // --- Vacation ---
    { id:'eilat',        emoji:'🏖️', imageFile:'assets/rewards/eilat.png',     type:'vacation', title:'חופשה באילת!!',   name:'טיסה לאילת + לילה במלון',          price:5000, story:'אילת זה החיים... ארטיק מסטיק... זה החיים.. ' },
    { id:'paris',        emoji:'🗼', imageFile:'assets/rewards/paris.png',     type:'vacation', title:'פריז מחכה לך!',   name:'כרטיס טיסה לפריז',        price:8000, story:'פריז היא עיר האורות, ואתה תהיה הכי זוהרת שם.' },
    { id:'spa',          emoji:'🛁', imageFile:'assets/rewards/spa.png',       type:'vacation', title:'יום כיף!',         name:'יום ספא מפנק',  price:2000, story:'עיסוי שישחרר לך גם את המחשבות על מבחנים.' },

    // --- Funny / Experiences ---
    { id:'grandmaRY',    emoji:'👵', imageFile:'assets/rewards/grandma.png',   type:'funny',    title:'סבתא של רונית!',  name:'בילוי מלא עם סבתא של רונית', price:100,  story:'עוגה ביתית וסיפורים על איך פעם אבטיחים היו מרובעים.'  },
    { id:'konik_tour',   emoji:'🏘️', imageFile:'assets/rewards/konik.png',     type:'funny',    title:'סיור אקסלוסיבי!',  name:'סיור עם רן קוניק', price:250,  story:'קוניק מבטיח להראות לך איפה בדיוק המדרכה מחליפה צבע.'  },
    { id:'poop_week',    emoji:'💩', imageFile:'assets/rewards/poop_service.png', type:'funny', title:'שירות לעיר!',     name:'שבוע איסוף קקי בעיר',       price:50,   story:'העיר מודה לך על כל שקית ושקית.'       },
    { id:'post_office',  emoji:'✉️', imageFile:'assets/rewards/post_office.png', type:'funny', title:'תור VIP!',       name:'תור מקוצר בדואר ישראל',    price:40,   story:'הזמן עובר בכיף כשאת יודעת שיש לך רק 120 דקות לחכות.'    },
    { id:'korazin',      emoji:'🚌', imageFile:'assets/rewards/korazin.png',   type:'funny',    title:'נסיעת VIP!',     name:'כרטיס חינם לסיבוב בכורזין', price:45,   story:'הנהג שאל אם אתה יורד בפינה, אמרת לו "לא, אני בסיבוב של החיים שלי!"'   },
    { id:'monopoly',    emoji:'💸', imageFile:'assets/rewards/monopoly.png',  type:'funny',    title:'עושר מיידי!',    name:'1000 ש"ח של מונופול', price:10,   story:'ניסית לשלם עם זה במכולת, המוכר שאל אם אתה מחפש את דרך יפו.'   },
    { id:'scooter',      emoji:'🛴', imageFile:'assets/rewards/scooter.png',   type:'funny',    title:'נהג חדש!',       name:'שיעור נהיגה על קורקינט',    price:150,  story:'הרוח בשערות, הברקסים לא עובדים, והחיוך בשמיים.'    },
    { id:'sticker1',     emoji:'🌊', imageFile:'assets/rewards/sticker_waves.png', type:'normal', title:'מדבקת גלים!',     name:'מדבקת גלים של רונית ים',              price:200,  story:'מדביקים את זה על הלפטופ ופתאום מרגישים בסיני.'              },
];

const TEASE_MSGS = [
    '🎁 פרס שווה במיוחד!',
    '🏖️ האם זו חופשה באילת?',
    '💎 תכשיט יוקרתי מחכה לך...',
    '✨ הפתעה שתשגע אותך!',
    '🌊 ריח הים בא מהתיבה...',
    '🎊 הפתעה גדולה! תלחצ/י!',
    '👀 מה יש בפנים?! לחץ!',
    '🏆 הצלחת! הפרס מחכה לך!',
    '🌴 אולי זה כרטיס לחופשה?',
    '💰 אוצר! לחץ מהר!',
    '🎤 אולי VIP לאמן אהוב?',
    '🌸 תכשיט מחכה לאצבעותייך',
];

const AUTO_REWARDS = [
    { pts:400,   id:'grandmaRY' },
    { pts:800,   id:'ry_necklace' },
    { pts:2000,  id:'charm'     },
    { pts:4000,  id:'ry_bracelet' },
    { pts:8000,  id:'ry_ring'  },
];

// ===== PRAISE =====
const PRAISE = [
    {text:'אלופה! 🏆', color:'#ffd700'}, {text:'כל הכבוד! ⭐',color:'#ff6b6b'},
    {text:'מדהים! 💥', color:'#ff9ff3'}, {text:'פצצה! 💣',    color:'#ff9800'},
    {text:'גאון! 🧠',  color:'#69f0ae'}, {text:'מושלם! ✨',   color:'#26c6da'},
    {text:'אדיר! 🔥',  color:'#ef5350'}, {text:'וואו! 🤯',    color:'#ce93d8'},
    {text:'מנצח! 🥇',  color:'#ffd740'}, {text:'ברכות! 🎈',   color:'#fff176'},
];

const NAMES  = ['אלינור','אביב','אביבוש','מאיה','מוחמד','שרית המורה','גילגול','מכלוף',
    "מייקל ג'קסון",'הרב רבי רביהו','נועה קירל','אייל גולן',"בוז'י הרצוג",'עומר אדם','ברי סחרוף'];
const ITEMS  = ['חולצה','שמלה','נעלי ספורט','תיק','שרשרת','מגן טלפון',"ג'ינס",'מגבעת','ספר','עגילים'];
const SHOPS  = ['רונית ים','קסטרו','זארה','H&M','מנגו','פוקס','MAX','קפיטשינו'];
const PLACES = ['כיתה','חוג ריקוד','קבוצת כדורסל','מסיבת יומולדת','ערב ספורט'];

function pick(a)  { return a[Math.floor(Math.random()*a.length)]; }

// ===== PRE-VALIDATED POOLS =====
const MathEps = 0.001;
// Convert string values like "1/3" or "25.5" or "100" to valid number for math
function parseSeq(s) {
    if(s.includes('/')){
        const p=s.split('/');
        return (Number(p[0])/Number(p[1]))*100;
    }
    return Number(s);
}

const POOL_A = (() => {
    const out=[];
    [1,5,10,15,20,25,30,40,50,60,75,80,90].forEach(p=>[20,40,50,60,80,100,150,200,300,400].forEach(b=>{
        const exact = (p/100)*b; 
        const exact2Dec = Number(exact.toFixed(2));
        const strVal = Number.isInteger(exact2Dec) ? exact2Dec.toString() : exact2Dec.toString();
        if(SEQ.includes(strVal) || SEQ.some(s=>Math.abs(parseSeq(s)-exact2Dec)<MathEps)) {
            const matchedSeq = SEQ.find(s=>Math.abs(parseSeq(s)-exact2Dec)<MathEps) || strVal;
            out.push({p,b,a:matchedSeq});
        }
    })); return out;
})();

const POOL_B = (() => {
    const out=[];
    [10,20,25,30,40,50,60,75,80].forEach(p=>[20,40,50,80,100,120,150,200,300,400].forEach(b=>{
        const exact = (1-p/100)*b; 
        const exact2Dec = Number(exact.toFixed(2));
        const strVal = exact2Dec.toString();
        if(SEQ.includes(strVal) || SEQ.some(s=>Math.abs(parseSeq(s)-exact2Dec)<MathEps)) {
            const matchedSeq = SEQ.find(s=>Math.abs(parseSeq(s)-exact2Dec)<MathEps) || strVal;
            out.push({p,b,a:matchedSeq});
        }
    })); return out;
})();

const POOL_E = (() => {
    const out=[];
    [{t:'1/2',v:0.5},{t:'1/3',v:1/3},{t:'2/3',v:2/3},{t:'1/4',v:0.25},
     {t:'3/4',v:0.75},{t:'1/5',v:0.2},{t:'1/8',v:0.125},{t:'1/9',v:1/9}]
    .forEach(f=>[20,30,40,50,60,80,90,100,120,150,200].forEach(b=>{
        const exact = f.v*b;
        const exact2Dec = Number(exact.toFixed(2));
        const strVal = exact2Dec.toString();
        if(SEQ.includes(strVal) || SEQ.some(s=>Math.abs(parseSeq(s)-exact2Dec)<MathEps)) {
            const matchedSeq = SEQ.find(s=>Math.abs(parseSeq(s)-exact2Dec)<MathEps) || strVal;
            out.push({t:f.t,b,a:matchedSeq});
        }
    })); return out;
})();

// Pool: answer is the ORIGINAL price before P% discount
const POOL_REVERSE = (() => {
    const out=[];
    [10,20,25,30,40,50,60,75,80].forEach(p=>[
        5,10,15,20,25,30,40,50,60,75,80,100
    ].forEach(orig=>{
        const exact = orig*(1-p/100); 
        const exact2Dec = Number(exact.toFixed(2));
        const strVal = exact2Dec.toString();
        if(SEQ.some(s=>Math.abs(parseSeq(s)-exact2Dec)<MathEps)) {
            const matchedSeq = SEQ.find(s=>Math.abs(parseSeq(s)-exact2Dec)<MathEps);
            out.push({p,orig,newPr:matchedSeq});
        }
    })); return out;
})();

// Pool: answer is the NEW value after P% increase
const POOL_INCREASE = (() => {
    const out=[];
    [5,10,15,20,25,30,40,50,60,75,80,100].forEach(p=>[
        1,5,10,15,20,25,30,40,50,60,75,80,100
    ].forEach(b=>{
        const exact = b*(1+p/100); 
        const exact2Dec = Number(exact.toFixed(2));
        if(SEQ.some(s=>Math.abs(parseSeq(s)-exact2Dec)<MathEps)) {
            const matchedSeq = SEQ.find(s=>Math.abs(parseSeq(s)-exact2Dec)<MathEps);
            out.push({p,b,a:matchedSeq});
        }
    })); return out;
})();

let currentQuestion = null;
let selectedOptionValue = null;

function generateQuestion() {
    const kind = Math.floor(Math.random()*10); // 10 question types total
    let text, ans, hint;

    if (kind===0 && POOL_A.length) {
        const {p,b,a}=pick(POOL_A); ans=a.toString();
        const forms=[
            `כמה הם ${p}% מתוך ${b}?`,
            `מה הוא ${p}% מ-${b}?`,
            `חשב${Math.random()>.5?'י':''}: ${p}% מתוך ${b}`,
        ];
        text=pick(forms);
        hint=`רמז: ${p}% פירושו ${p} חלקי 100. כלומר: ${b} ÷ 100 × ${p}`;

    } else if (kind===1 && POOL_E.length) {
        const {t,b,a}=pick(POOL_E); ans=a.toString();
        text=`כמה זה ${t} מתוך ${b}?`;
        const parts=t.split('/');
        if(parts.length===2) hint=`רמז: כדי למצוא ${t} מ-${b}, חלק ${b} ב-${parts[1]} ואז כפול ב-${parts[0]}`;
        else hint=`רמז: ${t} מ-${b}. חשב בשלבים`;

    } else if (kind===2 && POOL_B.length) {
        const {p,b,a}=pick(POOL_B); ans=a.toString();
        const name=pick(NAMES),item=pick(ITEMS),shop=pick(SHOPS);
        text=`${name} קנתה ${item} ב-${b}₪ ב${shop} וקיבלה ${p}% הנחה. כמה שקלים שילמה?`;
        hint=`רמז: ההנחה היא ${p}%. כלומר ${name.split(' ')[0]} שילמה ${100-p}% מהמחיר המקורי`;

    } else if (kind===3 && POOL_A.length) {
        const {p,b,a}=pick(POOL_A); ans=a.toString();
        const name=pick(NAMES),item=pick(ITEMS),shop=pick(SHOPS);
        text=`${name} קנתה ${item} ב-${b}₪ ב${shop} וקיבלה ${p}% הנחה. כמה שקלים הנחה קיבלה?`;
        hint=`רמז: כמה זה ${p}% מ-${b}? זה שווה לסכום ההנחה בשקלים`;

    } else if (kind===4 && POOL_B.length) {
        // BUG FIX: p = percent REMOVED, a = what STAYS = b*(1-p/100)
        // Question: "p% absent, how many stayed?"
        const {p,b,a}=pick(POOL_B); ans=a.toString();
        const place=pick(PLACES);
        const sc=[
            `ב${place} היו ${b} ילדים. ${p}% מהם לא הגיעו. כמה ילדים הגיעו?`,
            `ב${place} היו ${b} תלמידים. ${p}% מהם נעדרו. כמה נשארו?`,
            `בחוג ${pick(['ריקוד','ספורט','מוזיקה'])} היו ${b} ילדים. ${p}% נעדרו. כמה הגיעו?`,
        ];
        text=pick(sc);
        hint=`רמז: אם ${p}% לא הגיעו, אז ${100-p}% הגיעו. חשב ${100-p}% מ-${b}`;

    } else if (kind===5 && POOL_A.length) {
        const {p,b,a}=pick(POOL_A); ans=a.toString();
        const place=pick(PLACES);
        const sc=[
            `ב${place} יש ${b} ילדים. ${p}% מהם ילדות. כמה ילדות יש?`,
            `בקבוצה יש ${b} חברים. ${p}% קיבלו מדליה. כמה קיבלו?`,
        ];
        text=pick(sc);
        hint=`רמז: חשב ${p}% מ-${b}. זכור: ${p}% = ${p} חלקי 100`;

    } else if (kind===6 && POOL_B.length) {
        // "מה המספר/סכום שקטן ב-P%..." — decrease-from phrasing
        const {p,b,a}=pick(POOL_B); ans=a.toString();
        const items2=['אבטיח','טלפון','ספר','ציון','משכורת','כדור','מחשב'];
        const sc=[
            `מה המספר שקטן ב-${p}% מ-${b}?`,
            `${pick(items2)} עלה ${b}₪. מחירו הוזל ב-${p}%. מה המחיר החדש?`,
        ];
        text=pick(sc);
        hint=`רמז: "קטן ב-${p}%" אומר שנשאר ${100-p}% מ-${b}. חשב ${100-p}% מ-${b}`;

    } else if (kind===7 && POOL_REVERSE.length) {
        // Reverse: given discounted price, find original
        const {p,orig,newPr}=pick(POOL_REVERSE); ans=orig.toString();
        const items2=['טלפון','מחשב נייד','שמלה','נעלי ספורט','שרשרת','תיק','אוזניות'];
        const item=pick(items2);
        const sc=[
            `מחיר ${item} לאחר הוזלה של ${p}% הוא ${newPr}₪. מה היה המחיר לפני ההוזלה?`,
            `${item} עולה כעת ${newPr}₪ — зна${p}% פחות מהמחיר המקורי. מה המחיר המקורי?`,
            `${item} הוזל ב-${p}%, והמחיר החדש הוא ${newPr}₪. כמה עלה ${item} לפני ההוזלה?`,
        ];
        text=pick(sc);
        hint=`רמז: המחיר החדש (${newPr}₪) הוא ${100-p}% מהמחיר המקורי. חלק ${newPr} ב-${100-p} ואז כפול ב-100`;

    } else if (kind===8 && POOL_INCREASE.length) {
        // Increase by P%
        const {p,b,a}=pick(POOL_INCREASE); ans=a.toString();
        const nameInc=pick(NAMES);
        const sc=[
            `${nameInc} מרוויחה ${b}₪ לחודש. לרגל קידום שכרה עלה ב-${p}%. מה המשכורת החדשה?`,
            `מחיר ${pick(['אבטיח','ביצים','לחם','בנזין'])} עלה ב-${p}%. לפני העלייה עמד המחיר על ${b}₪. מה המחיר החדש?`,
            `${nameInc} יצאה לטייל. מחיר כרטיס המקורי ${b}₪ ועלה ב-${p}%. כמה שילמה?`,
        ];
        text=pick(sc);
        hint=`רמז: "עלה ב-${p}%" אומר שעכשיו יש ${100+p}% מהסכום המקורי. חשב ${100+p}% מ-${b}`;

    } else {
        const {p,b,a}=pick(POOL_A)||{p:10,b:100,a:10}; ans=a.toString();
        text=`כמה זה ${p}% מ-${b}?`;
        hint=`רמז: פרק לחלקים: ${b} ÷ 100 = ?, ואז × ${p}`;
    }

    let opts=[ans];
    while(opts.length<3){
        const shift = pick([-10, -5, -2.5, -1.25, 1.25, 2.5, 5, 10]);
        let wrNum = parseSeq(ans) + shift;
        if(wrNum <= 0) wrNum = parseSeq(ans) + 12.5;
        
        let wr = Number.isInteger(wrNum) ? wrNum.toString() : Number(wrNum.toFixed(2)).toString();
        // check if there's an exact fraction string to use instead
        const matchedSeq = SEQ.find(s=>Math.abs(parseSeq(s)-wrNum)<MathEps) || wr;
        if(!opts.includes(matchedSeq)) opts.push(matchedSeq);
    }
    opts.sort(()=>Math.random()-0.5);
    currentQuestion={text,answer:ans,options:opts,hint};
    document.getElementById('question-text').innerText=text;
    renderOptions();
}

function renderOptions() {
    optionsContainer.innerHTML='';
    currentQuestion.options.forEach(opt=>{
        const fd=getFD(opt);
        const div=document.createElement('div');
        div.className='drop-option';
        div.style.background=`radial-gradient(circle at 35% 30%, #fff 0%, ${fd.color} 45%, ${shadeColor(fd.color,-35)} 100%)`;
        div.style.boxShadow=`inset -7px -7px 12px rgba(0,0,0,0.4), inset 4px 4px 12px rgba(255,255,255,0.65), 0 7px 16px rgba(0,0,0,0.45)`;
        div.innerHTML=`<div class="fruit-emoji">${fd.emoji}</div><div class="fruit-value">${opt}</div>`;
        div.dataset.val=opt;
        div.addEventListener('click',e=>{
            e.stopPropagation();
            document.querySelectorAll('.drop-option').forEach(el=>el.classList.remove('selected'));
            div.classList.add('selected'); selectedOptionValue=opt;
        });
        div.addEventListener('pointerdown', startBubbleDrag);
        optionsContainer.appendChild(div);
    });
    if(optionsContainer.children.length>0) optionsContainer.children[0].click();
}

// ===== DRAG BUBBLE =====
let dragActive=false, activeDragDiv=null, activeDragVal=null;

function startBubbleDrag(e) {
    if(isGameOver||isGenerating)return;
    e.preventDefault(); e.stopPropagation();
    const div=e.currentTarget, val=div.dataset.val;
    document.querySelectorAll('.drop-option').forEach(el=>el.classList.remove('selected'));
    div.classList.add('selected'); selectedOptionValue=val;
    dragActive=true; activeDragDiv=div; activeDragVal=val;
    div.setPointerCapture(e.pointerId);
    const rect=div.getBoundingClientRect();
    div.style.position='fixed'; div.style.left=(e.clientX-rect.width/2)+'px';
    div.style.top=(e.clientY-rect.height/2)+'px'; div.style.zIndex='999';
    div.style.transform='scale(1.2)'; div.style.animation='selectedPulse 0.55s infinite alternate';
    div.style.transition='none'; div.style.touchAction='none';
    div.addEventListener('pointermove',onBubbleMove);
    div.addEventListener('pointerup',onBubbleUp);
    div.addEventListener('pointercancel',onBubbleUp);
}

function onBubbleMove(e) {
    if(!dragActive||!activeDragDiv)return;
    const w=activeDragDiv.offsetWidth,h=activeDragDiv.offsetHeight;
    activeDragDiv.style.left=(e.clientX-w/2)+'px';
    
    const optsRect = document.getElementById('options-container').getBoundingClientRect();
    const minY = optsRect.top - 20;
    const maxY = optsRect.bottom + 90; // "one row below top row"
    const limitedY = Math.max(minY, Math.min(e.clientY, maxY));
    
    activeDragDiv.style.top=(limitedY-h/2)+'px';
}

function onBubbleUp(e) {
    if(!dragActive||!activeDragDiv)return;
    const div=activeDragDiv,val=activeDragVal;
    
    const rect = div.getBoundingClientRect();
    const dropX = rect.left + rect.width/2;
    const dropY = rect.top + rect.height/2;

    div.removeEventListener('pointermove',onBubbleMove);
    div.removeEventListener('pointerup',onBubbleUp);
    div.removeEventListener('pointercancel',onBubbleUp);
    div.style.position=''; div.style.left=''; div.style.top=''; div.style.zIndex='';
    div.style.transform=''; div.style.animation=''; div.style.transition='';
    div.classList.remove('selected');
    dragActive=false; activeDragDiv=null; activeDragVal=null;

    const canvas=gameContainer.querySelector('canvas');
    if(!canvas||isGameOver||isGenerating)return;
    
    const optionsBottom = document.getElementById('options-container').getBoundingClientRect().bottom;
    if(dropY > optionsBottom + 5){
        const canvasRect=canvas.getBoundingClientRect();
        const cx=dropX-canvasRect.left;
        const cy=dropY-canvasRect.top;
        const r=getRadius(val);
        const safeX=Math.max(r+5,Math.min(cx,canvasRect.width-r-5));
        const safeY=Math.max(cy, r+5);
        spawnDropped(safeX,safeY,val); selectedOptionValue=null;
    }
}

// ===== HINT SYSTEM =====
function showHint() {
    if(!currentQuestion||!currentQuestion.hint)return;
    if(currentScore<50){ showQuickMsg('אין מספיק ניקוד לרמז! 😅'); return; }
    updateScore(-50);
    playHint();
    // Show hint as a timed overlay below the question
    const existing=document.getElementById('hint-popup');
    if(existing)existing.remove();
    const el=document.createElement('div');
    el.id='hint-popup'; el.className='hint-popup';
    el.innerHTML=`<span style="font-size:1.2rem;">💡</span> ${currentQuestion.hint}`;
    document.getElementById('ui-layer').appendChild(el);
    setTimeout(()=>{ if(el.parentNode)el.remove(); },6000);
}

// ===== PHYSICS =====
let engine, render, runner;
let currentScore=0, currentPoints=0;  // session-only, never persisted
let isGameOver=false, isGenerating=false;
let particles=[];
let purchasedRewards=[];  // reset every game

function initGame() {
    isGameOver=false; currentScore=0; currentPoints=0;
    purchasedRewards=[]; particles=[];
    dragActive=false; activeDragDiv=null;
    updateScore(0);
    // Clear hint if visible
    const h=document.getElementById('hint-popup');
    if(h)h.remove();

    engine=Engine.create({gravity:{y:2}});
    const w=gameContainer.clientWidth,h2=gameContainer.clientHeight;
    render=Render.create({
        element:gameContainer,engine,
        options:{width:w,height:h2,wireframes:false,background:'transparent'}
    });
    const wOpts={isStatic:true,restitution:0,render:{visible:false},friction:0.3};
    Composite.add(engine.world,[
        Bodies.rectangle(w/2,h2+50,w*2,100,wOpts),
        Bodies.rectangle(-30,h2/2,60,h2*2,wOpts),
        Bodies.rectangle(w+30,h2/2,60,h2*2,wOpts),
        Bodies.rectangle(w/2,85,w,10,{isStatic:true,isSensor:true,label:'topSensor',render:{visible:false}})
    ]);
    Events.on(render,'afterRender',renderCustom);
    setupCollisions();
    Render.run(render);
    runner=Runner.create(); Runner.run(runner,engine);
    generateQuestion();
    setTimeout(()=>{
        spawnFruit(w*0.25,h2-150,SEQ[4],false);
        spawnFruit(w*0.5, h2-150,SEQ[8],false);
        spawnFruit(w*0.75,h2-150,SEQ[11],false);
    },700);
}

// ===== CANVAS RENDER =====
function renderCustom() {
    const ctx=render.context;
    for(const body of Composite.allBodies(engine.world)){
        if(body.label!=='fruit')continue;
        const val=body.textValue,r=body.circleRadius,color=getColor(val),fd=getFD(val);
        ctx.save();
        ctx.translate(body.position.x,body.position.y);
        ctx.rotate(body.angle);

        // Draw 3D Sphere Background with Volume and High Contrast Stroke
        ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=15; ctx.shadowOffsetX=4; ctx.shadowOffsetY=6;
        
        // High Contrast Border to ensure visibility on dark backgrounds
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        const grad = ctx.createRadialGradient(-r*0.35, -r*0.35, r*0.1, 0, 0, r);
        grad.addColorStop(0, lighten(color, 100)); // Very bright specular highlight
        grad.addColorStop(0.3, color);
        grad.addColorStop(0.8, shadeColor(color, -60)); // deep core shadow
        grad.addColorStop(1, shadeColor(color, -80)); // extreme edge shadow
        ctx.fillStyle = grad;
        ctx.fill();

        // Gloss Overlay - made more opaque
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.ellipse(-r*0.3, -r*0.3, r*0.4, r*0.2, Math.PI*0.25, 0, 2*Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fill();

        // Draw the emoji slightly up for depth
        ctx.font=`${Math.max(20,r*1.1)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(fd.emoji, 0, -r*0.1);

        // Animated facial expressions!
        const t = Date.now() + body.id * 888; // Unique random offset per fruit
        let isBlink = (t % 4500 < 180);
        let isSurprised = body.isMerging || (Math.abs(body.velocity.y) > 6);
        let isHappy = (t % 8000 < 3500); // 3.5 seconds happy, 4.5 seconds neutral

        const eyeX = r * 0.22, eyeY = r * 0.08;
        ctx.fillStyle = 'rgba(30,20,5,0.85)';
        ctx.strokeStyle = 'rgba(30,20,5,0.85)';
        
        // Eyes
        if (isBlink) { // Drawn V V
            ctx.lineWidth = Math.max(2.5, r * 0.08); // Thicker line
            ctx.lineCap='round'; ctx.lineJoin='round';
            [[-eyeX, eyeY], [eyeX, eyeY]].forEach(([ex, ey]) => {
                ctx.beginPath();
                ctx.moveTo(ex - r*.12, ey);
                ctx.lineTo(ex, ey + r*.1);
                ctx.lineTo(ex + r*.12, ey);
                ctx.stroke();
            });
        } else if (isSurprised) { // Wide O O
            const eyeR = Math.max(5, r * 0.18); // Bigger surprised eyes
            [[-eyeX, eyeY], [eyeX, eyeY]].forEach(([ex, ey]) => {
                ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'white';
                ctx.beginPath(); ctx.arc(ex, ey, eyeR*0.4, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'rgba(30,20,5,0.85)';
            });
        } else { // Normal cute dots - but BIGGER
            const eyeR = Math.max(4, r * 0.15); // Much bigger pupils
            [[-eyeX, eyeY], [eyeX, eyeY]].forEach(([ex, ey]) => {
                ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'white';
                // Shine is also slightly larger
                ctx.beginPath(); ctx.arc(ex - eyeR*0.3, ey - eyeR*0.3, eyeR*0.38, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'rgba(30,20,5,0.85)';
            });
        }

        // Mouth - Bigger and bolder!
        ctx.lineWidth = Math.max(2.5, r * 0.08);
        ctx.beginPath();
        if (isSurprised) {
            ctx.arc(0, eyeY + r*0.32, r*0.12, 0, Math.PI*2); // Bigger mouth O
            ctx.fill();
        } else if (isHappy) {
            // Wider and deeper smile
            ctx.arc(0, eyeY + r*0.2, r*0.22, 0.05*Math.PI, 0.95*Math.PI);
            ctx.stroke();
        } else {
            // Neutral but thicker
            ctx.moveTo(-r*0.15, eyeY + r*0.25);
            ctx.lineTo(r*0.15, eyeY + r*0.25);
            ctx.stroke();
        }

        // Value text at bottom inside heavy stroke
        ctx.font=`900 ${Math.max(11,r*.38)}px Fredoka One,Rubik,sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.lineJoin='round';
        ctx.strokeStyle='rgba(0,0,0,0.85)'; ctx.lineWidth=3;
        ctx.strokeText(val, 0, r*.72);
        ctx.fillStyle='#fff'; ctx.fillText(val, 0, r*.72);

        ctx.restore();
    }
    // Particles
    for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.7; p.life-=0.025;
        if(p.life<=0){particles.splice(i,1);continue;}
        ctx.globalAlpha=p.life; ctx.fillStyle=p.color;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*p.life+1,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
    }
}

// ===== SPAWN =====
function spawnDropped(x,y,val){
    const r=getRadius(val);
    const b=Bodies.circle(x,y,r,{restitution:0.35,friction:0.25,label:'fruit',render:{visible:false}});
    b.textValue=val;b.isDropped=true;b.evaluated=false;Composite.add(engine.world,b);
}
function spawnFruit(x,y,val,isDropped){
    const r=getRadius(val);
    const b=Bodies.circle(x,y,r,{restitution:0.25,friction:0.3,label:'fruit',render:{visible:false}});
    b.textValue=val;b.isDropped=isDropped;b.evaluated=false;Composite.add(engine.world,b);
}

// ===== CONTACT GRAPH for triple-merge =====
let contacts = new Map();

function addContact(aId, bId) {
    if (!contacts.has(aId)) contacts.set(aId, new Set());
    if (!contacts.has(bId)) contacts.set(bId, new Set());
    contacts.get(aId).add(bId);
    contacts.get(bId).add(aId);
}
function removeContact(aId, bId) {
    contacts.get(aId)?.delete(bId);
    contacts.get(bId)?.delete(aId);
}

// Check for any triplet (triangle) of same-value fruits all touching each other
function checkTripleMerge(toRemove, newFruits) {
    const allBodies = Composite.allBodies(engine.world);
    const fruits = allBodies.filter(b => b.label==='fruit' && !b.isMerging && !toRemove.includes(b));
    const fMap = new Map(fruits.map(b => [b.id, b]));

    for (const body of fruits) {
        if (body.isMerging || toRemove.includes(body)) continue;
        const neighbors = contacts.get(body.id);
        if (!neighbors || neighbors.size < 2) continue;

        const sameNeigh = [];
        for (const nId of neighbors) {
            const n = fMap.get(nId);
            if (n && n.textValue===body.textValue && !n.isMerging && !toRemove.includes(n))
                sameNeigh.push(n);
        }
        if (sameNeigh.length < 2) continue;

        // Find any two sameNeigh that also touch each other → triangle
        for (let i=0; i<sameNeigh.length-1; i++) {
            for (let j=i+1; j<sameNeigh.length; j++) {
                const ni=sameNeigh[i], nj=sameNeigh[j];
                if (!contacts.get(ni.id)?.has(nj.id)) continue;
                const idx=SEQ.indexOf(body.textValue);
                if (idx<0 || idx>=SEQ.length-1) continue;
                if (body.isMerging||ni.isMerging||nj.isMerging) continue;
                // Merge!
                body.isMerging=true; ni.isMerging=true; nj.isMerging=true;
                toRemove.push(body, ni, nj);
                const cx=(body.position.x+ni.position.x+nj.position.x)/3;
                const cy=(body.position.y+ni.position.y+nj.position.y)/3;
                newFruits.push({x:cx, y:cy, val:SEQ[idx+1]});
                updateScore((idx+1)*90); playMerge();
                if (Math.random()>.4) showPraise(cx, cy);
                burst(cx, cy, getColor(SEQ[idx+1]), 80);
                return; // one merge per frame
            }
        }
    }
}

function setupCollisions(){
    Events.on(engine,'collisionStart',event=>{
        const toRemove=[],newFruits=[];
        for(const pair of event.pairs){
            const A=pair.bodyA,B=pair.bodyB;
            if(A.label==='fruit'&&B.label==='fruit') addContact(A.id,B.id);
            for(const b of [A,B]){
                if(b.label==='fruit'&&b.isDropped&&!b.evaluated&&!b.isMerging){
                    const other=b===A?B:A;
                    if(other.label==='fruit'){
                        b.evaluated=true;
                        if(b.textValue===currentQuestion.answer){
                            burst(b.position.x,b.position.y,getColor(b.textValue),120);
                            playSuccess();updateScore(50);showPraise(b.position.x,b.position.y);
                            b.isMerging=true;toRemove.push(b);
                            if(!toRemove.includes(other)){other.isMerging=true;toRemove.push(other);}
                            if(!isGenerating){isGenerating=true;setTimeout(()=>{generateQuestion();isGenerating=false;},800);}
                        } else { playError(); }
                    }
                }
            }
        }
        checkTripleMerge(toRemove,newFruits);
        if(toRemove.length){
            Composite.remove(engine.world,toRemove);
            toRemove.forEach(b=>contacts.delete(b.id));
        }
        newFruits.forEach(f=>spawnFruit(f.x,f.y,f.val,false));
    });
    Events.on(engine,'collisionEnd',event=>{
        for(const pair of event.pairs) removeContact(pair.bodyA.id,pair.bodyB.id);
    });
    Events.on(engine,'collisionActive',event=>{
        if(isGameOver)return;
        for(const pair of event.pairs){
            const isAS=pair.bodyA.label==='topSensor',isBS=pair.bodyB.label==='topSensor';
            if(!isAS&&!isBS)continue;
            const fruit=isAS?pair.bodyB:pair.bodyA;
            if(fruit.label!=='fruit')continue;
            const spd=Math.abs(fruit.velocity.y)+Math.abs(fruit.velocity.x);
            if(spd<0.5)triggerGameOver();
        }
    });
}


// ===== BURST =====
function burst(x,y,color,count){
    for(let i=0;i<count;i++){
        const angle=Math.random()*Math.PI*2,speed=Math.random()*12+3;
        particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-Math.random()*4,
            life:1,r:Math.random()*8+3,
            color:[color,'#fff','#ffd700','#ff6b6b','#69f0ae'][Math.floor(Math.random()*5)]});
    }
}

// ===== PRAISE =====
function showPraise(x,y, customTxt = null, customColor = null){
    const pw=customTxt ? {text:customTxt, color:customColor} : PRAISE[Math.floor(Math.random()*PRAISE.length)];
    const el=document.createElement('div');
    el.className='praise-popup';el.innerText=pw.text;el.style.color=pw.color;
    el.style.left=x+'px';el.style.top=y+'px';
    if(customTxt) {
        el.style.fontSize = '1.8rem';
        el.style.width = '100%';
        el.style.textAlign = 'center';
        el.style.left = '0';
        el.style.background = 'rgba(0,0,0,0.6)';
        el.style.padding = '15px';
    }
    popupContainer.appendChild(el);setTimeout(()=>el.remove(), customTxt ? 2500 : 1700);
}

// ===== CHEST SEQUENCE (2-Step Click) =====
let chestRunning=false;
let currentRewardParams=null;

function openChest(reward){
    if(chestRunning)return; chestRunning=true;
    currentRewardParams=reward;
    // Reset views
    document.getElementById('chest-closed-view').classList.remove('hidden');
    document.getElementById('chest-reward-card').classList.add('hidden');
    const box = document.querySelector('.chest-click-area');
    box.style.animation=''; 
    document.querySelector('.coins-ring').style.display='none';
    
    // Set tease text
    document.getElementById('tease-banner').innerText = TEASE_MSGS[Math.floor(Math.random()*TEASE_MSGS.length)];
    document.getElementById('chest-overlay').classList.remove('hidden');
}

window.clickChest=function(){
    if(!currentRewardParams)return;
    const box = document.querySelector('.chest-click-area');
    if(box.style.animation) return; // already clicked
    
    // Shake & Coins
    box.style.animation = 'chestClickShake 0.4s ease'; 
    playChest();
    document.querySelector('.coins-ring').style.display='block';
    
    // Show Card After Delay
    setTimeout(()=>{
        document.getElementById('chest-closed-view').classList.add('hidden');
        document.getElementById('chest-reward-card').classList.remove('hidden');
        
        const rw = currentRewardParams;
        document.getElementById('chest-title').innerText = rw.title || 'זכית!';
        
        const imgEl = document.getElementById('chest-prize-img');
        if (rw.imageFile) {
            imgEl.innerHTML = `<img src="${rw.imageFile}" class="prize-photo">`;
        } else {
            imgEl.innerText = rw.img || rw.emoji;
            imgEl.style.fontSize = '5.5rem';
        }
        
        document.getElementById('chest-prize-name').innerText = rw.name;
        
        // Add Story if exists
        const storyEl = document.getElementById('chest-prize-story') || document.createElement('div');
        storyEl.id = 'chest-prize-story';
        storyEl.style.fontSize = '1.1rem';
        storyEl.style.marginTop = '15px';
        storyEl.style.color = '#ffd700';
        storyEl.style.fontStyle = 'italic';
        storyEl.style.fontWeight = 'bold';
        storyEl.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
        storyEl.innerText = rw.story || '';
        document.getElementById('chest-prize-name').parentElement.appendChild(storyEl);

        playSuccess();
        applyPrizeEffect(rw.type);
    }, 1100);
};

function applyPrizeEffect(type) {
    const cx = window.innerWidth/2; const cy = window.innerHeight*0.45;
    if(type==='jewelry') { burst(cx,cy,'#00bcd4',150); burst(cx,cy,'#ffffff',50); }
    else if(type==='vacation') { burst(cx,cy,'#ff9800',100); burst(cx,cy,'#03a9f4',100); }
    else if(type==='funny') { burst(cx,cy,'#9c27b0',100); burst(cx,cy,'#e91e63',50); }
    else if(type==='tech') { burst(cx,cy,'#607d8b',150); burst(cx,cy,'#cfd8dc',50); }
    else { burst(cx,cy,'#ffd700',100); burst(cx,cy,'#ffecb3',50); }
}

window.closeChest=function(){
    document.getElementById('chest-overlay').classList.add('hidden');
    chestRunning=false; currentRewardParams=null;
};

// ===== SCORE (session only) =====
// ===== SCORE & POINTS =====
function updateScore(delta) {
    const oldScore = currentScore;
    currentScore = Math.max(0, currentScore + delta);
    currentPoints = Math.max(0, currentPoints + delta);
    if(scoreValueEl) scoreValueEl.innerText = Math.floor(currentScore);
    
    // Encouragement msg: One question before reward (350 CP step)
    const currentBase = Math.floor(currentScore / 400) * 400;
    if (currentScore >= currentBase + 350 && oldScore < currentBase + 350) {
        showPraise(window.innerWidth/2, window.innerHeight/3, "עוד שאלה אחת לפרס שווה... ✨", "#ffeb3b");
    }

    // Brawl Stars Chest Hook: Trigger every 400 points
    if (Math.floor(currentScore / 400) > Math.floor(oldScore / 400)) {
        setTimeout(showChestSequence, 800);
    }

    const sp=document.getElementById('shop-points');
    if(sp)sp.innerText=currentPoints;
    checkAutoRewards();
}
function checkAutoRewards(){
    for(const t of AUTO_REWARDS){
        if(currentPoints>=t.pts&&!purchasedRewards.includes(t.id)){grantReward(t.id,true);break;}
    }
}
function grantReward(id,isGift=false){
    const r=REWARDS.find(r=>r.id===id);if(!r)return;
    if(!purchasedRewards.includes(id))purchasedRewards.push(id);
    if(!isGift)updateScore(-r.price);
    openChest(r);updateShopUI();
}
window.buyReward=function(id){
    const r=REWARDS.find(r=>r.id===id);if(!r)return;
    if(currentPoints<r.price){showQuickMsg('אין מספיק נקודות! 😅');return;}
    grantReward(id,false);
};
function showQuickMsg(txt){
    const el=document.createElement('div');el.className='reward-popup';el.innerText=txt;
    popupContainer.appendChild(el);setTimeout(()=>el.remove(),3000);
}

// ===== LIGHTBOX =====
window.openLightbox = function(src) {
    console.log("Opening lightbox for:", src);
    const lb = document.getElementById('lightbox-overlay');
    const img = document.getElementById('lightbox-img');
    if(!lb || !img) return;
    img.src = src;
    lb.classList.remove('hidden');
};
window.closeLightbox = function() {
    document.getElementById('lightbox-overlay').classList.add('hidden');
};

// ===== SHOP & PRIZES =====
function updateShopUI(){
    const ptsEl = document.getElementById('shop-points');
    if(ptsEl) ptsEl.innerText = currentPoints;
    const grid=document.getElementById('rewards-grid');
    if(!grid) return;
    grid.innerHTML='';
    REWARDS.forEach(r=>{
        const owned=purchasedRewards.includes(r.id);
        const card=document.createElement('div');
        card.className='reward-card'+(owned?' purchased':'');
        
        const visual = r.imageFile ? `<div class="reward-img" onclick="window.openLightbox('${r.imageFile}')"><img src="${r.imageFile}"></div>` : `<div class="reward-emoji">${r.emoji}</div>`;
        
        card.innerHTML=`${visual}
            <div class="reward-name">${r.name.split('—')[0].trim()}</div>
            <div class="reward-price">${owned?'✅ שלך!':'💎 '+r.price}</div>
            ${!owned?`<button class="btn buy" onclick="buyReward('${r.id}')">קנה 🛒</button>`:''}`;
        grid.appendChild(card);
    });
}

function updatePrizesUI(){
    const grid = document.getElementById('prizes-grid');
    if(!grid) return;
    grid.innerHTML='';
    
    const myPrizes = REWARDS.filter(r => purchasedRewards.includes(r.id));
    const noPrizes = document.getElementById('no-prizes-msg');
    
    if(myPrizes.length === 0) {
        if(noPrizes) noPrizes.classList.remove('hidden');
        return;
    }
    if(noPrizes) noPrizes.classList.add('hidden');
    
    myPrizes.forEach(r => {
        const item = document.createElement('div');
        item.className = 'prize-item';
        const imgPath = r.imageFile || '';
        const visual = r.imageFile ? `<div class="prize-thumb" onclick="event.stopPropagation(); openLightbox('${imgPath}')"><img src="${r.imageFile}"></div>` : `<div class="prize-thumb emoji">${r.emoji}</div>`;
        item.innerHTML = `${visual}<div class="prize-label">${r.name.split('—')[0].trim()}</div>`;
        item.onclick = () => { openChest(r); document.getElementById('prizes-screen').classList.add('hidden'); };
        grid.appendChild(item);
    });
}

document.getElementById('shop-btn').onclick=()=>{
    document.getElementById('shop-screen').classList.remove('hidden');
    updateShopUI();
};
document.getElementById('close-shop').onclick=()=>document.getElementById('shop-screen').classList.add('hidden');

document.getElementById('my-prizes-btn').onclick=()=>{
    document.getElementById('prizes-screen').classList.remove('hidden');
    updatePrizesUI();
};
document.getElementById('close-prizes').onclick=()=>document.getElementById('prizes-screen').classList.add('hidden');

document.getElementById('hint-btn')?.addEventListener('click', () => showHint());



// ===== GAME OVER =====
// ===== CHEST SEQUENCE (Brawl Stars Style) =====
function showChestSequence() {
    const overlay = document.getElementById('chest-overlay');
    const closedView = document.getElementById('chest-closed-view');
    const rewardCard = document.getElementById('chest-reward-card');
    const teaseText = document.getElementById('tease-text');

    overlay.classList.remove('hidden');
    closedView.classList.remove('hidden');
    rewardCard.classList.add('hidden');
    
    // Pick a random tease message
    teaseText.innerText = pick(TEASE_MSGS);
    playChest();
}

let chestClicks = 0;
function handleChestClick() {
    chestClicks++;
    const clicker = document.getElementById('chest-clicker');
    clicker.classList.remove('chest-box-anim');
    void clicker.offsetWidth; // trigger reflow
    clicker.classList.add('chest-box-anim');
    
    playSound(400 + chestClicks * 100, 'square', 0.05);

    if (chestClicks >= 3) {
        chestClicks = 0;
        openChestReward();
    }
}

function openChestReward() {
    const closedView = document.getElementById('chest-closed-view');
    const rewardCard = document.getElementById('chest-reward-card');
    const coinsRing = document.getElementById('coins-ring');

    // Explosion of coins/stars
    coinsRing.style.display = 'block';
    for(let i=0; i<12; i++) {
        const coin = document.createElement('div');
        coin.className = 'fcoin';
        coin.innerText = i % 2 === 0 ? '💰' : '✨';
        coin.style.setProperty('--angle', (i * 30) + 'deg');
        coin.style.setProperty('--d', (i * 0.05) + 's');
        coinsRing.appendChild(coin);
        setTimeout(()=>coin.remove(), 1000);
    }

    playSuccess();

    setTimeout(() => {
        closedView.classList.add('hidden');
        rewardCard.classList.remove('hidden');
        
        // Pick a funny/random reward
        const reward = pick(REWARDS);
        document.getElementById('chest-prize-img').innerText = reward.emoji;
        document.getElementById('chest-prize-name').innerText = reward.name;
        
        // Add Story if exists
        const storyEl = document.getElementById('chest-prize-story') || document.createElement('div');
        storyEl.id = 'chest-prize-story';
        storyEl.style.fontSize = '1.1rem';
        storyEl.style.marginTop = '15px';
        storyEl.style.color = '#ffd700';
        storyEl.style.fontStyle = 'italic';
        storyEl.style.fontWeight = 'bold';
        storyEl.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
        storyEl.innerText = reward.story || '';
        document.getElementById('chest-prize-name').parentElement.appendChild(storyEl);

        // Auto-close after 6 seconds (more time to read the story)
        setTimeout(closeChest, 6000);
    }, 500);
}

function closeChest() {
    const overlay = document.getElementById('chest-overlay');
    overlay.classList.add('hidden');
}
function triggerGameOver(){
    if(isGameOver)return;isGameOver=true;
    document.getElementById('final-score').innerText=currentScore;
    document.getElementById('game-over-screen').classList.remove('hidden');
}
document.getElementById('restart-btn').onclick=()=>{
    document.getElementById('game-over-screen').classList.add('hidden');
    const h=document.getElementById('hint-popup'); if(h)h.remove();
    Composite.clear(engine.world);Engine.clear(engine);
    Render.stop(render);Runner.stop(runner);
    if(render.canvas)render.canvas.remove();
    initGame();
};
document.getElementById('share-btn').onclick=async()=>{
    const txt=`הגעתי ל-${currentScore} נקודות במשחק האחוזים! נסה גם אתה!`;
    if(navigator.share){try{await navigator.share({title:'אבטיח האחוזים',text:txt});}catch(e){}}
    else{navigator.clipboard?.writeText(txt);showQuickMsg('הטקסט הועתק!');}
};

window.addEventListener('resize',()=>{
    if(render){render.canvas.width=gameContainer.clientWidth;render.canvas.height=gameContainer.clientHeight;}
});

// ===== ROTATING BACKGROUNDS (Disabled for ring-bg) =====
const BG_THEMES=['theme-space','theme-ocean','theme-jungle','theme-sunset','theme-aurora'];
let bgIdx=0;
function rotateBg(){
    // Disabled to keep the ring background permanent
    return;
}
rotateBg(); // No-op now

initGame();
