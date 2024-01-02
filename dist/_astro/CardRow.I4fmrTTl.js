import{$ as B,a as A,b as F,_ as y,d as M,i as z,j as K,a7 as U,t as V,s as X,n as Y,o as q,k as J,e as T,u as f,v as W,I as Q,J as Z,T as ee,V as te,W as oe,X as ne,U as re,K as ae,O as ce}from"./button.vlNrmCEY.js";import{r as n}from"./index.ebYJtNMn.js";import{a as se}from"./index.skzTx53k.js";import{B as ie}from"./badge.3hMqq7iR.js";const[D,Me]=B("Tooltip",[A]),R=A(),le="TooltipProvider",de=700,_="tooltip.open",[ue,k]=D(le),fe=e=>{const{__scopeTooltip:o,delayDuration:t=de,skipDelayDuration:r=300,disableHoverableContent:a=!1,children:i}=e,[c,d]=n.useState(!0),s=n.useRef(!1),u=n.useRef(0);return n.useEffect(()=>{const l=u.current;return()=>window.clearTimeout(l)},[]),n.createElement(ue,{scope:o,isOpenDelayed:c,delayDuration:t,onOpen:n.useCallback(()=>{window.clearTimeout(u.current),d(!1)},[]),onClose:n.useCallback(()=>{window.clearTimeout(u.current),u.current=window.setTimeout(()=>d(!0),r)},[r]),isPointerInTransitRef:s,onPointerInTransitChange:n.useCallback(l=>{s.current=l},[]),disableHoverableContent:a},i)},L="Tooltip",[pe,O]=D(L),$e=e=>{const{__scopeTooltip:o,children:t,open:r,defaultOpen:a=!1,onOpenChange:i,disableHoverableContent:c,delayDuration:d}=e,s=k(L,e.__scopeTooltip),u=R(o),[l,p]=n.useState(null),v=V(),$=n.useRef(0),x=c??s.disableHoverableContent,b=d??s.delayDuration,h=n.useRef(!1),[m=!1,g]=X({prop:r,defaultProp:a,onChange:I=>{I?(s.onOpen(),document.dispatchEvent(new CustomEvent(_))):s.onClose(),i?.(I)}}),C=n.useMemo(()=>m?h.current?"delayed-open":"instant-open":"closed",[m]),E=n.useCallback(()=>{window.clearTimeout($.current),h.current=!1,g(!0)},[g]),w=n.useCallback(()=>{window.clearTimeout($.current),g(!1)},[g]),j=n.useCallback(()=>{window.clearTimeout($.current),$.current=window.setTimeout(()=>{h.current=!0,g(!0)},b)},[b,g]);return n.useEffect(()=>()=>window.clearTimeout($.current),[]),n.createElement(Y,u,n.createElement(pe,{scope:o,contentId:v,open:m,stateAttribute:C,trigger:l,onTriggerChange:p,onTriggerEnter:n.useCallback(()=>{s.isOpenDelayed?j():E()},[s.isOpenDelayed,j,E]),onTriggerLeave:n.useCallback(()=>{x?w():window.clearTimeout($.current)},[w,x]),onOpen:E,onClose:w,disableHoverableContent:x},t))},N="TooltipTrigger",xe=n.forwardRef((e,o)=>{const{__scopeTooltip:t,...r}=e,a=O(N,t),i=k(N,t),c=R(t),d=n.useRef(null),s=M(o,d,a.onTriggerChange),u=n.useRef(!1),l=n.useRef(!1),p=n.useCallback(()=>u.current=!1,[]);return n.useEffect(()=>()=>document.removeEventListener("pointerup",p),[p]),n.createElement(q,y({asChild:!0},c),n.createElement(J.button,y({"aria-describedby":a.open?a.contentId:void 0,"data-state":a.stateAttribute},r,{ref:s,onPointerMove:T(e.onPointerMove,v=>{v.pointerType!=="touch"&&!l.current&&!i.isPointerInTransitRef.current&&(a.onTriggerEnter(),l.current=!0)}),onPointerLeave:T(e.onPointerLeave,()=>{a.onTriggerLeave(),l.current=!1}),onPointerDown:T(e.onPointerDown,()=>{u.current=!0,document.addEventListener("pointerup",p,{once:!0})}),onFocus:T(e.onFocus,()=>{u.current||a.onOpen()}),onBlur:T(e.onBlur,a.onClose),onClick:T(e.onClick,a.onClose)})))}),ve="TooltipPortal",[He,he]=D(ve,{forceMount:void 0}),P="TooltipContent",be=n.forwardRef((e,o)=>{const t=he(P,e.__scopeTooltip),{forceMount:r=t.forceMount,side:a="top",...i}=e,c=O(P,e.__scopeTooltip);return n.createElement(F,{present:r||c.open},c.disableHoverableContent?n.createElement(H,y({side:a},i,{ref:o})):n.createElement(ge,y({side:a},i,{ref:o})))}),ge=n.forwardRef((e,o)=>{const t=O(P,e.__scopeTooltip),r=k(P,e.__scopeTooltip),a=n.useRef(null),i=M(o,a),[c,d]=n.useState(null),{trigger:s,onClose:u}=t,l=a.current,{onPointerInTransitChange:p}=r,v=n.useCallback(()=>{d(null),p(!1)},[p]),$=n.useCallback((x,b)=>{const h=x.currentTarget,m={x:x.clientX,y:x.clientY},g=Te(m,h.getBoundingClientRect()),C=ye(m,g),E=Ce(b.getBoundingClientRect()),w=we([...C,...E]);d(w),p(!0)},[p]);return n.useEffect(()=>()=>v(),[v]),n.useEffect(()=>{if(s&&l){const x=h=>$(h,l),b=h=>$(h,s);return s.addEventListener("pointerleave",x),l.addEventListener("pointerleave",b),()=>{s.removeEventListener("pointerleave",x),l.removeEventListener("pointerleave",b)}}},[s,l,$,v]),n.useEffect(()=>{if(c){const x=b=>{const h=b.target,m={x:b.clientX,y:b.clientY},g=s?.contains(h)||l?.contains(h),C=!Ee(m,c);g?v():C&&(v(),u())};return document.addEventListener("pointermove",x),()=>document.removeEventListener("pointermove",x)}},[s,l,c,u,v]),n.createElement(H,y({},e,{ref:i}))}),[me,Se]=D(L,{isInside:!1}),H=n.forwardRef((e,o)=>{const{__scopeTooltip:t,children:r,"aria-label":a,onEscapeKeyDown:i,onPointerDownOutside:c,...d}=e,s=O(P,t),u=R(t),{onClose:l}=s;return n.useEffect(()=>(document.addEventListener(_,l),()=>document.removeEventListener(_,l)),[l]),n.useEffect(()=>{if(s.trigger){const p=v=>{const $=v.target;$!=null&&$.contains(s.trigger)&&l()};return window.addEventListener("scroll",p,{capture:!0}),()=>window.removeEventListener("scroll",p,{capture:!0})}},[s.trigger,l]),n.createElement(z,{asChild:!0,disableOutsidePointerEvents:!1,onEscapeKeyDown:i,onPointerDownOutside:c,onFocusOutside:p=>p.preventDefault(),onDismiss:l},n.createElement(K,y({"data-state":s.stateAttribute},u,d,{ref:o,style:{...d.style,"--radix-tooltip-content-transform-origin":"var(--radix-popper-transform-origin)","--radix-tooltip-content-available-width":"var(--radix-popper-available-width)","--radix-tooltip-content-available-height":"var(--radix-popper-available-height)","--radix-tooltip-trigger-width":"var(--radix-popper-anchor-width)","--radix-tooltip-trigger-height":"var(--radix-popper-anchor-height)"}}),n.createElement(U,null,r),n.createElement(me,{scope:t,isInside:!0},n.createElement(se,{id:s.contentId,role:"tooltip"},a||r))))});function Te(e,o){const t=Math.abs(o.top-e.y),r=Math.abs(o.bottom-e.y),a=Math.abs(o.right-e.x),i=Math.abs(o.left-e.x);switch(Math.min(t,r,a,i)){case i:return"left";case a:return"right";case t:return"top";case r:return"bottom";default:throw new Error("unreachable")}}function ye(e,o,t=5){const r=[];switch(o){case"top":r.push({x:e.x-t,y:e.y+t},{x:e.x+t,y:e.y+t});break;case"bottom":r.push({x:e.x-t,y:e.y-t},{x:e.x+t,y:e.y-t});break;case"left":r.push({x:e.x+t,y:e.y-t},{x:e.x+t,y:e.y+t});break;case"right":r.push({x:e.x-t,y:e.y-t},{x:e.x-t,y:e.y+t});break}return r}function Ce(e){const{top:o,right:t,bottom:r,left:a}=e;return[{x:a,y:o},{x:t,y:o},{x:t,y:r},{x:a,y:r}]}function Ee(e,o){const{x:t,y:r}=e;let a=!1;for(let i=0,c=o.length-1;i<o.length;c=i++){const d=o[i].x,s=o[i].y,u=o[c].x,l=o[c].y;s>r!=l>r&&t<(u-d)*(r-s)/(l-s)+d&&(a=!a)}return a}function we(e){const o=e.slice();return o.sort((t,r)=>t.x<r.x?-1:t.x>r.x?1:t.y<r.y?-1:t.y>r.y?1:0),Pe(o)}function Pe(e){if(e.length<=1)return e.slice();const o=[];for(let r=0;r<e.length;r++){const a=e[r];for(;o.length>=2;){const i=o[o.length-1],c=o[o.length-2];if((i.x-c.x)*(a.y-c.y)>=(i.y-c.y)*(a.x-c.x))o.pop();else break}o.push(a)}o.pop();const t=[];for(let r=e.length-1;r>=0;r--){const a=e[r];for(;t.length>=2;){const i=t[t.length-1],c=t[t.length-2];if((i.x-c.x)*(a.y-c.y)>=(i.y-c.y)*(a.x-c.x))t.pop();else break}t.push(a)}return t.pop(),o.length===1&&t.length===1&&o[0].x===t[0].x&&o[0].y===t[0].y?o:o.concat(t)}const De=fe,Oe=$e,_e=xe,S=be,Re=De,ke=Oe,Le=_e,G=n.forwardRef(({className:e,sideOffset:o=4,...t},r)=>f.jsx(S,{ref:r,sideOffset:o,className:W("z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",e),...t}));G.displayName=S.displayName;function Ge(e){Q(Z.get(),{i18n:ce});const[o,t]=n.useState(!1),[r,a]=n.useState(!1),i=c=>{c.stopPropagation(),o||t(!0)};return f.jsx("div",{className:"col-span-1",children:f.jsxs("div",{className:"grid grid-cols-10",children:[f.jsxs("div",{className:"col-span-4",children:[e.title,":"]}),f.jsx("div",{className:"col-span-5 mr-2",children:f.jsx(ie,{variant:"outline",className:"pl-2 pb-1 w-full",children:e.button})}),f.jsx("div",{className:"col-span-1",children:f.jsx(Re,{children:f.jsxs(ee,{open:o,onOpenChange:c=>{t(c),a(!1)},children:[f.jsx(te,{className:"sm:max-w-[400px] bg-white",children:f.jsxs(oe,{children:[f.jsx(ne,{children:e.dialogtitle}),e.dialogdescription]})}),f.jsxs(ke,{children:[f.jsx(Le,{asChild:!0,open:r,onMouseOver:()=>{a(!0)},children:f.jsx(re,{asChild:!0,children:f.jsx(ae,{variant:"outline",size:"icon",className:"h-6 w-6 text-gray-400",onClick:i,children:"?"})})}),r&&f.jsx(G,{children:e.tooltip})]})]})})})]})},`${e.dialogtitle}`)}export{Ge as C};