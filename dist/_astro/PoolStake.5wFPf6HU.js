import{u as we,l as De,j as s,i as Te}from"./utils.CoSl1RWq.js";import{r as l}from"./index.sXsv9c-e.js";import{F as Be}from"./fuse.aCsZfKX4.js";import{u as $e,F as Fe,a as A,b as w,c as D,d as T,f as ps,e as Ce}from"./form.udPx8mwr.js";import{F as js}from"./index.esm.yz4690tU.js";import{L as $,D as Us}from"./DeepLinkDialog.HLUa6rT4.js";import{B as V}from"./badge.KzOuQ34z.js";import{B as W}from"./button._UsuMLkQ.js";import{I as k}from"./input.LAd1ue8h.js";import{S as zs}from"./scroll-area.zUgU1QDW.js";import{M as Ss,S as y}from"./MarketAssetCard.lQELfzGD.js";import{P as gs,a as _s,b as fs}from"./popover.u-Mm-IT9.js";import{$ as Vs,C as F,a as C,b as E,c as O,d as I}from"./users.M21O9cX4.js";import{l as ks,m as ys,n as Ns,o as Ps,p as vs,q as As}from"./dialog.8HOXxM8G.js";import{S as Ee,a as Oe,b as Ie,c as Re,d as Me}from"./select.X9HrpY5y.js";import{h as S,T as Ws,a as Hs,c as R,d as Z,b as ws}from"./common.1hfIZstp.js";import{A as Je,a as Le}from"./avatar.QQpX46xN.js";import{A as qe}from"./Avatar.YIoG-MVg.js";import{f as Ks,g as Ys,j as Gs,k as Qs,b as Xs,c as Zs,d as se,e as ee,u as Ue}from"./Init.MhOaBiuT.js";import{d as Ds,e as ae}from"./Assets.JWfepgwa.js";import{c as ze,a as Ve}from"./Pools.oVNrfFti.js";import{b as We}from"./User.bnexxm_Z.js";import{E as Ts}from"./ExternalLink.su8-pHSR.js";import"./index.uYDp4DLV.js";import"./index.QjywInIh.js";import"./index.sg5Asqa-.js";import"./index.f2GGseSc.js";import"./CardRow.Q7cvBaVs.js";import"./index.0G9Tm10-.js";import"./index.nCjDGh3z.js";import"./index.UUjOqZ5j.js";function va(){const{t:e,i18n:He}=we(De.get(),{i18n:Te}),N=$e({defaultValues:{account:""}}),[x,q]=l.useState(""),r=l.useSyncExternalStore(Vs.subscribe,Vs.get,()=>!0),ss=l.useSyncExternalStore(Ks.subscribe,Ks.get,()=>!0),es=l.useSyncExternalStore(Ys.subscribe,Ys.get,()=>!0),as=l.useSyncExternalStore(Gs.subscribe,Gs.get,()=>!0),ts=l.useSyncExternalStore(Qs.subscribe,Qs.get,()=>!0),ls=l.useSyncExternalStore(Xs.subscribe,Xs.get,()=>!0),os=l.useSyncExternalStore(Zs.subscribe,Zs.get,()=>!0),rs=l.useSyncExternalStore(se.subscribe,se.get,()=>!0),is=l.useSyncExternalStore(ee.subscribe,ee.get,()=>!0),g=l.useMemo(()=>r&&r.chain?r.chain:"bitshares",[r]);Ue(g??"bitshares",["marketSearch","assets","pools","globalParams"]);const f=l.useMemo(()=>g&&(ss||es)?g==="bitshares"?ss:es:[],[ss,es,g]),m=l.useMemo(()=>g&&(as||ts)?g==="bitshares"?as:ts:[],[as,ts,g]),G=l.useMemo(()=>g&&(ls||os)?g==="bitshares"?ls:os:[],[ls,os,g]),B=l.useMemo(()=>g&&(rs||is)?g==="bitshares"?rs:is:[],[rs,is,g]),[Bs,te]=l.useState();l.useEffect(()=>{if(B&&B.length){const o=B.find(a=>a[0]===61),i=S(o[1].fee,5);te(i)}},[B]);const[$s,le]=l.useState();l.useEffect(()=>{if(B&&B.length){const o=B.find(a=>a[0]===62),i=S(o[1].fee,5);le(i)}},[B]);const[Q,Fs]=l.useState("asset"),[v,Cs]=l.useState("stake"),ns=l.useMemo(()=>!m||!m.length?null:new Be(m,{includeScore:!0,threshold:.2,keys:Q==="asset"?["asset_a_symbol","asset_b_symbol"]:["share_asset_symbol"]}),[m,Q]),[oe,Es]=l.useState(!1),[cs,re]=l.useState(),[M,ds]=l.useState();l.useEffect(()=>{if(ns&&cs){const o=ns.search(cs);ds(o)}},[ns,cs]);const Os=({index:o,style:i})=>{const a=M[o].item;return s.jsxs("div",{style:{...i},className:"grid grid-cols-12",onClick:()=>{q(a.id),Es(!1),ds()},children:[s.jsx("div",{className:"col-span-2",children:a.id}),s.jsx("div",{className:"col-span-3",children:a.share_asset_symbol}),s.jsxs("div",{className:"col-span-3",children:[a.asset_a_symbol," (",a.asset_a_id,")"]}),s.jsxs("div",{className:"col-span-3",children:[a.asset_b_symbol," (",a.asset_b_id,")"]}),s.jsxs("div",{className:"col-span-1",children:[a.taker_fee_percent/100,"%"]})]},`acard-${a.id}`)},X={backgroundColor:"#252526",color:"white"};l.useEffect(()=>{async function o(){if(window.location.search){const i=new URLSearchParams(window.location.search),a=Object.fromEntries(i.entries()),d=a&&a.pool?a.pool:null;if(!d||!d.length){console.log("Invalid pool parameters"),q("1.19.0");return}if(d&&d.length&&!d.includes("1.19.")){console.log("Invalid pool parameters"),q("1.19.0");return}if(!(m&&m.length?m.map(h=>h.id):[]).includes(d)){console.log("Replacing unknown pool with first pool in list"),q("1.19.0");return}q(d)}}m&&m.length&&o()},[m]);const[Ke,ie]=l.useState(0),[p,ne]=l.useState(),[n,ce]=l.useState(""),[c,de]=l.useState("");l.useEffect(()=>{if(m&&x&&f){const o=m.find(d=>d.id===x);if(!o){console.log("Invalid pool");return}ne(o);const i=f.find(d=>d.id===o.asset_a_id),a=f.find(d=>d.id===o.asset_b_id);ce(i),de(a),ie(1)}},[x,m,f]);const[t,he]=l.useState();l.useEffect(()=>{let o;return r&&r.chain&&p&&n&&c&&f&&(o=ze([r.chain,p.id]).subscribe(({data:a,error:d,loading:u})=>{if(a&&!d&&!u){let h=a;h.asset_a_symbol=n.symbol,h.asset_a_precision=n.precision,h.asset_b_symbol=c.symbol,h.asset_b_precision=c.precision,h.share_asset_symbol=p.share_asset_symbol,h.readable_balance_a=`${S(h.balance_a,n.precision)} ${n.symbol}`,h.readable_balance_b=`${S(h.balance_b,c.precision)} ${c.symbol}`,h.share_asset_details=f.find(P=>P.id===h.share_asset),he(h)}})),()=>{o&&o()}},[r,p,n,c,f]);const[H,me]=l.useState();l.useEffect(()=>{let o;return t&&(o=Ve([r.chain,t.share_asset.replace("1.","2.")]).subscribe(({data:a,error:d,loading:u})=>{a&&!d&&!u&&me(a)})),()=>{o&&o()}},[t]);const[hs,xe]=l.useState(null),[ms,ue]=l.useState(null),[Is,be]=l.useState(null),[Rs,pe]=l.useState(null),[Ms,je]=l.useState(null);l.useEffect(()=>{let o,i,a,d,u;if(r&&r.id&&f&&n&&c&&p){o=Ds([r.chain,n.id.replace("1.3.","2.3.")]).subscribe(({data:b,error:j,loading:_})=>{b&&!j&&!_&&xe(b)}),i=Ds([r.chain,c.id.replace("1.3.","2.3.")]).subscribe(({data:b,error:j,loading:_})=>{b&&!j&&!_&&ue(b)});const J=f.find(b=>b.symbol===p.share_asset_symbol);a=Ds([r.chain,J.id.replace("1.3.","2.3.")]).subscribe(({data:b,error:j,loading:_})=>{b&&!j&&!_&&be(b)}),n.bitasset_data_id&&(d=ae([r.chain,n.bitasset_data_id]).subscribe(({data:j,error:_,loading:bs})=>{j&&!_&&!bs&&pe(j)})),c.bitasset_data_id&&(u=ae([r.chain,c.bitasset_data_id]).subscribe(({data:j,error:_,loading:bs})=>{j&&!_&&!bs&&je(j)}))}return()=>{o&&o(),i&&i(),a&&a(),d&&d(),u&&u()}},[r,n,c,p,f]);const[K,Se]=l.useState();l.useEffect(()=>{let o;return r&&r.id&&n&&c&&(o=We([r.chain,r.id]).subscribe(({data:a,error:d,loading:u})=>{a&&!d&&!u&&Se(a)})),()=>{o&&o()}},[r,n,c]);const[U,xs]=l.useState(0),[z,Js]=l.useState(0),[ge,Ls]=l.useState(0),[Y,_e]=l.useState(0),[fe,ke]=l.useState(0),[ye,Ne]=l.useState(0),[qs,us]=l.useState(!1),[Pe,ve]=l.useState("default_pool_key");l.useEffect(()=>{x&&x.length&&window.history.replaceState({},"",`?pool=${x}`),ve(`pool_key${Date.now()}`)},[x]);const Ae=({index:o,style:i})=>{const a=m[o];return s.jsx(Me,{value:a.id,style:i,children:`${a.id} - ${a.share_asset_symbol} - ${a.asset_a_symbol}:${a.asset_b_symbol}`})};return s.jsxs(s.Fragment,{children:[s.jsxs("div",{className:"container mx-auto mt-5 mb-5",children:[s.jsx("div",{className:"grid grid-cols-1 gap-3",children:s.jsxs(F,{className:"p-2",children:[s.jsxs(C,{children:[s.jsx(E,{children:e("PoolStake:title")}),s.jsx(O,{children:e("PoolStake:description")})]}),s.jsxs(I,{children:[m?null:s.jsx("p",{children:e("PoolStake:loadingPoolData")}),f?null:s.jsx("p",{children:e("PoolStake:loadingAssetData")}),m&&f?s.jsxs(s.Fragment,{children:[s.jsx(Fe,{...N,children:s.jsxs("form",{onSubmit:()=>{us(!0),event.preventDefault()},children:[s.jsx(A,{control:N.control,name:"account",render:({field:o})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:account")}),s.jsx(T,{children:s.jsxs("div",{className:"grid grid-cols-8",children:[s.jsx("div",{className:"col-span-1 ml-5",children:r&&r.username?s.jsx(qe,{size:40,name:r.username,extra:"Target",expression:{eye:"normal",mouth:"open"},colors:["#92A1C6","#146A7C","#F0AB3D","#C271B4","#C20D90"]}):s.jsx(Je,{children:s.jsx(Le,{children:"?"})})}),s.jsx("div",{className:"col-span-7",children:s.jsx(k,{disabled:!0,readOnly:!0,placeholder:"Bitshares account (1.2.x)",className:"mb-3 mt-1",value:`${r.username} (${r.id})`})})]})})]})}),s.jsx(A,{control:N.control,name:"pool",render:({field:o})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:liquidityPool")}),s.jsx(ps,{style:{marginTop:"0px"},children:e(t?"PoolStake:liquidityPoolChosen":"PoolStake:selectLiquidityPool")}),s.jsx(T,{onChange:i=>{q(i.target.value)},children:s.jsxs("div",{className:"grid grid-cols-5 mt-3",children:[s.jsx("div",{className:"mt-1 col-span-4",children:s.jsxs(Ee,{children:[s.jsx(Oe,{className:"mb-3",children:s.jsx(Ie,{placeholder:p?`${p.id} - ${p.share_asset_symbol} - ${p.asset_a_symbol}:${p.asset_b_symbol}`:e("PoolStake:selectPoolPlaceholder")})}),s.jsx(Re,{className:"bg-white",children:m&&m.length?s.jsx(js,{height:150,itemCount:m.length,itemSize:35,className:"w-full",initialScrollOffset:m.map(i=>i.id).indexOf(x)*35,children:Ae}):null})]},Pe)}),s.jsx("div",{className:"text-gray-500 text-right col-span-1 ml-3",children:s.jsxs(ks,{open:oe,onOpenChange:i=>{i||ds(),Es(i)},children:[s.jsx(ys,{asChild:!0,children:s.jsx(W,{variant:"outline",className:"h-9 mt-1 p-3 w-full",children:e("PoolStake:searchButton")})}),s.jsxs(Ns,{className:"sm:max-w-[900px] bg-white",children:[s.jsxs(Ps,{children:[s.jsx(vs,{children:e("PoolStake:searchDialogTitle")}),s.jsx(As,{children:e("PoolStake:searchDialogDescription")})]}),s.jsx("div",{className:"grid grid-cols-1",children:s.jsx("div",{className:"col-span-1",children:s.jsxs(Ws,{defaultValue:"asset",children:[s.jsxs(Hs,{className:"grid max-w-[400px] grid-cols-2 mb-1 gap-3",children:[Q==="asset"?s.jsx(R,{style:X,value:"asset",children:e("PoolStake:swappableAssets")}):s.jsx(R,{value:"asset",onClick:()=>Fs("asset"),children:e("PoolStake:swappableAssets")}),Q==="share"?s.jsx(R,{style:X,value:"share",children:e("PoolStake:poolShareAsset")}):s.jsx(R,{value:"share",onClick:()=>Fs("share"),children:e("PoolStake:poolShareAsset")})]}),s.jsx(k,{name:"assetSearch",placeholder:e("PoolStake:searchPlaceholder"),className:"mb-3 max-w-[400px]",onChange:i=>{re(i.target.value),i.preventDefault(),i.stopPropagation()}}),s.jsx(Z,{value:"share",children:M&&M.length?s.jsxs(s.Fragment,{children:[s.jsxs("div",{className:"grid grid-cols-12",children:[s.jsx("div",{className:"col-span-2",children:e("PoolStake:id")}),s.jsx("div",{className:"col-span-3",children:s.jsx("b",{children:e("PoolStake:shareAsset")})}),s.jsx("div",{className:"col-span-3",children:e("PoolStake:assetA")}),s.jsx("div",{className:"col-span-3",children:e("PoolStake:assetB")}),s.jsx("div",{className:"col-span-1",children:e("PoolStake:takerFee")})]}),s.jsx(js,{height:400,itemCount:M.length,itemSize:45,className:"w-full",children:Os})]}):null}),s.jsx(Z,{value:"asset",children:M&&M.length?s.jsxs(s.Fragment,{children:[s.jsxs("div",{className:"grid grid-cols-12",children:[s.jsx("div",{className:"col-span-2",children:e("PoolStake:id")}),s.jsx("div",{className:"col-span-3",children:e("PoolStake:shareAsset")}),s.jsx("div",{className:"col-span-3",children:s.jsx("b",{children:e("PoolStake:assetA")})}),s.jsx("div",{className:"col-span-3",children:s.jsx("b",{children:e("PoolStake:assetB")})}),s.jsx("div",{className:"col-span-1",children:e("PoolStake:takerFee")})]}),s.jsx(js,{height:400,itemCount:M.length,itemSize:45,className:"w-full",children:Os})]}):null})]})})})]})]})})]})})]})}),s.jsx("div",{className:"grid grid-cols-10 gap-5 mt-1 mb-1",children:x&&n&&c?s.jsxs(s.Fragment,{children:[s.jsx("div",{className:"col-span-5",children:s.jsxs(F,{children:[s.jsxs(C,{className:"pb-0",children:[s.jsxs(E,{className:"text-sm pt-0",children:[e("PoolStake:assetA"),":"," ",s.jsx(Ts,{classnamecontents:"text-blue-500",type:"text",text:n.symbol,hyperlink:`https://blocksights.info/#/assets/${n.id}`})]}),s.jsx(O,{children:e("PoolStake:currentTotalAmountInPool")})]}),s.jsx(I,{className:"text-lg mt-0 pt-0",children:t?t.readable_balance_a.split(" ")[0]:"?"})]})}),s.jsx("div",{className:"col-span-5",children:s.jsxs(F,{children:[s.jsxs(C,{className:"pb-0",children:[s.jsxs(E,{className:"text-sm pt-0",children:[e("PoolStake:assetB"),":"," ",s.jsx(Ts,{classnamecontents:"text-blue-500",type:"text",text:c.symbol,hyperlink:`https://blocksights.info/#/assets/${c.id}`})]}),s.jsx(O,{children:e("PoolStake:currentTotalAmountInPool")})]}),s.jsx(I,{className:"text-lg",children:t?t.readable_balance_b.split(" ")[0]:"?"})]})})]}):null}),s.jsxs("div",{className:"grid grid-cols-3 mt-5 text-center",children:[x?s.jsx(Ts,{variant:"outline",classnamecontents:"ml-2",type:"button",text:e("PoolStake:blocksightsPoolExplorer"),hyperlink:`https://blocksights.info/#/pools/${x}${r.chain!=="bitshares"?"?network=testnet":""}`}):null,t&&H?s.jsxs(ks,{children:[s.jsx(ys,{asChild:!0,children:s.jsx(W,{className:"ml-2",variant:"outline",children:e("PoolStake:poolJson")})}),s.jsxs(Ns,{className:"sm:max-w-[550px] bg-white",children:[s.jsxs(Ps,{children:[s.jsx(vs,{children:e("PoolStake:liquidityPoolJson")}),s.jsx(As,{children:e("PoolStake:checkPoolDetails")})]}),s.jsx("div",{className:"grid grid-cols-1",children:s.jsx("div",{className:"col-span-1",children:s.jsx(zs,{className:"h-72 rounded-md border",children:s.jsx("pre",{children:JSON.stringify([t,H],null,2)})})})})]})]}):s.jsx(W,{className:"ml-2",variant:"outline",disabled:!0,children:e("PoolStake:poolJson")}),hs&&ms?s.jsxs(ks,{children:[s.jsx(ys,{asChild:!0,children:s.jsx(W,{className:"ml-2",variant:"outline",children:e("PoolStake:swappableAssetJson")})}),s.jsxs(Ns,{className:"sm:max-w-[550px] bg-white",children:[s.jsxs(Ps,{children:[s.jsx(vs,{children:e("PoolStake:swappableAssetJson")}),s.jsx(As,{children:e("PoolStake:checkSwappableAssetsDetails")})]}),s.jsx("div",{className:"grid grid-cols-1",children:s.jsx("div",{className:"col-span-1",children:s.jsx(zs,{className:"h-72 rounded-md border",children:s.jsx("pre",{children:JSON.stringify({assetA:n??"",assetADetails:hs??{},aBitassetData:Rs??{},assetB:c??"",assetBDetails:ms??{},bBitassetData:Ms??{},poolShareDetails:Is??{}},null,2)})})})})]})]}):s.jsx(W,{className:"ml-2",variant:"outline",disabled:!0,children:e("PoolStake:swappableAssetJson")})]}),x&&x.length?s.jsxs(Ws,{defaultValue:v,className:"w-full mt-5",children:[s.jsxs(Hs,{className:"grid w-full grid-cols-2 gap-2",children:[v==="stake"?s.jsx(R,{value:"stake",style:X,children:e("PoolStake:stakingAssets")}):s.jsx(R,{value:"stake",onClick:o=>{Cs("stake")},children:e("PoolStake:stakeAssets")}),v==="unstake"?s.jsx(R,{value:"unstake",style:X,children:e("PoolStake:unstakingAssets")}):s.jsx(R,{value:"unstake",onClick:o=>{Cs("unstake")},children:e("PoolStake:unstakeAssets")})]}),s.jsx(Z,{value:"stake",children:s.jsxs("div",{className:"grid grid-cols-1",children:[s.jsx(A,{control:N.control,name:"stakeA",render:({field:o})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:howMuchToStake",{symbol:n?n.symbol:"???"})}),s.jsx(T,{children:s.jsxs("div",{className:"grid grid-cols-12",children:[s.jsx("div",{className:"col-span-8",children:s.jsx(k,{disabled:!0,readOnly:!0,value:n&&U?`${U} ${n.symbol}`:`0 ${n.symbol}`,onChange:i=>{const a=i.target.value;/^[0-9]*\.?[0-9]*$/.test(a)&&xs(a)}})}),s.jsx("div",{className:"col-span-4 ml-3",children:s.jsxs(gs,{children:[s.jsx(_s,{children:s.jsx("span",{onClick:()=>{event.preventDefault()},className:"inline-block border border-grey rounded pl-4 pb-1 pr-4",children:s.jsx($,{children:e("PoolStake:changeAmount")})})}),s.jsxs(fs,{children:[s.jsx($,{children:e("PoolStake:newAmount")})," ",s.jsx(k,{placeholder:U,className:"mb-2 mt-1",onChange:i=>{const a=i.target.value,d=/^[0-9]*\.?[0-9]*$/;if(a&&a.length&&d.test(a)&&(xs(a),t.balance_a&&t.balance_b)){const u=parseFloat(a),h=parseFloat((u*(S(Number(t.balance_b),t.asset_b_precision)/S(Number(t.balance_a),t.asset_a_precision))).toFixed(t.asset_a_precision));Js(h);const P=S(H.current_supply,t.share_asset_details.precision),J=S(Number(t.balance_a),t.asset_a_precision),L=S(Number(t.balance_b),t.asset_b_precision),b=u/J*P,j=h/L*P,_=Math.min(b,j);Ls(parseFloat(_.toFixed(t.share_asset_details.precision)))}}})]})]})})]})})]})}),s.jsx(A,{control:N.control,name:"stakeB",render:({field:o})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:howMuchToStake",{symbol:c?c.symbol:"???"})}),s.jsx(T,{children:s.jsxs("div",{className:"grid grid-cols-12",children:[s.jsx("div",{className:"col-span-8",children:s.jsx(k,{disabled:!0,readOnly:!0,value:c&&z?`${z} ${c.symbol}`:`0 ${c.symbol}`})}),s.jsx("div",{className:"col-span-4 ml-3",children:s.jsxs(gs,{children:[s.jsx(_s,{children:s.jsx("span",{onClick:()=>{event.preventDefault()},className:"inline-block border border-grey rounded pl-4 pb-1 pr-4",children:s.jsx($,{children:e("PoolStake:changeAmount")})})}),s.jsxs(fs,{children:[s.jsx($,{children:e("PoolStake:newAmount")})," ",s.jsx(k,{placeholder:z,className:"mb-2 mt-1",onChange:i=>{const a=i.target.value,d=/^[0-9]*\.?[0-9]*$/;if(a&&a.length&&d.test(a)&&(Js(a),t.balance_a&&t.balance_b)){const u=parseFloat(a),h=parseFloat((u*(S(Number(t.balance_a),t.asset_a_precision)/S(Number(t.balance_b),t.asset_b_precision))).toFixed(t.asset_a_precision));xs(h);const P=S(H.current_supply,t.share_asset_details.precision),J=S(Number(t.balance_a),t.asset_a_precision),L=S(Number(t.balance_b),t.asset_b_precision),b=h/J*P,j=u/L*P,_=Math.min(b,j);Ls(parseFloat(_.toFixed(t.share_asset_details.precision)))}}})]})]})})]})})]})}),s.jsx(A,{control:N.control,name:"poolShareAssetAmount",render:({field:o})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:totalShareAssetReceive",{symbol:t?.share_asset_symbol})}),s.jsx(T,{children:s.jsx("div",{className:"grid grid-cols-2 mb-3 mt-3",children:s.jsx(k,{disabled:!0,readOnly:!0,placeholder:`${ge} ${t?.share_asset_symbol}`})})})]})})]})}),s.jsx(Z,{value:"unstake",children:s.jsxs("div",{className:"grid grid-cols-1",children:[s.jsx(A,{control:N.control,name:"withdrawalAmount",render:({field:o})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:withdrawLabel",{symbol:t.share_asset_symbol})}),s.jsx(ps,{children:e("PoolStake:withdrawDesc")}),s.jsx(T,{children:s.jsxs("div",{className:"grid grid-cols-12",children:[s.jsx("div",{className:"col-span-8",children:s.jsx(k,{disabled:!0,readOnly:!0,value:Y?`${Y} ${t.share_asset_symbol}`:`0 ${t.share_asset_symbol}`})}),s.jsx("div",{className:"col-span-4 ml-3",children:s.jsxs(gs,{children:[s.jsx(_s,{children:s.jsx("span",{onClick:()=>{event.preventDefault()},className:"inline-block border border-grey rounded pl-4 pb-1 pr-4",children:s.jsx($,{children:e("PoolStake:changeAmount")})})}),s.jsxs(fs,{children:[s.jsx($,{children:e("PoolStake:newAmount")})," ",s.jsx(k,{placeholder:Y,className:"mb-2 mt-1",onChange:i=>{const a=i.target.value,d=/^[0-9]*\.?[0-9]*$/;if(a&&a.length&&d.test(a)){const u=parseFloat(Number(a).toFixed(t.share_asset_details.precision));_e(u);const h=S(H.current_supply,t.share_asset_details.precision),P=S(Number(t.balance_a),t.asset_a_precision),J=S(Number(t.balance_b),t.asset_b_precision),L=u/h,b=parseFloat((P*L).toFixed(t.asset_a_precision)),j=parseFloat((J*L).toFixed(t.asset_b_precision));ke(b),Ne(j)}}})]})]})})]})})]})}),s.jsx(A,{control:N.control,name:"withdrawingA",render:({field:o})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:withdrawingA",{symbol:n.symbol})}),s.jsx(T,{children:s.jsx("div",{className:"grid grid-cols-2 mb-3 mt-3",children:s.jsx(k,{disabled:!0,readOnly:!0,placeholder:`${fe} ${n.symbol}`})})})]})}),s.jsx(A,{control:N.control,name:"withdrawingB",render:({field:o})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:withdrawingB",{symbol:c.symbol})}),s.jsx(T,{children:s.jsx("div",{className:"grid grid-cols-2 mb-3 mt-3",children:s.jsx(k,{disabled:!0,readOnly:!0,placeholder:`${ye} ${c.symbol}`})})})]})})]})})]},`staking_${v}`):null,p?s.jsx(A,{control:N.control,name:"networkFee",render:({field:o})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:networkFee")}),s.jsx(ps,{style:{marginTop:"0px"},children:e(`PoolStake:networkFeeDescription${v==="stake"?"1":"2"}`)}),s.jsx(T,{children:s.jsx("div",{className:"grid grid-cols-2 mb-3 mt-3",children:s.jsx("div",{className:"col-span-1",children:s.jsx(k,{disabled:!0,readOnly:!0,placeholder:`${v==="stake"?Bs:$s} BTS`})})})}),r.id===r.referrer?s.jsx(Ce,{children:e("PoolStake:rebate",{rebate:v==="stake"?(Bs*.8).toFixed(5):($s*.8).toFixed(5)})}):null]})}):null,s.jsx(W,{className:"mt-5 mb-3",variant:"outline",type:"submit",children:e("PoolStake:submit")})]})}),qs&&v==="stake"?s.jsx(Us,{operationName:"liquidity_pool_deposit",username:r.username,usrChain:r.chain,userID:r.id,dismissCallback:us,headerText:e("PoolStake:stakingAssetsDesc",{aStake:U,assetASymbol:n.symbol,bStake:z,assetBSymbol:c.symbol,poolId:x}),trxJSON:[{account:r.id,pool:x,amount_a:{amount:ws(U,n.precision),asset_id:n.id},amount_b:{amount:ws(z,c.precision),asset_id:c.id},extensions:[]}]},`Staking${U}${n.symbol}and${z}${c.symbol}`):null,qs&&v==="unstake"?s.jsx(Us,{operationName:"liquidity_pool_withdraw",username:r.username,usrChain:r.chain,userID:r.id,dismissCallback:us,headerText:e("PoolStake:unstakingDesc",{amount:Y,symbol:t.share_asset_symbol,poolId:x}),trxJSON:[{account:r.id,pool:x,share_amount:{amount:ws(Y,t.share_asset_details.precision),asset_id:t.share_asset},extensions:[]}]},"Withdrawing"):null]}):null]})]})}),s.jsxs("div",{className:"grid grid-cols-2 gap-5 mt-5",children:[x?s.jsx("div",{className:"grid grid-cols-1 gap-3",children:K&&t?s.jsxs(s.Fragment,{children:[s.jsx(Ss,{asset:c.symbol,assetData:c,assetDetails:ms,bitassetData:Ms,marketSearch:G,chain:r.chain,usrBalances:K,type:"buy"}),s.jsx(Ss,{asset:n.symbol,assetData:n,assetDetails:hs,bitassetData:Rs,marketSearch:G,chain:r.chain,usrBalances:K,type:"sell"})]}):s.jsxs(s.Fragment,{children:[s.jsxs(F,{children:[s.jsxs(C,{className:"pb-2 pt-4",children:[s.jsx(E,{children:e("PoolStake:quoteAsset")}),s.jsx(O,{className:"text-lg",children:e("PoolStake:loading")})]}),s.jsx(I,{children:s.jsxs("div",{className:"space-y-2",children:[s.jsx(y,{className:"h-4 w-[250px]"}),s.jsx(y,{className:"h-4 w-[200px]"}),s.jsx(y,{className:"h-4 w-[250px]"}),s.jsx(y,{className:"h-4 w-[200px]"})]})})]}),s.jsxs(F,{children:[s.jsxs(C,{className:"pb-2 pt-4",children:[s.jsx(E,{children:e("PoolStake:baseAsset")}),s.jsx(O,{className:"text-lg",children:e("PoolStake:loading")})]}),s.jsx(I,{children:s.jsxs("div",{className:"space-y-2",children:[s.jsx(y,{className:"h-4 w-[250px]"}),s.jsx(y,{className:"h-4 w-[200px]"}),s.jsx(y,{className:"h-4 w-[250px]"}),s.jsx(y,{className:"h-4 w-[200px]"})]})})]})]})}):null,s.jsx("div",{className:"grid grid-cols-1 gap-3",children:x&&n&&c?s.jsxs(s.Fragment,{children:[s.jsxs(F,{children:[s.jsxs(C,{className:"pb-2 pt-4",children:[s.jsx(E,{children:e("PoolStake:borrowAssets")}),s.jsx(O,{className:"text-sm",children:e("PoolStake:borrowAssetsDescription")})]}),s.jsxs(I,{className:"text-sm pb-3",children:[s.jsx($,{children:e("PoolStake:searchBorrowableAssets")}),s.jsx("br",{}),s.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${n.symbol}`,children:s.jsx(V,{children:n.symbol})}),s.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${c.symbol}`,children:s.jsx(V,{className:"ml-2 mt-1 mb-1",children:c.symbol})}),s.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${p?.share_asset_symbol}`,children:s.jsx(V,{className:"ml-2 mt-1 mb-1",children:p?.share_asset_symbol})}),s.jsx("br",{}),s.jsx($,{children:e("PoolStake:searchByAcceptedCollateral")}),s.jsx("br",{}),s.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${n.symbol}`,children:s.jsx(V,{children:n.symbol})}),s.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${c.symbol}`,children:s.jsx(V,{className:"ml-2 mt-1",children:c.symbol})}),s.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${p?.share_asset_symbol}`,children:s.jsx(V,{className:"ml-2 mt-1",children:p?.share_asset_symbol})})]})]}),t&&G&&K?s.jsx(Ss,{asset:t.share_asset_symbol,assetData:t.share_asset_details,assetDetails:Is,bitassetData:null,marketSearch:G,chain:r.chain,usrBalances:K,type:"pool"}):s.jsxs(F,{children:[s.jsxs(C,{className:"pb-2 pt-4",children:[s.jsx(E,{children:e("PoolStake:poolShareAsset")}),s.jsx(O,{className:"text-lg",children:e("PoolStake:loading")})]}),s.jsx(I,{children:s.jsxs("div",{className:"space-y-2",children:[s.jsx(y,{className:"h-4 w-[250px]"}),s.jsx(y,{className:"h-4 w-[200px]"}),s.jsx(y,{className:"h-4 w-[250px]"}),s.jsx(y,{className:"h-4 w-[200px]"})]})})]})]}):null})]})]}),s.jsx("div",{className:"grid grid-cols-1 mt-5 ml-8 mr-8",children:s.jsxs(F,{children:[s.jsxs(C,{className:"pb-3",children:[s.jsx(E,{children:e("PoolStake:risksAssociated")}),s.jsx(O,{children:e("PoolStake:doYourOwnResearch")})]}),s.jsx(I,{children:s.jsx("span",{className:"text-sm",children:s.jsxs("ul",{className:"ml-2 list-disc [&>li]:mt-1 pl-2",children:[s.jsx("li",{children:e("PoolStake:risk1")}),s.jsx("li",{children:e("PoolStake:risk2")}),s.jsx("li",{children:e("PoolStake:risk3")}),s.jsx("li",{children:e("PoolStake:risk4")}),s.jsx("li",{children:e("PoolStake:risk5")}),s.jsx("li",{children:e("PoolStake:risk6")}),s.jsx("li",{children:e("PoolStake:risk7")})]})})})]})})]})}export{va as default};
