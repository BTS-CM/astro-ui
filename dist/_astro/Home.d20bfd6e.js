import{$ as l,j as e,A as d,C as s,a as i,b as t,c as n,d as x,e as h}from"./CurrentUser.9d68bb13.js";import{r as o}from"./index.40fd2bfc.js";function p(j){const[r,a]=o.useState();return o.useEffect(()=>l.subscribe(c=>{a(c)}),[l]),!r||!r.id||!r.id.length?e.jsx(d,{}):e.jsx(e.Fragment,{children:e.jsxs("div",{className:"container mx-auto mt-5 mb-5",children:[e.jsxs("div",{className:"grid grid-cols-3 gap-3",children:[e.jsx("a",{href:"/pool/index.html",style:{textDecoration:"none"},children:e.jsx(s,{children:e.jsxs(i,{children:[e.jsx(t,{children:"💱 Pool exchange"}),e.jsx(n,{children:"Trade with a liquidity pool"})]})})}),e.jsx("a",{href:"/dex/index.html",style:{textDecoration:"none"},children:e.jsx(s,{children:e.jsxs(i,{children:[e.jsx(t,{children:"📈 DEX limit orders"}),e.jsx(n,{children:"Trade on the Bitshares DEX"})]})})}),e.jsx("a",{href:"/portfolio/index.html",style:{textDecoration:"none"},children:e.jsx(s,{children:e.jsxs(i,{children:[e.jsx(t,{children:"💰 Portfolio"}),e.jsx(n,{children:"View your portfolio"})]})})})]}),e.jsx("div",{className:"grid grid-cols-1 mt-5",children:r?e.jsx(x,{usr:r,resetCallback:h}):null})]})})}export{p as default};
