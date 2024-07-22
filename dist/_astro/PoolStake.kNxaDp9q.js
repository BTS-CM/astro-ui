import{j as s,u as re,l as oe,i as ie}from"./utils.f2cWa0M5.js";import{r as l}from"./index.sXsv9c-e.js";import{F as Be}from"./fuse.aCsZfKX4.js";import{u as Fe,F as Ee,a as A,b as w,c as D,d as T,e as js,f as Me}from"./form.lZWYRzQu.js";import{F as gs}from"./index.esm.MzjYIzP_.js";import{L as $,D as Vs}from"./DeepLinkDialog.hhX-uqsX.js";import{B as O}from"./badge.003_V-VC.js";import{B as P}from"./button.a7-WOX-8.js";import{I as y}from"./input.hzHoVlAt.js";import{S as Ws}from"./scroll-area.1An-4fTu.js";import{P as Ss,a as _s,b as fs}from"./popover.kIDkAdw4.js";import{C as J,a as q,b as U,c as z,d as V,$ as Hs}from"./users.jrnbX0_8.js";import{D as ks,e as ys,a as Ns,b as Ps,c as vs,d as As}from"./dialog.syK3Ff39.js";import{S as Oe,a as Ie,b as Re,c as Le,d as Je}from"./select.jGoYDpMA.js";import{h as S,T as Ks,a as Ys,b as B,c as Z,d as ws}from"./common.hInvFuHt.js";import{A as qe,a as Ue}from"./avatar.6-Vbudo0.js";import{A as ze}from"./Avatar.ayrde5G3.js";import{$ as Gs,a as Qs,f as Xs,g as Zs,h as se,i as ee,d as ae,e as te,u as Ve}from"./Init.DukeMtId.js";import{c as Ds,a as le}from"./Assets.Bwm3_wwj.js";import{c as We,a as He}from"./Pools.IogGQ9gr.js";import{c as Ke}from"./User.zQvnfFk2.js";import{M as Ts}from"./MarketAssetCard.7Hu1LYWa.js";import{E as Cs}from"./ExternalLink.iv_ddFeE.js";import"./index.LDFW_GCY.js";import"./index.QjywInIh.js";import"./index.u8nr6ruA.js";import"./index.f2GGseSc.js";import"./index.x6Fbg0gz.js";import"./index.reIbhit3.js";import"./index.lLhWZhZj.js";import"./CardRow.IOiLog6o.js";function ss(e){return s.jsx("div",{className:"col-span-1",children:s.jsxs("div",{className:"grid grid-cols-10",children:[s.jsxs("div",{className:"col-span-4",children:[e.title,":"]}),s.jsx("div",{className:"col-span-5 mr-2",children:s.jsx(O,{variant:"outline",className:"pl-2 pb-1 w-full",children:" "})}),s.jsx("div",{className:"col-span-1",children:s.jsx(P,{variant:"outline",size:"icon",className:"h-6 w-6 text-gray-400",children:"?"})})]})},`${e.dialogtitle}`)}function $s(e){const{type:Y}=e,{t:h,i18n:u}=re(oe.get(),{i18n:ie});return s.jsxs(J,{children:[s.jsxs(q,{className:"pb-2 pt-4",children:[s.jsx(U,{children:"1.3.x"}),s.jsxs(z,{className:"text-lg",children:[Y==="buy"?s.jsxs(s.Fragment,{children:[s.jsx("span",{children:h("MarketAssetCard:quoteAsset")})," -",s.jsxs("span",{className:"text-sm",children:[" ",h("MarketAssetCard:buying")]})]}):null,Y==="sell"?s.jsxs(s.Fragment,{children:[s.jsx("span",{children:h("MarketAssetCard:baseAsset")})," -",s.jsxs("span",{className:"text-sm",children:[" ",h("MarketAssetCard:selling")]})]}):null,Y==="pool"?s.jsx("span",{children:h("MarketAssetCard:poolStakeAsset")}):null]})]}),s.jsxs(V,{className:"text-sm pb-2",children:[s.jsxs("div",{className:"grid grid-cols-3 gap-3 mb-3 w-full",children:[s.jsx(P,{variant:"outline",className:"h-6",children:h("MarketAssetCard:supply")}),s.jsx(P,{variant:"outline",className:"h-6",style:{marginLeft:"3px"},children:h("MarketAssetCard:links")}),s.jsx(P,{variant:"outline",className:"h-6",style:{marginLeft:"3px"},children:h("MarketAssetCard:json")})]}),s.jsxs("div",{className:"grid grid-cols-1 gap-1 w-full",children:[s.jsx(ss,{title:h("MarketAssetCard:yourBalance"),dialogtitle:"balance"}),s.jsx(ss,{title:h("MarketAssetCard:assetType"),dialogtitle:"assetType"}),s.jsx(ss,{title:h("MarketAssetCard:issuer"),dialogtitle:"issuer"}),s.jsx(ss,{title:h("MarketAssetCard:precision"),dialogtitle:"precision"})]})]})]})}function Aa(){const{t:e,i18n:Y}=re(oe.get(),{i18n:ie}),h=Fe({defaultValues:{account:""}}),[u,I]=l.useState(""),o=l.useSyncExternalStore(Hs.subscribe,Hs.get,()=>!0),es=l.useSyncExternalStore(Gs.subscribe,Gs.get,()=>!0),as=l.useSyncExternalStore(Qs.subscribe,Qs.get,()=>!0),ts=l.useSyncExternalStore(Xs.subscribe,Xs.get,()=>!0),ls=l.useSyncExternalStore(Zs.subscribe,Zs.get,()=>!0),rs=l.useSyncExternalStore(se.subscribe,se.get,()=>!0),os=l.useSyncExternalStore(ee.subscribe,ee.get,()=>!0),is=l.useSyncExternalStore(ae.subscribe,ae.get,()=>!0),ns=l.useSyncExternalStore(te.subscribe,te.get,()=>!0),_=l.useMemo(()=>o&&o.chain?o.chain:"bitshares",[o]);Ve(_??"bitshares",["marketSearch","assets","pools","globalParams"]);const k=l.useMemo(()=>_&&(es||as)?_==="bitshares"?es:as:[],[es,as,_]),x=l.useMemo(()=>_&&(ts||ls)?_==="bitshares"?ts:ls:[],[ts,ls,_]),G=l.useMemo(()=>_&&(rs||os)?_==="bitshares"?rs:os:[],[rs,os,_]),C=l.useMemo(()=>_&&(is||ns)?_==="bitshares"?is:ns:[],[is,ns,_]),[Bs,ne]=l.useState();l.useEffect(()=>{if(C&&C.length){const r=C.find(a=>a[0]===61),i=S(r[1].fee,5);ne(i)}},[C]);const[Fs,ce]=l.useState();l.useEffect(()=>{if(C&&C.length){const r=C.find(a=>a[0]===62),i=S(r[1].fee,5);ce(i)}},[C]);const[Q,Es]=l.useState("asset"),[v,Ms]=l.useState("stake"),cs=l.useMemo(()=>!x||!x.length?null:new Be(x,{includeScore:!0,threshold:.2,keys:Q==="asset"?["asset_a_symbol","asset_b_symbol"]:["share_asset_symbol"]}),[x,Q]),[de,Os]=l.useState(!1),[ds,he]=l.useState(),[F,hs]=l.useState();l.useEffect(()=>{if(cs&&ds){const r=cs.search(ds);hs(r)}},[cs,ds]);const Is=({index:r,style:i})=>{const a=F[r].item;return s.jsxs("div",{style:{...i},className:"grid grid-cols-12",onClick:()=>{I(a.id),Os(!1),hs()},children:[s.jsx("div",{className:"col-span-2",children:a.id}),s.jsx("div",{className:"col-span-3",children:a.share_asset_symbol}),s.jsxs("div",{className:"col-span-3",children:[a.asset_a_symbol," (",a.asset_a_id,")"]}),s.jsxs("div",{className:"col-span-3",children:[a.asset_b_symbol," (",a.asset_b_id,")"]}),s.jsxs("div",{className:"col-span-1",children:[a.taker_fee_percent/100,"%"]})]},`acard-${a.id}`)},X={backgroundColor:"#252526",color:"white"};l.useEffect(()=>{async function r(){if(window.location.search){const i=new URLSearchParams(window.location.search),a=Object.fromEntries(i.entries()),d=a&&a.pool?a.pool:null;if(!d||!d.length){console.log("Invalid pool parameters"),I("1.19.0");return}if(d&&d.length&&!d.includes("1.19.")){console.log("Invalid pool parameters"),I("1.19.0");return}if(!(x&&x.length?x.map(m=>m.id):[]).includes(d)){console.log("Replacing unknown pool with first pool in list"),I("1.19.0");return}I(d)}}x&&x.length&&r()},[x]);const[Ye,me]=l.useState(0),[j,ue]=l.useState(),[n,xe]=l.useState(""),[c,be]=l.useState("");l.useEffect(()=>{if(x&&u&&k){const r=x.find(d=>d.id===u);if(!r){console.log("Invalid pool");return}ue(r);const i=k.find(d=>d.id===r.asset_a_id),a=k.find(d=>d.id===r.asset_b_id);xe(i),be(a),me(1)}},[u,x,k]);const[t,pe]=l.useState();l.useEffect(()=>{let r;return o&&o.chain&&j&&n&&c&&k&&(r=We([o.chain,j.id]).subscribe(({data:a,error:d,loading:b})=>{if(a&&!d&&!b){let m=a;m.asset_a_symbol=n.symbol,m.asset_a_precision=n.precision,m.asset_b_symbol=c.symbol,m.asset_b_precision=c.precision,m.share_asset_symbol=j.share_asset_symbol,m.readable_balance_a=`${S(m.balance_a,n.precision)} ${n.symbol}`,m.readable_balance_b=`${S(m.balance_b,c.precision)} ${c.symbol}`,m.share_asset_details=k.find(N=>N.id===m.share_asset),pe(m)}})),()=>{r&&r()}},[o,j,n,c,k]);const[W,je]=l.useState();l.useEffect(()=>{let r;return t&&(r=He([o.chain,t.share_asset.replace("1.","2.")]).subscribe(({data:a,error:d,loading:b})=>{a&&!d&&!b&&je(a)})),()=>{r&&r()}},[t]);const[ms,ge]=l.useState(null),[us,Se]=l.useState(null),[Rs,_e]=l.useState(null),[Ls,fe]=l.useState(null),[Js,ke]=l.useState(null);l.useEffect(()=>{let r,i,a,d,b;if(o&&o.id&&k&&n&&c&&j){r=Ds([o.chain,n.id.replace("1.3.","2.3.")]).subscribe(({data:p,error:g,loading:f})=>{p&&!g&&!f&&ge(p)}),i=Ds([o.chain,c.id.replace("1.3.","2.3.")]).subscribe(({data:p,error:g,loading:f})=>{p&&!g&&!f&&Se(p)});const E=k.find(p=>p.symbol===j.share_asset_symbol);a=Ds([o.chain,E.id.replace("1.3.","2.3.")]).subscribe(({data:p,error:g,loading:f})=>{p&&!g&&!f&&_e(p)}),n.bitasset_data_id&&(d=le([o.chain,n.bitasset_data_id]).subscribe(({data:g,error:f,loading:ps})=>{g&&!f&&!ps&&fe(g)})),c.bitasset_data_id&&(b=le([o.chain,c.bitasset_data_id]).subscribe(({data:g,error:f,loading:ps})=>{g&&!f&&!ps&&ke(g)}))}return()=>{r&&r(),i&&i(),a&&a(),d&&d(),b&&b()}},[o,n,c,j,k]);const[H,ye]=l.useState();l.useEffect(()=>{let r;return o&&o.id&&n&&c&&(r=Ke([o.chain,o.id]).subscribe(({data:a,error:d,loading:b})=>{a&&!d&&!b&&ye(a)})),()=>{r&&r()}},[o,n,c]);const[R,xs]=l.useState(0),[L,qs]=l.useState(0),[Ne,Us]=l.useState(0),[K,Pe]=l.useState(0),[ve,Ae]=l.useState(0),[we,De]=l.useState(0),[zs,bs]=l.useState(!1),[Te,Ce]=l.useState("default_pool_key");l.useEffect(()=>{u&&u.length&&window.history.replaceState({},"",`?pool=${u}`),Ce(`pool_key${Date.now()}`)},[u]);const $e=({index:r,style:i})=>{const a=x[r];return s.jsx(Je,{value:a.id,style:i,children:`${a.id} - ${a.share_asset_symbol} - ${a.asset_a_symbol}:${a.asset_b_symbol}`})};return s.jsxs(s.Fragment,{children:[s.jsxs("div",{className:"container mx-auto mt-5 mb-5",children:[s.jsx("div",{className:"grid grid-cols-1 gap-3",children:s.jsxs(J,{className:"p-2",children:[s.jsxs(q,{children:[s.jsx(U,{children:e("PoolStake:title")}),s.jsx(z,{children:e("PoolStake:description")})]}),s.jsxs(V,{children:[x?null:s.jsx("p",{children:e("PoolStake:loadingPoolData")}),k?null:s.jsx("p",{children:e("PoolStake:loadingAssetData")}),x&&k?s.jsxs(s.Fragment,{children:[s.jsx(Ee,{...h,children:s.jsxs("form",{onSubmit:()=>{bs(!0),event.preventDefault()},children:[s.jsx(A,{control:h.control,name:"account",render:({field:r})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:account")}),s.jsx(T,{children:s.jsxs("div",{className:"grid grid-cols-8",children:[s.jsx("div",{className:"col-span-1 ml-5",children:o&&o.username?s.jsx(ze,{size:40,name:o.username,extra:"Target",expression:{eye:"normal",mouth:"open"},colors:["#92A1C6","#146A7C","#F0AB3D","#C271B4","#C20D90"]}):s.jsx(qe,{children:s.jsx(Ue,{children:"?"})})}),s.jsx("div",{className:"col-span-7",children:s.jsx(y,{disabled:!0,readOnly:!0,placeholder:"Bitshares account (1.2.x)",className:"mb-3 mt-1",value:`${o.username} (${o.id})`})})]})})]})}),s.jsx(A,{control:h.control,name:"pool",render:({field:r})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:liquidityPool")}),s.jsx(js,{style:{marginTop:"0px"},children:e(u?"PoolStake:liquidityPoolChosen":"PoolStake:selectLiquidityPool")}),s.jsx(T,{onChange:i=>{I(i.target.value)},children:s.jsxs("div",{className:"grid grid-cols-5 mt-3",children:[s.jsx("div",{className:"mt-1 col-span-4",children:s.jsxs(Oe,{children:[s.jsx(Ie,{className:"mb-3",children:s.jsx(Re,{placeholder:j?`${j.id} - ${j.share_asset_symbol} - ${j.asset_a_symbol}:${j.asset_b_symbol}`:e("PoolStake:selectPoolPlaceholder")})}),s.jsx(Le,{className:"bg-white",children:x&&x.length?s.jsx(gs,{height:150,itemCount:x.length,itemSize:35,className:"w-full",initialScrollOffset:x.map(i=>i.id).indexOf(u)*35,children:$e}):null})]},Te)}),s.jsx("div",{className:"text-gray-500 text-right col-span-1 ml-3",children:s.jsxs(ks,{open:de,onOpenChange:i=>{i||hs(),Os(i)},children:[s.jsx(ys,{asChild:!0,children:s.jsx(P,{variant:"outline",className:"h-9 mt-1 p-3 w-full",children:e("PoolStake:searchButton")})}),s.jsxs(Ns,{className:"sm:max-w-[900px] bg-white",children:[s.jsxs(Ps,{children:[s.jsx(vs,{children:e("PoolStake:searchDialogTitle")}),s.jsx(As,{children:e("PoolStake:searchDialogDescription")})]}),s.jsx("div",{className:"grid grid-cols-1",children:s.jsx("div",{className:"col-span-1",children:s.jsxs(Ks,{defaultValue:"asset",children:[s.jsxs(Ys,{className:"grid max-w-[400px] grid-cols-2 mb-1 gap-3",children:[Q==="asset"?s.jsx(B,{style:X,value:"asset",children:e("PoolStake:swappableAssets")}):s.jsx(B,{value:"asset",onClick:()=>Es("asset"),children:e("PoolStake:swappableAssets")}),Q==="share"?s.jsx(B,{style:X,value:"share",children:e("PoolStake:poolShareAsset")}):s.jsx(B,{value:"share",onClick:()=>Es("share"),children:e("PoolStake:poolShareAsset")})]}),s.jsx(y,{name:"assetSearch",placeholder:e("PoolStake:searchPlaceholder"),className:"mb-3 max-w-[400px]",onChange:i=>{he(i.target.value),i.preventDefault(),i.stopPropagation()}}),s.jsx(Z,{value:"share",children:F&&F.length?s.jsxs(s.Fragment,{children:[s.jsxs("div",{className:"grid grid-cols-12",children:[s.jsx("div",{className:"col-span-2",children:e("PoolStake:id")}),s.jsx("div",{className:"col-span-3",children:s.jsx("b",{children:e("PoolStake:shareAsset")})}),s.jsx("div",{className:"col-span-3",children:e("PoolStake:assetA")}),s.jsx("div",{className:"col-span-3",children:e("PoolStake:assetB")}),s.jsx("div",{className:"col-span-1",children:e("PoolStake:takerFee")})]}),s.jsx(gs,{height:400,itemCount:F.length,itemSize:45,className:"w-full",children:Is})]}):null}),s.jsx(Z,{value:"asset",children:F&&F.length?s.jsxs(s.Fragment,{children:[s.jsxs("div",{className:"grid grid-cols-12",children:[s.jsx("div",{className:"col-span-2",children:e("PoolStake:id")}),s.jsx("div",{className:"col-span-3",children:e("PoolStake:shareAsset")}),s.jsx("div",{className:"col-span-3",children:s.jsx("b",{children:e("PoolStake:assetA")})}),s.jsx("div",{className:"col-span-3",children:s.jsx("b",{children:e("PoolStake:assetB")})}),s.jsx("div",{className:"col-span-1",children:e("PoolStake:takerFee")})]}),s.jsx(gs,{height:400,itemCount:F.length,itemSize:45,className:"w-full",children:Is})]}):null})]})})})]})]})})]})})]})}),s.jsx("div",{className:"grid grid-cols-10 gap-5 mt-1 mb-1",children:u&&n&&c?s.jsxs(s.Fragment,{children:[s.jsx("div",{className:"col-span-5",children:s.jsxs(J,{children:[s.jsxs(q,{className:"pb-0",children:[s.jsxs(U,{className:"text-sm pt-0",children:[e("PoolStake:assetA"),":"," ",s.jsx(Cs,{classnamecontents:"text-blue-500",type:"text",text:n.symbol,hyperlink:`https://blocksights.info/#/assets/${n.id}`})]}),s.jsx(z,{children:e("PoolStake:currentTotalAmountInPool")})]}),s.jsx(V,{className:"text-lg mt-0 pt-0",children:t?t.readable_balance_a.split(" ")[0]:"0"})]})}),s.jsx("div",{className:"col-span-5",children:s.jsxs(J,{children:[s.jsxs(q,{className:"pb-0",children:[s.jsxs(U,{className:"text-sm pt-0",children:[e("PoolStake:assetB"),":"," ",s.jsx(Cs,{classnamecontents:"text-blue-500",type:"text",text:c.symbol,hyperlink:`https://blocksights.info/#/assets/${c.id}`})]}),s.jsx(z,{children:e("PoolStake:currentTotalAmountInPool")})]}),s.jsx(V,{className:"text-lg",children:t?t.readable_balance_b.split(" ")[0]:"0"})]})})]}):null}),s.jsx("div",{className:"grid grid-cols-3 mt-5 text-center",children:u?s.jsxs(s.Fragment,{children:[s.jsx(Cs,{variant:"outline",classnamecontents:"ml-2",type:"button",text:e("PoolStake:blocksightsPoolExplorer"),hyperlink:`https://blocksights.info/#/pools/${u}${o.chain!=="bitshares"?"?network=testnet":""}`}),t&&W?s.jsxs(ks,{children:[s.jsx(ys,{asChild:!0,children:s.jsx(P,{className:"ml-2",variant:"outline",children:e("PoolStake:poolJson")})}),s.jsxs(Ns,{className:"sm:max-w-[550px] bg-white",children:[s.jsxs(Ps,{children:[s.jsx(vs,{children:e("PoolStake:liquidityPoolJson")}),s.jsx(As,{children:e("PoolStake:checkPoolDetails")})]}),s.jsx("div",{className:"grid grid-cols-1",children:s.jsx("div",{className:"col-span-1",children:s.jsx(Ws,{className:"h-72 rounded-md border",children:s.jsx("pre",{children:JSON.stringify([t,W],null,2)})})})})]})]}):s.jsx(P,{className:"ml-2",variant:"outline",children:e("PoolStake:poolJson")}),ms&&us?s.jsxs(ks,{children:[s.jsx(ys,{asChild:!0,children:s.jsx(P,{className:"ml-2",variant:"outline",children:e("PoolStake:swappableAssetJson")})}),s.jsxs(Ns,{className:"sm:max-w-[550px] bg-white",children:[s.jsxs(Ps,{children:[s.jsx(vs,{children:e("PoolStake:swappableAssetJson")}),s.jsx(As,{children:e("PoolStake:checkSwappableAssetsDetails")})]}),s.jsx("div",{className:"grid grid-cols-1",children:s.jsx("div",{className:"col-span-1",children:s.jsx(Ws,{className:"h-72 rounded-md border",children:s.jsx("pre",{children:JSON.stringify({assetA:n??"",assetADetails:ms??{},aBitassetData:Ls??{},assetB:c??"",assetBDetails:us??{},bBitassetData:Js??{},poolShareDetails:Rs??{}},null,2)})})})})]})]}):s.jsx(P,{className:"ml-2",variant:"outline",children:e("PoolStake:swappableAssetJson")})]}):null}),u&&u.length?s.jsxs(Ks,{defaultValue:v,className:"w-full mt-5",children:[s.jsxs(Ys,{className:"grid w-full grid-cols-2 gap-2",children:[v==="stake"?s.jsx(B,{value:"stake",style:X,children:e("PoolStake:stakingAssets")}):s.jsx(B,{value:"stake",onClick:r=>{Ms("stake")},children:e("PoolStake:stakeAssets")}),v==="unstake"?s.jsx(B,{value:"unstake",style:X,children:e("PoolStake:unstakingAssets")}):s.jsx(B,{value:"unstake",onClick:r=>{Ms("unstake")},children:e("PoolStake:unstakeAssets")})]}),s.jsx(Z,{value:"stake",children:s.jsxs("div",{className:"grid grid-cols-1",children:[s.jsx(A,{control:h.control,name:"stakeA",render:({field:r})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:howMuchToStake",{symbol:n?n.symbol:"???"})}),s.jsx(T,{children:s.jsxs("div",{className:"grid grid-cols-12",children:[s.jsx("div",{className:"col-span-8",children:s.jsx(y,{disabled:!0,readOnly:!0,value:n&&R?`${R} ${n.symbol}`:`0 ${n.symbol}`,onChange:i=>{const a=i.target.value;/^[0-9]*\.?[0-9]*$/.test(a)&&xs(a)}})}),s.jsx("div",{className:"col-span-4 ml-3",children:s.jsxs(Ss,{children:[s.jsx(_s,{children:s.jsx("span",{onClick:()=>{event.preventDefault()},className:"inline-block border border-grey rounded pl-4 pb-1 pr-4",children:s.jsx($,{children:e("PoolStake:changeAmount")})})}),s.jsxs(fs,{children:[s.jsx($,{children:e("PoolStake:newAmount")})," ",s.jsx(y,{placeholder:R,className:"mb-2 mt-1",onChange:i=>{const a=i.target.value,d=/^[0-9]*\.?[0-9]*$/;if(a&&a.length&&d.test(a)&&(xs(a),t.balance_a&&t.balance_b)){const b=parseFloat(a),m=parseFloat((b*(S(Number(t.balance_b),t.asset_b_precision)/S(Number(t.balance_a),t.asset_a_precision))).toFixed(t.asset_a_precision));qs(m);const N=S(W.current_supply,t.share_asset_details.precision),E=S(Number(t.balance_a),t.asset_a_precision),M=S(Number(t.balance_b),t.asset_b_precision),p=b/E*N,g=m/M*N,f=Math.min(p,g);Us(parseFloat(f.toFixed(t.share_asset_details.precision)))}}})]})]})})]})})]})}),s.jsx(A,{control:h.control,name:"stakeB",render:({field:r})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:howMuchToStake",{symbol:c?c.symbol:"???"})}),s.jsx(T,{children:s.jsxs("div",{className:"grid grid-cols-12",children:[s.jsx("div",{className:"col-span-8",children:s.jsx(y,{disabled:!0,readOnly:!0,value:c&&L?`${L} ${c.symbol}`:`0 ${c.symbol}`})}),s.jsx("div",{className:"col-span-4 ml-3",children:s.jsxs(Ss,{children:[s.jsx(_s,{children:s.jsx("span",{onClick:()=>{event.preventDefault()},className:"inline-block border border-grey rounded pl-4 pb-1 pr-4",children:s.jsx($,{children:e("PoolStake:changeAmount")})})}),s.jsxs(fs,{children:[s.jsx($,{children:e("PoolStake:newAmount")})," ",s.jsx(y,{placeholder:L,className:"mb-2 mt-1",onChange:i=>{const a=i.target.value,d=/^[0-9]*\.?[0-9]*$/;if(a&&a.length&&d.test(a)&&(qs(a),t.balance_a&&t.balance_b)){const b=parseFloat(a),m=parseFloat((b*(S(Number(t.balance_a),t.asset_a_precision)/S(Number(t.balance_b),t.asset_b_precision))).toFixed(t.asset_a_precision));xs(m);const N=S(W.current_supply,t.share_asset_details.precision),E=S(Number(t.balance_a),t.asset_a_precision),M=S(Number(t.balance_b),t.asset_b_precision),p=m/E*N,g=b/M*N,f=Math.min(p,g);Us(parseFloat(f.toFixed(t.share_asset_details.precision)))}}})]})]})})]})})]})}),s.jsx(A,{control:h.control,name:"poolShareAssetAmount",render:({field:r})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:totalShareAssetReceive")}),s.jsx(T,{children:s.jsx("div",{className:"grid grid-cols-2 mb-3 mt-3",children:s.jsx(y,{disabled:!0,readOnly:!0,placeholder:t?`${Ne} ${t?.share_asset_symbol}`:"0"})})})]})})]})}),s.jsx(Z,{value:"unstake",children:s.jsxs("div",{className:"grid grid-cols-1",children:[s.jsx(A,{control:h.control,name:"withdrawalAmount",render:({field:r})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:withdrawLabel",{symbol:t.share_asset_symbol})}),s.jsx(js,{children:e("PoolStake:withdrawDesc")}),s.jsx(T,{children:s.jsxs("div",{className:"grid grid-cols-12",children:[s.jsx("div",{className:"col-span-8",children:s.jsx(y,{disabled:!0,readOnly:!0,value:K?`${K} ${t.share_asset_symbol}`:`0 ${t.share_asset_symbol}`})}),s.jsx("div",{className:"col-span-4 ml-3",children:s.jsxs(Ss,{children:[s.jsx(_s,{children:s.jsx("span",{onClick:()=>{event.preventDefault()},className:"inline-block border border-grey rounded pl-4 pb-1 pr-4",children:s.jsx($,{children:e("PoolStake:changeAmount")})})}),s.jsxs(fs,{children:[s.jsx($,{children:e("PoolStake:newAmount")})," ",s.jsx(y,{placeholder:K,className:"mb-2 mt-1",onChange:i=>{const a=i.target.value,d=/^[0-9]*\.?[0-9]*$/;if(a&&a.length&&d.test(a)){const b=parseFloat(Number(a).toFixed(t.share_asset_details.precision));Pe(b);const m=S(W.current_supply,t.share_asset_details.precision),N=S(Number(t.balance_a),t.asset_a_precision),E=S(Number(t.balance_b),t.asset_b_precision),M=b/m,p=parseFloat((N*M).toFixed(t.asset_a_precision)),g=parseFloat((E*M).toFixed(t.asset_b_precision));Ae(p),De(g)}}})]})]})})]})})]})}),s.jsx(A,{control:h.control,name:"withdrawingA",render:({field:r})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:withdrawingA",{symbol:n.symbol})}),s.jsx(T,{children:s.jsx("div",{className:"grid grid-cols-2 mb-3 mt-3",children:s.jsx(y,{disabled:!0,readOnly:!0,placeholder:`${ve} ${n.symbol}`})})})]})}),s.jsx(A,{control:h.control,name:"withdrawingB",render:({field:r})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:withdrawingB",{symbol:c.symbol})}),s.jsx(T,{children:s.jsx("div",{className:"grid grid-cols-2 mb-3 mt-3",children:s.jsx(y,{disabled:!0,readOnly:!0,placeholder:`${we} ${c.symbol}`})})})]})})]})})]},`staking_${v}`):null,j?s.jsx(A,{control:h.control,name:"networkFee",render:({field:r})=>s.jsxs(w,{children:[s.jsx(D,{children:e("PoolStake:networkFee")}),s.jsx(js,{style:{marginTop:"0px"},children:e(`PoolStake:networkFeeDescription${v==="stake"?"1":"2"}`)}),s.jsx(T,{children:s.jsx("div",{className:"grid grid-cols-2 mb-3 mt-3",children:s.jsx("div",{className:"col-span-1",children:s.jsx(y,{disabled:!0,readOnly:!0,placeholder:`${v==="stake"?Bs:Fs} BTS`})})})}),o.id===o.referrer?s.jsx(Me,{children:e("PoolStake:rebate",{rebate:v==="stake"?(Bs*.8).toFixed(5):(Fs*.8).toFixed(5)})}):null]})}):null,s.jsx(P,{className:"mt-5 mb-3",variant:"outline",type:"submit",children:e("PoolStake:submit")})]})}),zs&&v==="stake"?s.jsx(Vs,{operationName:"liquidity_pool_deposit",username:o.username,usrChain:o.chain,userID:o.id,dismissCallback:bs,headerText:e("PoolStake:stakingAssetsDesc",{aStake:R,assetASymbol:n.symbol,bStake:L,assetBSymbol:c.symbol,poolId:u}),trxJSON:[{account:o.id,pool:u,amount_a:{amount:ws(R,n.precision),asset_id:n.id},amount_b:{amount:ws(L,c.precision),asset_id:c.id},extensions:[]}]},`Staking${R}${n.symbol}and${L}${c.symbol}`):null,zs&&v==="unstake"?s.jsx(Vs,{operationName:"liquidity_pool_withdraw",username:o.username,usrChain:o.chain,userID:o.id,dismissCallback:bs,headerText:e("PoolStake:unstakingDesc",{amount:K,symbol:t.share_asset_symbol,poolId:u}),trxJSON:[{account:o.id,pool:u,share_amount:{amount:ws(K,t.share_asset_details.precision),asset_id:t.share_asset},extensions:[]}]},"Withdrawing"):null]}):null]})]})}),s.jsxs("div",{className:"grid grid-cols-2 gap-5 mt-5",children:[u?s.jsx("div",{className:"grid grid-cols-1 gap-3",children:H&&t?s.jsxs(s.Fragment,{children:[s.jsx(Ts,{asset:c.symbol,assetData:c,assetDetails:us,bitassetData:Js,marketSearch:G,chain:o.chain,usrBalances:H,type:"buy"}),s.jsx(Ts,{asset:n.symbol,assetData:n,assetDetails:ms,bitassetData:Ls,marketSearch:G,chain:o.chain,usrBalances:H,type:"sell"})]}):s.jsxs(s.Fragment,{children:[s.jsx($s,{type:"buy"}),s.jsx($s,{type:"sell"})]})}):null,s.jsx("div",{className:"grid grid-cols-1 gap-3",children:u&&n&&c?s.jsxs(s.Fragment,{children:[s.jsxs(J,{children:[s.jsxs(q,{className:"pb-2 pt-4",children:[s.jsx(U,{children:e("PoolStake:borrowAssets")}),s.jsx(z,{className:"text-sm",children:e("PoolStake:borrowAssetsDescription")})]}),s.jsxs(V,{className:"text-sm pb-3",children:[s.jsx($,{children:e("PoolStake:searchBorrowableAssets")}),s.jsx("br",{}),s.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${n.symbol}`,children:s.jsx(O,{children:n.symbol})}),s.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${c.symbol}`,children:s.jsx(O,{className:"ml-2 mt-1 mb-1",children:c.symbol})}),s.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${j?.share_asset_symbol}`,children:s.jsx(O,{className:"ml-2 mt-1 mb-1",children:j?.share_asset_symbol})}),s.jsx("br",{}),s.jsx($,{children:e("PoolStake:searchByAcceptedCollateral")}),s.jsx("br",{}),s.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${n.symbol}`,children:s.jsx(O,{children:n.symbol})}),s.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${c.symbol}`,children:s.jsx(O,{className:"ml-2 mt-1",children:c.symbol})}),s.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${j?.share_asset_symbol}`,children:s.jsx(O,{className:"ml-2 mt-1",children:j?.share_asset_symbol})})]})]}),t&&G&&H?s.jsx(Ts,{asset:t.share_asset_symbol,assetData:t.share_asset_details,assetDetails:Rs,bitassetData:null,marketSearch:G,chain:o.chain,usrBalances:H,type:"pool"}):s.jsx($s,{type:"pool"})]}):null})]})]}),s.jsx("div",{className:"grid grid-cols-1 mt-5 ml-8 mr-8",children:s.jsxs(J,{children:[s.jsxs(q,{className:"pb-3",children:[s.jsx(U,{children:e("PoolStake:risksAssociated")}),s.jsx(z,{children:e("PoolStake:doYourOwnResearch")})]}),s.jsx(V,{children:s.jsx("span",{className:"text-sm",children:s.jsxs("ul",{className:"ml-2 list-disc [&>li]:mt-1 pl-2",children:[s.jsx("li",{children:e("PoolStake:risk1")}),s.jsx("li",{children:e("PoolStake:risk2")}),s.jsx("li",{children:e("PoolStake:risk3")}),s.jsx("li",{children:e("PoolStake:risk4")}),s.jsx("li",{children:e("PoolStake:risk5")}),s.jsx("li",{children:e("PoolStake:risk6")}),s.jsx("li",{children:e("PoolStake:risk7")})]})})})]})})]})}export{Aa as default};