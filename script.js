/* To Master Chess - standalone version: no external chess.js dependency. */
const PIECES = {
  w:{p:"♙",n:"♘",b:"♗",r:"♖",q:"♕",k:"♔"},
  b:{p:"♟",n:"♞",b:"♝",r:"♜",q:"♛",k:"♚"}
};

class Chess {
  constructor(fen){ this.reset(); if(fen) this.load(fen); }
  reset(){
    this._board=Array.from({length:8},()=>Array(8).fill(null));
    const back=['r','n','b','q','k','b','n','r'];
    for(let c=0;c<8;c++){this._board[0][c]={type:back[c],color:'b'};this._board[1][c]={type:'p',color:'b'};this._board[6][c]={type:'p',color:'w'};this._board[7][c]={type:back[c],color:'w'}}
    this._turn='w'; this._castling={w:{k:true,q:true},b:{k:true,q:true}}; this._ep=null; this._half=0; this._full=1; this._stack=[]; this._history=[];
    return this;
  }
  load(fen){
    const p=fen.trim().split(/\s+/); if(!p.length) return false;
    this._board=Array.from({length:8},()=>Array(8).fill(null));
    const rows=p[0].split('/');
    for(let r=0;r<8;r++){let c=0;for(const ch of rows[r]){if(/\d/.test(ch))c+=+ch;else{this._board[r][c]={type:ch.toLowerCase(),color:ch===ch.toUpperCase()?'w':'b'};c++}}}
    this._turn=p[1]||'w'; const cr=p[2]||'-'; this._castling={w:{k:cr.includes('K'),q:cr.includes('Q')},b:{k:cr.includes('k'),q:cr.includes('q')}};
    this._ep=p[3]&&p[3]!=='-'?this._parse(p[3]):null; this._half=+(p[4]||0); this._full=+(p[5]||1); this._stack=[];this._history=[];return true;
  }
  board(){return this._board.map(row=>row.map(p=>p?{...p}:null))}
  turn(){return this._turn}
  get(sq){const p=this._parse(sq); return p?this._board[p.r][p.c]:null}
  _parse(s){if(typeof s!=='string'||!/^[a-h][1-8]$/.test(s))return null;return {c:s.charCodeAt(0)-97,r:8-+s[1]}}
  _sq(r,c){return c>=0&&c<8&&r>=0&&r<8?String.fromCharCode(97+c)+(8-r):null}
  _opp(c){return c==='w'?'b':'w'}
  _cloneState(){return {board:this.board(),turn:this._turn,castling:JSON.parse(JSON.stringify(this._castling)),ep:this._ep?{...this._ep}:null,half:this._half,full:this._full,history:this._history.slice()}}
  _restore(s){this._board=s.board;this._turn=s.turn;this._castling=s.castling;this._ep=s.ep;this._half=s.half;this._full=s.full;this._history=s.history}
  _king(c){for(let r=0;r<8;r++)for(let x=0;x<8;x++)if(this._board[r][x]?.type==='k'&&this._board[r][x].color===c)return {r,c:x};return null}
  _attacked(r,c,by){
    // pawns
    const pr=r+(by==='w'?1:-1);
    for(const dc of [-1,1]) if(this._board[pr]?.[c+dc]?.type==='p'&&this._board[pr][c+dc].color===by)return true;
    // knights
    for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const p=this._board[r+dr]?.[c+dc];if(p?.color===by&&p.type==='n')return true}
    // sliders
    const lines=[[[1,0],[-1,0],[0,1],[0,-1],['r','q']],[[1,1],[1,-1],[-1,1],[-1,-1],['b','q']]];
    for(const group of lines){const dirs=group.slice(0,4),types=group[4];for(const [dr,dc] of dirs){let rr=r+dr,cc=c+dc;while(rr>=0&&rr<8&&cc>=0&&cc<8){const p=this._board[rr][cc];if(p){if(p.color===by&&types.includes(p.type))return true;break}rr+=dr;cc+=dc}}}
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc){const p=this._board[r+dr]?.[c+dc];if(p?.color===by&&p.type==='k')return true}
    return false;
  }
  inCheck(color=this._turn){const k=this._king(color);return !k||this._attacked(k.r,k.c,this._opp(color))}
  _pseudo(square){
    const out=[]; const from=this._parse(square); if(!from)return out; const p=this._board[from.r][from.c];if(!p||p.color!==this._turn)return out;
    const add=(r,c,extra={})=>{if(r<0||r>7||c<0||c>7)return;const target=this._board[r][c];if(!target||target.color!==p.color){out.push({from:square,to:this._sq(r,c),piece:p.type,color:p.color,captured:target?.type||undefined,...extra})}};
    if(p.type==='p'){
      const d=p.color==='w'?-1:1,start=p.color==='w'?6:1,promo=p.color==='w'?0:7;
      if(this._board[from.r+d]?.[from.c]==null){if(from.r+d===promo)for(const q of ['q','r','b','n'])add(from.r+d,from.c,{promotion:q});else add(from.r+d,from.c);if(from.r===start&&this._board[from.r+2*d]?.[from.c]==null)add(from.r+2*d,from.c)}
      for(const dc of [-1,1]){const rr=from.r+d,cc=from.c+dc,target=this._board[rr]?.[cc];if(target&&target.color!==p.color){if(rr===promo)for(const q of ['q','r','b','n'])add(rr,cc,{promotion:q});else add(rr,cc)}else if(this._ep&&this._ep.r===rr&&this._ep.c===cc){out.push({from:square,to:this._sq(rr,cc),piece:'p',color:p.color,captured:'p',ep:true})}}
    } else if(p.type==='n'){
      for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])add(from.r+dr,from.c+dc)
    } else if(['b','r','q'].includes(p.type)){
      const dirs=[];if(['b','q'].includes(p.type))dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);if(['r','q'].includes(p.type))dirs.push([1,0],[-1,0],[0,1],[0,-1]);
      for(const [dr,dc] of dirs){let rr=from.r+dr,cc=from.c+dc;while(rr>=0&&rr<8&&cc>=0&&cc<8){const target=this._board[rr][cc];if(!target){out.push({from:square,to:this._sq(rr,cc),piece:p.type,color:p.color})}else{if(target.color!==p.color)out.push({from:square,to:this._sq(rr,cc),piece:p.type,color:p.color,captured:target.type});break}rr+=dr;cc+=dc}}
    } else if(p.type==='k'){
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)add(from.r+dr,from.c+dc);
      const row=p.color==='w'?7:0, enemy=this._opp(p.color);
      if(from.r===row&&from.c===4&&!this.inCheck(p.color)){
        if(this._castling[p.color].k&&this._board[row][5]==null&&this._board[row][6]==null&&!this._attacked(row,5,enemy)&&!this._attacked(row,6,enemy))out.push({from:square,to:this._sq(row,6),piece:'k',color:p.color,castle:'k'});
        if(this._castling[p.color].q&&this._board[row][3]==null&&this._board[row][2]==null&&this._board[row][1]==null&&!this._attacked(row,3,enemy)&&!this._attacked(row,2,enemy))out.push({from:square,to:this._sq(row,2),piece:'k',color:p.color,castle:'q'});
      }
    }
    return out;
  }
  _apply(m,record=true){
    const a=this._parse(m.from),b=this._parse(m.to),p=this._board[a.r][a.c];
    if(!p)return null;
    const state=this._cloneState(); if(record)this._stack.push(state);
    let captured=this._board[b.r][b.c];
    this._board[b.r][b.c]={type:m.promotion||p.type,color:p.color};this._board[a.r][a.c]=null;
    if(m.ep){const cr=b.r+(p.color==='w'?1:-1);captured=this._board[cr][b.c];this._board[cr][b.c]=null}
    if(m.castle){const row=a.r;const fromC=m.castle==='k'?7:0,toC=m.castle==='k'?5:3;this._board[row][toC]=this._board[row][fromC];this._board[row][fromC]=null}
    if(p.type==='k'){this._castling[p.color].k=false;this._castling[p.color].q=false}
    if(p.type==='r'){if(a.r===7&&a.c===0)this._castling.w.q=false;if(a.r===7&&a.c===7)this._castling.w.k=false;if(a.r===0&&a.c===0)this._castling.b.q=false;if(a.r===0&&a.c===7)this._castling.b.k=false}
    if(captured?.type==='r'){if(b.r===7&&b.c===0)this._castling.w.q=false;if(b.r===7&&b.c===7)this._castling.w.k=false;if(b.r===0&&b.c===0)this._castling.b.q=false;if(b.r===0&&b.c===7)this._castling.b.k=false}
    this._ep=null;if(p.type==='p'&&Math.abs(b.r-a.r)===2)this._ep={r:(a.r+b.r)/2,c:a.c};
    this._half=(p.type==='p'||captured)?0:this._half+1;if(p.color==='b')this._full++;
    this._turn=this._opp(this._turn);
    return {from:m.from,to:m.to,piece:p.type,color:p.color,captured:captured?.type,promotion:m.promotion,castle:m.castle,ep:m.ep,flags:m.castle?'k':m.ep?'e':captured?'c':'n'};
  }
  _legalMovesRaw(square){
    const all=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const p=this._board[r][c];
      if(p&&p.color===this._turn){
        const s=this._sq(r,c);
        if(!square||square===s)all.push(...this._pseudo(s));
      }
    }
    const legal=[];
    for(const m of all){
      const state=this._cloneState();
      this._apply(m,false);
      const ok=!this.inCheck(state.turn);
      this._restore(state);
      if(ok)legal.push(m);
    }
    return legal;
  }
  moves(opts={}){
    const candidates=this._legalMovesRaw(opts.square);
    candidates.forEach(m=>m.san=this._san(m,candidates));
    return opts.verbose?candidates:candidates.map(m=>m.san);
  }
  _san(m,legalList){
    if(m.castle)return m.castle==='k'?'O-O':'O-O-O';
    const p=this.get(m.from);let s=p.type==='p'?'':p.type.toUpperCase();const same=legalList.filter(x=>x.to===m.to&&x.piece===m.piece&&x.from!==m.from);if(p.type!=='p'&&same.length){const f=m.from[0],rank=m.from[1];if(!same.some(x=>x.from[0]===f))s+=f;else if(!same.some(x=>x.from[1]===rank))s+=rank;else s+=m.from}
    const capture=!!m.captured||m.ep;if(p.type==='p'&&capture)s+=m.from[0];if(capture)s+='x';s+=m.to;if(m.promotion)s+='='+m.promotion.toUpperCase();
    const state=this._cloneState();
    this._apply(m,false);
    const check=this.inCheck(this._turn);
    const mate=check&&this._legalMovesRaw().length===0;
    this._restore(state);
    if(mate)s+='#';else if(check)s+='+';
    return s;
  }
  move(input){
    const legal=this.moves({verbose:true});let m=null;
    if(typeof input==='string')m=legal.find(x=>x.san===input);else m=legal.find(x=>x.from===input.from&&x.to===input.to&&(!input.promotion||x.promotion===input.promotion));
    if(!m)throw new Error('Illegal move');
    const san=m.san;const result=this._apply(m,true);result.san=san;this._history.push(san);return result;
  }
  undo(){if(!this._stack.length)return null;const state=this._stack.pop();const last=this._history.pop();this._restore(state);return last?{san:last}:null}
  history(opts={}){return opts.verbose?this._history.map(s=>s):this._history.slice()}
  isCheckmate(){return this.inCheck(this._turn)&&this.moves().length===0}
  isStalemate(){return !this.inCheck(this._turn)&&this.moves().length===0}
  isThreefoldRepetition(){return false}
  isInsufficientMaterial(){const pieces=[];for(const row of this._board)for(const p of row)if(p&&p.type!=='k')pieces.push(p);if(!pieces.length)return true;if(pieces.some(p=>['p','r','q'].includes(p.type)))return false;if(pieces.length===1&&['b','n'].includes(pieces[0].type))return true;return false}
  isDraw(){return this.isStalemate()||this.isInsufficientMaterial()||this._half>=100}
  isGameOver(){return this.isCheckmate()||this.isDraw()}
  fen(){
    const rows=[];for(let r=0;r<8;r++){let s='',empty=0;for(let c=0;c<8;c++){const p=this._board[r][c];if(!p)empty++;else{if(empty){s+=empty;empty=0}s+=p.color==='w'?p.type.toUpperCase():p.type}}if(empty)s+=empty;rows.push(s)}
    let cr='';if(this._castling.w.k)cr+='K';if(this._castling.w.q)cr+='Q';if(this._castling.b.k)cr+='k';if(this._castling.b.q)cr+='q';if(!cr)cr='-';return `${rows.join('/')} ${this._turn} ${cr} ${this._ep?this._sq(this._ep.r,this._ep.c):'-'} ${this._half} ${this._full}`;
  }
  pgn(){let out='';for(let i=0;i<this._history.length;i++){if(i%2===0)out+=`${Math.floor(i/2)+1}. `;out+=this._history[i]+' ';}return out.trim()}
  loadPgn(pgn){this.reset();const clean=pgn.replace(/\{[^}]*\}/g,'').replace(/\d+\.(\.\.)?/g,'').trim();if(!clean)return true;for(const san of clean.split(/\s+/)){if(/^(1-0|0-1|1\/2-1\/2|\*)$/.test(san))break;this.move(san)}return true}
}

