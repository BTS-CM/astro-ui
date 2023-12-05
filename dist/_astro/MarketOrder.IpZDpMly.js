import{u as e,L as ps,N as js,I,O as bs,P as gs,Q as fs,S as Ns,T as re,U as ne,v as Ss,V as Cs}from"./button.py8r9pgQ.js";import{r as t}from"./index.vR8cGMCg.js";import{u as ws,F as ks,a as g,b as f,c as w,d as N,f as S,e as U}from"./form.GftYXjjA.js";import{$ as Ee,m as Fe,n as Ae,o as Be,p as Le,w as Ie,x as Ue,u as ys,C as V,b as z,c as H,d as M,k as ie,A as vs,I as u,H as ce,a as oe,e as de,f as Ts}from"./CurrentUser.RIfKambw.js";import{S as _s,a as Ds,b as $s,c as Os,d as q}from"./select.tdaGh0LQ.js";import{P as Q,a as R,b as W,c as Ve,C as ze,S as He}from"./checkbox.FFWN2b7h.js";import{L as k,D as Me}from"./DeepLinkDialog.EofcCPWO.js";import{f as Ps,C as Es}from"./calendar.LvMZ4ZUj.js";import{S as Fs}from"./scroll-area.d4DgCtw2.js";import{T as me}from"./toggle.jn4JSZ5g.js";import{B as he}from"./badge.pYgHolp0.js";import{h as G,i as As,d as qe,e as ke,t as Bs}from"./common.X_7DDhag.js";import{c as Ls}from"./User.yt9xOv9l.js";import{a as Is}from"./Market.nnchY4yI.js";import{E as Us}from"./ExternalLink.T2a5i_k0.js";import{P as Vs}from"./PoolDialogs.7GbeMCaE.js";import"./index.f2GGseSc.js";import"./index.7dNGbZe0.js";import"./index.TKWSAka7.js";import"./index.esm.8fBdem9M.js";function dt(zs){const p=ws({defaultValues:{account:""}}),[n,Qe]=t.useState(),[a,Re]=t.useState(),[xe,We]=t.useState(0),[K,Je]=t.useState(0),[ue,Xe]=t.useState(0),[Ye,Ge]=t.useState(),[y,pe]=t.useState("locked"),[C,Z]=t.useState("locked"),[T,E]=t.useState("locked"),[_,ye]=t.useState("locked"),[Ke,ve]=t.useState(!1),[Ze,Te]=t.useState(!1),[F,ee]=t.useState(0),[D,se]=t.useState(0),[te,A]=t.useState(0),[_e,es]=t.useState(!1),[J,ss]=t.useState("1hr"),[ts,je]=t.useState(()=>{const i=new Date,r=60*60*1e3;return new Date(i.getTime()+r)}),[v,ae]=t.useState(new Date(Date.now()+7*24*60*60*1e3));t.useEffect(()=>{J==="specific"&&v&&je(v)},[J,v]);const[j,b]=t.useState(0),[$,De]=t.useState(!1),[B,be]=t.useState(1),[L,ge]=t.useState(100),[Hs,as]=t.useState(1e6),[X,$e]=t.useState(!1),l=t.useSyncExternalStore(Ee.subscribe,Ee.get,()=>!0),fe=t.useSyncExternalStore(Fe.subscribe,Fe.get,()=>!0),Ne=t.useSyncExternalStore(Ae.subscribe,Ae.get,()=>!0),Se=t.useSyncExternalStore(Be.subscribe,Be.get,()=>!0),Ce=t.useSyncExternalStore(Le.subscribe,Le.get,()=>!0);t.useSyncExternalStore(Ie.subscribe,Ie.get,()=>!0),t.useSyncExternalStore(Ue.subscribe,Ue.get,()=>!0);const O=t.useMemo(()=>l&&l.chain?l.chain:"bitshares",[l]);ys(O??"bitshares",["assets","globalParams","pools"]);const Oe=t.useMemo(()=>O&&(fe||Ne)?O==="bitshares"?fe:Ne:[],[fe,Ne,O]),le=t.useMemo(()=>O&&(Se||Ce)?O==="bitshares"?Se:Ce:[],[Se,Ce,O]),[Pe,ls]=t.useState(0);t.useEffect(()=>{if(le&&le.length){const i=le.find(s=>s[0]===77),r=G(i[1].fee,5);ls(r)}},[le]);const[x,rs]=t.useState();t.useEffect(()=>{async function i(){const r=new URLSearchParams(window.location.search),c=Object.fromEntries(r.entries()).id;if(!(!c||!c.includes("1.7.")))return{id:c}}l&&l.chain&&window.location.search&&i().then(({id:r})=>{rs(r)})},[l]);const[h,ns]=t.useState();t.useEffect(()=>{let i;return x&&l&&l.chain&&(i=Is([l.chain,x]).subscribe(({data:s})=>{if(s&&!s.error&&!s.loading){ns(s);const c=Oe.find(we=>we.id===s.sell_price.quote.asset_id),o=Oe.find(we=>we.id===s.sell_price.base.asset_id);Qe(c),Re(o);const d=G(s.sell_price.quote.amount,c.precision),m=G(s.sell_price.base.amount,o.precision),P=As(o.id,c.id);es(P),We(d),Je(m),Xe(P?m/d:m*d),Ge(s.expiration),ee(m),A(d),se(P?m/d:m*d);const Y=s.on_fill.length?s.on_fill[0][1]:null;Y&&(De(!0),be(Y.spread_percent/100),ge(Y.size_percent/100),as(Y.expiration_seconds),$e(Y.repeat))}})),()=>{i&&i()}},[x,l]);const[Ms,is]=t.useState(),[cs,os]=t.useState(0),[ds,ms]=t.useState(0);t.useEffect(()=>{let i;return l&&l.id&&h&&a&&n&&(i=Ls([l.chain,l.id]).subscribe(({data:s,error:c,loading:o})=>{if(s&&!c&&!o){is(s);const d=s.find(P=>P.asset_id===a.id),m=s.find(P=>P.asset_id===n.id);ms(d?G(d.amount,a.precision):0),os(m?G(m.amount,n.precision):0)}})),()=>{i&&i()}},[l,h,a,n]);const hs=t.useCallback(qe((i,r)=>{/^[0-9]*\.?[0-9]*$/.test(i)&&i>=0&&i<=100&&(be(i),b(j+1))},25),[]),xs=t.useCallback(qe((i,r)=>{/^[0-9]*\.?[0-9]*$/.test(i)&&i>=0&&i<=100&&(ge(i),b(j+1))},25),[]),us=t.useMemo(()=>{if(l&&l.id&&x&&a&&n){const i={fee:{amount:0,asset_id:"1.3.0"},account_id_type:l.id,limit_order_id_type:x,new_price:y==="editable"?{base:{amount:ke(F,a.precision),asset_id:a.id},quote:{amount:ke(te,n.precision),asset_id:n.id}}:void 0,new_expiration:_==="editable"?v:void 0,on_fill:$?[[0,{fee_asset_id:"1.3.0",spread_percent:B?B*100:0,size_percent:L?L*100:0,expiration_seconds:1e9,repeat:X}]]:void 0,extensions:[]};if(C==="editable"){const r=parseFloat(F-K);(r&&r<0||r&&r>0)&&(i.delta_amount_to_sell={amount:ke(r,a.precision),asset_id:a.id})}else i.delta_amount_to_sell=void 0;return i}},[l,x,K,te,a,ts,$,B,L,X]);return e.jsx(e.Fragment,{children:e.jsxs("div",{className:"container mx-auto mt-5 mb-5",children:[e.jsxs("div",{className:"grid grid-cols-1 gap-3",children:[e.jsxs(V,{children:[e.jsxs(z,{className:"pb-0 mb-0",children:[e.jsx(H,{className:"mb-2",children:e.jsxs("span",{className:"grid grid-cols-2",children:[e.jsxs("span",{className:"col-span-1 text-left",children:["Updating limit order ",x]}),e.jsx("span",{className:"text-right",children:e.jsxs(ps,{children:[e.jsx(js,{asChild:!0,children:e.jsx(I,{className:"h-6",children:"View existing limit order data"})}),e.jsxs(bs,{className:"sm:max-w-[600px] bg-white",children:[e.jsxs(gs,{children:[e.jsx(fs,{children:"Existing limit order data"}),e.jsx(Ns,{children:"This form will update the following JSON data"})]}),e.jsxs("div",{className:"grid grid-cols-1",children:[e.jsx("div",{className:"col-span-1",children:e.jsx(Fs,{className:"h-72 rounded-md border text-sm",children:e.jsx("pre",{children:JSON.stringify(h,null,2)})})}),e.jsx("div",{className:"col-span-1 text-left mt-5",children:e.jsx(Us,{variant:"outline",classnamecontents:"",type:"button",text:"View object on blocksights.info",hyperlink:`https://blocksights.info/#/objects/${x}`})})]})]})]})})]})}),e.jsx(M,{children:"The Bitshares DEX now supports directly editing open limit orders via this form"})]}),e.jsxs(ie,{children:[e.jsx(ks,{...p,children:e.jsxs("form",{children:[e.jsx(g,{control:p.control,name:"account",render:({field:i})=>e.jsxs(f,{children:[e.jsx(w,{children:"Limit order owner"}),e.jsx(N,{children:e.jsxs("div",{className:"grid grid-cols-8 gap-2",children:[e.jsx("div",{className:"col-span-1 ml-5",children:h&&l?e.jsx(vs,{size:40,name:l.id===h.seller?l.username:h.seller.replace(".","_"),extra:"Sender",expression:{eye:l.id===h.seller?"normal":"sleepy",mouth:l.id===h.seller?"open":"unhappy"},colors:["#92A1C6","#146A7C","#F0AB3D","#C271B4","#C20D90"]},`Avatar_${l.id===h.seller?"loggedIn":"loggedOut"}`):null}),e.jsx("div",{className:"col-span-4",children:l&&h?e.jsx(u,{disabled:!0,placeholder:"Bitshares account (1.2.x)",className:"mb-1 mt-1",value:l&&l.id===h.seller?`${l.username} (${l.id})`:h.seller}):null})]})}),e.jsx(S,{children:"This is the account which owns the market order that is being updated."}),h&&l&&l.id!==h.seller?e.jsx(U,{children:"⚠️ You are not logged in as the Bitshares account which owns this limit order."}):null]})}),e.jsx(g,{control:p.control,name:"priceAmount",render:({field:i})=>e.jsx(f,{className:"mt-4 text-xs",children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-1",children:e.jsxs(ce,{children:[e.jsx(oe,{children:e.jsx(me,{variant:"outline",onClick:()=>{y==="editable"?(pe("locked"),se(ue),C==="locked"&&(E("locked"),A(xe))):(pe("editable"),E("editable"))},children:y==="editable"?e.jsx(re,{className:"h-4 w-4"}):e.jsx(ne,{className:"h-4 w-4"})})}),e.jsx(de,{className:"w-40 text-sm text-center pt-1 pb-1",derp:"Optionally change the limit order price",children:y==="editable"?"Editing the price":"Price is locked"})]},"amountLockCard")}),e.jsxs("span",{className:"col-span-10",children:[e.jsx(w,{children:y==="editable"?"Updating the price":"Want to change the price ?"}),e.jsx(S,{children:y==="editable"?`The existing price: ${ue} ${n?n.symbol:"?"}/${a?a.symbol:"?"}`:"Click the unlock button to begin setting a new price"})]})]})})}),y==="editable"&&n&&a?e.jsx(N,{children:e.jsxs("span",{className:"grid grid-cols-12 mt-3",children:[e.jsx("span",{className:"col-span-1"}),e.jsx("span",{className:"col-span-7",children:e.jsx(u,{label:"Price",placeholder:`${D} ${n.symbol}/${a.symbol}`,disabled:!0,readOnly:!0})}),e.jsx("span",{className:"col-span-4 ml-3 text-center",children:e.jsxs(Q,{children:[e.jsx(R,{asChild:!0,children:e.jsx(I,{className:"w-full",onClick:()=>event.preventDefault(),variant:"outline",children:"Set new price"})}),e.jsxs(W,{children:[e.jsx(k,{children:"Provide a new price"}),e.jsx(u,{placeholder:D,className:"mb-2 mt-1",onChange:i=>{const r=i.target.value,s=/^[0-9,]*\.?[0-9]*$/;if(r&&r.length&&s.test(r)){const c=parseFloat(r.replaceAll(",",""));c&&(se(c),F&&T==="editable"&&A(parseFloat((F*(_e?1/c:c)).toFixed(n.precision))),b(j+1))}}})]})]})})]})}):null,e.jsx(g,{control:p.control,name:"sellAmount",render:({field:i})=>e.jsxs(f,{className:"mt-4 text-xs",children:[e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-1",children:e.jsxs(ce,{children:[e.jsx(oe,{children:e.jsx(me,{variant:"outline",onClick:()=>{C==="editable"?(Z("locked"),y==="locked"&&E("locked")):(Z("editable"),E("editable"))},children:C==="editable"?e.jsx(re,{className:"h-4 w-4"}):e.jsx(ne,{className:"h-4 w-4"})})}),e.jsx(de,{className:"w-40 text-sm text-center pt-1 pb-1",children:C==="editable"?"Editing the amount being sold":"Currently locked. Using existing amount being sold"})]},"amountLockCard")}),e.jsxs("span",{className:"col-span-11",children:[e.jsx(w,{children:C==="editable"?`Updating the amount of ${a?a.symbol:"?"} being sold`:`Want to update the amount of ${a?a.symbol:"?"} being sold ?`}),e.jsx(S,{children:C==="editable"?`The existing amount being sold: ${K} ${a?a.symbol:"?"}`:"Click the unlock button to begin changing the amount you plan on selling"})]})]}),C==="editable"?e.jsx(N,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-1"}),e.jsx("span",{className:"col-span-7",children:e.jsx(u,{label:"Amount",placeholder:`${F} ${a?a.symbol:"?"}`,disabled:!0,readOnly:!0})}),e.jsx("span",{className:"col-span-4 ml-3 text-center",children:e.jsxs(Q,{children:[e.jsx(R,{asChild:!0,children:e.jsx(I,{className:"w-full",onClick:()=>event.preventDefault(),variant:"outline",children:"Set new sell amount"})}),e.jsxs(W,{children:[e.jsx(k,{children:"Provide a new amount"}),e.jsx(u,{placeholder:F,className:"mb-2",onChange:r=>{const s=r.target.value,c=/^[0-9,]*\.?[0-9]*$/;if(s&&s.length&&c.test(s)){const o=parseFloat(s.replaceAll(",",""));o&&(ee(o.toFixed(a.precision)),D&&A(parseFloat((o*(_e?1/D:D)).toFixed(n.precision))),b(j+1))}}})]})]})})]})}):null]})}),e.jsx(g,{control:p.control,name:"sellTotal",render:({field:i})=>e.jsxs(f,{className:"mt-4 text-xs",children:[e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-1",children:e.jsxs(ce,{children:[e.jsx(oe,{children:e.jsx(me,{variant:"outline",onClick:()=>{T==="editable"?(E("locked"),A(xe),Z("locked"),ee(K),pe("locked"),se(ue)):(E("editable"),Z("editable"))},children:T==="editable"?e.jsx(re,{className:"h-4 w-4"}):e.jsx(ne,{className:"h-4 w-4"})})}),e.jsx(de,{className:"w-40 text-sm text-center pt-1 pb-1",children:T==="editable"?"Editing the total amount being sold":"Currently locked. Using existing total amount."})]},"sellTotalCard")}),e.jsxs("span",{className:"col-span-11",children:[e.jsx(w,{children:C==="editable"||T==="editable"?"Updating the total amount being bought":`Want to update the total amount of ${n?n.symbol:"?"} being bought ?`}),e.jsx(S,{children:T==="editable"?`The existing total amount being bought: ${xe} ${n?n.symbol:"?"}`:`Click the unlock button to begin changing the total amount of ${n?n.symbol:"?"} you plan on buying`})]})]}),T==="editable"&&a&&n?e.jsx(N,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-1"}),e.jsx("span",{className:"col-span-7",children:e.jsx(u,{label:"Total",placeholder:`${te} ${n?n.symbol:"?"}`,disabled:!0,readOnly:!0})}),e.jsx("span",{className:"col-span-4 ml-3 text-center",children:e.jsxs(Q,{children:[e.jsx(R,{asChild:!0,children:e.jsx(I,{className:"w-full",onClick:()=>event.preventDefault(),variant:"outline",children:"Set new total amount"})}),e.jsxs(W,{children:[e.jsx(k,{children:"Provide a new total"}),e.jsx(u,{placeholder:te,className:"mb-2 mt-1",onChange:r=>{const s=r.target.value,c=/^[0-9,]*\.?[0-9]*$/;if(s&&s.length&&c.test(s)){const o=parseFloat(s.replaceAll(",",""));o&&(A(o.toFixed(n.precision)),D&&ee((o/D).toFixed(a.precision)),b(j+1))}}})]})]})})]})}):null]})}),e.jsx(g,{control:p.control,name:"expiry",render:({field:i})=>e.jsxs(f,{children:[e.jsxs("span",{className:"grid grid-cols-12 mt-4 text-sm",children:[e.jsx("span",{className:"col-span-1",children:e.jsxs(ce,{children:[e.jsx(oe,{children:e.jsx(me,{variant:"outline",onClick:()=>{_==="editable"?(ye("locked"),ae(new Date(Ye))):ye("editable")},children:_==="editable"?e.jsx(re,{className:"h-4 w-4"}):e.jsx(ne,{className:"h-4 w-4"})})}),e.jsx(de,{className:"w-40 text-sm text-center pt-1 pb-1",children:_==="editable"?"Editing the limit order expiration":"Currently locked. Using existing expiration date"})]},"sellTotalCard")}),e.jsxs("span",{className:"col-span-11",children:[e.jsx(w,{children:_==="editable"?"Updating the limit order expiration":"Want to update the limit order expiration ?"}),e.jsx(S,{children:_==="editable"?`The existing expiration date: ${h.expiration.replace("T"," ")}`:"Click the unlock button to begin changing the limit order expiration"})]})]}),_==="editable"?e.jsx(e.Fragment,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-1"}),e.jsx("span",{className:"col-span-7",children:e.jsx(N,{onValueChange:r=>{ss(r);const s=60*60*1e3,c=24*s;if(r!=="specific"){const o=new Date;let d;if(r==="1hr")d=new Date(o.getTime()+s);else if(r==="12hr"){const m=s*12;d=new Date(o.getTime()+m)}else if(r==="24hr"){const m=c;d=new Date(o.getTime()+m)}else if(r==="7d"){const m=c*7;d=new Date(o.getTime()+m)}else if(r==="30d"){const m=c*30;d=new Date(o.getTime()+m)}d&&ae(d),je(r)}else r==="specific"&&je();b(j+1)},children:e.jsxs(_s,{children:[e.jsx(Ds,{className:"mb-3",children:e.jsx($s,{placeholder:"1hr"})}),e.jsxs(Os,{className:"bg-white",children:[e.jsx(q,{value:"1hr",children:"1 hour"}),e.jsx(q,{value:"12hr",children:"12 hours"}),e.jsx(q,{value:"24hr",children:"24 hours"}),e.jsx(q,{value:"7d",children:"7 days"}),e.jsx(q,{value:"30d",children:"30 days"}),e.jsx(q,{value:"specific",children:"Specific date"})]})]})})}),e.jsx("span",{className:"col-span-4 text-center ml-3",children:J==="specific"?e.jsxs(Q,{children:[e.jsx(R,{asChild:!0,children:e.jsxs(I,{variant:"outline",className:Ss("w-full justify-start text-left font-normal",!v&&"text-muted-foreground"),children:[e.jsx(Cs,{className:"mr-2 h-4 w-4"}),v?Ps(v,"PPP"):e.jsx("span",{children:"Pick a date"})]})}),e.jsx(W,{className:"w-auto p-0",align:"start",children:e.jsx(Es,{mode:"single",selected:v,onSelect:r=>{if(new Date(r)<new Date){ae(new Date(Date.now()+1*24*60*60*1e3));return}ae(r)},initialFocus:!0})})]}):null}),e.jsx("span",{className:"col-span-1"}),e.jsx("span",{className:"col-span-11",children:e.jsx(S,{children:J!=="specific"?`This limit order will expire ${J} after broadcast`:null})})]})}):null]})}),e.jsx(Ve,{className:"mb-2 mt-2"}),e.jsx(g,{control:p.control,name:"osoValue",render:({field:i})=>e.jsxs(f,{children:[e.jsx(N,{children:e.jsxs("div",{className:"flex items-center space-x-2 mt-4",children:[e.jsx(ze,{id:"terms1",checked:$,onClick:()=>{De(!$),b(j+1)}}),e.jsx("label",{htmlFor:"terms1",className:"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",children:$?"Order Sends Order Enabled":"Enable Order Sends Order"})]})}),$?e.jsx(S,{children:"Automatic OSO function will be active"}):null]})}),$?e.jsxs(e.Fragment,{children:[e.jsx(g,{control:p.control,name:"osoSpread",render:({field:i})=>e.jsxs(f,{className:"mt-2 text-xs",children:[e.jsx(w,{className:"text-sm",children:"Spread percent"}),e.jsx(S,{children:"How far the price of the take profit order differs from the original order"}),e.jsx(N,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsxs("span",{className:"col-span-9",children:[e.jsx(u,{label:"Spread percent",placeholder:B,disabled:!0,readOnly:!0}),e.jsx(He,{className:"mt-3",defaultValue:[B],max:100,min:1,step:.01,onValueChange:r=>{hs(r[0])}})]}),e.jsx("span",{className:"col-span-3 ml-3 text-center",children:e.jsxs(Q,{children:[e.jsx(R,{asChild:!0,children:e.jsx("span",{onClick:()=>{event.preventDefault()},className:"inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg",children:e.jsx(k,{children:"Edit spread"})})}),e.jsxs(W,{children:[e.jsx(k,{children:"Provide a new spread percent"}),e.jsx(u,{placeholder:B,className:"mb-2 mt-1",onChange:r=>{const s=r.target.value,c=/^[0-9]*\.?[0-9]*$/;s&&s.length&&c.test(s)&&s>=1&&s<=100&&(be(s),b(j+1))}})]})]})})]})}),e.jsx(U,{})]})}),e.jsx(g,{control:p.control,name:"osoSize",render:({field:i})=>e.jsxs(f,{className:"mt-4 text-xs",children:[e.jsx(w,{className:"text-sm",children:"Size percent"}),e.jsx(S,{children:"Percentage to sell in the take profit order"}),e.jsx(N,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsxs("span",{className:"col-span-9",children:[e.jsx(u,{label:"Size percent",placeholder:L,disabled:!0,readOnly:!0}),e.jsx(He,{className:"mt-3",defaultValue:[L],max:100,min:0,step:.01,onValueChange:r=>{xs(r[0])}})]}),e.jsx("span",{className:"col-span-3 ml-3 text-center",children:e.jsxs(Q,{children:[e.jsx(R,{asChild:!0,children:e.jsx("span",{onClick:()=>{event.preventDefault()},className:"inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg",children:e.jsx(k,{children:"Edit size"})})}),e.jsxs(W,{children:[e.jsx(k,{children:"Provide a new size percent"}),e.jsx(u,{placeholder:L,className:"mb-2 mt-1",onChange:r=>{const s=r.target.value,c=/^[0-9]*\.?[0-9]*$/;s&&s.length&&c.test(s)&&s>=0&&s<=100&&(ge(s),b(j+1))}})]})]})})]})}),e.jsx(U,{})]})}),e.jsx(g,{control:p.control,name:"repeatValue",render:({field:i})=>e.jsxs(f,{className:"mt-4 text-xs",children:[e.jsx(w,{className:"text-sm",children:"Set OSO to automatically repeat?"}),e.jsx(S,{children:"Automates repeated OSO based limit orders"}),e.jsx(N,{children:e.jsxs("div",{className:"flex items-center space-x-2",children:[e.jsx(ze,{id:"terms2",checked:X,onClick:()=>{$e(!X),b(j+1)}}),e.jsx("label",{htmlFor:"terms2",className:"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",children:X?"OSO configured to repeat":"OSO configured not to repeat"})]})}),e.jsx(U,{})]})})]}):null,e.jsx(Ve,{className:"mt-3"}),e.jsx(g,{control:p.control,name:"networkFee",render:({field:i})=>e.jsxs(f,{children:[e.jsx(w,{children:"Network fee"}),e.jsx(N,{children:e.jsx(u,{disabled:!0,placeholder:`${Pe} BTS`,className:"mb-3 mt-3"})}),l.id===l.referrer?e.jsxs(U,{children:["Rebate: ",Bs(Pe*.8,5)," BTS (vesting)"]}):null,e.jsx(U,{})]})}),e.jsx(I,{className:"mt-5 mb-3",variant:"outline",onClick:i=>{Te(!0),i.preventDefault()},children:"Submit limit order changes"})]})}),Ze?e.jsx(Me,{operationName:"limit_order_update",username:l.username,usrChain:l.chain,userID:l.id,dismissCallback:Te,headerText:`Updating the limit order ${x}`,trxJSON:[us]},`limit_order_update_${x}`):null]})]}),e.jsxs("div",{className:"grid grid-cols-2 mt-3 gap-5",children:[e.jsxs(V,{children:[e.jsxs(z,{className:"pb-0",children:[e.jsxs(H,{children:[n?n.symbol:"?"," (",n?n.id:"1.3.x",") balance"]}),e.jsx(M,{children:"Limit order quote asset"})]}),e.jsxs(ie,{children:[cs," ",n?n.symbol:"?"]})]}),e.jsxs(V,{children:[e.jsxs(z,{className:"pb-0",children:[e.jsxs(H,{children:[a?a.symbol:"?"," (",a?a.id:"1.3.x",") balance"]}),e.jsx(M,{children:"Limit order base asset"})]}),e.jsxs(ie,{children:[ds," ",a?a.symbol:"?"]})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-5 mt-1",children:[e.jsxs("div",{className:"col-span-1",children:[e.jsx(V,{className:"mb-3",onClick:()=>{ve(!0)},children:e.jsxs(z,{children:[e.jsx(H,{children:"Want to cancel this limit order?"}),e.jsxs(M,{children:["Click here to cancel the limit order ",x]})]})}),Ke?e.jsx(Me,{operationName:"limit_order_cancel",username:l.username,usrChain:l.chain,userID:l.id,dismissCallback:ve,headerText:`Cancelling the limit order ${x}`,trxJSON:[{fee_paying_account:l.id,order:x,extensions:[]}]},`CancellingLimitOrder_${x}`):null,e.jsx("a",{href:`/dex/index.html?market=${n?n.symbol:"?"}_${a?a.symbol:"?"}`,children:e.jsx(V,{children:e.jsxs(z,{children:[e.jsx(H,{children:"Trade on the DEX instead?"}),e.jsxs(M,{children:["Market: ",n?n.symbol:"?","/",a?a.symbol:"?",e.jsx("br",{}),"Need to create a new limit order?",e.jsx("br",{}),"Or perhaps you seek additional market data?"]})]})})})]}),e.jsxs(V,{children:[e.jsxs(z,{className:"pb-0",children:[e.jsx(H,{children:"Need to borrow relevant assets?"}),e.jsxs(M,{children:["Users may offer to lend you ",n?n.symbol:"?"," or"," ",a?a.symbol:"?",".",e.jsx("br",{})]})]}),e.jsxs(ie,{children:[e.jsx(k,{children:"Search by borrowable assets"}),e.jsx("br",{}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${n?n.symbol:""}`,children:e.jsx(he,{children:n?n.symbol:"?"})}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${a?a.symbol:""}`,children:e.jsx(he,{className:"ml-2 mt-1 mb-1",children:a?a.symbol:""})}),e.jsx("br",{}),e.jsx(k,{children:"Search by accepted collateral"}),e.jsx("br",{}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${n?n.symbol:"?"}`,children:e.jsx(he,{children:n?n.symbol:"?"})}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${a?a.symbol:""}`,children:e.jsx(he,{className:"ml-2 mt-1",children:a?a.symbol:""})})]})]})]})]}),n&&a?e.jsx(Vs,{assetA:n.symbol,assetAData:n,assetB:a.symbol,assetBData:a,chain:l.chain}):null,e.jsx("div",{className:"grid grid-cols-1 mt-5",children:l&&l.username&&l.username.length?e.jsx(Ts,{usr:l}):null})]})})}export{dt as default};