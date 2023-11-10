import{O as Qe,$ as xe,u as We,J as be,P as pe,h as je,w as fe,j as e,I as k,C as S,b as $,c as B,d as A,i as w,D as Ne,y as ge,B as R,z as _e,E as ye,F as Se,G as we,f as Ze}from"./CurrentUser.1e0e4221.js";import{r as i}from"./index.178a5b5e.js";import{F as es}from"./fuse.a1032ea1.js";import{u as ss,F as as,a as F,b as C,c as P,d as T,e as D}from"./form.19f24f8d.js";import{F as ee}from"./index.esm.60b0ed75.js";import{D as ts,L as De}from"./DeepLinkDialog.d4274afa.js";import{B as H}from"./badge.7bb8028a.js";import{S as ls}from"./scroll-area.8e441ca4.js";import{S as j,P as rs,M as se}from"./MarketAssetCard.053a137c.js";import{S as is,a as ns,b as os,c as cs,d as ds}from"./select.6419c585.js";import{h as ae,T as ms,a as hs,b as K,c as ve,f as ke}from"./common.e1bc7670.js";import{a as te,b as $e}from"./CardRow.95b51c15.js";import{c as us}from"./User.fd878bac.js";import{E as le}from"./ExternalLink.26cefe6b.js";import"./index.6a2b73ba.js";import"./index.6e64f2e3.js";const[xs]=Qe({fetcher:async(_,c)=>{const y=await fetch(`http://localhost:8080/api/getObjects/${_}`,{method:"POST",body:JSON.stringify([c])});if(!y||!y.ok){console.log("Failed to fetch pool details");return}let a;try{a=await y.json()}catch(N){console.log({e:N,response:y});return}if(!a||!a.result){console.log("Failed to fetch pool data");return}if(a&&a.result&&a.result.length)return console.log("Fetched pool details"),a.result[0]}});function Fs(){const _=ss({defaultValues:{account:""}}),[c,y]=i.useState(""),a=i.useSyncExternalStore(xe.subscribe,xe.get,()=>!0);We(a&&a.chain?a.chain:"bitshares",["marketSearch","assets","pools","feeSchedule"]);const N=i.useSyncExternalStore(be.subscribe,be.get,()=>!0),h=i.useSyncExternalStore(pe.subscribe,pe.get,()=>!0),J=i.useSyncExternalStore(je.subscribe,je.get,()=>!0),U=i.useSyncExternalStore(fe.subscribe,fe.get,()=>!0),[re,Be]=i.useState(0);i.useEffect(()=>{if(U&&U.length){const l=U.find(r=>r[0]===63),n=ae(l[1].fee,5);Be(n)}},[U]);const[Y,Ae]=i.useState(),[z,ie]=i.useState("asset");i.useEffect(()=>{if(!h||!h.length)return;const l=new es(h??[],{includeScore:!0,threshold:.2,keys:z==="asset"?["asset_a_symbol","asset_b_symbol"]:["share_asset_symbol"]});Ae(l)},[h,z]);const[G,Fe]=i.useState(),[E,Q]=i.useState(),[Ce,ne]=i.useState(!1);i.useEffect(()=>{if(Y&&G){const l=Y.search(G);Q(l)}},[Y,G]);const oe=({index:l,style:n})=>{const r=E[l].item;return e.jsxs("div",{style:{...n},className:"grid grid-cols-12",onClick:()=>{y(r.id),ne(!1),Q()},children:[e.jsx("div",{className:"col-span-2",children:r.id}),e.jsx("div",{className:"col-span-3",children:r.share_asset_symbol}),e.jsxs("div",{className:"col-span-3",children:[r.asset_a_symbol," (",r.asset_a_id,")"]}),e.jsxs("div",{className:"col-span-3",children:[r.asset_b_symbol," (",r.asset_b_id,")"]}),e.jsxs("div",{className:"col-span-1",children:[r.taker_fee_percent/100,"%"]})]},`acard-${r.id}`)},ce={backgroundColor:"#252526",color:"white"};i.useEffect(()=>{async function l(){if(window.location.search){console.log("Parsing url params");const n=new URLSearchParams(window.location.search),r=Object.fromEntries(n.entries()),o=r&&r.pool?r.pool:null;if(!o||!o.length){console.log("Invalid pool parameters"),y("1.19.0");return}if(o&&o.length&&!o.includes("1.19.")){console.log("Invalid pool parameters"),y("1.19.0");return}if(!(h&&h.length?h.map(m=>m.id):[]).includes(o)){console.log("Replacing unknown pool with first pool in list"),y("1.19.0");return}y(o)}}h&&h.length&&l()},[h]);const[f,de]=i.useState(0),[u,Pe]=i.useState(),[s,me]=i.useState(""),[t,he]=i.useState("");i.useEffect(()=>{if(h&&c&&N){const l=h.find(o=>o.id===c);Pe(l);const n=N.find(o=>o.id===l.asset_a_id),r=N.find(o=>o.id===l.asset_b_id);me(n),he(r),de(1)}},[c,N]);const[d,Te]=i.useState();i.useEffect(()=>{let l;return a&&a.chain&&u&&(l=xs([a.chain,u.id]).subscribe(({data:r,error:o,loading:g})=>{if(r&&!o&&!g){let m=r;m.asset_a_symbol=s.symbol,m.asset_a_precision=s.precision,m.asset_b_symbol=t.symbol,m.asset_b_precision=t.precision,m.share_asset_symbol=u.share_asset_symbol,m.readable_balance_a=`${ae(m.balance_a,s.precision)} ${s.symbol}`,m.readable_balance_b=`${ae(m.balance_b,t.precision)} ${t.symbol}`,m.share_asset_details=N.find(I=>I.id===m.share_asset),Te(m)}})),()=>{l&&l()}},[a,u,s,t,N]);const[Ee,Me]=i.useState(null),[Oe,Ie]=i.useState(null),[Le,Re]=i.useState(null),[qe,Je]=i.useState(null),[Ue,ze]=i.useState(null);i.useEffect(()=>{let l,n,r,o,g;if(a&&a.id&&s&&t&&u){l=te([a.chain,s.id.replace("1.3.","2.3.")]).subscribe(({data:x,error:p,loading:b})=>{x&&!p&&!b&&Me(x)}),n=te([a.chain,t.id.replace("1.3.","2.3.")]).subscribe(({data:x,error:p,loading:b})=>{x&&!p&&!b&&Ie(x)});const v=N.find(x=>x.symbol===u.share_asset_symbol);r=te([a.chain,v.id.replace("1.3.","2.3.")]).subscribe(({data:x,error:p,loading:b})=>{x&&!p&&!b&&Re(x)}),s.bitasset_data_id&&(o=$e([a.chain,s.bitasset_data_id]).subscribe(({data:p,error:b,loading:L})=>{p&&!b&&!L&&Je(p)})),t.bitasset_data_id&&(g=$e([a.chain,t.bitasset_data_id]).subscribe(({data:p,error:b,loading:L})=>{p&&!b&&!L&&ze(p)}))}return()=>{l&&l(),n&&n(),r&&r(),o&&o(),g&&g()}},[a,s,t,u,N]);const[q,Ve]=i.useState();i.useEffect(()=>{let l;return a&&a.id&&s&&t&&(l=us([a.chain,a.id]).subscribe(({data:r,error:o,loading:g})=>{r&&!o&&!g&&Ve(r)})),()=>{l&&l()}},[a,s,t]);const O=i.useMemo(()=>{if(s&&t&&d){let l=function(){if(v===0)return 0;if(v>0)return Math.min(Number(x),Math.ceil(Number(f)*Number(g)*(Number(v)/1e4)))},n=function(){if(X===0)return 0;if(X>0)return Math.min(Number(p),Math.ceil(Number(f)*Number(I)*(Number(X)/1e4)))},r=function(){return typeof b>"u"&&v>0?Number(v)/1e4:typeof b>"u"&&v===0?0:Number(b)/1e4};console.log("Calculating the amount the user can buy");let o=Number(d.balance_a),g=Number(10**s.precision),m=Number(d.balance_b),I=Number(10**t.precision);const v=s.market_fee_percent,X=t.market_fee_percent,x=s.max_market_fee,p=t.max_market_fee,b=d.taker_fee_percent;let L=Number(r()),W;if(s.id===u.asset_a_id){let M=Number(m)-Math.ceil(Number(m)*Number(o)/(Number(o)+(Number(f)*Number(g)-Number(l())))),Z=Number(M)*Number(b)/1e4;W=(Number(M)-Math.floor(Number(Z))-Math.ceil(Math.min(Number(p),Math.ceil(Number(M)*Number(L)))))/Number(I)}else{let M=Number(o)-Math.ceil(Number(o)*Number(m)/(Number(m)+(Number(f)*Number(I)-Number(n())))),Z=Number(M)*Number(b)/1e4;W=(Number(M)-Math.floor(Number(Z))-Math.ceil(Math.min(Number(x),Math.ceil(Number(M)*Number(L)))))/Number(g)}return W}},[f,s,t,d]),[Xe,He]=i.useState();i.useEffect(()=>{He(e.jsx(k,{value:O??0,disabled:!0,className:"mb-3"}))},[O]);const[V,ue]=i.useState(!1),[Ke,Ye]=i.useState("default_pool_key");i.useEffect(()=>{c&&c.length&&window.history.replaceState({},"",`?pool=${c}`),Ye(`pool_key${Date.now()}`)},[c]);const Ge=({index:l,style:n})=>{const r=h[l];return e.jsx(ds,{value:r.id,style:n,children:`${r.id} - ${r.share_asset_symbol} - ${r.asset_a_symbol}:${r.asset_b_symbol}`})};return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"container mx-auto mt-5 mb-5",children:[e.jsx("div",{className:"grid grid-cols-1 gap-3",children:e.jsxs(S,{className:"p-2",children:[e.jsxs($,{children:[e.jsx(B,{children:"Bitshares Liquidity Pool Exchange"}),e.jsx(A,{children:"Easily swap between Bitshares assets using one of these user created liquidity pools."})]}),e.jsxs(w,{children:[h?null:e.jsx("p",{children:"Loading pool data"}),N?null:e.jsx("p",{children:"Loading asset data"}),h&&N?e.jsxs(e.Fragment,{children:[e.jsx(as,{..._,children:e.jsxs("form",{onSubmit:()=>{ue(!0),event.preventDefault()},children:[e.jsx(F,{control:_.control,name:"account",render:({field:l})=>e.jsxs(C,{children:[e.jsx(P,{children:"Account"}),e.jsx(T,{children:e.jsx(k,{disabled:!0,placeholder:"Bitshares account (1.2.x)",className:"mb-3 mt-3",value:`${a.username} (${a.id})`})}),e.jsx(D,{})]})}),e.jsx(F,{control:_.control,name:"pool",render:({field:l})=>e.jsxs(C,{children:[e.jsx(P,{children:e.jsxs("div",{className:"grid grid-cols-2 mt-3",children:[e.jsx("div",{className:"mt-1",children:"Liquidity pool"}),e.jsx("div",{className:"text-gray-500 text-right",children:e.jsxs(Ne,{open:Ce,onOpenChange:n=>{n||Q(),ne(n)},children:[e.jsx(ge,{asChild:!0,children:e.jsx(R,{className:"h-5 p-3",children:"Search"})}),e.jsxs(_e,{className:"sm:max-w-[900px] bg-white",children:[e.jsxs(ye,{children:[e.jsx(Se,{children:"Search for a liquidity pool"}),e.jsx(we,{children:"Select a search result to proceed with your desired asset swap."})]}),e.jsx("div",{className:"grid grid-cols-1",children:e.jsx("div",{className:"col-span-1",children:e.jsxs(ms,{defaultValue:"asset",children:[e.jsxs(hs,{className:"grid max-w-[400px] grid-cols-2 mb-1 gap-3",children:[z==="asset"?e.jsx(K,{style:ce,value:"asset",children:"Swappable assets"}):e.jsx(K,{value:"asset",onClick:()=>ie("asset"),children:"Swappable assets"}),z==="share"?e.jsx(K,{style:ce,value:"share",children:"Pool share asset"}):e.jsx(K,{value:"share",onClick:()=>ie("share"),children:"Pool share asset"})]}),e.jsx(k,{name:"assetSearch",placeholder:"Enter search text",className:"mb-3 max-w-[400px]",onChange:n=>{Fe(n.target.value)}}),e.jsx(ve,{value:"share",children:E&&E.length?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"grid grid-cols-12",children:[e.jsx("div",{className:"col-span-2",children:"ID"}),e.jsx("div",{className:"col-span-3",children:e.jsx("b",{children:"Share asset"})}),e.jsx("div",{className:"col-span-3",children:"Asset A"}),e.jsx("div",{className:"col-span-3",children:"Asset B"}),e.jsx("div",{className:"col-span-1",children:"Taker Fee"})]}),e.jsx(ee,{height:400,itemCount:E.length,itemSize:45,className:"w-full",children:oe})]}):null}),e.jsx(ve,{value:"asset",children:E&&E.length?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"grid grid-cols-12",children:[e.jsx("div",{className:"col-span-2",children:"ID"}),e.jsx("div",{className:"col-span-3",children:"Share asset"}),e.jsx("div",{className:"col-span-3",children:e.jsx("b",{children:"Asset A"})}),e.jsx("div",{className:"col-span-3",children:e.jsx("b",{children:"Asset B"})}),e.jsx("div",{className:"col-span-1",children:"Taker Fee"})]}),e.jsx(ee,{height:400,itemCount:E.length,itemSize:45,className:"w-full",children:oe})]}):null})]})})})]})]})})]})}),e.jsx(T,{onValueChange:n=>{y(n)},children:e.jsxs(is,{children:[e.jsx(ns,{className:"mb-3",children:e.jsx(os,{placeholder:u?`${u.id} - ${u.share_asset_symbol} - ${u.asset_a_symbol}:${u.asset_b_symbol}`:"Select a pool.."})}),e.jsx(cs,{className:"bg-white",children:h&&h.length?e.jsx(ee,{height:150,itemCount:h.length,itemSize:35,className:"w-full",initialScrollOffset:h.map(n=>n.id).indexOf(c)*35,children:Ge}):null})]},Ke)}),e.jsx(D,{})]})}),e.jsx("div",{className:"grid grid-cols-2 gap-5 mt-5 mb-5",children:c&&d&&s&&t?e.jsxs(e.Fragment,{children:[e.jsx(S,{children:e.jsx(w,{children:e.jsx(F,{control:_.control,name:"balanceA",render:({field:l})=>e.jsxs(C,{children:[e.jsxs(P,{children:["Swappable ",s.symbol," (",e.jsx(le,{classNameContents:"text-blue-500",type:"text",text:s.id,hyperlink:`https://blocksights.info/#/assets/${s.id}`}),")"]}),e.jsx(T,{children:d?e.jsx(k,{disabled:!0,placeholder:"0",className:"mb-3 mt-3",value:d.readable_balance_a}):e.jsx(j,{className:"h-4 w-[250px]"})}),e.jsx(D,{})]})})})}),e.jsx(S,{children:e.jsx(w,{children:e.jsx(F,{control:_.control,name:"balanceB",render:({field:l})=>e.jsxs(C,{children:[e.jsxs(P,{children:["Swappable ",t.symbol," (",e.jsx(le,{classNameContents:"text-blue-500",type:"text",text:t.id,hyperlink:`https://blocksights.info/#/assets/${t.id}`}),")"]}),e.jsx(T,{children:d?e.jsx(k,{disabled:!0,placeholder:"0",className:"mb-3 mt-3",value:d.readable_balance_b}):e.jsx(j,{className:"h-4 w-[250px]"})}),e.jsx(D,{})]})})})})]}):null}),c&&c.length?e.jsx(e.Fragment,{children:e.jsx(F,{control:_.control,name:"sellAmount",render:({field:l})=>e.jsxs(C,{children:[e.jsx(P,{children:`Amount of ${s?s.symbol:"???"} to swap`}),e.jsx(T,{onChange:n=>{const r=n.target.value;/^[0-9]*\.?[0-9]*$/.test(r)&&de(r)},children:e.jsx(k,{label:`Amount of ${s?s.symbol:"???"} to swap`,value:f,placeholder:f,className:"mb-3"})}),e.jsx(D,{})]})})}):null,f&&d&&d.taker_fee_percent?e.jsx(e.Fragment,{children:e.jsx(F,{control:_.control,name:"marketFee",render:({field:l})=>e.jsxs(C,{children:[e.jsx(P,{children:"Pool fee"}),e.jsx(T,{children:e.jsx(k,{disabled:!0,placeholder:"0",className:"mb-3 mt-3",value:`${(d.taker_fee_percent/1e4*f).toFixed(s.precision)} (${s.symbol}) (${d.taker_fee_percent/100}% fee)`})}),e.jsx(D,{})]})})}):null,u?e.jsx(F,{control:_.control,name:"networkFee",render:({field:l})=>e.jsxs(C,{children:[e.jsx(P,{children:"Network fee"}),e.jsx(T,{children:e.jsx(k,{disabled:!0,placeholder:`${re} BTS`,className:"mb-3 mt-3"})}),a.id===a.referrer?e.jsxs(D,{children:["Rebate: ",re*.8," BTS (vesting)"]}):null,e.jsx(D,{})]})}):null,d?e.jsx(e.Fragment,{children:e.jsx(F,{control:_.control,name:"buyAmount",render:({field:l})=>e.jsxs(C,{children:[e.jsx(P,{children:`Amount of ${t?t.symbol:"???"} you'll receive`}),e.jsx(T,{children:Xe}),e.jsx(D,{})]})})}):null,!c||!f||!O||V!==!1?e.jsx(R,{className:"mt-5 mb-3",variant:"outline",disabled:!0,type:"submit",children:"Submit"}):e.jsx(R,{className:"mt-5 mb-3",variant:"outline",type:"submit",children:"Submit"})]})}),V?e.jsx(ts,{operationName:"liquidity_pool_exchange",username:a.username,usrChain:a.chain,userID:a.id,dismissCallback:ue,headerText:`Exchanging ${f} ${s.symbol} for ${O} ${t.symbol}`,trxJSON:[{account:a.id,pool:c,amount_to_sell:{amount:ke(f,s.precision),asset_id:s.id},min_to_receive:{amount:ke(O,t.precision),asset_id:t.id},extensions:[]}]},`Exchanging${f}${s.symbol}for${O}${t.symbol}`):null,c&&!V?e.jsx(R,{variant:"outline",mt:"xl",onClick:()=>{const l=s;me(t),he(l)},children:"Swap buy/sell"}):null,c&&V?e.jsx(R,{variant:"outline",mt:"xl",disabled:!0,children:"Swap buy/sell"}):null,c?e.jsx(le,{variant:"outline",classNameContents:"ml-2",type:"button",text:"Blocksights pool explorer",hyperlink:`https://blocksights.info/#/pools/${c}${a.chain!=="bitshares"?"?network=testnet":""}`}):null,d?e.jsxs(Ne,{children:[e.jsx(ge,{asChild:!0,children:e.jsx(R,{className:"ml-2",variant:"outline",children:"Pool JSON"})}),e.jsxs(_e,{className:"sm:max-w-[550px] bg-white",children:[e.jsxs(ye,{children:[e.jsx(Se,{children:"Liquidity Pool JSON"}),e.jsx(we,{children:"Check out the details returned by the network for this pool"})]}),e.jsx("div",{className:"grid grid-cols-1",children:e.jsx("div",{className:"col-span-1",children:e.jsx(ls,{className:"h-72 rounded-md border",children:e.jsx("pre",{children:JSON.stringify(d,null,2)})})})})]})]}):null]}):null]})]})}),s&&t?e.jsx(rs,{assetA:s.symbol,assetAData:s,assetB:t.symbol,assetBData:t}):null,e.jsxs("div",{className:"grid grid-cols-2 gap-5 mt-5",children:[c?e.jsx("div",{className:"grid grid-cols-1 gap-3",children:q&&d?e.jsxs(e.Fragment,{children:[e.jsx(se,{asset:t.symbol,assetData:t,assetDetails:Oe,bitassetData:Ue,marketSearch:J,chain:a.chain,usrBalances:q,type:"buy"}),e.jsx(se,{asset:s.symbol,assetData:s,assetDetails:Ee,bitassetData:qe,marketSearch:J,chain:a.chain,usrBalances:q,type:"sell"})]}):e.jsxs(e.Fragment,{children:[e.jsxs(S,{children:[e.jsxs($,{className:"pb-2 pt-4",children:[e.jsx(B,{children:"Quote asset"}),e.jsx(A,{className:"text-lg",children:"Loading..."})]}),e.jsx(w,{children:e.jsxs("div",{className:"space-y-2",children:[e.jsx(j,{className:"h-4 w-[250px]"}),e.jsx(j,{className:"h-4 w-[200px]"}),e.jsx(j,{className:"h-4 w-[250px]"}),e.jsx(j,{className:"h-4 w-[200px]"})]})})]}),e.jsxs(S,{children:[e.jsxs($,{className:"pb-2 pt-4",children:[e.jsx(B,{children:"Base asset"}),e.jsx(A,{className:"text-lg",children:"Loading..."})]}),e.jsx(w,{children:e.jsxs("div",{className:"space-y-2",children:[e.jsx(j,{className:"h-4 w-[250px]"}),e.jsx(j,{className:"h-4 w-[200px]"}),e.jsx(j,{className:"h-4 w-[250px]"}),e.jsx(j,{className:"h-4 w-[200px]"})]})})]})]})}):null,e.jsx("div",{className:"grid grid-cols-1 gap-3",children:c&&s&&t?e.jsxs(e.Fragment,{children:[e.jsx("a",{href:`/dex/index.html?market=${s.symbol}_${t.symbol}`,children:e.jsxs(S,{children:[e.jsxs($,{className:"pb-2 pt-4",children:[e.jsx(B,{children:"Trade on the Dex instead?"}),e.jsxs(A,{className:"text-sm",children:["Market: ",s.symbol,"/",t.symbol]})]}),e.jsx(w,{className:"text-sm pb-2",children:"You can manually create limit orders for trading pairs of your choice on the Bitshares DEX"})]})}),e.jsx("a",{href:`/dex/index.html?market=${u?.share_asset_symbol}_${s.symbol!=="BTS"?"BTS":s.symbol}`,children:e.jsxs(S,{children:[e.jsxs($,{className:"pb-2 pt-4",children:[e.jsx(B,{children:"Purchase stake in this pool?"}),e.jsxs(A,{className:"text-sm",children:["Share asset: ",u?.share_asset_symbol]})]}),e.jsx(w,{className:"text-sm pb-2",children:"Receive swap fee yield over time by owning a stake in the pool via a market limit order."})]})}),e.jsx("a",{href:`/stake/index.html?pool=${c}`,children:e.jsxs(S,{children:[e.jsxs($,{className:"pb-2 pt-4",children:[e.jsx(B,{children:"Stake assets in this pool?"}),e.jsxs(A,{className:"text-sm",children:["Share asset: ",u?.share_asset_symbol]})]}),e.jsx(w,{className:"text-sm pb-2",children:"Earn swap fees on assets staked in liquidity pools minus a small pool defined withdrawal fee."})]})}),e.jsxs(S,{children:[e.jsxs($,{className:"pb-2 pt-4",children:[e.jsx(B,{children:"Need to borrow some assets?"}),e.jsx(A,{className:"text-sm",children:"DEX users lend assets at user defined rates. You could borrow from DEX participants, at their defined rates."})]}),e.jsxs(w,{className:"text-sm pb-3",children:[e.jsx(De,{children:"Search by borrowable assets"}),e.jsx("br",{}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${s.symbol}`,children:e.jsx(H,{children:s.symbol})}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${t.symbol}`,children:e.jsx(H,{className:"ml-2 mt-1 mb-1",children:t.symbol})}),e.jsx("br",{}),e.jsx(De,{children:"Search by accepted collateral"}),e.jsx("br",{}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${s.symbol}`,children:e.jsx(H,{children:s.symbol})}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${t.symbol}`,children:e.jsx(H,{className:"ml-2 mt-1",children:t.symbol})})]})]}),d&&J&&q?e.jsx(se,{asset:d.share_asset_symbol,assetData:d.share_asset_details,assetDetails:Le,bitassetData:null,marketSearch:J,chain:a.chain,usrBalances:q,type:"pool"}):e.jsxs(S,{children:[e.jsxs($,{className:"pb-2 pt-4",children:[e.jsx(B,{children:"Pool share asset"}),e.jsx(A,{className:"text-lg",children:"Loading..."})]}),e.jsx(w,{children:e.jsxs("div",{className:"space-y-2",children:[e.jsx(j,{className:"h-4 w-[250px]"}),e.jsx(j,{className:"h-4 w-[200px]"}),e.jsx(j,{className:"h-4 w-[250px]"}),e.jsx(j,{className:"h-4 w-[200px]"})]})})]})]}):null})]})]}),a&&a.username&&a.username.length?e.jsx(Ze,{usr:a}):null]})}export{Fs as default};