let practiceGame = new Chess();
let localGame = new Chess();
let onlineGame = new Chess();
let lastGame = null;
let practiceFens = [practiceGame.fen()];
let localFens = [localGame.fen()];
let selected = {practice:null,local:null,online:null};
let practicePlayerColor = localStorage.getItem("practicePlayerColor") || "w";
let localViewColor = "w";
let onlineColorChoice = "random";
let onlineAssignedColor = null;
let onlinePeerChoice = null;
let onlineColorResolved = false;
let onlineStarted = false;
let onlineDrawPending = false;
let onlineTimeChoice = 600000;
let onlineClockMs = {w:600000,b:600000};
let onlineClockRunning = false;
let onlineClockLast = 0;
let onlineClockRaf = 0;
const TIME_CONTROLS = {1:60_000,3:180_000,10:600_000,0:0};
let selectedTime = {practice:600_000,local:600_000};
let clocks = {practice:{w:600_000,b:600_000},local:{w:600_000,b:600_000}};
const clockState = {
  practice:{running:false,last:0,activeColor:null,raf:0,started:false,turnStartedAt:0,turnBaseMs:0},
  local:{running:false,last:0,activeColor:null,raf:0,started:false,turnStartedAt:0,turnBaseMs:0}
};
let practiceThinking = false;
let practiceComputerToken = 0;
let profileName = localStorage.getItem("chessProfileName") || "You";
let profileEmail = localStorage.getItem("chessProfileEmail") || "";
let peer = null, conn = null, onlineRole = null;

