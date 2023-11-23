import{u as e,L as pe,N as je,I as E,O as fe,P as ge,Q as ye,S as Ne}from"./button.b901bdd6.js";import{r as t}from"./index.33c77f1d.js";import{F as xs}from"./fuse.a1032ea1.js";import{u as bs,F as ps,a as I,b as q,c as R,d as J,e as P,f as V}from"./form.b6e565ad.js";import{F as _e}from"./index.esm.ce8faf47.js";import{D as js,L as W}from"./DeepLinkDialog.523b36e7.js";import{B as U}from"./badge.c39a8de4.js";import{w as fs,q as gs,s as ys,r as Ns,$ as Oe,m as Me,n as Ie,x as qe,y as Re,i as Je,j as Ue,o as ze,p as Xe,u as _s,I as z,C as S,b as w,c as v,d as T,k,A as Ss,f as ws}from"./CurrentUser.f9848bfe.js";import{S as Ve}from"./scroll-area.443e8dfc.js";import{P as vs,M as Se,S as N}from"./MarketAssetCard.d6b67e34.js";import{T as ks}from"./toggle.1adcb243.js";import{S as Ds,a as Ts,b as Cs,c as Bs,d as $s}from"./select.29c82d39.js";import{h as we,T as As,a as Fs,b as ee,c as Ye,e as He}from"./common.bc86bc21.js";import{A as Es,a as Ps}from"./avatar.b60ea8a4.js";import{a as ve,b as Ke}from"./CardRow.aa51879f.js";import{c as Ls}from"./User.89aadead.js";import{E as ke}from"./ExternalLink.adef43a2.js";import"./index.2e44db93.js";import"./index.6a2b73ba.js";import"./index.86d2b34a.js";const[Os]=fs({fetcher:async(D,d)=>{const _=await fetch(`http://localhost:8080/api/getObjects/${D}`,{method:"POST",body:JSON.stringify([d])});if(!_||!_.ok){console.log("Failed to fetch pool details");return}let a;try{a=await _.json()}catch(B){console.log({e:B,response:_});return}if(!a||!a.result){console.log("Failed to fetch pool data");return}if(a&&a.result){const B=gs(ys(a.result,!0)),$=JSON.parse(Ns(B));return $&&$.length?$[0]:null}}});function la(){const D=bs({defaultValues:{account:""}}),[d,_]=t.useState(""),a=t.useSyncExternalStore(Oe.subscribe,Oe.get,()=>!0),B=t.useSyncExternalStore(Me.subscribe,Me.get,()=>!0),$=t.useSyncExternalStore(Ie.subscribe,Ie.get,()=>!0),se=t.useSyncExternalStore(qe.subscribe,qe.get,()=>!0),ae=t.useSyncExternalStore(Re.subscribe,Re.get,()=>!0),te=t.useSyncExternalStore(Je.subscribe,Je.get,()=>!0),le=t.useSyncExternalStore(Ue.subscribe,Ue.get,()=>!0),re=t.useSyncExternalStore(ze.subscribe,ze.get,()=>!0),ie=t.useSyncExternalStore(Xe.subscribe,Xe.get,()=>!0),j=t.useMemo(()=>a&&a.chain?a.chain:"bitshares",[a]);_s(j??"bitshares",["marketSearch","assets","pools","globalParams"]);const g=t.useMemo(()=>j&&(B||$)?j==="bitshares"?B:$:[],[B,$,j]),h=t.useMemo(()=>j&&(se||ae)?j==="bitshares"?se:ae:[],[se,ae,j]),Y=t.useMemo(()=>j&&(te||le)?j==="bitshares"?te:le:[],[te,le,j]),H=t.useMemo(()=>j&&(re||ie)?j==="bitshares"?re:ie:[],[re,ie,j]),[De,Qe]=t.useState();t.useEffect(()=>{if(H&&H.length){const r=H.find(i=>i[0]===63),n=we(r[1].fee,5);Qe(n)}},[H]);const[K,Te]=t.useState("asset"),ne=t.useMemo(()=>!h||!h.length?null:new xs(h,{includeScore:!0,threshold:.2,keys:K==="asset"?["asset_a_symbol","asset_b_symbol"]:["share_asset_symbol"]}),[h,K]),[Ze,Ce]=t.useState(!1),[oe,Ge]=t.useState(),[A,ce]=t.useState();t.useEffect(()=>{if(ne&&oe){const r=ne.search(oe);ce(r)}},[ne,oe]);const Be=({index:r,style:n})=>{const i=A[r].item;return e.jsxs("div",{style:{...n},className:"grid grid-cols-12",onClick:()=>{_(i.id),Ce(!1),ce()},children:[e.jsx("div",{className:"col-span-2",children:i.id}),e.jsx("div",{className:"col-span-3",children:i.share_asset_symbol}),e.jsxs("div",{className:"col-span-3",children:[i.asset_a_symbol," (",i.asset_a_id,")"]}),e.jsxs("div",{className:"col-span-3",children:[i.asset_b_symbol," (",i.asset_b_id,")"]}),e.jsxs("div",{className:"col-span-1",children:[i.taker_fee_percent/100,"%"]})]},`acard-${i.id}`)},$e={backgroundColor:"#252526",color:"white"};t.useEffect(()=>{async function r(){if(window.location.search){const n=new URLSearchParams(window.location.search),i=Object.fromEntries(n.entries()),o=i&&i.pool?i.pool:null;if(!o||!o.length){console.log("Invalid pool parameters"),_("1.19.0");return}if(o&&o.length&&!o.includes("1.19.")){console.log("Invalid pool parameters"),_("1.19.0");return}if(!(h&&h.length?h.map(u=>u.id):[]).includes(o)){console.log("Replacing unknown pool with first pool in list"),_("1.19.0");return}_(o)}}h&&h.length&&r()},[h]);const[f,Ae]=t.useState(0),[c,We]=t.useState(),[s,de]=t.useState(""),[l,he]=t.useState(""),[es,Q]=t.useState(!1),ss=es?{transition:"transform 0.5s",transform:"rotate(360deg)"}:{};t.useEffect(()=>{if(h&&d&&g){const r=h.find(o=>o.id===d);if(!r){console.log("Invalid pool");return}We(r);const n=g.find(o=>o.id===r.asset_a_id),i=g.find(o=>o.id===r.asset_b_id);de(n),he(i),Ae(1)}},[d,h,g]);const[m,as]=t.useState();t.useEffect(()=>{let r;return a&&a.chain&&c&&s&&l&&g&&(r=Os([a.chain,c.id]).subscribe(({data:i,error:o,loading:y})=>{if(i&&!o&&!y){let u=i;u.asset_a_symbol=s.symbol,u.asset_a_precision=s.precision,u.asset_b_symbol=l.symbol,u.asset_b_precision=l.precision,u.share_asset_symbol=c.share_asset_symbol,u.readable_balance_a=`${we(u.balance_a,s.precision)} ${s.symbol}`,u.readable_balance_b=`${we(u.balance_b,l.precision)} ${l.symbol}`,u.share_asset_details=g.find(O=>O.id===u.share_asset),as(u)}})),()=>{r&&r()}},[a,c,s,l,g]);const[me,ts]=t.useState(null),[ue,ls]=t.useState(null),[Fe,rs]=t.useState(null),[Ee,is]=t.useState(null),[Pe,ns]=t.useState(null);t.useEffect(()=>{let r,n,i,o,y;if(a&&a.id&&g&&s&&l&&c){r=ve([a.chain,s.id.replace("1.3.","2.3.")]).subscribe(({data:x,error:p,loading:b})=>{x&&!p&&!b&&ts(x)}),n=ve([a.chain,l.id.replace("1.3.","2.3.")]).subscribe(({data:x,error:p,loading:b})=>{x&&!p&&!b&&ls(x)});const C=g.find(x=>x.symbol===c.share_asset_symbol);i=ve([a.chain,C.id.replace("1.3.","2.3.")]).subscribe(({data:x,error:p,loading:b})=>{x&&!p&&!b&&rs(x)}),s.bitasset_data_id&&(o=Ke([a.chain,s.bitasset_data_id]).subscribe(({data:p,error:b,loading:M})=>{p&&!b&&!M&&is(p)})),l.bitasset_data_id&&(y=Ke([a.chain,l.bitasset_data_id]).subscribe(({data:p,error:b,loading:M})=>{p&&!b&&!M&&ns(p)}))}return()=>{r&&r(),n&&n(),i&&i(),o&&o(),y&&y()}},[a,s,l,c,g]);const[X,os]=t.useState();t.useEffect(()=>{let r;return a&&a.id&&s&&l&&(r=Ls([a.chain,a.id]).subscribe(({data:i,error:o,loading:y})=>{i&&!o&&!y&&os(i)})),()=>{r&&r()}},[a,s,l]);const L=t.useMemo(()=>{if(s&&l&&m){let r=function(){if(C===0)return 0;if(C>0)return Math.min(Number(x),Math.ceil(Number(f)*Number(y)*(Number(C)/1e4)))},n=function(){if(G===0)return 0;if(G>0)return Math.min(Number(p),Math.ceil(Number(f)*Number(O)*(Number(G)/1e4)))},i=function(){return typeof b>"u"&&C>0?Number(C)/1e4:typeof b>"u"&&C===0?0:Number(b)/1e4},o=Number(m.balance_a),y=Number(10**s.precision),u=Number(m.balance_b),O=Number(10**l.precision);const C=s.market_fee_percent,G=l.market_fee_percent,x=s.max_market_fee,p=l.max_market_fee,b=m.taker_fee_percent;let M=Number(i()),xe;if(s&&c&&s.id===c.asset_a_id){let F=Number(u)-Math.ceil(Number(u)*Number(o)/(Number(o)+(Number(f)*Number(y)-Number(r())))),be=Number(F)*Number(b)/1e4;xe=(Number(F)-Math.floor(Number(be))-Math.ceil(Math.min(Number(p),Math.ceil(Number(F)*Number(M)))))/Number(O)}else{let F=Number(o)-Math.ceil(Number(o)*Number(u)/(Number(u)+(Number(f)*Number(O)-Number(n())))),be=Number(F)*Number(b)/1e4;xe=(Number(F)-Math.floor(Number(be))-Math.ceil(Math.min(Number(x),Math.ceil(Number(F)*Number(M)))))/Number(y)}return xe}},[f,s,l,m]),[cs,ds]=t.useState();t.useEffect(()=>{ds(e.jsx(z,{readOnly:!0,value:L??0,disabled:!0,className:"mb-3"}))},[L]);const[Z,Le]=t.useState(!1),[hs,ms]=t.useState("default_pool_key");t.useEffect(()=>{d&&d.length&&window.history.replaceState({},"",`?pool=${d}`),ms(`pool_key${Date.now()}`)},[d]);const us=({index:r,style:n})=>{const i=h[r];return e.jsx($s,{value:i.id,style:n,children:`${i.id} - ${i.share_asset_symbol} - ${i.asset_a_symbol}:${i.asset_b_symbol}`})};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"container mx-auto mt-5 mb-5",children:[e.jsx("div",{className:"grid grid-cols-1 gap-3",children:e.jsxs(S,{className:"p-2",children:[e.jsxs(w,{children:[e.jsx(v,{children:"Bitshares Liquidity Pool Exchange"}),e.jsx(T,{children:"Easily swap between Bitshares assets using one of these user created liquidity pools."})]}),e.jsxs(k,{children:[h?null:e.jsx("p",{children:"Loading pool data"}),g?null:e.jsx("p",{children:"Loading asset data"}),h&&g?e.jsxs(e.Fragment,{children:[e.jsx(ps,{...D,children:e.jsxs("form",{onSubmit:()=>{Le(!0),event.preventDefault()},children:[e.jsx(I,{control:D.control,name:"account",render:({field:r})=>e.jsxs(q,{children:[e.jsx(R,{children:"Account"}),e.jsx(J,{children:e.jsxs("div",{className:"grid grid-cols-8",children:[e.jsx("div",{className:"col-span-1 ml-5",children:a&&a.username?e.jsx(Ss,{size:40,name:a.username,extra:"Target",expression:{eye:"normal",mouth:"open"},colors:["#92A1C6","#146A7C","#F0AB3D","#C271B4","#C20D90"]}):e.jsx(Es,{children:e.jsx(Ps,{children:"?"})})}),e.jsx("div",{className:"col-span-7",children:e.jsx(z,{disabled:!0,readOnly:!0,placeholder:"Bitshares account (1.2.x)",className:"mb-3 mt-1",value:`${a.username} (${a.id})`})})]})}),e.jsx(P,{})]})}),e.jsx(I,{control:D.control,name:"pool",render:({field:r})=>e.jsxs(q,{children:[e.jsx(R,{children:"Liquidity pool"}),e.jsx(V,{style:{marginTop:"0px"},children:m?"This is the liquidity pool you have chosen for your asset swap":"Select a liquidity pool to continue with your asset swap"}),e.jsx(J,{onChange:n=>{_(n.target.value)},children:e.jsxs("div",{className:"grid grid-cols-5 mt-3",children:[e.jsx("div",{className:"mt-1 col-span-4",children:e.jsxs(Ds,{children:[e.jsx(Ts,{className:"mb-3",children:e.jsx(Cs,{placeholder:c?`${c.id} - ${c.share_asset_symbol} - ${c.asset_a_symbol}:${c.asset_b_symbol}`:"Select a pool.."})}),e.jsx(Bs,{className:"bg-white",children:h&&h.length?e.jsx(_e,{height:150,itemCount:h.length,itemSize:35,className:"w-full",initialScrollOffset:h.map(n=>n.id).indexOf(d)*35,children:us}):null})]},hs)}),e.jsx("div",{className:"text-gray-500 text-right col-span-1 ml-3",children:e.jsxs(pe,{open:Ze,onOpenChange:n=>{n||ce(),Ce(n)},children:[e.jsx(je,{asChild:!0,children:e.jsx(E,{variant:"outline",className:"h-9 mt-1 p-3 w-full",children:"Search"})}),e.jsxs(fe,{className:"sm:max-w-[900px] bg-white",children:[e.jsxs(ge,{children:[e.jsx(ye,{children:"Search for a liquidity pool"}),e.jsx(Ne,{children:"Select a search result to proceed with your desired asset swap."})]}),e.jsx("div",{className:"grid grid-cols-1",children:e.jsx("div",{className:"col-span-1",children:e.jsxs(As,{defaultValue:"asset",children:[e.jsxs(Fs,{className:"grid max-w-[400px] grid-cols-2 mb-1 gap-3",children:[K==="asset"?e.jsx(ee,{style:$e,value:"asset",children:"Swappable assets"}):e.jsx(ee,{value:"asset",onClick:()=>Te("asset"),children:"Swappable assets"}),K==="share"?e.jsx(ee,{style:$e,value:"share",children:"Pool share asset"}):e.jsx(ee,{value:"share",onClick:()=>Te("share"),children:"Pool share asset"})]}),e.jsx(z,{name:"assetSearch",placeholder:"Enter search text",className:"mb-3 max-w-[400px]",onChange:n=>{Ge(n.target.value),n.preventDefault(),n.stopPropagation()}}),e.jsx(Ye,{value:"share",children:A&&A.length?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"grid grid-cols-12",children:[e.jsx("div",{className:"col-span-2",children:"ID"}),e.jsx("div",{className:"col-span-3",children:e.jsx("b",{children:"Share asset"})}),e.jsx("div",{className:"col-span-3",children:"Asset A"}),e.jsx("div",{className:"col-span-3",children:"Asset B"}),e.jsx("div",{className:"col-span-1",children:"Taker Fee"})]}),e.jsx(_e,{height:400,itemCount:A.length,itemSize:45,className:"w-full",children:Be})]}):null}),e.jsx(Ye,{value:"asset",children:A&&A.length?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"grid grid-cols-12",children:[e.jsx("div",{className:"col-span-2",children:"ID"}),e.jsx("div",{className:"col-span-3",children:"Share asset"}),e.jsx("div",{className:"col-span-3",children:e.jsx("b",{children:"Asset A"})}),e.jsx("div",{className:"col-span-3",children:e.jsx("b",{children:"Asset B"})}),e.jsx("div",{className:"col-span-1",children:"Taker Fee"})]}),e.jsx(_e,{height:400,itemCount:A.length,itemSize:45,className:"w-full",children:Be})]}):null})]})})})]})]})})]})}),e.jsx(P,{})]})}),e.jsx("div",{className:"grid grid-cols-11 gap-5 mt-1 mb-1",children:d&&m&&s&&l?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"col-span-5",children:e.jsxs(S,{children:[e.jsx(w,{className:"pb-0",children:e.jsxs(v,{className:"text-sm pt-0",children:["Swappable"," ",e.jsx(ke,{classnamecontents:"text-blue-500",type:"text",text:s.symbol,hyperlink:`https://blocksights.info/#/assets/${s.id}`})]})}),e.jsx(k,{className:"text-lg mt-0 pt-0",children:m.readable_balance_a.split(" ")[0]})]})}),e.jsx("div",{className:"col-span-1 text-center mt-8",children:e.jsx(ks,{variant:"outline",onClick:()=>{const r=s;de(l),he(r),Q(!0),setTimeout(()=>Q(!1),500)},children:e.jsx("svg",{style:ss,width:"15",height:"15",viewBox:"0 0 15 15",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:e.jsx("path",{d:"M1.90321 7.29677C1.90321 10.341 4.11041 12.4147 6.58893 12.8439C6.87255 12.893 7.06266 13.1627 7.01355 13.4464C6.96444 13.73 6.69471 13.9201 6.41109 13.871C3.49942 13.3668 0.86084 10.9127 0.86084 7.29677C0.860839 5.76009 1.55996 4.55245 2.37639 3.63377C2.96124 2.97568 3.63034 2.44135 4.16846 2.03202L2.53205 2.03202C2.25591 2.03202 2.03205 1.80816 2.03205 1.53202C2.03205 1.25588 2.25591 1.03202 2.53205 1.03202L5.53205 1.03202C5.80819 1.03202 6.03205 1.25588 6.03205 1.53202L6.03205 4.53202C6.03205 4.80816 5.80819 5.03202 5.53205 5.03202C5.25591 5.03202 5.03205 4.80816 5.03205 4.53202L5.03205 2.68645L5.03054 2.68759L5.03045 2.68766L5.03044 2.68767L5.03043 2.68767C4.45896 3.11868 3.76059 3.64538 3.15554 4.3262C2.44102 5.13021 1.90321 6.10154 1.90321 7.29677ZM13.0109 7.70321C13.0109 4.69115 10.8505 2.6296 8.40384 2.17029C8.12093 2.11718 7.93465 1.84479 7.98776 1.56188C8.04087 1.27898 8.31326 1.0927 8.59616 1.14581C11.4704 1.68541 14.0532 4.12605 14.0532 7.70321C14.0532 9.23988 13.3541 10.4475 12.5377 11.3662C11.9528 12.0243 11.2837 12.5586 10.7456 12.968L12.3821 12.968C12.6582 12.968 12.8821 13.1918 12.8821 13.468C12.8821 13.7441 12.6582 13.968 12.3821 13.968L9.38205 13.968C9.10591 13.968 8.88205 13.7441 8.88205 13.468L8.88205 10.468C8.88205 10.1918 9.10591 9.96796 9.38205 9.96796C9.65819 9.96796 9.88205 10.1918 9.88205 10.468L9.88205 12.3135L9.88362 12.3123C10.4551 11.8813 11.1535 11.3546 11.7585 10.6738C12.4731 9.86976 13.0109 8.89844 13.0109 7.70321Z",fill:"currentColor",fillRule:"evenodd",clipRule:"evenodd"})})})}),e.jsx("div",{className:"col-span-5",children:e.jsxs(S,{children:[e.jsx(w,{className:"pb-0",children:e.jsxs(v,{className:"text-sm pt-0",children:["Swappable"," ",e.jsx(ke,{classnamecontents:"text-blue-500",type:"text",text:l.symbol,hyperlink:`https://blocksights.info/#/assets/${l.id}`})]})}),e.jsx(k,{className:"text-lg",children:m.readable_balance_b.split(" ")[0]})]})})]}):null}),d&&d.length?e.jsx(e.Fragment,{children:e.jsx(I,{control:D.control,name:"sellAmount",render:({field:r})=>e.jsxs(q,{children:[e.jsx(R,{children:`Amount of ${s?s.symbol:"???"} to swap`}),e.jsxs(V,{style:{marginTop:"0px"},children:["Enter the amount of ",s?s.symbol:"???"," you want to swap for ",l?l.symbol:"???"]}),e.jsx(J,{onChange:n=>{const i=n.target.value;/^[0-9]*\.?[0-9]*$/.test(i)&&Ae(i)},children:e.jsx("div",{className:"grid grid-cols-2",children:e.jsx("div",{className:"col-span-1",children:e.jsx(z,{label:`Amount of ${s?s.symbol:"???"} to swap`,value:f,placeholder:f,className:"mb-3"})})})}),e.jsx(P,{})]})})}):null,m?e.jsx(e.Fragment,{children:e.jsx(I,{control:D.control,name:"buyAmount",render:({field:r})=>e.jsxs(q,{children:[e.jsx(R,{children:"Total amount"}),e.jsx(V,{style:{marginTop:"0px"},children:`This is the amount of ${l?l.symbol:"???"} you'll receive in return for ${s?s.symbol:"???"}`}),e.jsx(J,{children:e.jsx("div",{className:"grid grid-cols-2 mb-3 mt-3",children:e.jsx("div",{className:"col-span-1",children:cs})})}),e.jsx(P,{})]})})}):null,f&&m&&m.taker_fee_percent?e.jsx(e.Fragment,{children:e.jsx(I,{control:D.control,name:"poolFee",render:({field:r})=>e.jsxs(q,{children:[e.jsx(R,{children:"Pool fee"}),e.jsx(V,{style:{marginTop:"0px"},children:"This is the estimated fee you'll pay to the pool for this swap"}),e.jsx(J,{children:e.jsx("div",{className:"grid grid-cols-2 mb-3 mt-3",children:e.jsx("div",{className:"col-span-1",children:e.jsx(z,{disabled:!0,readOnly:!0,placeholder:"0",value:`${(m.taker_fee_percent/1e4*f).toFixed(s.precision)} (${s.symbol}) (${m.taker_fee_percent/100}% fee)`})})})}),e.jsx(P,{})]})})}):null,c?e.jsx(I,{control:D.control,name:"networkFee",render:({field:r})=>e.jsxs(q,{children:[e.jsx(R,{children:"Network fee"}),e.jsx(V,{style:{marginTop:"0px"},children:"This is the cost to broadcast your pool exchange operation onto the blockchain"}),e.jsx(J,{children:e.jsx("div",{className:"grid grid-cols-2 mb-3 mt-3",children:e.jsx("div",{className:"col-span-1",children:e.jsx(z,{disabled:!0,readOnly:!0,placeholder:`${De} BTS`})})})}),a.id===a.referrer?e.jsxs(P,{children:["Rebate: ",De*.8," BTS (vesting)"]}):null,e.jsx(P,{})]})}):null,!d||!f||!L||Z!==!1?e.jsx(E,{className:"mt-5 mb-3",variant:"outline",disabled:!0,type:"submit",children:"Submit"}):e.jsx(E,{className:"mt-5 mb-3",variant:"outline",type:"submit",children:"Submit"})]})}),Z?e.jsx(js,{operationName:"liquidity_pool_exchange",username:a.username,usrChain:a.chain,userID:a.id,dismissCallback:Le,headerText:`Exchanging ${f} ${s.symbol} for ${L} ${l.symbol}`,trxJSON:[{account:a.id,pool:d,amount_to_sell:{amount:He(f,s.precision),asset_id:s.id},min_to_receive:{amount:He(L,l.precision),asset_id:l.id},extensions:[]}]},`Exchanging${f}${s.symbol}for${L}${l.symbol}`):null,d&&!Z?e.jsx(E,{variant:"outline",mt:"xl",onClick:()=>{const r=s;de(l),he(r),Q(!0),setTimeout(()=>Q(!1),500)},children:"Swap buy/sell"}):null,d&&Z?e.jsx(E,{variant:"outline",mt:"xl",disabled:!0,children:"Swap buy/sell"}):null,d?e.jsx(ke,{variant:"outline",classnamecontents:"ml-2",type:"button",text:"Blocksights pool explorer",hyperlink:`https://blocksights.info/#/pools/${d}${a.chain!=="bitshares"?"?network=testnet":""}`}):null,m?e.jsxs(pe,{children:[e.jsx(je,{asChild:!0,children:e.jsx(E,{className:"ml-2",variant:"outline",children:"Pool JSON"})}),e.jsxs(fe,{className:"sm:max-w-[550px] bg-white",children:[e.jsxs(ge,{children:[e.jsx(ye,{children:"Liquidity Pool JSON"}),e.jsx(Ne,{children:"Check out the details returned by the network for this pool"})]}),e.jsx("div",{className:"grid grid-cols-1",children:e.jsx("div",{className:"col-span-1",children:e.jsx(Ve,{className:"h-72 rounded-md border",children:e.jsx("pre",{children:JSON.stringify(m,null,2)})})})})]})]}):null,me&&ue?e.jsxs(pe,{children:[e.jsx(je,{asChild:!0,children:e.jsx(E,{className:"ml-2",variant:"outline",children:"Swappable asset JSON"})}),e.jsxs(fe,{className:"sm:max-w-[550px] bg-white",children:[e.jsxs(ge,{children:[e.jsx(ye,{children:"Swappable asset JSON"}),e.jsx(Ne,{children:"Check out the details returned by the network this pool's swappable assets"})]}),e.jsx("div",{className:"grid grid-cols-1",children:e.jsx("div",{className:"col-span-1",children:e.jsx(Ve,{className:"h-72 rounded-md border",children:e.jsx("pre",{children:JSON.stringify({assetA:s??"",assetADetails:me??{},aBitassetData:Ee??{},assetB:l??"",assetBDetails:ue??{},bBitassetData:Pe??{},poolShareDetails:Fe??{}},null,2)})})})})]})]}):null]}):null]})]})}),s&&l?e.jsx(vs,{assetA:s.symbol,assetAData:s,assetB:l.symbol,assetBData:l,chain:a.chain}):null,e.jsxs("div",{className:"grid grid-cols-2 gap-5 mt-5",children:[d?e.jsx("div",{className:"grid grid-cols-1 gap-3",children:X&&m?e.jsxs(e.Fragment,{children:[e.jsx(Se,{asset:l.symbol,assetData:l,assetDetails:ue,bitassetData:Pe,marketSearch:Y,chain:a.chain,usrBalances:X,type:"buy"}),e.jsx(Se,{asset:s.symbol,assetData:s,assetDetails:me,bitassetData:Ee,marketSearch:Y,chain:a.chain,usrBalances:X,type:"sell"})]}):e.jsxs(e.Fragment,{children:[e.jsxs(S,{children:[e.jsxs(w,{className:"pb-2 pt-4",children:[e.jsx(v,{children:"Quote asset"}),e.jsx(T,{className:"text-lg",children:"Loading..."})]}),e.jsx(k,{children:e.jsxs("div",{className:"space-y-2",children:[e.jsx(N,{className:"h-4 w-[250px]"}),e.jsx(N,{className:"h-4 w-[200px]"}),e.jsx(N,{className:"h-4 w-[250px]"}),e.jsx(N,{className:"h-4 w-[200px]"})]})})]}),e.jsxs(S,{children:[e.jsxs(w,{className:"pb-2 pt-4",children:[e.jsx(v,{children:"Base asset"}),e.jsx(T,{className:"text-lg",children:"Loading..."})]}),e.jsx(k,{children:e.jsxs("div",{className:"space-y-2",children:[e.jsx(N,{className:"h-4 w-[250px]"}),e.jsx(N,{className:"h-4 w-[200px]"}),e.jsx(N,{className:"h-4 w-[250px]"}),e.jsx(N,{className:"h-4 w-[200px]"})]})})]})]})}):null,e.jsx("div",{className:"grid grid-cols-1 gap-3",children:d&&s&&l?e.jsxs(e.Fragment,{children:[e.jsx("a",{href:`/dex/index.html?market=${s.symbol}_${l.symbol}`,children:e.jsxs(S,{children:[e.jsxs(w,{className:"pb-2 pt-4",children:[e.jsx(v,{children:"Trade on the Dex instead?"}),e.jsxs(T,{className:"text-sm",children:["Market: ",s.symbol,"/",l.symbol]})]}),e.jsx(k,{className:"text-sm pb-2",children:"You can manually create limit orders for trading pairs of your choice on the Bitshares DEX"})]})}),e.jsx("a",{href:`/dex/index.html?market=${c?.share_asset_symbol}_${s.symbol!=="BTS"?"BTS":s.symbol}`,children:e.jsxs(S,{children:[e.jsxs(w,{className:"pb-2 pt-4",children:[e.jsx(v,{children:"Purchase stake in this pool?"}),e.jsxs(T,{className:"text-sm",children:["Share asset: ",c?.share_asset_symbol]})]}),e.jsx(k,{className:"text-sm pb-2",children:"Receive swap fee yield over time by owning a stake in the pool via a market limit order."})]})}),e.jsx("a",{href:`/stake/index.html?pool=${d}`,children:e.jsxs(S,{children:[e.jsxs(w,{className:"pb-2 pt-4",children:[e.jsx(v,{children:"Stake assets in this pool?"}),e.jsxs(T,{className:"text-sm",children:["Share asset: ",c?.share_asset_symbol]})]}),e.jsx(k,{className:"text-sm pb-2",children:"Earn swap fees on assets staked in liquidity pools minus a small pool defined withdrawal fee."})]})}),e.jsxs(S,{children:[e.jsxs(w,{className:"pb-2 pt-4",children:[e.jsx(v,{children:"Need to borrow some assets?"}),e.jsx(T,{className:"text-sm",children:"DEX users lend assets at user defined rates. You could borrow from DEX participants, at their defined rates."})]}),e.jsxs(k,{className:"text-sm pb-3",children:[e.jsx(W,{children:"Search by borrowable assets"}),e.jsx("br",{}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${s.symbol}`,children:e.jsx(U,{children:s.symbol})}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${l.symbol}`,children:e.jsx(U,{className:"ml-2 mt-1 mb-1",children:l.symbol})}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${c?.share_asset_symbol}`,children:e.jsx(U,{className:"ml-2 mt-1 mb-1",children:c?.share_asset_symbol})}),e.jsx("br",{}),e.jsx(W,{children:"Search by accepted collateral"}),e.jsx("br",{}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${s.symbol}`,children:e.jsx(U,{children:s.symbol})}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${l.symbol}`,children:e.jsx(U,{className:"ml-2 mt-1",children:l.symbol})}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${c?.share_asset_symbol}`,children:e.jsx(U,{className:"ml-2 mt-1",children:c?.share_asset_symbol})})]})]}),m&&Y&&X?e.jsx(Se,{asset:m.share_asset_symbol,assetData:m.share_asset_details,assetDetails:Fe,bitassetData:null,marketSearch:Y,chain:a.chain,usrBalances:X,type:"pool"}):e.jsxs(S,{children:[e.jsxs(w,{className:"pb-2 pt-4",children:[e.jsx(v,{children:"Pool share asset"}),e.jsx(T,{className:"text-lg",children:"Loading..."})]}),e.jsx(k,{children:e.jsxs("div",{className:"space-y-2",children:[e.jsx(N,{className:"h-4 w-[250px]"}),e.jsx(N,{className:"h-4 w-[200px]"}),e.jsx(N,{className:"h-4 w-[250px]"}),e.jsx(N,{className:"h-4 w-[200px]"})]})})]})]}):null})]})]}),e.jsx("div",{className:"grid grid-cols-1 mt-5 ml-8 mr-8",children:e.jsxs(S,{children:[e.jsxs(w,{className:"pb-3",children:[e.jsx(v,{children:"Risks associated with liquidity pool exchanges"}),e.jsx(T,{children:"Please do your own research into liquidity pools and their swappable assets before proceeding."})]}),e.jsxs(k,{children:[e.jsxs("span",{className:"text-sm",children:[e.jsx(W,{className:"mb-0 pb-0 text-lg",children:"Liquidity pool risks"}),e.jsxs("ul",{className:"ml-2 list-disc [&>li]:mt-1 pl-2",children:[e.jsx("li",{children:"As liquidity pools are user configured they have highly unique properties and different owners; as such, they have unique risk profiles. Check that the pool fee and pool exchange rate are reasonable before proceeding with asset swap."}),e.jsx("li",{children:"As anyone can stake funds into both sides of the pool, pool liquidity is dynamic. If you make a swap, the opportunity to perform a reverse swap may not be available at a later time at the same price."})]})]}),e.jsxs("span",{className:"text-sm",children:[e.jsx(W,{className:"mb-0 pb-0 text-lg",children:"Swappable asset risks"}),e.jsxs("ul",{className:"ml-2 list-disc [&>li]:mt-1 pl-2",children:[e.jsx("li",{children:"As the liquidity pool assets can be user owned & configured, they have their own unique risk profiles; Check each asset's flags, permissions, market fee and issuers to gauge risk."}),e.jsxs("li",{children:["If you try to swap assets in excess of available swappable assets your swap price will greatly suffer. You should instead swap small amounts and await pool balance replenishment. If you want to swap a larger amount you should consider"," ",e.jsx("a",{href:`/dex/index.html?market=${c?.share_asset_symbol}_${s.symbol!=="BTS"?"BTS":s.symbol}`,className:"text-blue-500",children:"creating a limit order on the DEX"})," ","instead."]}),e.jsx("li",{children:"The value of the swappable assets themselves can fluctuate based on external factors (external cex volume) as well as internal factors (asset issuer & price feed publisher actions). Make sure you trust a pool's swappable assets before performing a swap."})]})]})]})]})}),a&&a.username&&a.username.length?e.jsx(ws,{usr:a}):null]})}export{la as default};
