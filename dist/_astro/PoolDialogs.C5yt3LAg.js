import{u as s,O as R,P as q,Q as z,S as F,T as L,U as O}from"./button.gDHZ9QV2.js";import{r}from"./index.vR8cGMCg.js";import{F as Q}from"./index.esm.ysaRy2yh.js";import{w as C,x as T,H as j,a as p,e as u,C as b,b as f,c as g,d as y}from"./CurrentUser.JfssIRBN.js";function K(A){const{assetA:l,assetB:a,assetAData:P,assetBData:v,chain:d}=A,c=r.useSyncExternalStore(C.subscribe,C.get,()=>!0),h=r.useSyncExternalStore(T.subscribe,T.get,()=>!0),t=r.useMemo(()=>d&&(c||h)?d==="bitshares"?c:h:[],[c,h,d]),[N,D]=r.useState(),[$,B]=r.useState(),[S,E]=r.useState();r.useEffect(()=>{function i(){const o=t.filter(e=>e.asset_a_symbol===l||e.asset_b_symbol===l);D(o)}t&&l&&i()},[t,l]),r.useEffect(()=>{function i(){const o=t.filter(e=>e.asset_a_symbol===a||e.asset_b_symbol===a);B(o)}t&&a&&i()},[t,a]),r.useEffect(()=>{function i(){const o=t.filter(e=>e.asset_a_symbol===l&&e.asset_b_symbol===a||e.asset_a_symbol===a&&e.asset_b_symbol===l);E(o&&o.length?o:[])}t&&l&&a&&i()},[t,l,a]);function x({id:i,share_asset_symbol:o,asset_a_symbol:e,asset_b_symbol:_}){return s.jsxs("div",{className:"grid grid-cols-10",children:[s.jsx("div",{className:"col-span-1",children:s.jsx("p",{children:i})}),s.jsx("div",{className:"col-span-3",children:s.jsx("p",{children:o})}),s.jsx("div",{className:"col-span-3",children:s.jsx("p",{children:e})}),s.jsx("div",{className:"col-span-3",children:s.jsx("p",{children:_})})]})}const k=({index:i,style:o})=>{const e=N[i];return s.jsx("a",{style:o,href:`/pool/index.html?pool=${e.id}`,children:s.jsx(x,{id:e.id,share_asset_symbol:e.share_asset_symbol,asset_a_symbol:e.asset_a_symbol,asset_b_symbol:e.asset_b_symbol})},`a_${e.id}`)},H=({index:i,style:o})=>{const e=$[i];return s.jsx("a",{style:o,href:`/pool/index.html?pool=${e.id}`,children:s.jsx(x,{id:e.id,share_asset_symbol:e.share_asset_symbol,asset_a_symbol:e.asset_a_symbol,asset_b_symbol:e.asset_b_symbol})},`a_${e.id}`)},M=({index:i,style:o})=>{const e=S[i];return s.jsx("a",{style:o,href:`/pool/index.html?pool=${e.id}`,children:s.jsx(x,{id:e.id,share_asset_symbol:e.share_asset_symbol,asset_a_symbol:e.asset_a_symbol,asset_b_symbol:e.asset_b_symbol})},`a_${e.id}`)};function m({title:i,poolArray:o,dialogTitle:e,dialogDescription:_,type:w}){if(!o)return s.jsx(b,{children:s.jsxs(f,{className:"pb-2",children:[s.jsx(g,{children:i}),s.jsx(y,{children:"loading..."})]})});if(!o.length)return s.jsx(b,{children:s.jsxs(f,{className:"pb-2",children:[s.jsx(g,{children:i}),s.jsx(y,{children:"0 pools found"})]})});let n;return w==="A"?n=k:w==="B"?n=H:n=M,s.jsxs(R,{children:[s.jsx(q,{asChild:!0,children:s.jsx(b,{children:s.jsxs(f,{className:"pb-3 pt-3",children:[s.jsx(g,{children:i}),s.jsxs(y,{children:[o&&o.length," pools found"]})]})})}),s.jsxs(z,{className:"sm:max-w-[800px] bg-white",children:[s.jsxs(F,{children:[s.jsx(L,{children:e}),s.jsx(O,{children:_})]}),s.jsxs("div",{className:"grid grid-cols-1",children:[s.jsxs("div",{className:"grid grid-cols-10",children:[s.jsx("div",{className:"col-span-1",children:"id"}),s.jsx("div",{className:"col-span-3",children:"Share asset"}),s.jsx("div",{className:"col-span-3",children:"Asset A"}),s.jsx("div",{className:"col-span-3",children:"Asset B"})]}),s.jsx(Q,{height:300,itemCount:o.length,itemSize:35,className:"w-full",children:n})]})]})]})}return s.jsxs("div",{className:"grid grid-cols-3 gap-5 mt-3",children:[s.jsxs(j,{children:[s.jsx(p,{asChild:!0,children:s.jsx("div",{children:s.jsx(m,{title:`${l&&l.length<12?l:P.id} Pools`,poolArray:N,dialogTitle:`${l} Pools`,dialogDescription:`These Bitshares pools use ${l} (${P.id}) as one of the assets.`,type:"A"})})}),s.jsxs(u,{className:"w-60",children:["Swap ",l," using one of these liquidity pools"]})]},"hover_a"),s.jsxs(j,{children:[s.jsx(p,{asChild:!0,children:s.jsx("div",{children:s.jsx(m,{title:"Market Pools",poolArray:S,dialogTitle:`${l}/${a} Pools`,dialogDescription:`These pools trade between ${l} and ${a}.`,type:"Market"})})}),s.jsxs(u,{className:"w-60",children:["Swap between ",l," and ",a," using one of these liquidity pools"]})]},"hover_b"),s.jsxs(j,{children:[s.jsx(p,{asChild:!0,children:s.jsx("div",{children:s.jsx(m,{title:`${a&&a.length<12?a:v.id} Pools`,poolArray:$,dialogTitle:`${a} Pools`,dialogDescription:`These Bitshares pools use ${a} (${v.id})  as one of the assets.`,type:"B"})})}),s.jsxs(u,{className:"w-60",children:["Swap ",a," using one of these liquidity pools"]})]},"hover_c")]})}export{K as P};