const $ = id => document.getElementById(id);
const toast = msg => { const el=$("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2200); };

function showPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active-page"));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  const target=$(page); if(!target)return; target.classList.add("active-page");
  document.querySelector(`[data-page="${page}"]`)?.classList.add("active");
  if(page==="estadisticas")renderStats();
}
document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.go)));
document.querySelectorAll("[data-rail]").forEach(btn=>btn.addEventListener("click",()=>{
  const target=btn.dataset.rail;
  if(target==="profile"){renderProfileName();$("profileModal").classList.remove("hidden");setTimeout(()=>$("profileNameInput").focus(),0);return}
  showPage(target);
}));

function squareName(r,c){return "abcdefgh"[c]+(8-r)}
function botColor(){return practicePlayerColor==="w"?"b":"w"}
function boardOrientation(type){
  if(type==="local") return localViewColor;
  if(type==="practice") return practicePlayerColor;
  if(type==="online") return onlineAssignedColor || "w";
  return "w";
}
function renderBoardCore(el,game,type){
  if(!el||!game)return;
  el.innerHTML="";
  const raw=game.board();
  const orientation=boardOrientation(type);
  const board=orientation==="b"?raw.slice().reverse().map(row=>row.slice().reverse()):raw;
  const legalFrom=selected[type];
  let legal=[];
  if(legalFrom)legal=game.moves({square:legalFrom,verbose:true});
  board.forEach((row,r)=>row.forEach((piece,c)=>{
    const sq=orientation==="b"?squareName(7-r,7-c):squareName(r,c);
    const div=document.createElement("div");
    div.className=`square ${(r+c)%2===0?"light":"dark"}`;
    if(sq===legalFrom)div.classList.add("selected");
    const move=legal.find(m=>m.to===sq);
    if(move)div.classList.add(move.captured?"capture":"legal");
    if(piece){
      const span=document.createElement("span");
      span.className=`piece ${piece.color==="w"?"white":"black"}`;
      span.textContent=PIECES[piece.color][piece.type];
      div.appendChild(span);
    }
    div.onclick=()=>handleSquare(type,sq);
    el.appendChild(div);
  }));
}
// Keep each game mode on its own renderer so a problem in one mode cannot prevent
// the other boards from being drawn.
function renderPracticeBoard(){renderBoardCore($("practiceBoard"),practiceGame,"practice")}
function renderLocalBoard(){renderBoardCore($("localBoard"),localGame,"local")}
function renderOnlineBoard(){renderBoardCore($("onlineBoard"),onlineGame,"online")}
function renderBoard(el,game,type){renderBoardCore(el,game,type)}

function drawAnalysisArrow(el,fen,uci){
  if(!fen||!uci||uci.length<4)return;
  const from=uci.slice(0,2),to=uci.slice(2,4); const file=s=>s.charCodeAt(0)-97, rank=s=>8-Number(s[1]);
  const x1=(file(from)+.5)*12.5,y1=(rank(from)+.5)*12.5,x2=(file(to)+.5)*12.5,y2=(rank(to)+.5)*12.5;
  const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");svg.classList.add("analysis-arrow-layer");svg.setAttribute("viewBox","0 0 100 100");svg.setAttribute("preserveAspectRatio","none");
  const defs=document.createElementNS(ns,"defs"),marker=document.createElementNS(ns,"marker");marker.setAttribute("id","arrowHead");marker.setAttribute("markerWidth","6");marker.setAttribute("markerHeight","6");marker.setAttribute("refX","5");marker.setAttribute("refY","3");marker.setAttribute("orient","auto");const path=document.createElementNS(ns,"path");path.setAttribute("d","M0,0 L6,3 L0,6 Z");path.setAttribute("fill","#ff3b30");marker.appendChild(path);defs.appendChild(marker);svg.appendChild(defs);const line=document.createElementNS(ns,"line");line.setAttribute("x1",x1);line.setAttribute("y1",y1);line.setAttribute("x2",x2);line.setAttribute("y2",y2);line.setAttribute("stroke","#ff3b30");line.setAttribute("stroke-width","2.2");line.setAttribute("stroke-linecap","round");line.setAttribute("marker-end","url(#arrowHead)");svg.appendChild(line);el.appendChild(svg);
}
function refreshAll(){
  try{renderPracticeBoard();}catch(e){console.error("Practice board:",e)}
  try{renderLocalBoard();}catch(e){console.error("Local board:",e)}
  try{renderOnlineBoard();}catch(e){console.error("Online board:",e)}
  try{renderMoves(practiceGame,$("practiceMoves"));}catch(e){}
  try{renderMoves(localGame,$("localMoves"));}catch(e){}
  try{renderMoves(onlineGame,$("onlineMoves"));}catch(e){}
  updateAdvantageBar(fallbackScore(practiceGame));
  updateOnlineAdvantageBar(fallbackScore(onlineGame));
  updateStatus();
}
function renderMoves(game,el){const hist=game.history();el.innerHTML="";if(!hist.length){el.innerHTML="<div style='color:#8791a1'>No moves yet.</div>";return}for(let i=0;i<hist.length;i+=2){const row=document.createElement("div");row.className="move-row";row.innerHTML=`<span>${Math.floor(i/2)+1}.</span><span>${hist[i]||""}</span><span>${hist[i+1]||""}</span>`;el.appendChild(row)}}
function updateStatus(){
  const status=g=>g.isCheckmate()?`Checkmate — ${g.turn()==="w"?"Black":"White"} wins.`:g.isDraw()?"Draw.":g.inCheck()?`Check — ${g.turn()==="w"?"White":"Black"} to move.`:`${g.turn()==="w"?"White":"Black"} to move.`;
  $("practiceStatus").textContent=practiceThinking?"The computer is thinking…":(!clockState.practice.started?"Press Start Game to begin.":status(practiceGame));
  $("localStatus").textContent=!clockState.local.started?"Press Start Game to begin.":status(localGame);
  const connected=!!(conn&&conn.open);
  const lobby=$("onlineLobby"),setup=$("onlineSetup"),match=$("onlineMatch");
  if(lobby)lobby.classList.toggle("hidden",connected);
  if(setup)setup.classList.toggle("hidden",!connected||onlineStarted);
  if(match)match.classList.toggle("hidden",!onlineStarted);
  const onlineStatus=$("onlineStatus");
  if(onlineStatus)onlineStatus.textContent=!connected?"Waiting for both players.":(!onlineColorResolved?"Opponent connected — choose your color.":(!onlineStarted?"Both players are connected. Choose the match settings, then Start Match.":status(onlineGame)));
  const badge=$("onlineConnectionBadge");
  if(badge){badge.textContent=connected?"Connected":"Waiting";badge.style.background=connected?"#183326":"#222833";}
  const start=$("onlineStart");
  if(start){start.disabled=!connected||!onlineColorResolved||onlineStarted||onlineRole!=="host";start.textContent=onlineRole==="host"?"Start Match":"Waiting for Host";}
  const draw=$("onlineDraw"),resign=$("onlineResign");
  if(draw)draw.classList.toggle("hidden",!onlineStarted||!connected||onlineGame.isGameOver());
  if(resign)resign.classList.toggle("hidden",!onlineStarted||!connected||onlineGame.isGameOver());
  if($("onlineMatchStatus"))$("onlineMatchStatus").textContent=onlineStarted?status(onlineGame):"Match not started.";
}

