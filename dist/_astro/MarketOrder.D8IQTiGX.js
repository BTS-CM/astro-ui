import{I as js,J as bs,u as e,T as gs,U as fs,K as I,V as ks,W as Os,X as Ns,Y as Ss,Z as ne,a0 as ie,v as Ms,a1 as Cs,O as ws}from"./button.cJSehY-U.js";import{r as a}from"./index.ebYJtNMn.js";import{u as vs,F as Ts,a as f,b as k,c as M,d as O,f as N,e as H}from"./form.3kNmoMJP.js";import{$ as Be,C as U,a as z,b as q,c as V,d as ce,A as ys,I as p,H as oe,g as de,h as me}from"./hover-card.FBvz_Lnw.js";import{S as Ds,a as As,b as Ls,c as _s,d as R}from"./select.2eufauwf.js";import{P as Q,a as J,b as W}from"./popover.GBzIu6kc.js";import{a as Pe,C as Fe,S as Ee}from"./checkbox.QZXEgLIz.js";import{L as C,D as $e}from"./DeepLinkDialog.zHQqyl1x.js";import{f as Bs,C as Ps}from"./calendar.6nKM1Ujx.js";import{S as Fs}from"./scroll-area.SaduVWLD.js";import{T as xe}from"./toggle.KEoyu4bI.js";import{B as he}from"./badge.NcEn9OCP.js";import{f as Ie,g as He,d as Ue,e as ze,j as qe,k as Ve,u as Es}from"./Init.AGQQj0ZE.js";import{h as Z,i as $s,d as Re,b as Ce,t as Is}from"./common.wDIQf1ml.js";import{c as Hs}from"./User.EWeWi36D.js";import{a as Us}from"./Market.4mfm1d3N.js";import{E as zs}from"./ExternalLink.7YCz3qWc.js";import{P as qs}from"./PoolDialogs.rZF4F91e.js";import"./index.f2GGseSc.js";import"./index.OpSMZY1r.js";import"./index.EbhUlXEb.js";import"./index.esm.5gY7anoR.js";function jr(Vs){const{t:s,i18n:Rs}=js(bs.get(),{i18n:ws}),j=vs({defaultValues:{account:""}}),[n,Qe]=a.useState(),[t,Je]=a.useState(),[ue,We]=a.useState(0),[G,Ke]=a.useState(0),[pe,Xe]=a.useState(0),[Ye,Ze]=a.useState(),[w,je]=a.useState("locked"),[S,ee]=a.useState("locked"),[T,B]=a.useState("locked"),[y,we]=a.useState("locked"),[Ge,ve]=a.useState(!1),[es,Te]=a.useState(!1),[P,se]=a.useState(0),[D,re]=a.useState(0),[ae,F]=a.useState(0),[ye,ss]=a.useState(!1),[K,rs]=a.useState("1hr"),[as,be]=a.useState(()=>{const c=new Date,l=60*60*1e3;return new Date(c.getTime()+l)}),[v,te]=a.useState(new Date(Date.now()+7*24*60*60*1e3));a.useEffect(()=>{K==="specific"&&v&&be(v)},[K,v]);const[b,g]=a.useState(0),[A,De]=a.useState(!1),[E,ge]=a.useState(1),[$,fe]=a.useState(100),[Qs,ts]=a.useState(1e6),[X,Ae]=a.useState(!1),i=a.useSyncExternalStore(Be.subscribe,Be.get,()=>!0),ke=a.useSyncExternalStore(Ie.subscribe,Ie.get,()=>!0),Oe=a.useSyncExternalStore(He.subscribe,He.get,()=>!0),Ne=a.useSyncExternalStore(Ue.subscribe,Ue.get,()=>!0),Se=a.useSyncExternalStore(ze.subscribe,ze.get,()=>!0);a.useSyncExternalStore(qe.subscribe,qe.get,()=>!0),a.useSyncExternalStore(Ve.subscribe,Ve.get,()=>!0);const L=a.useMemo(()=>i&&i.chain?i.chain:"bitshares",[i]);Es(L??"bitshares",["assets","globalParams","pools"]);const Le=a.useMemo(()=>L&&(ke||Oe)?L==="bitshares"?ke:Oe:[],[ke,Oe,L]),le=a.useMemo(()=>L&&(Ne||Se)?L==="bitshares"?Ne:Se:[],[Ne,Se,L]),[_e,ls]=a.useState(0);a.useEffect(()=>{if(le&&le.length){const c=le.find(r=>r[0]===77),l=Z(c[1].fee,5);ls(l)}},[le]);const[u,ns]=a.useState();a.useEffect(()=>{async function c(){const l=new URLSearchParams(window.location.search),o=Object.fromEntries(l.entries()).id;if(!(!o||!o.includes("1.7.")))return{id:o}}i&&i.chain&&window.location.search&&c().then(({id:l})=>{ns(l)})},[i]);const[h,is]=a.useState();a.useEffect(()=>{let c;return u&&i&&i.chain&&(c=Us([i.chain,u]).subscribe(({data:r})=>{if(r&&!r.error&&!r.loading){is(r);const o=Le.find(Me=>Me.id===r.sell_price.quote.asset_id),d=Le.find(Me=>Me.id===r.sell_price.base.asset_id);Qe(o),Je(d);const m=Z(r.sell_price.quote.amount,o.precision),x=Z(r.sell_price.base.amount,d.precision),_=$s(d.id,o.id);ss(_),We(m),Ke(x),Xe(_?x/m:x*m),Ze(r.expiration),se(x),F(m),re(_?x/m:x*m);const Y=r.on_fill.length?r.on_fill[0][1]:null;Y&&(De(!0),ge(Y.spread_percent/100),fe(Y.size_percent/100),ts(Y.expiration_seconds),Ae(Y.repeat))}})),()=>{c&&c()}},[u,i]);const[Js,cs]=a.useState(),[os,ds]=a.useState(0),[ms,xs]=a.useState(0);a.useEffect(()=>{let c;return i&&i.id&&h&&t&&n&&(c=Hs([i.chain,i.id]).subscribe(({data:r,error:o,loading:d})=>{if(r&&!o&&!d){cs(r);const m=r.find(_=>_.asset_id===t.id),x=r.find(_=>_.asset_id===n.id);xs(m?Z(m.amount,t.precision):0),ds(x?Z(x.amount,n.precision):0)}})),()=>{c&&c()}},[i,h,t,n]);const hs=a.useCallback(Re((c,l)=>{/^[0-9]*\.?[0-9]*$/.test(c)&&c>=0&&c<=100&&(ge(c),g(b+1))},25),[]),us=a.useCallback(Re((c,l)=>{/^[0-9]*\.?[0-9]*$/.test(c)&&c>=0&&c<=100&&(fe(c),g(b+1))},25),[]),ps=a.useMemo(()=>{if(i&&i.id&&u&&t&&n){const c={fee:{amount:0,asset_id:"1.3.0"},seller:i.id,order:u,new_price:w==="editable"?{base:{amount:Ce(P,t.precision),asset_id:t.id},quote:{amount:Ce(ae,n.precision),asset_id:n.id}}:void 0,new_expiration:y==="editable"?v:void 0,on_fill:A?[[0,{fee_asset_id:"1.3.0",spread_percent:E?E*100:0,size_percent:$?$*100:0,expiration_seconds:1e9,repeat:X}]]:void 0,extensions:[]};if(S==="editable"){const l=parseFloat(P-G);(l&&l<0||l&&l>0)&&(c.delta_amount_to_sell={amount:Ce(l,t.precision),asset_id:t.id})}else c.delta_amount_to_sell=void 0;return c}},[i,u,G,ae,t,as,A,E,$,X]);return e.jsx(e.Fragment,{children:e.jsxs("div",{className:"container mx-auto mt-5 mb-5",children:[e.jsxs("div",{className:"grid grid-cols-1 gap-3",children:[e.jsxs(U,{children:[e.jsxs(z,{className:"pb-0 mb-0",children:[e.jsx(q,{className:"mb-2",children:e.jsxs("span",{className:"grid grid-cols-2",children:[e.jsx("span",{className:"col-span-1 text-left",children:s("MarketOrder:updatingLimitOrder",{limitOrderID:u})}),e.jsx("span",{className:"text-right",children:e.jsxs(gs,{children:[e.jsx(fs,{asChild:!0,children:e.jsx(I,{className:"h-6",children:s("MarketOrder:viewExistingLimitOrderDataButton")})}),e.jsxs(ks,{className:"sm:max-w-[600px] bg-white",children:[e.jsxs(Os,{children:[e.jsx(Ns,{children:s("MarketOrder:existingLimitOrderDataTitle")}),e.jsx(Ss,{children:s("MarketOrder:existingLimitOrderDataDescription")})]}),e.jsxs("div",{className:"grid grid-cols-1",children:[e.jsx("div",{className:"col-span-1",children:e.jsx(Fs,{className:"h-72 rounded-md border text-sm",children:e.jsx("pre",{children:JSON.stringify(h,null,2)})})}),e.jsx("div",{className:"col-span-1 text-left mt-5",children:e.jsx(zs,{variant:"outline",classnamecontents:"",type:"button",text:s("MarketOrder:viewObjectOnBlocksightsInfo"),hyperlink:`https://blocksights.info/#/objects/${u}`})})]})]})]})})]})}),e.jsx(V,{children:s("MarketOrder:bitsharesDexSupportDescription")})]}),e.jsxs(ce,{children:[e.jsx(Ts,{...j,children:e.jsxs("form",{children:[e.jsx(f,{control:j.control,name:"account",render:({field:c})=>e.jsxs(k,{children:[e.jsx(M,{children:s("MarketOrder:limitOrderOwnerLabel")}),e.jsx(O,{children:e.jsxs("div",{className:"grid grid-cols-8 gap-2",children:[e.jsx("div",{className:"col-span-1 ml-5",children:h&&i?e.jsx(ys,{size:40,name:i.id===h.seller?i.username:h.seller.replace(".","_"),extra:"Sender",expression:{eye:i.id===h.seller?"normal":"sleepy",mouth:i.id===h.seller?"open":"unhappy"},colors:["#92A1C6","#146A7C","#F0AB3D","#C271B4","#C20D90"]},`Avatar_${i.id===h.seller?"loggedIn":"loggedOut"}`):null}),e.jsx("div",{className:"col-span-4",children:i&&h?e.jsx(p,{disabled:!0,placeholder:s("MarketOrder:bitsharesAccountPlaceholder"),className:"mb-1 mt-1",value:i&&i.id===h.seller?`${i.username} (${i.id})`:h.seller}):null})]})}),e.jsx(N,{children:s("MarketOrder:limitOrderOwnerDescription")}),h&&i&&i.id!==h.seller?e.jsx(H,{children:s("MarketOrder:limitOrderOwnerWarning")}):null]})}),e.jsx(f,{control:j.control,name:"priceAmount",render:({field:c})=>e.jsx(k,{className:"mt-4 text-xs",children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-1",children:e.jsxs(oe,{children:[e.jsx(de,{children:e.jsx(xe,{variant:"outline",onClick:()=>{w==="editable"?(je("locked"),re(pe),S==="locked"&&(B("locked"),F(ue))):(je("editable"),B("editable"))},children:w==="editable"?e.jsx(ne,{className:"h-4 w-4"}):e.jsx(ie,{className:"h-4 w-4"})})}),e.jsx(me,{className:"w-40 text-sm text-center pt-1 pb-1",derp:s("MarketOrder:priceLockHoverCardDescription"),children:s(w==="editable"?"MarketOrder:editingThePrice":"MarketOrder:priceIsLocked")})]},"amountLockCard")}),e.jsxs("span",{className:"col-span-10",children:[e.jsx(M,{children:s(w==="editable"?"MarketOrder:updatingThePrice":"MarketOrder:wantToChangeThePrice")}),e.jsx(N,{children:w==="editable"?s("MarketOrder:existingPriceDescription",{existingPrice:pe,quoteAssetSymbol:n?n.symbol:"?",baseAssetSymbol:t?t.symbol:"?"}):s("MarketOrder:clickToUnlockDescription")})]})]})})}),w==="editable"&&n&&t?e.jsx(O,{children:e.jsxs("span",{className:"grid grid-cols-12 mt-3",children:[e.jsx("span",{className:"col-span-1"}),e.jsx("span",{className:"col-span-7",children:e.jsx(p,{label:s("MarketOrder:priceLabel"),placeholder:`${D} ${n.symbol}/${t.symbol}`,disabled:!0,readOnly:!0})}),e.jsx("span",{className:"col-span-4 ml-3 text-center",children:e.jsxs(Q,{children:[e.jsx(J,{asChild:!0,children:e.jsx(I,{className:"w-full",onClick:()=>event.preventDefault(),variant:"outline",children:s("MarketOrder:setNewPriceButton")})}),e.jsxs(W,{children:[e.jsx(C,{children:s("MarketOrder:provideNewPriceLabel")}),e.jsx(p,{placeholder:D,className:"mb-2 mt-1",onChange:c=>{const l=c.target.value,r=/^[0-9,]*\.?[0-9]*$/;if(l&&l.length&&r.test(l)){const o=parseFloat(l.replaceAll(",",""));o&&(re(o),P&&T==="editable"&&F(parseFloat((P*(ye?1/o:o)).toFixed(n.precision))),g(b+1))}}})]})]})})]})}):null,e.jsx(f,{control:j.control,name:"sellAmount",render:({field:c})=>e.jsxs(k,{className:"mt-4 text-xs",children:[e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-1",children:e.jsxs(oe,{children:[e.jsx(de,{children:e.jsx(xe,{variant:"outline",onClick:()=>{S==="editable"?(ee("locked"),w==="locked"&&B("locked")):(ee("editable"),B("editable"))},children:S==="editable"?e.jsx(ne,{className:"h-4 w-4"}):e.jsx(ie,{className:"h-4 w-4"})})}),e.jsx(me,{className:"w-40 text-sm text-center pt-1 pb-1",children:s(S==="editable"?"MarketOrder:editingAmountBeingSold":"MarketOrder:amountLocked")})]},"amountLockCard")}),e.jsxs("span",{className:"col-span-11",children:[e.jsx(M,{children:S==="editable"?s("MarketOrder:updatingAmountBeingSold",{baseAssetSymbol:t?t.symbol:"?"}):s("MarketOrder:wantToUpdateAmountBeingSold",{baseAssetSymbol:t?t.symbol:"?"})}),e.jsx(N,{children:S==="editable"?s("MarketOrder:existingAmountBeingSold",{existingBaseAmount:G,baseAssetSymbol:t?t.symbol:"?"}):s("MarketOrder:clickToUnlockAmount")})]})]}),S==="editable"?e.jsx(O,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-1"}),e.jsx("span",{className:"col-span-7",children:e.jsx(p,{label:s("MarketOrder:amountLabel"),placeholder:`${P} ${t?t.symbol:"?"}`,disabled:!0,readOnly:!0})}),e.jsx("span",{className:"col-span-4 ml-3 text-center",children:e.jsxs(Q,{children:[e.jsx(J,{asChild:!0,children:e.jsx(I,{className:"w-full",onClick:()=>event.preventDefault(),variant:"outline",children:s("MarketOrder:setNewSellAmountButton")})}),e.jsxs(W,{children:[e.jsx(C,{children:s("MarketOrder:provideNewAmountLabel")}),e.jsx(p,{placeholder:P,className:"mb-2",onChange:l=>{const r=l.target.value,o=/^[0-9,]*\.?[0-9]*$/;if(r&&r.length&&o.test(r)){const d=parseFloat(r.replaceAll(",",""));d&&(se(d.toFixed(t.precision)),D&&F(parseFloat((d*(ye?1/D:D)).toFixed(n.precision))),g(b+1))}}})]})]})})]})}):null]})}),e.jsx(f,{control:j.control,name:"sellTotal",render:({field:c})=>e.jsxs(k,{className:"mt-4 text-xs",children:[e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-1",children:e.jsxs(oe,{children:[e.jsx(de,{children:e.jsx(xe,{variant:"outline",onClick:()=>{T==="editable"?(B("locked"),F(ue),ee("locked"),se(G),je("locked"),re(pe)):(B("editable"),ee("editable"))},children:T==="editable"?e.jsx(ne,{className:"h-4 w-4"}):e.jsx(ie,{className:"h-4 w-4"})})}),e.jsx(me,{className:"w-40 text-sm text-center pt-1 pb-1",children:s(T==="editable"?"MarketOrder:editingTotalAmountBeingSold":"MarketOrder:totalAmountLocked")})]},"sellTotalCard")}),e.jsxs("span",{className:"col-span-11",children:[e.jsx(M,{children:S==="editable"||T==="editable"?s("MarketOrder:updatingTotalAmountBeingBought"):s("MarketOrder:wantToUpdateTotalAmountBeingBought",{quoteAssetSymbol:n?n.symbol:"?"})}),e.jsx(N,{children:T==="editable"?s("MarketOrder:existingTotalAmountBeingBought",{existingQuoteAmount:ue,quoteAssetSymbol:n?n.symbol:"?"}):s("MarketOrder:clickToUnlockTotalAmount",{quoteAssetSymbol:n?n.symbol:"?"})})]})]}),T==="editable"&&t&&n?e.jsx(O,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-1"}),e.jsx("span",{className:"col-span-7",children:e.jsx(p,{label:s("MarketOrder:totalLabel"),placeholder:`${ae} ${n?n.symbol:"?"}`,disabled:!0,readOnly:!0})}),e.jsx("span",{className:"col-span-4 ml-3 text-center",children:e.jsxs(Q,{children:[e.jsx(J,{asChild:!0,children:e.jsx(I,{className:"w-full",onClick:()=>event.preventDefault(),variant:"outline",children:s("MarketOrder:setNewTotalAmountButton")})}),e.jsxs(W,{children:[e.jsx(C,{children:s("MarketOrder:provideNewTotalLabel")}),e.jsx(p,{placeholder:ae,className:"mb-2 mt-1",onChange:l=>{const r=l.target.value,o=/^[0-9,]*\.?[0-9]*$/;if(r&&r.length&&o.test(r)){const d=parseFloat(r.replaceAll(",",""));d&&(F(d.toFixed(n.precision)),D&&se((d/D).toFixed(t.precision)),g(b+1))}}})]})]})})]})}):null]})}),e.jsx(f,{control:j.control,name:"expiry",render:({field:c})=>e.jsxs(k,{children:[e.jsxs("span",{className:"grid grid-cols-12 mt-4 text-sm",children:[e.jsx("span",{className:"col-span-1",children:e.jsxs(oe,{children:[e.jsx(de,{children:e.jsx(xe,{variant:"outline",onClick:()=>{y==="editable"?(we("locked"),te(new Date(Ye))):we("editable")},children:y==="editable"?e.jsx(ne,{className:"h-4 w-4"}):e.jsx(ie,{className:"h-4 w-4"})})}),e.jsx(me,{className:"w-40 text-sm text-center pt-1 pb-1",children:s(y==="editable"?"MarketOrder:editingExpiration":"MarketOrder:expirationLocked")})]},"sellTotalCard")}),e.jsxs("span",{className:"col-span-11",children:[e.jsx(M,{children:s(y==="editable"?"MarketOrder:updatingExpiration":"MarketOrder:wantToUpdateExpiration")}),e.jsx(N,{children:y==="editable"?s("MarketOrder:existingExpiration",{existingExpiration:h.expiration.replace("T"," ")}):s("MarketOrder:clickToUnlockExpiration")})]})]}),y==="editable"?e.jsx(e.Fragment,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-1"}),e.jsx("span",{className:"col-span-7",children:e.jsx(O,{onValueChange:l=>{rs(l);const r=60*60*1e3,o=24*r;if(l!=="specific"){const d=new Date;let m;if(l==="1hr")m=new Date(d.getTime()+r);else if(l==="12hr"){const x=r*12;m=new Date(d.getTime()+x)}else if(l==="24hr"){const x=o;m=new Date(d.getTime()+x)}else if(l==="7d"){const x=o*7;m=new Date(d.getTime()+x)}else if(l==="30d"){const x=o*30;m=new Date(d.getTime()+x)}m&&te(m),be(l)}else l==="specific"&&be();g(b+1)},children:e.jsxs(Ds,{children:[e.jsx(As,{className:"mb-3",children:e.jsx(Ls,{placeholder:"1hr"})}),e.jsxs(_s,{className:"bg-white",children:[e.jsx(R,{value:"1hr",children:s("MarketOrder:oneHour")}),e.jsx(R,{value:"12hr",children:s("MarketOrder:twelveHours")}),e.jsx(R,{value:"24hr",children:s("MarketOrder:twentyFourHours")}),e.jsx(R,{value:"7d",children:s("MarketOrder:sevenDays")}),e.jsx(R,{value:"30d",children:s("MarketOrder:thirtyDays")}),e.jsx(R,{value:"specific",children:s("MarketOrder:specificDate")})]})]})})}),e.jsx("span",{className:"col-span-4 text-center ml-3",children:K==="specific"?e.jsxs(Q,{children:[e.jsx(J,{asChild:!0,children:e.jsxs(I,{variant:"outline",className:Ms("w-full justify-start text-left font-normal",!v&&"text-muted-foreground"),children:[e.jsx(Cs,{className:"mr-2 h-4 w-4"}),v?Bs(v,"PPP"):e.jsx("span",{children:s("MarketOrder:pickADate")})]})}),e.jsx(W,{className:"w-auto p-0",align:"start",children:e.jsx(Ps,{mode:"single",selected:v,onSelect:l=>{if(new Date(l)<new Date){te(new Date(Date.now()+1*24*60*60*1e3));return}te(l)},initialFocus:!0})})]}):null}),e.jsx("span",{className:"col-span-1"}),e.jsx("span",{className:"col-span-11",children:e.jsx(N,{children:K!=="specific"?s("MarketOrder:limitOrderExpiry",{expiryType:K}):null})})]})}):null]})}),e.jsx(Pe,{className:"mb-2 mt-2"}),e.jsx(f,{control:j.control,name:"osoValue",render:({field:c})=>e.jsxs(k,{children:[e.jsx(O,{children:e.jsxs("div",{className:"flex items-center space-x-2 mt-4",children:[e.jsx(Fe,{id:"terms1",checked:A,onClick:()=>{De(!A),g(b+1)}}),e.jsx("label",{htmlFor:"terms1",className:"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",children:s(A?"MarketOrder:osoEnabled":"MarketOrder:enableOso")})]})}),A?e.jsx(N,{children:s("MarketOrder:autoOsoActive")}):null]})}),A?e.jsxs(e.Fragment,{children:[e.jsx(f,{control:j.control,name:"osoSpread",render:({field:c})=>e.jsxs(k,{className:"mt-2 text-xs",children:[e.jsx(M,{className:"text-sm",children:s("MarketOrder:spreadPercentLabel")}),e.jsx(N,{children:s("MarketOrder:spreadPercentDescription")}),e.jsx(O,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsxs("span",{className:"col-span-9",children:[e.jsx(p,{label:s("MarketOrder:spreadPercentInput"),placeholder:E,disabled:!0,readOnly:!0}),e.jsx(Ee,{className:"mt-3",defaultValue:[E],max:100,min:1,step:.01,onValueChange:l=>{hs(l[0])}})]}),e.jsx("span",{className:"col-span-3 ml-3 text-center",children:e.jsxs(Q,{children:[e.jsx(J,{asChild:!0,children:e.jsx("span",{onClick:()=>{event.preventDefault()},className:"inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg",children:e.jsx(C,{children:s("MarketOrder:editSpreadLabel")})})}),e.jsxs(W,{children:[e.jsx(C,{children:s("MarketOrder:provideNewSpreadPercentLabel")}),e.jsx(p,{placeholder:E,className:"mb-2 mt-1",onChange:l=>{const r=l.target.value,o=/^[0-9]*\.?[0-9]*$/;r&&r.length&&o.test(r)&&r>=1&&r<=100&&(ge(r),g(b+1))}})]})]})})]})}),e.jsx(H,{})]})}),e.jsx(f,{control:j.control,name:"osoSize",render:({field:c})=>e.jsxs(k,{className:"mt-4 text-xs",children:[e.jsx(M,{className:"text-sm",children:s("MarketOrder:sizePercentLabel")}),e.jsx(N,{children:s("MarketOrder:sizePercentDescription")}),e.jsx(O,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsxs("span",{className:"col-span-9",children:[e.jsx(p,{label:s("MarketOrder:sizePercentLabel"),placeholder:$,disabled:!0,readOnly:!0}),e.jsx(Ee,{className:"mt-3",defaultValue:[$],max:100,min:0,step:.01,onValueChange:l=>{us(l[0])}})]}),e.jsx("span",{className:"col-span-3 ml-3 text-center",children:e.jsxs(Q,{children:[e.jsx(J,{asChild:!0,children:e.jsx("span",{onClick:()=>{event.preventDefault()},className:"inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg",children:e.jsx(C,{children:s("MarketOrder:editSizeLabel")})})}),e.jsxs(W,{children:[e.jsx(C,{children:s("MarketOrder:provideNewSizePercentLabel")}),e.jsx(p,{placeholder:$,className:"mb-2 mt-1",onChange:l=>{const r=l.target.value,o=/^[0-9]*\.?[0-9]*$/;r&&r.length&&o.test(r)&&r>=0&&r<=100&&(fe(r),g(b+1))}})]})]})})]})}),e.jsx(H,{})]})}),e.jsx(f,{control:j.control,name:"repeatValue",render:({field:c})=>e.jsxs(k,{className:"mt-4 text-xs",children:[e.jsx(M,{className:"text-sm",children:s("MarketOrder:setOsoRepeatLabel")}),e.jsx(N,{children:s("MarketOrder:osoRepeatDescription")}),e.jsx(O,{children:e.jsxs("div",{className:"flex items-center space-x-2",children:[e.jsx(Fe,{id:"terms2",checked:X,onClick:()=>{Ae(!X),g(b+1)}}),e.jsx("label",{htmlFor:"terms2",className:"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",children:s(X?"MarketOrder:osoConfiguredToRepeat":"MarketOrder:osoConfiguredNotToRepeat")})]})}),e.jsx(H,{})]})})]}):null,e.jsx(Pe,{className:"mt-3"}),e.jsx(f,{control:j.control,name:"networkFee",render:({field:c})=>e.jsxs(k,{children:[e.jsx(M,{children:s("MarketOrder:networkFeeLabel")}),e.jsx(O,{children:e.jsx(p,{disabled:!0,placeholder:`${_e} BTS`,className:"mb-3 mt-3"})}),i.id===i.referrer?e.jsx(H,{children:s("MarketOrder:rebateMessage",{rebate:Is(_e*.8,5)})}):null,e.jsx(H,{})]})}),e.jsx(I,{className:"mt-5 mb-3",variant:"outline",onClick:c=>{Te(!0),c.preventDefault()},children:s("MarketOrder:submitLimitOrderChangesButton")})]})}),es?e.jsx($e,{operationName:"limit_order_update",username:i.username,usrChain:i.chain,userID:i.id,dismissCallback:Te,headerText:s("MarketOrder:updatingLimitOrderHeader",{limitOrderID:u}),trxJSON:[ps]},`limit_order_update_${u}`):null]})]}),e.jsxs("div",{className:"grid grid-cols-2 mt-3 gap-5",children:[e.jsxs(U,{children:[e.jsxs(z,{className:"pb-0",children:[e.jsxs(q,{children:[n?n.symbol:"?"," (",n?n.id:"1.3.x",")",s("MarketOrder:balance")]}),e.jsx(V,{children:s("MarketOrder:limitOrderQuoteAsset")})]}),e.jsxs(ce,{children:[os," ",n?n.symbol:"?"]})]}),e.jsxs(U,{children:[e.jsxs(z,{className:"pb-0",children:[e.jsxs(q,{children:[t?t.symbol:"?"," (",t?t.id:"1.3.x",")",s("MarketOrder:balance")]}),e.jsx(V,{children:s("MarketOrder:limitOrderBaseAsset")})]}),e.jsxs(ce,{children:[ms," ",t?t.symbol:"?"]})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-5 mt-1",children:[e.jsxs("div",{className:"col-span-1",children:[e.jsx(U,{className:"mb-3",onClick:()=>{ve(!0)},children:e.jsxs(z,{children:[e.jsx(q,{children:s("MarketOrder:cancelLimitOrderTitle")}),e.jsx(V,{children:s("MarketOrder:cancelLimitOrderDescription",{limitOrderID:u})})]})}),Ge?e.jsx($e,{operationName:"limit_order_cancel",username:i.username,usrChain:i.chain,userID:i.id,dismissCallback:ve,headerText:s("MarketOrder:cancellingLimitOrderHeader",{limitOrderID:u}),trxJSON:[{fee_paying_account:i.id,order:u,extensions:[]}]},`CancellingLimitOrder_${u}`):null,e.jsx("a",{href:`/dex/index.html?market=${n?n.symbol:"?"}_${t?t.symbol:"?"}`,children:e.jsx(U,{children:e.jsxs(z,{children:[e.jsx(q,{children:s("MarketOrder:tradeOnDexTitle")}),e.jsxs(V,{children:[s("MarketOrder:market")," ",n?n.symbol:"?","/",t?t.symbol:"?",e.jsx("br",{}),s("MarketOrder:createNewLimitOrder"),e.jsx("br",{}),s("MarketOrder:seekAdditionalMarketData")]})]})})})]}),e.jsxs(U,{children:[e.jsxs(z,{className:"pb-0",children:[e.jsx(q,{children:s("MarketOrder:borrowAssetsTitle")}),e.jsx(V,{children:s("MarketOrder:borrowAssetsDescription",{quoteAsset:n?n.symbol:"?",baseAsset:t?t.symbol:"?"})})]}),e.jsxs(ce,{children:[e.jsx(C,{children:s("MarketOrder:searchBorrowableAssetsLabel")}),e.jsx("br",{}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${n?n.symbol:""}`,children:e.jsx(he,{children:n?n.symbol:"?"})}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=borrow&searchText=${t?t.symbol:""}`,children:e.jsx(he,{className:"ml-2 mt-1 mb-1",children:t?t.symbol:""})}),e.jsx("br",{}),e.jsx(C,{children:s("MarketOrder:searchAcceptedCollateralLabel")}),e.jsx("br",{}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${n?n.symbol:"?"}`,children:e.jsx(he,{children:n?n.symbol:"?"})}),e.jsx("a",{href:`/borrow/index.html?tab=searchOffers&searchTab=collateral&searchText=${t?t.symbol:""}`,children:e.jsx(he,{className:"ml-2 mt-1",children:t?t.symbol:""})})]})]})]})]}),n&&t?e.jsx(qs,{assetA:n.symbol,assetAData:n,assetB:t.symbol,assetBData:t,chain:i.chain}):null]})})}export{jr as default};
