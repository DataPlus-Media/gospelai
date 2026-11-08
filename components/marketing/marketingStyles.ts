// Scoped transcription of the supplied GospelAI HTML, including its final overrides.
export const marketingStyles = `
.gospel-marketing{color-scheme:light;--paper:#edf0eb;--ink:#213237;--muted:#4b6464;--wine:#276f63;--line:#b8cbc2;--panel:#dee8df;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,sans-serif;min-height:100dvh;width:100%;height:100%;overflow-y:auto;flex:1}
.gospel-marketing[data-theme=dark]{color-scheme:dark;--paper:#0d171b;--ink:#f1f5f1;--muted:#9db1b5;--wine:#a9e3df;--line:#2b4147;--panel:#17262b}
.gospel-marketing *{box-sizing:border-box}
.gospel-marketing a{color:inherit}
.gospel-marketing button{font:inherit;cursor:pointer}
.gospel-marketing a:focus-visible,.gospel-marketing button:focus-visible,.gospel-marketing summary:focus-visible{outline:3px solid var(--wine);outline-offset:5px}
.gospel-marketing h1,.gospel-marketing h2,.gospel-marketing h3,.gospel-marketing blockquote{font-family:Georgia,serif;font-weight:400;line-height:1.02;margin:0;letter-spacing:-.045em}
.gospel-marketing h1{font-size:clamp(3.5rem,8vw,7.5rem)}
.gospel-marketing h2{font-size:clamp(2.6rem,5.8vw,5.25rem)}
.gospel-marketing h3{font-size:2.2rem}
.gospel-marketing em{color:var(--wine);font-weight:400}
.gospel-marketing p{color:var(--muted);margin:1em 0}
.gospel-marketing .label{font-size:.69rem;font-weight:750;letter-spacing:.19em;text-transform:uppercase;color:var(--wine)}
.gospel-marketing .wrap{width:min(1100px,calc(100% - 44px));margin:auto}
.gospel-marketing .skip{position:fixed;top:-100px}
.gospel-marketing .skip:focus{top:12px;z-index:9;background:var(--paper)}
.gospel-marketing header{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:24px 0}
.gospel-marketing .brand{display:inline-flex;gap:10px;align-items:center;text-decoration:none;font:1.25rem Georgia,serif}
.gospel-marketing .brand svg{width:34px;color:var(--wine)}
.gospel-marketing .actions,.gospel-marketing .buttons{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
.gospel-marketing .pill,.gospel-marketing .round{border:1px solid var(--line);background:var(--paper);color:var(--ink);border-radius:100px;padding:10px 18px;text-decoration:none;font-size:.86rem;font-weight:650;display:inline-block}
.gospel-marketing .primary{background:#a9e3df;border-color:#a9e3df;color:#173538}
.gospel-marketing .round[hidden]{display:none}
.gospel-marketing .round{padding:0;width:44px;height:44px;display:grid;place-items:center}
.gospel-marketing details{position:relative}
.gospel-marketing summary{cursor:pointer;list-style:none}
.gospel-marketing summary::-webkit-details-marker{display:none}
.gospel-marketing nav{position:absolute;right:0;top:54px;width:215px;background:var(--paper);border:1px solid var(--line);padding:14px;border-radius:14px;box-shadow:0 12px 28px #0002}
.gospel-marketing nav a{display:block;padding:8px;text-decoration:none}
.gospel-marketing nav a:hover,.gospel-marketing .pill:hover{box-shadow:inset 0 0 0 1px var(--wine)}
.gospel-marketing .hero{text-align:center;position:relative;min-height:690px;display:grid;place-items:center;padding:90px 100px 112px;overflow:hidden;isolation:isolate;background:radial-gradient(ellipse at 50% 15%,#59958b25,transparent 66%)}
.gospel-marketing .hero-content{max-width:850px;position:relative}
.gospel-marketing .hero p:not(.label){max-width:525px;margin:22px auto 25px;font-size:1.1rem}
.gospel-marketing .hero .buttons{justify-content:center}
.gospel-marketing .down{display:inline-block;margin-top:42px;text-decoration:none}
.gospel-marketing .rail{position:absolute;top:0;bottom:0;width:clamp(80px,8vw,119px);display:grid;gap:10px;overflow:hidden;mask-image:linear-gradient(transparent,#000 18%,#000 82%,transparent)}
.gospel-marketing .left{left:0}
.gospel-marketing .right{right:0}
.gospel-marketing .rail-track{display:grid;gap:10px;align-content:start;animation:gospel-shelf 29s linear infinite;width:100%}
.gospel-marketing .right .rail-track{animation-direction:reverse;animation-duration:34s}
.gospel-marketing[data-motion=paused] .rail-track{animation-play-state:paused}
@keyframes gospel-shelf{to{transform:translateY(-50%)}}
.gospel-marketing .tile{aspect-ratio:.74;border-radius:16px;padding:10px;display:flex;flex-direction:column;justify-content:space-between;text-align:left;font:1.23rem Georgia,serif;background:#a9e3df;color:#173538}
.gospel-marketing .tile small{font:650 .56rem/1.3 system-ui;letter-spacing:.14em;text-transform:uppercase}
.gospel-marketing .tile:nth-child(2n){background:#24464a;color:#e0f7f1}
.gospel-marketing .tile:nth-child(3n){background:#17262b;color:#a9e3df}
.gospel-marketing .tile:nth-child(5n){background:#dce7de;color:#213237}
.gospel-marketing .showcase{background:var(--panel);padding:50px 12px 34px;text-align:center;overflow:hidden;border-block:1px solid var(--line)}
.gospel-marketing .phones{display:flex;align-items:center;justify-content:center;gap:clamp(6px,2vw,25px);max-width:790px;margin:22px auto 0}
.gospel-marketing .phone{position:relative;width:min(26vw,230px);aspect-ratio:.62;border:5px solid #263338;border-radius:26px;background:#0d171b;color:#f1f5f1;text-align:left;padding:25px clamp(7px,2vw,23px) 12px;box-shadow:0 12px 28px #0003;font-size:clamp(.55rem,1.5vw,.89rem);transition:transform .35s ease,opacity .35s ease;opacity:.72}
.gospel-marketing .phone:before{content:'';position:absolute;top:8px;left:37%;width:26%;height:7px;border-radius:10px;background:#263338}
.gospel-marketing .phone b{font:clamp(.95rem,2.5vw,1.9rem) Georgia,serif;display:block;margin:8px 0;overflow-wrap:anywhere}
.gospel-marketing .phone small{letter-spacing:.12em;text-transform:uppercase;color:#a9e3df}
.gospel-marketing .phone span{display:block;border-radius:10px;background:#17262b;border:1px solid #2b4147;padding:9px;margin-top:8px}
.gospel-marketing .phone.main{transform:translateY(-8px);opacity:1;border-color:#59958b}
.gospel-marketing .controls{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:24px}
.gospel-marketing .controls output{min-width:105px;color:var(--muted);font-size:.85rem}
.gospel-marketing .section{padding:85px 0;border-bottom:1px solid var(--line)}
.gospel-marketing .intro{text-align:center}
.gospel-marketing .intro h2{max-width:850px;margin:auto}
.gospel-marketing .intro p{margin:22px auto 0;max-width:560px}
.gospel-marketing .lead{max-width:720px;margin-bottom:36px}
.gospel-marketing .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.gospel-marketing .card{border:1px solid var(--line);border-radius:18px;padding:24px;background:var(--panel)}
.gospel-marketing .card .label{margin-top:0}
.gospel-marketing .demo{display:grid;grid-template-columns:1fr 1fr;gap:38px;align-items:start}
.gospel-marketing .prompts{display:flex;gap:8px;flex-wrap:wrap}
.gospel-marketing .prompts button[aria-pressed=true]{border-color:var(--wine);color:var(--wine)}
.gospel-marketing .answer{min-height:225px}
.gospel-marketing .answer p:last-child{margin-bottom:0}
.gospel-marketing .author-controls{margin-bottom:14px}
.gospel-marketing .author-detail{min-height:190px}
.gospel-marketing .author-detail p:last-child{max-width:620px}
.gospel-marketing .support{background:var(--panel)}
.gospel-marketing .study-links{display:flex;gap:9px;flex-wrap:wrap;margin-top:28px}
.gospel-marketing footer{padding:38px 0 55px}
.gospel-marketing .foot{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:14px}
.gospel-marketing footer a:not(.brand){margin-right:14px}
.gospel-marketing .fine{font-size:.82rem}
@media(max-width:680px){
.gospel-marketing header{padding:16px 0}
.gospel-marketing .top-support{display:none}
.gospel-marketing .hero{min-height:620px;padding:70px 35px 75px}
.gospel-marketing .rail{width:42px;opacity:.44}
.gospel-marketing .tile{padding:4px;font-size:.65rem;border-radius:8px}
.gospel-marketing .tile small{font-size:.32rem}
.gospel-marketing .left{left:-13px}
.gospel-marketing .right{right:-13px}
.gospel-marketing .hero h1{font-size:clamp(2.9rem,12vw,4.7rem)}
.gospel-marketing .hero p:not(.label){font-size:1rem}
.gospel-marketing .section{padding:58px 0}
.gospel-marketing .grid,.gospel-marketing .demo{grid-template-columns:1fr}
.gospel-marketing .phone{border-width:3px;border-radius:16px;padding-top:20px}
.gospel-marketing .phones{margin-top:30px}
.gospel-marketing .phone span{padding:5px;font-size:.56rem}
}
@media(prefers-reduced-motion:reduce){
.gospel-marketing .rail-track{animation:none}
.gospel-marketing .phone{transition:none}
.gospel-marketing .motion-control{display:none}
}
`;
