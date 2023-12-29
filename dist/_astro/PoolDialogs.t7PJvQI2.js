import{I as F,J as I,u as s,T as z,U as J,V as L,W as O,X as U,Y as V,O as W}from"./button.XYtNsIwi.js";import{r as n}from"./index.ebYJtNMn.js";import{F as X}from"./index.esm.ksywcv-c.js";import{H as j,a as u,e as P,C as b,b as p,c as D,d as f}from"./input.2f7523pR.js";import{j as B,k as S}from"./Init.bfqq3PXC.js";function ss(k){const{assetA:a,assetB:i,assetAData:y,assetBData:C,chain:d}=k,{t:l,i18n:Y}=F(I.get(),{i18n:W}),h=n.useSyncExternalStore(B.subscribe,B.get,()=>!0),m=n.useSyncExternalStore(S.subscribe,S.get,()=>!0),r=n.useMemo(()=>d&&(h||m)?d==="bitshares"?h:m:[],[h,m,d]),[T,w]=n.useState(),[v,H]=n.useState(),[A,E]=n.useState();n.useEffect(()=>{function t(){const o=r.filter(e=>e.asset_a_symbol===a||e.asset_b_symbol===a);w(o)}r&&a&&t()},[r,a]),n.useEffect(()=>{function t(){const o=r.filter(e=>e.asset_a_symbol===i||e.asset_b_symbol===i);H(o)}r&&i&&t()},[r,i]),n.useEffect(()=>{function t(){const o=r.filter(e=>e.asset_a_symbol===a&&e.asset_b_symbol===i||e.asset_a_symbol===i&&e.asset_b_symbol===a);E(o&&o.length?o:[])}r&&a&&i&&t()},[r,a,i]);function x({id:t,share_asset_symbol:o,asset_a_symbol:e,asset_b_symbol:_}){return s.jsxs("div",{className:"grid grid-cols-10",children:[s.jsx("div",{className:"col-span-1",children:s.jsx("p",{children:t})}),s.jsx("div",{className:"col-span-3",children:s.jsx("p",{children:o})}),s.jsx("div",{className:"col-span-3",children:s.jsx("p",{children:e})}),s.jsx("div",{className:"col-span-3",children:s.jsx("p",{children:_})})]})}const M=({index:t,style:o})=>{const e=T[t];return s.jsx("a",{style:o,href:`/pool/index.html?pool=${e.id}`,children:s.jsx(x,{id:e.id,share_asset_symbol:e.share_asset_symbol,asset_a_symbol:e.asset_a_symbol,asset_b_symbol:e.asset_b_symbol})},`a_${e.id}`)},$=({index:t,style:o})=>{const e=v[t];return s.jsx("a",{style:o,href:`/pool/index.html?pool=${e.id}`,children:s.jsx(x,{id:e.id,share_asset_symbol:e.share_asset_symbol,asset_a_symbol:e.asset_a_symbol,asset_b_symbol:e.asset_b_symbol})},`a_${e.id}`)},R=({index:t,style:o})=>{const e=A[t];return s.jsx("a",{style:o,href:`/pool/index.html?pool=${e.id}`,children:s.jsx(x,{id:e.id,share_asset_symbol:e.share_asset_symbol,asset_a_symbol:e.asset_a_symbol,asset_b_symbol:e.asset_b_symbol})},`a_${e.id}`)};function g({title:t,poolArray:o,dialogTitle:e,dialogDescription:_,type:N}){if(!o)return s.jsx(b,{children:s.jsxs(p,{className:"pb-2",children:[s.jsx(D,{children:t}),s.jsx(f,{children:l("PoolDialogs:loadingMessage")})]})});if(!o.length)return s.jsx(b,{children:s.jsxs(p,{className:"pb-2",children:[s.jsx(D,{children:t}),s.jsx(f,{children:l("PoolDialogs:noPoolsFoundMessage")})]})});let c;return N==="A"?c=M:N==="B"?c=$:c=R,s.jsxs(z,{children:[s.jsx(J,{asChild:!0,children:s.jsx(b,{children:s.jsxs(p,{className:"pb-3 pt-3",children:[s.jsx(D,{children:t}),s.jsx(f,{children:l("PoolDialogs:poolsFound",{count:o&&o.length})})]})})}),s.jsxs(L,{className:"sm:max-w-[800px] bg-white",children:[s.jsxs(O,{children:[s.jsx(U,{children:e}),s.jsx(V,{children:_})]}),s.jsxs("div",{className:"grid grid-cols-1",children:[s.jsxs("div",{className:"grid grid-cols-10",children:[s.jsx("div",{className:"col-span-1",children:l("PoolDialogs:idColumnTitle")}),s.jsx("div",{className:"col-span-3",children:l("PoolDialogs:shareAssetColumnTitle")}),s.jsx("div",{className:"col-span-3",children:l("PoolDialogs:assetAColumnTitle")}),s.jsx("div",{className:"col-span-3",children:l("PoolDialogs:assetBColumnTitle")})]}),s.jsx(X,{height:300,itemCount:o.length,itemSize:35,className:"w-full",children:c})]})]})]})}return s.jsxs("div",{className:"grid grid-cols-3 gap-5 mt-3",children:[s.jsxs(j,{children:[s.jsx(u,{asChild:!0,children:s.jsx("div",{children:s.jsx(g,{title:l("PoolDialogs:assetAPoolsTitle",{assetA:a&&a.length<12?a:y.id}),poolArray:T,dialogTitle:l("PoolDialogs:assetAPoolsDialogTitle",{assetA:a}),dialogDescription:l("PoolDialogs:assetAPoolsDialogDescription",{assetA:a,assetAId:y.id}),type:"A"})})}),s.jsx(P,{className:"w-60",children:l("PoolDialogs:assetAHoverCardContent",{assetA:a})})]},"hover_a"),s.jsxs(j,{children:[s.jsx(u,{asChild:!0,children:s.jsx("div",{children:s.jsx(g,{title:l("PoolDialogs:marketPoolsTitle"),poolArray:A,dialogTitle:l("PoolDialogs:marketPoolsDialogTitle",{assetA:a,assetB:i}),dialogDescription:l("PoolDialogs:marketPoolsDialogDescription",{assetA:a,assetB:i}),type:"Market"})})}),s.jsx(P,{className:"w-60",children:l("PoolDialogs:marketHoverCardContent",{assetA:a,assetB:i})})]},"hover_b"),s.jsxs(j,{children:[s.jsx(u,{asChild:!0,children:s.jsx("div",{children:s.jsx(g,{title:l("PoolDialogs:assetBPoolsTitle",{assetB:i&&i.length<12?i:C.id}),poolArray:v,dialogTitle:l("PoolDialogs:assetBPoolsDialogTitle",{assetB:i}),dialogDescription:l("PoolDialogs:assetBPoolsDialogDescription",{assetB:i,assetBId:C.id}),type:"B"})})}),s.jsx(P,{className:"w-60",children:l("PoolDialogs:assetBHoverCardContent",{assetB:i})})]},"hover_c")]})}export{ss as P};