function boardFor(type){return type==="practice"?practiceGame:type==="local"?localGame:onlineGame}
function boardElement(type){return $(type==="practice"?"practiceBoard":type==="local"?"localBoard":"onlineBoard")}
function handleSquare(type,sq){
  const game=boardFor(type);if(game.isGameOver())return;if((type==="practice"||type==="local")&&!clockState[type].started)return;if(type==="practice"&&(game.turn()!==practicePlayerColor||practiceThinking))return;if(type==="online"&&(!conn||!onlineColorResolved||!onlineStarted))return;if(type==="online"&&conn&&onlineAssignedColor&&game.turn()!==onlineAssignedColor)return;
  const current=selected[type];if(!current){const p=game.get(sq);if(p&&p.color===game.turn()){selected[type]=sq;renderBoard(boardElement(type),game,type)}return}
  const piece=game.get(current);if(piece&&piece.color===game.turn()&&sq===current){selected[type]=null;refreshAll();return}
  const moveData={from:current,to:sq};if(piece?.type==="p"&&((piece.color==="w"&&sq[1]==="8")||(piece.color==="b"&&sq[1]==="1"))){openPromotion(type,moveData);return}
  try{const move=game.move(moveData);selected[type]=null;if(type==="online")sendOnlineMove(move);afterMove(type,move)}catch(e){selected[type]=null;toast("Illegal move.");refreshAll()}
}
function openPromotion(type,data){const modal=$("promotionModal"),box=$("promotionChoices"),game=boardFor(type);box.innerHTML="";const color=game.turn();["q","r","b","n"].forEach(t=>{const b=document.createElement("button");b.textContent=PIECES[color][t];b.onclick=()=>{try{const move=game.move({...data,promotion:t});modal.classList.add("hidden");selected[type]=null;if(type==="online")sendOnlineMove(move);afterMove(type,move)}catch(e){toast("Invalid promotion.")}};box.appendChild(b)});modal.classList.remove("hidden")}
$("promotionModal").onclick=e=>{if(e.target.id==="promotionModal")e.currentTarget.classList.add("hidden")};
function afterMove(type){
  const game=boardFor(type);
  if(type==="local") localViewColor=game.turn();
  if(type==="practice") practiceFens.push(game.fen());
  if(type==="local") localFens.push(game.fen());
  refreshAll();
  if(game.isGameOver()){finishGame(type,game);return}
  if(type==="local"||type==="practice")switchClockTurn(type,game.turn());
  if(type==="practice" && game.turn()===botColor()){
    // Give immediate visual feedback without blocking the board; Stockfish will
    // replace this estimate when the computer finishes thinking.
    updateAdvantageBar(fallbackScore(game));
    maybeComputerMove();
  }
}
function showCheckmateOverlay(winner,message=null){
  const overlay=$("checkmateOverlay");if(!overlay)return;
  $("checkmateWinner").textContent=message||`${winner} wins`; overlay.classList.remove("hidden");
  const box=$("confettiBox");box.innerHTML="";
  for(let i=0;i<70;i++){const c=document.createElement("i");c.style.left=(Math.random()*100)+"%";c.style.animationDelay=(Math.random()*1.2)+"s";c.style.transform=`rotate(${Math.random()*360}deg)`;box.appendChild(c)}
  clearTimeout(window.checkmateTimer);window.checkmateTimer=setTimeout(()=>overlay.classList.add("hidden"),4200);
}
$("checkmateOverlay")?.addEventListener("click",()=>$("checkmateOverlay").classList.add("hidden"));

function showDrawOverlay(){
  const overlay=$("drawOverlay");
  if(!overlay)return;
  overlay.classList.remove("hidden");
  clearTimeout(window.drawTimer);
  window.drawTimer=setTimeout(()=>overlay.classList.add("hidden"),4200);
}
$("drawOverlay")?.addEventListener("click",()=>$("drawOverlay").classList.add("hidden"));


