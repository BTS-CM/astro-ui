import{r as t}from"./index.33c77f1d.js";import{k as o,_ as a}from"./hover-card.e7ea2833.js";function s(e){const r=t.useRef({value:e,previous:e});return t.useMemo(()=>(r.current.value!==e&&(r.current.previous=r.current.value,r.current.value=e),r.current.previous),[e])}const c=t.forwardRef((e,r)=>t.createElement(o.span,a({},e,{ref:r,style:{position:"absolute",border:0,width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",wordWrap:"normal",...e.style}}))),d=c;export{s as $,d as a,c as b};