function fmtClock(ms, tenths=false){
  ms=Math.max(0,Math.floor(ms));
  const s=Math.floor(ms/1000),m=Math.floor(s/60),sec=s%60;
  return tenths && ms<60000 ? `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}.${Math.floor((ms%1000)/100)}` : `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}
function getTimeMs(type){
  const id=type==="practice"?"practiceTime":"localTime";
  return TIME_CONTROLS[Number($(id)?.value||10)]??600000;
}
function renderAllClocks(){
  const pc=clocks.practice;
  const lc=clocks.local;
  if($("practiceClock"))$("practiceClock").textContent=fmtClock(pc[practicePlayerColor],true);
  if($("aiClock"))$("aiClock").textContent=fmtClock(pc[botColor()],true);

  // Local is a shared board: the board rotates after every move so the side
  // whose turn it is is always at the bottom. The player cards and clocks
  // must rotate with the board too, otherwise the displayed clocks appear
  // to belong to the wrong player.
  const topColor=localViewColor==="w"?"b":"w";
  const bottomColor=localViewColor==="w"?"w":"b";
  const topName=topColor==="w"?"Player 1":"Player 2";
  const bottomName=bottomColor==="w"?"Player 1":"Player 2";
  if($("blackPlayerLabel"))$("blackPlayerLabel").textContent=topName;
  if($("whitePlayerLabel"))$("whitePlayerLabel").textContent=bottomName;
  const topLabel=$("blackPlayerLabel")?.parentElement;
  const bottomLabel=$("whitePlayerLabel")?.parentElement;
  if(topLabel)topLabel.lastChild.textContent=` (${topColor==="w"?"White":"Black"})`;
  if(bottomLabel)bottomLabel.lastChild.textContent=` (${bottomColor==="w"?"White":"Black"})`;
  if($("blackClock"))$("blackClock").textContent=fmtClock(lc[topColor]);
  if($("whiteClock"))$("whiteClock").textContent=fmtClock(lc[bottomColor]);
}
function stopClock(type){
  const st=clockState[type];
  st.running=false;
  if(st.raf)cancelAnimationFrame(st.raf);
  st.raf=0;
}
function startClock(type){
  const st=clockState[type];
  stopClock(type);
  st.running=true;st.last=performance.now();st.activeColor=boardFor(type).turn();
  const frame=now=>{
    if(!st.running||!st.started)return;
    const dt=Math.max(0,now-st.last);st.last=now;
    const color=boardFor(type).turn();
    clocks[type][color]=Math.max(0,clocks[type][color]-dt);
    renderAllClocks();
    if(clocks[type][color]<=0){
      st.running=false;st.raf=0;finishTimedGame(type,color);return;
    }
    st.raf=requestAnimationFrame(frame);
  };
  st.raf=requestAnimationFrame(frame);
}
function switchClockTurn(type,color){
  const st=clockState[type];
  if(!st.started||selectedTime[type]<=0)return;
  st.activeColor=color;
  if(!st.running)startClock(type);
}
function showTimeoutAnnouncement(message="You lost, cause your to slow 🐢"){
  let overlay=$("timeoutOverlay");
  if(!overlay){
    overlay=document.createElement("div");overlay.id="timeoutOverlay";overlay.className="timeout-overlay hidden";
    overlay.innerHTML='<div class="timeout-card"><div class="timeout-title">TIME OUT</div><div id="timeoutMessage">You lost, cause your to slow 🐢</div><small>Click anywhere to continue</small></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener("click",()=>overlay.classList.add("hidden"));
  }
  $("timeoutMessage").textContent=message;overlay.classList.remove("hidden");
  clearTimeout(window.timeoutTimer);window.timeoutTimer=setTimeout(()=>overlay.classList.add("hidden"),3500);
}
function materialScore(game){
  const v={p:1,n:3,b:3.2,r:5,q:9,k:0};let score=0;
  for(const row of game.board())for(const p of row)if(p)score+=(p.color==="w"?1:-1)*v[p.type];
  return score;
}
function fallbackScore(game){
  if(!game)return 0;
  if(game.isCheckmate())return game.turn()==="w"?-1000:1000;
  return materialScore(game);
}
function chanceFromScore(score){
  const w=50+Math.max(-45,Math.min(45,score*6));
  return Math.round(Math.max(5,Math.min(95,w)));
}
function setChanceBar(whiteEl,blackEl,textEl,evalEl,score){
  const white=chanceFromScore(score),black=100-white;
  if(whiteEl)whiteEl.style.width=white+"%";
  if(blackEl)blackEl.style.width=black+"%";
  if(textEl)textEl.textContent=`${white}% White · ${black}% Black`;
  if(evalEl)evalEl.textContent=white>black?"White has the advantage":black>white?"Black has the advantage":"Equal position";
}
function updateAdvantageBar(score){setChanceBar($("advantageWhite"),$("advantageBlack"),$("advantageText"),$("advantageEval"),score)}
function updateOnlineAdvantageBar(score){setChanceBar($("onlineAdvantageWhite"),$("onlineAdvantageBlack"),$("onlineAdvantageText"),$("onlineAdvantageEval"),score)}
function saveGame(game){
  const list=JSON.parse(localStorage.getItem("chessHistory")||"[]");
  const item={...game,id:Date.now()+Math.random()};list.unshift(item);localStorage.setItem("chessHistory",JSON.stringify(list.slice(0,100)));return item;
}
function renderStats(){
  const list=JSON.parse(localStorage.getItem("chessHistory")||"[]");
  const wins=list.filter(g=>g.result==="white"||g.result==="black").length;
  const losses=list.filter(g=>g.resigned||g.timeout).length;
  const draws=list.filter(g=>g.result==="draw").length;
  if($("statGames"))$("statGames").textContent=list.length;
  if($("statWins"))$("statWins").textContent=Math.max(0,wins-losses);
  if($("statLosses"))$("statLosses").textContent=losses;
  if($("statDraws"))$("statDraws").textContent=draws;
  if($("statMoves"))$("statMoves").textContent=list.reduce((n,g)=>n+(g.moves?.length||0),0);
  const h=$("historyList");if(h){h.innerHTML=list.length?list.map(g=>`<div class="history-item"><div class="history-main"><strong>${g.mode||"Game"}</strong><small>${g.date||""}</small></div><div class="history-result">${g.result||"—"}</div></div>`).join(""):"<div class='status'>No games yet.</div>"}
}
function renderProfileName(){
  if($("profileNameInput"))$("profileNameInput").value=profileName;
  if($("profileEmailInput"))$("profileEmailInput").value=profileEmail;
}
$("profileSave").onclick=()=>{
  const name=($("profileNameInput")?.value||"").trim().slice(0,20)||"You";
  const email=($("profileEmailInput")?.value||"").trim();
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast("Please enter a valid email.");return}
  profileName=name;profileEmail=email;
  localStorage.setItem("chessProfileName",profileName);
  localStorage.setItem("chessProfileEmail",profileEmail);
  syncColorLabels();
  $("profileModal")?.classList.add("hidden");
  toast("Profile saved.");
};
$("profileCancel").onclick=()=>$("profileModal")?.classList.add("hidden");
$("profileModal")?.addEventListener("click",e=>{if(e.target===$("profileModal"))$("profileModal").classList.add("hidden")});

function syncColorLabels(){
  const c=practicePlayerColor==="w"?"White":"Black";
  if($("practiceColorLabel"))$("practiceColorLabel").textContent=c;
  if($("practiceColor"))$("practiceColor").value=practicePlayerColor;
  if($("practicePlayerLabel"))$("practicePlayerLabel").textContent=profileName;
  if($("railProfileName"))$("railProfileName").textContent=profileName;
}

// Practice color is independent from Online. Changing it resets only Practice and
// immediately flips the board so the player's chosen color is at the bottom.
$("practiceColor")?.addEventListener("change", e=>{
  practicePlayerColor=e.target.value==="b"?"b":"w";
  localStorage.setItem("practicePlayerColor",practicePlayerColor);
  resetGame("practice");
  syncColorLabels();
  refreshAll();
});
function botElo(){return Number($("aiDifficulty")?.value||3000)}
const BOT_LEVELS={
  3000:{depth:8,randomness:0}
};

// Practice uses a self-contained chess search instead of Stockfish.
// The search starts immediately, yields back to the browser between root moves,
// and stops at about 2 seconds with the best move found so far.
const BOT_VALUES={p:100,n:320,b:330,r:500,q:900,k:20000};
const BOT_PST={
  p:[0,5,5,0,5,10,30,0,0,0,0,0,5,5,10,-5,-5,-5,0,5,0,0,0,0,0,0,0,0,5,5,5,0,5,5,5,5,10,10,10,10,20,20,20,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  n:[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,5,5,0,-20,-40,-30,5,10,15,15,10,5,-30,-30,0,15,20,20,15,0,-30,-30,5,15,20,20,15,5,-30,-30,0,10,15,15,10,0,-30,-40,-20,0,0,0,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  b:[-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,5,0,5,5,0,5,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  r:[0,0,5,10,10,5,0,0,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,5,10,10,10,10,10,10,5,10,10,10,10,10,10,10,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  q:[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,5,0,0,0,0,-10,-10,5,5,5,5,5,0,-10,0,0,5,5,5,5,0,-5,-5,0,5,5,5,5,0,-5,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  k:[20,30,10,0,0,10,30,20,20,20,0,0,0,0,20,20,-10,-20,-20,-20,-20,-20,-20,-10,-20,-30,-30,-40,-40,-30,-30,-20,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-30,-30,-30,-30,-30,-30,-30,-30,-20,-10,0,0,-10,-20,-30]
};
let practiceSearchToken=0;

function botPieceSquare(piece,r,c){
  const idx=piece.color==='w'?r*8+c:(7-r)*8+c;
  return BOT_PST[piece.type]?.[idx]||0;
}
function botEvaluate(game,botSide){
  if(game.isCheckmate()) return game.turn()===botSide ? -100000 : 100000;
  if(game.isDraw()) return 0;
  let score=0, pieces=0, pawns={w:[],b:[]};
  const bd=game.board();
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=bd[r][c]; if(!p)continue; pieces++;
    const sign=p.color===botSide?1:-1;
    score += sign*(BOT_VALUES[p.type] + botPieceSquare(p,r,c));
    if(p.type==='p')pawns[p.color].push([r,c]);
    if((r===3||r===4)&&(c===3||c===4))score+=sign*10;
  }
  // Mobility and king safety make the engine prefer sensible developing moves.
  try{
    const mobility=game.moves().length;
    score+=(game.turn()===botSide?1:-1)*mobility*2;
    if(game.inCheck())score+=(game.turn()===botSide?-35:35);
  }catch{}
  for(const color of ['w','b']){
    const sign=color===botSide?1:-1;
    for(const [r,c] of pawns[color]){
      const file=c, isolated=!pawns[color].some(([rr,cc])=>cc!==file&&Math.abs(cc-file)===1);
      if(isolated)score-=sign*12;
    }
  }
  return score;
}
function botMoveScore(m){
  let s=0;
  if(m.captured)s+=BOT_VALUES[m.captured]*10-BOT_VALUES[m.piece];
  if(m.promotion)s+=BOT_VALUES[m.promotion]*12;
  if(m.san?.includes('+'))s+=45;
  if(m.san?.includes('#'))s+=10000;
  if(['d4','e4','d5','e5'].includes(m.to))s+=12;
  return s;
}
function botOrderedMoves(game){
  return game.moves({verbose:true}).sort((a,b)=>botMoveScore(b)-botMoveScore(a));
}
function botSearch(game,depth,alpha,beta,botSide,deadline){
  if(performance.now()>=deadline) return {score:botEvaluate(game,botSide),complete:false};
  if(depth<=0||game.isGameOver()) return {score:botEvaluate(game,botSide),complete:true};
  const maximizing=game.turn()===botSide;
  let best=maximizing?-Infinity:Infinity;
  const moves=botOrderedMoves(game);
  if(!moves.length)return {score:botEvaluate(game,botSide),complete:true};
  for(const m of moves){
    if(performance.now()>=deadline)return {score:best===Infinity||best===-Infinity?botEvaluate(game,botSide):best,complete:false};
    game.move({from:m.from,to:m.to,promotion:m.promotion});
    const child=botSearch(game,depth-1,alpha,beta,botSide,deadline);
    game.undo();
    best=maximizing?Math.max(best,child.score):Math.min(best,child.score);
    if(maximizing)alpha=Math.max(alpha,best);else beta=Math.min(beta,best);
    if(beta<=alpha)break;
    if(!child.complete)return {score:best,complete:false};
  }
  return {score:best,complete:true};
}

function chooseReasonableBotMove(token,done){
  const elo=botElo(),cfg=BOT_LEVELS[elo]||BOT_LEVELS[1800];
  const botSide=botColor(),deadline=performance.now()+1950;
  let legal=botOrderedMoves(practiceGame);
  if(!legal.length){done(null);return}
  let best=legal[0],bestScore=-Infinity,lastCompleted=best;
  let depth=1;
  const thinkDepth=()=>{
    if(token!==practiceSearchToken||!practiceThinking||practiceGame.isGameOver()){return;}
    if(performance.now()>=deadline){done(lastCompleted);return;}
    let iterationBest=null,iterationScore=-Infinity,complete=true;
    const rootMoves=botOrderedMoves(practiceGame);
    let i=0;
    const rootStep=()=>{
      if(token!==practiceSearchToken||!practiceThinking||practiceGame.isGameOver())return;
      if(performance.now()>=deadline||i>=rootMoves.length){
        if(iterationBest)lastCompleted=iterationBest;
        if(depth>=cfg.depth||performance.now()>=deadline){done(lastCompleted);return}
        depth++;
        setTimeout(thinkDepth,0);
        return;
      }
      const m=rootMoves[i++];
      practiceGame.move({from:m.from,to:m.to,promotion:m.promotion});
      const result=botSearch(practiceGame,depth-1,-Infinity,Infinity,botSide,deadline);
      practiceGame.undo();
      if(!result.complete)complete=false;
      if(result.score>iterationScore){iterationScore=result.score;iterationBest=m;}
      if(!complete){done(lastCompleted||m);return}
      setTimeout(rootStep,0);
    };
    rootStep();
  };
  thinkDepth();
}

function maybeComputerMove(){
  if(practiceThinking||practiceGame.isGameOver()||practiceGame.turn()!==botColor())return;
  const token=++practiceComputerToken;
  practiceSearchToken=token;
  practiceThinking=true;
  updateStatus();
  chooseReasonableBotMove(token,best=>{
    if(token!==practiceComputerToken||!practiceThinking||practiceGame.isGameOver())return;
    practiceThinking=false;
    if(!best){updateStatus();return;}
    try{practiceGame.move({from:best.from,to:best.to,promotion:best.promotion});}
    catch{const fallback=botOrderedMoves(practiceGame)[0];if(fallback)practiceGame.move({from:fallback.from,to:fallback.to,promotion:fallback.promotion});}
    selected.practice=null;
    if(practiceGame.isGameOver()){refreshAll();finishGame('practice',practiceGame);return;}
    practiceFens.push(practiceGame.fen());
    refreshAll();
    switchClockTurn('practice',practiceGame.turn());
    updateStatus();
  });
}

function showResignOverlay(winner){
  const overlay=$("resignOverlay");
  if(!overlay)return;
  const winnerEl=$("resignWinner");
  if(winnerEl)winnerEl.textContent=`${winner==="white"?"White":"Black"} wins`;
  const box=$("resignConfettiBox");
  if(box){
    box.innerHTML="";
    for(let i=0;i<70;i++){
      const piece=document.createElement("i");
      piece.style.left=(Math.random()*100)+"%";
      piece.style.animationDelay=(Math.random()*0.9)+"s";
      piece.style.animationDuration=(2.2+Math.random()*1.5)+"s";
      box.appendChild(piece);
    }
  }
  overlay.classList.remove("hidden");
}

function resignGame(type){
  const game=boardFor(type);
  if(game.isGameOver())return;
  if(type==="online") {
    if(!onlineStarted)return;
    const resigningColor=onlineAssignedColor;
    if(conn&&conn.open)conn.send({type:"resign",color:resigningColor});
    toast("You resigned.");
    onlineStarted=false;
    onlineDrawPending=false;
    updateStatus();
    return;
  }
  const resigningColor=type==="practice"?practicePlayerColor:game.turn();
  const winner=resigningColor==="w"?"black":"white";
  stopClock(type);
  if(type==="practice"){practiceComputerToken++;practiceThinking=false;}
  const saved=saveGame({mode:type==="practice"?"Practice":"1v1 Local",result:winner,moves:game.history(),pgn:game.pgn(),date:new Date().toLocaleString(),timeControl:selectedTime[type],resigned:resigningColor,fens:type==="practice"?practiceFens.slice():localFens.slice()});
  lastGame={...saved,mode:type};
  if(type==="practice") {
    toast("You resigned. New game ready.");
    resetGame("practice");
  } else if(type==="local") {
    // Show the resignation result first, then reset the local board after the animation.
    showResignOverlay(winner);
    clearTimeout(window.localResignResetTimer);
    window.localResignResetTimer=setTimeout(()=>{
      const overlay=$("resignOverlay");
      if(overlay)overlay.classList.add("hidden");
      resetGame("local");
      refreshAll();
    },2000);
  } else showCheckmateOverlay(winner,`Your opponent resign — great job!`);
}

function finishGame(type,game){
  if(game.isCheckmate()) showCheckmateOverlay(game.turn()==="w"?"Black":"White");
  if(type==="online"){onlineStarted=false;updateStatus();return}
  stopClock(type);
  const winner=game.isCheckmate()?(game.turn()==="w"?"black":"white"):"draw";
  const saved=saveGame({mode:type==="practice"?"Practice":"1v1 Local",result:winner,moves:game.history(),pgn:game.pgn(),date:new Date().toLocaleString(),timeControl:selectedTime[type],fens:type==="practice"?practiceFens.slice():localFens.slice()});
  lastGame={...saved,mode:type};
  toast(winner==="draw"?"Game drawn":`Game over: ${winner==="white"?"White":"Black"} wins`);
}
function finishTimedGame(type,loser){
  const game=boardFor(type);
  if(game.isGameOver()&&!clockState[type].running)return;
  stopClock(type);clockState[type].started=false;
  const winner=loser==="w"?"black":"white";
  const userColor=type==="practice"?practicePlayerColor:(type==="local"?null:null);
  const saved=saveGame({mode:type==="practice"?"Practice":"1v1 Local",result:winner,moves:game.history(),pgn:game.pgn(),date:new Date().toLocaleString(),timeControl:selectedTime[type],timeout:true,timeoutColor:loser,fens:type==="practice"?practiceFens.slice():localFens.slice()});
  lastGame={...saved,mode:type};
  if(type==="practice"){
    practiceComputerToken++;practiceThinking=false;
    showTimeoutAnnouncement(loser===practicePlayerColor?"You lost, cause your to slow 🐢":"You won, cause the bot was too slow ⚡");
  }else{
    // Local is shared-screen, so show the requested winner message to the
    // player who did not run out of time.
    showTimeoutAnnouncement("You won, cause your fast ⚡");
  }
  renderStats();updateStatus();
}
function resetGame(type){
  if(type==="practice"){practiceComputerToken++;practiceThinking=false;practiceGame=new Chess();selected.practice=null;stopClock("practice");clockState.practice.started=false;clocks.practice={w:selectedTime.practice,b:selectedTime.practice};practiceFens=[practiceGame.fen()];practiceEvalCp=0;updateAdvantageBar(0);}
  if(type==="local"){localGame=new Chess();localViewColor="w";selected.local=null;stopClock("local");clockState.local.started=false;clocks.local={w:selectedTime.local,b:selectedTime.local};localFens=[localGame.fen()];renderAllClocks();}
  if(type==="online"){onlineGame=new Chess();selected.online=null;onlineStarted=false;onlineDrawPending=false;}
  refreshAll();
}

$("practiceNew").onclick=()=>resetGame("practice");$("localNew2").onclick=()=>resetGame("local");
$("practiceResign").onclick=()=>resignGame("practice");$("localResign").onclick=()=>resignGame("local");$("onlineResign").onclick=()=>resignGame("online");
function startGame(type){const state=clockState[type];if(state.started)return;state.started=true;state.turnStartedAt=0;state.turnBaseMs=0;selectedTime[type]=getTimeMs(type);clocks[type]={w:selectedTime[type],b:selectedTime[type]};renderAllClocks();if(selectedTime[type]>0)startClock(type);updateStatus();}
$("practiceStart").onclick=()=>{startGame("practice");if(practiceGame.turn()===botColor())maybeComputerMove()};$("localStart2").onclick=()=>startGame("local");

// Apply the selected clock immediately. The clock stays paused until Start Game.
function applySelectedTime(type){
  const ms=getTimeMs(type);
  selectedTime[type]=ms;
  clocks[type]={w:ms,b:ms};
  clockState[type].started=false;
  stopClock(type);
  renderAllClocks();
  updateStatus();
}
$("practiceTime")?.addEventListener("change",()=>applySelectedTime("practice"));
$("localTime")?.addEventListener("change",()=>applySelectedTime("local"));
$("practiceUndo").onclick=()=>{if(practiceThinking)return;if(practiceGame.undo())practiceGame.undo();selected.practice=null;refreshAll()};$("localUndo").onclick=()=>{if(localGame.undo())localGame.undo();selected.local=null;refreshAll()};

$("onlineStart").onclick=()=>{
  if(onlineRole!=="host"||!conn||!conn.open||!onlineColorResolved||onlineStarted)return;
  onlineStarted=true;onlineGame=new Chess();selected.online=null;
  onlineTimeChoice=Number($("onlineTime")?.value||600000);
  onlineClockMs={w:onlineTimeChoice,b:onlineTimeChoice};
  conn.send({type:"start",time:onlineTimeChoice});
  startOnlineClock();
  $("roomInfo").textContent=`Match started. You are ${onlineAssignedColor==="w"?"White":"Black"}.`;
  refreshAll();
};
$("onlineDraw").onclick=()=>{
  if(!onlineStarted||onlineDrawPending||!conn||!conn.open)return;
  onlineDrawPending=true;conn.send({type:"draw-offer"});toast("Draw offer sent.");updateStatus();
};
$("leaveRoom").onclick=()=>{
  try{if(conn&&conn.open)conn.close();if(peer)peer.destroy()}catch{}
  conn=null;peer=null;onlineRole=null;onlineStarted=false;onlineColorResolved=false;onlineAssignedColor=null;onlinePeerChoice=null;onlineDrawPending=false;stopOnlineClock();
  $("roomCodeBox")?.classList.add("hidden");$("roomInfo").textContent="Waiting for your opponent…";refreshAll();
};
$("copyRoomCode").onclick=async()=>{const code=$("roomCode")?.textContent||"";if(!code||code==="—")return;try{await navigator.clipboard.writeText(code);toast("Room code copied.")}catch{toast(`Room code: ${code}`)}};
function showOnlineLobby(){
  $("onlineLobby")?.classList.remove("hidden");$("onlineSetup")?.classList.add("hidden");$("onlineMatch")?.classList.add("hidden");
}
function resolveOnlineColors(){
  if(!onlinePeerChoice||!conn)return;
  const mine=onlineColorChoice,other=onlinePeerChoice;
  let hostColor;
  if(mine!=="random"&&other!=="random"){
    if(mine!==other) hostColor=mine;
    else hostColor=Math.random()<0.5?mine:(mine==="w"?"b":"w");
  }else if(mine!=="random") hostColor=mine;
  else if(other!=="random") hostColor=other==="w"?"b":"w";
  else hostColor=Math.random()<0.5?"w":"b";
  onlineAssignedColor=onlineRole==="host"?hostColor:(hostColor==="w"?"b":"w");
  onlineColorResolved=true;
  if(onlineRole==="host"&&conn.open)conn.send({type:"color-assignment",hostColor});
  const who=onlineAssignedColor==="w"?"White":"Black";
  $("roomInfo").textContent=`Both players are ready. You are ${who}. Choose the time, then the host can start.`;
  updateStatus();
}
function startOnlineClock(){
  stopOnlineClock();
  onlineClockRunning=true;onlineClockLast=performance.now();
  const frame=now=>{
    if(!onlineClockRunning||!onlineStarted)return;
    const dt=Math.max(0,now-onlineClockLast);onlineClockLast=now;
    const c=onlineGame.turn();onlineClockMs[c]=Math.max(0,onlineClockMs[c]-dt);
    renderOnlineClocks();
    if(onlineClockMs[c]<=0){onlineClockRunning=false;conn?.send({type:"timeout",color:c});finishOnlineTimeout(c);return;}
    onlineClockRaf=requestAnimationFrame(frame);
  };
  onlineClockRaf=requestAnimationFrame(frame);
}
function stopOnlineClock(){onlineClockRunning=false;if(onlineClockRaf)cancelAnimationFrame(onlineClockRaf);onlineClockRaf=0}
function renderOnlineClocks(){
  if($("onlineWhiteClock"))$("onlineWhiteClock").textContent=fmtClock(onlineClockMs.w);
  if($("onlineBlackClock"))$("onlineBlackClock").textContent=fmtClock(onlineClockMs.b);
  if($("onlineWhiteName"))$("onlineWhiteName").textContent=onlineAssignedColor==="w"?"You (White)":"Opponent (White)";
  if($("onlineBlackName"))$("onlineBlackName").textContent=onlineAssignedColor==="b"?"You (Black)":"Opponent (Black)";
  updateOnlineAdvantageBar(fallbackScore(onlineGame));
}
function finishOnlineTimeout(color){
  onlineStarted=false;stopOnlineClock();
  const lostByYou=color===onlineAssignedColor;
  showTimeoutAnnouncement(lostByYou?"You lost, be faster":"You won, cause you ain't slow");
  updateStatus();
}
function sendOnlineMove(move){
  if(conn&&conn.open&&onlineStarted)conn.send({type:"move",ply:onlineGame.history().length,move:{from:move.from,to:move.to,promotion:move.promotion}})
}
function setupConn(c,role){
  conn=c;onlineRole=role;onlineColorResolved=false;onlineAssignedColor=null;onlinePeerChoice=null;onlineStarted=false;onlineDrawPending=false;
  c.on("open",()=>{
    $("roomInfo").textContent="Opponent connected. Choose your color.";
    $("onlineConnectionBadge").textContent="Connected";
    c.send({type:"color-choice",choice:onlineColorChoice});
    updateStatus();
  });
  c.on("data",data=>{
    if(data.type==="color-choice"){onlinePeerChoice=data.choice||"random";if(onlineRole==="host")resolveOnlineColors();}
    if(data.type==="color-assignment"){
      onlineAssignedColor=data.hostColor==="w"?"b":"w";onlineColorResolved=true;
      $("roomInfo").textContent=`Both players are ready. You are ${onlineAssignedColor==="w"?"White":"Black"}. Choose the time, then wait for the host to start.`;updateStatus();
    }
    if(data.type==="start"){
      onlineStarted=true;onlineGame=new Chess();selected.online=null;onlineTimeChoice=Number(data.time)||600000;onlineClockMs={w:onlineTimeChoice,b:onlineTimeChoice};startOnlineClock();
      $("roomInfo").textContent=`Match started. You are ${onlineAssignedColor==="w"?"White":"Black"}.`;refreshAll();
    }
    if(data.type==="move"){
      if(!onlineStarted||!onlineColorResolved)return;
      const expectedPly=onlineGame.history().length+1, expectedColor=onlineGame.turn(), remoteColor=onlineAssignedColor==="w"?"b":"w";
      if(data.ply!==expectedPly||expectedColor!==remoteColor)return;
      try{const move=onlineGame.move(data.move);selected.online=null;refreshAll();if(onlineGame.isGameOver())finishGame("online",onlineGame);else updateStatus()}catch{toast("Received an invalid online move.")}
    }
    if(data.type==="resign"){
      if(!onlineStarted)return;onlineStarted=false;stopOnlineClock();showCheckmateOverlay(data.color==="w"?"White":"Black","Your opponent resign — great job!");updateStatus();return;
    }
    if(data.type==="draw-offer"){
      if(!onlineStarted)return;const accepted=confirm("Your opponent offered a draw. Accept the draw?");if(conn&&conn.open)conn.send({type:accepted?"draw-accept":"draw-decline"});if(!accepted)toast("Draw declined.");return;
    }
    if(data.type==="draw-accept"){if(!onlineStarted)return;onlineStarted=false;onlineDrawPending=false;stopOnlineClock();showDrawOverlay();updateStatus();return;}
    if(data.type==="draw-decline"){onlineDrawPending=false;toast("Your draw offer was declined.");updateStatus();return;}
    if(data.type==="timeout"){if(!onlineStarted)return;finishOnlineTimeout(data.color);return;}
  });
  c.on("close",()=>{$("roomInfo").textContent="Connection closed.";conn=null;onlineStarted=false;onlineColorResolved=false;onlineAssignedColor=null;onlineDrawPending=false;stopOnlineClock();showOnlineLobby();updateStatus()})
}
$("createRoom").onclick=()=>{
  if(typeof Peer==="undefined"){toast("Could not load the online service.");return}
  peer=new Peer();
  peer.on("open",id=>{
    $("roomCode").textContent=id;$("roomCodeBox").classList.remove("hidden");$("roomInfo").textContent="Room created. Share the code and wait for your opponent.";updateStatus();
  });
  peer.on("connection",c=>setupConn(c,"host"));
  peer.on("error",e=>toast(e?.type==="unavailable-id"?"Room service is unavailable.":"Could not create the room."));
};
$("joinRoom").onclick=()=>{
  if(typeof Peer==="undefined"){toast("Could not load the online service.");return}
  const id=$("roomInput").value.trim();if(!id){toast("Enter a room code.");return}
  peer=new Peer();peer.on("open",()=>setupConn(peer.connect(id),"guest"));peer.on("error",()=>toast("Room not found or unavailable."));
};
$("onlineColor")?.addEventListener("change",e=>{if(onlineStarted){e.target.value=onlineColorChoice;return}onlineColorChoice=e.target.value;if(conn&&conn.open)conn.send({type:"color-choice",choice:onlineColorChoice});if(onlineRole==="host"&&onlinePeerChoice)resolveOnlineColors();updateStatus()});
$("onlineTime")?.addEventListener("change",e=>{onlineTimeChoice=Number(e.target.value)||600000;});

window.addEventListener("beforeunload",()=>localStorage.setItem("chessLastPgn",localGame.pgn()));
selectedTime.practice=getTimeMs("practice");
selectedTime.local=getTimeMs("local");
clocks.practice={w:selectedTime.practice,b:selectedTime.practice};
clocks.local={w:selectedTime.local,b:selectedTime.local};
clockState.practice.started=false;clockState.local.started=false;
syncColorLabels();refreshAll();renderAllClocks();renderStats();
