import{I as ve,J as _e,u as e,K as $e,O as Ae}from"./button.cJSehY-U.js";import{r as a}from"./index.ebYJtNMn.js";import{u as Ce,F as De,a as j,b,c as S,d as f,e as g,f as T}from"./form.3kNmoMJP.js";import{F as ye}from"./index.esm.5gY7anoR.js";import{$ as X,C as Y,a as Z,b as ee,c as se,d as te,A as Be,I as o}from"./hover-card.FBvz_Lnw.js";import{A as Te,a as Pe}from"./avatar.B1Tm2Jx0.js";import{P as w,a as M,b as R}from"./popover.GBzIu6kc.js";import{L as C,D as Oe}from"./DeepLinkDialog.zHQqyl1x.js";import{$ as ne,a as le,b as ae,c as re,d as ie,e as ce,u as Ee}from"./Init.AGQQj0ZE.js";import"./User.EWeWi36D.js";import{c as ke,a as Ie}from"./Assets.eJlhJGbG.js";import{h as F,g as we,b as H}from"./common.wDIQf1ml.js";import"./ExternalLink.7YCz3qWc.js";import"./index.OpSMZY1r.js";function ss(s){const{t:l,i18n:n}=ve(_e.get(),{i18n:Ae}),t=Ce({defaultValues:{account:""}}),r=a.useSyncExternalStore(X.subscribe,X.get,(()=>!0)),i=a.useSyncExternalStore(ne.subscribe,ne.get,(()=>!0)),d=a.useSyncExternalStore(le.subscribe,le.get,(()=>!0)),c=a.useSyncExternalStore(ae.subscribe,ae.get,(()=>!0)),m=a.useSyncExternalStore(re.subscribe,re.get,(()=>!0)),x=a.useSyncExternalStore(ie.subscribe,ie.get,(()=>!0)),h=a.useSyncExternalStore(ce.subscribe,ce.get,(()=>!0)),u=a.useMemo((()=>r&&r.chain?r.chain:"bitshares"),[r]);Ee(u??"bitshares",["bitAssetData","globalParams","marketSearch"]);const p=a.useMemo((()=>u&&(i||d)?"bitshares"===u?i:d:[]),[i,d,u]),N=a.useMemo((()=>u&&(x||h)?"bitshares"===u?x:h:[]),[x,h,u]),v=a.useMemo((()=>u&&(c||m)?"bitshares"===u?c:m:[]),[c,m,u]),[$,_]=a.useState(),[y,A]=a.useState(),[D,O]=a.useState(),[B,E]=a.useState(0),[P,I]=a.useState(0);a.useEffect((()=>{if(N&&N.length){const e=N.find((e=>45===e[0])),s=N.find((e=>17===e[0])),l=F(e[1].fee,5),n=F(s[1].fee,5);E(l),I(n)}}),[N]);const k=a.useMemo((()=>{if(v&&v.length&&window.location.search){const e=new URLSearchParams(window.location.search),s=Object.fromEntries(e.entries()),l=s&&s.id?s.id:null;return!l||!l.length||l&&!l.includes("1.3.")?void console.log("Invalid parameter"):(v&&v.length?v.map((e=>e.id)):[]).includes(l)?l:void console.log("Invalid parameter")}}),[v]),J=a.useMemo((()=>k&&k.length&&v?v.find((e=>e.id===k)):null),[k,v]),z=a.useMemo((()=>J&&p?p.find((e=>e.assetID===J.id)):null),[J,p]),q=a.useMemo((()=>{if(z&&p)return v.find((e=>e.id===z.collateral))}),[z,p]),G=a.useMemo((()=>{if(y&&y.current_feed&&q&&J)return parseFloat((F(parseInt(y.current_feed.settlement_price.quote.amount),q.p)/F(parseInt(y.current_feed.settlement_price.base.amount),J.p)).toFixed(q.p))}),[y,J,q]),L=a.useMemo((()=>{if($&&J&&q){return{finalSettlementFund:F(parseInt(y.settlement_fund),q.p),finalSettlementPrice:parseFloat((1/(F(y.settlement_price.quote.amount,q.p)/F(y.settlement_price.base.amount,J.p))).toFixed(J.p))}}}),[y,J,q]),Q=a.useMemo((()=>{if(y&&J&&q){return{_debt:F(parseInt(y.individual_settlement_debt),J.p),_fund:F(parseInt(y.individual_settlement_fund),q.p)}}}),[y,J,q]);a.useEffect((()=>{let e;return z&&z&&r&&r.chain&&(e=ke([r.chain,J.id,z.collateral,z.id]).subscribe((({data:e,error:s,loading:l})=>{e&&!s&&!l&&(_(e[0]),O(e[1]),A(e[2]))}))),()=>{e&&e()}}),[J,z,r]);const[U,W]=a.useState();a.useEffect((()=>{let e;return J&&r&&r.chain&&(e=Ie([r.chain,J.id]).subscribe((({data:e,error:s,loading:l})=>{e&&!s&&!l&&W(e)}))),()=>{e&&e()}}),[J,r]);const K=a.useMemo((()=>{if($){const e=we($.options.flags);return Object.keys(e).includes("disable_collateral_bidding")}}),[$]),[V,de]=a.useState(0),[oe,me]=a.useState(0),[xe,je]=a.useState(0),[he,ue]=a.useState(0),[pe,be]=a.useState(!1);return e.jsx(e.Fragment,{children:e.jsx("div",{className:"container mx-auto mt-5 mb-5",children:e.jsxs("div",{className:"grid grid-cols-1 gap-3",children:[e.jsxs(Y,{children:[e.jsxs(Z,{children:[e.jsx(ee,{children:l("Settlement:smartcoinSettlementFormTitle")}),e.jsx(se,{children:L&&L.finalSettlementFund?l("Settlement:bidOnGlobalSettlementFundsDescription"):l("Settlement:forceSettleAssetsDescription")})]}),e.jsxs(te,{children:[e.jsx(De,{...t,children:e.jsxs("form",{onSubmit:e=>{be(!0),e.stopPropagation(),e.preventDefault()},children:[e.jsx(j,{control:t.control,name:"account",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:L&&L.finalSettlementFund?l("Settlement:biddingAccount"):l("Settlement:assetSettlingAccount")}),e.jsx(f,{children:e.jsxs("div",{className:"grid grid-cols-8 mt-4",children:[e.jsx("div",{className:"col-span-1 ml-5",children:r&&r.username?e.jsx(Be,{size:40,name:r.username,extra:"Target",expression:{eye:"normal",mouth:"open"},colors:["#92A1C6","#146A7C","#F0AB3D","#C271B4","#C20D90"]}):e.jsx(Te,{children:e.jsx(Pe,{children:"?"})})}),e.jsx("div",{className:"col-span-7",children:e.jsx(o,{disabled:!0,placeholder:"Bitshares account (1.2.x)",className:"mb-3",value:`${r.username} (${r.id})`,readOnly:!0})})]})}),e.jsx(g,{})]})}),e.jsx(j,{control:t.control,name:"selectedAsset",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:l("Settlement:selectedAsset")}),e.jsx(f,{children:e.jsx("span",{className:"grid grid-cols-8",children:e.jsx("span",{className:"col-span-6",children:e.jsx(o,{disabled:!0,placeholder:"Bitshares smartcoin (1.3.x)",className:"mb-1",value:`${J?J.s:""} (${J?J.id:""})`,readOnly:!0})})})}),e.jsx(g,{})]})}),e.jsx(j,{control:t.control,name:"currentFeedPrice",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:l("Settlement:currentFeedPrice")})," ",e.jsx(f,{children:e.jsx("span",{className:"grid grid-cols-8",children:e.jsx("span",{className:"col-span-6",children:J&&q?e.jsx(o,{disabled:!0,className:"mb-1",value:`${G?(1/G).toFixed(J.p):0} ${J?J.s:""}/${q?q.s:""}`,readOnly:!0}):e.jsx(o,{disabled:!0,className:"mb-1",value:"",readOnly:!0})})})}),e.jsx(g,{})]})}),L&&L.finalSettlementFund?e.jsxs(e.Fragment,{children:[e.jsx(j,{control:t.control,name:"settlementPrice",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:l("Settlement:finalSettlementPrice")})," ",e.jsx(f,{children:e.jsx("span",{className:"grid grid-cols-8",children:e.jsx("span",{className:"col-span-6",children:e.jsx(o,{disabled:!0,className:"mb-1",value:`${L.finalSettlementPrice} ${J.s}/${q.s}`,readOnly:!0})})})}),e.jsx(g,{})]})}),e.jsx(j,{control:t.control,name:"fundsAvailable",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:l("Settlement:settlementFundsAvailable")})," ",e.jsx(f,{children:e.jsx("span",{className:"grid grid-cols-8",children:e.jsx("span",{className:"col-span-6",children:e.jsx(o,{disabled:!0,className:"mb-1",value:`${L.finalSettlementFund} ${q.s}`,readOnly:!0})})})}),e.jsx(g,{})]})}),e.jsx(j,{control:t.control,name:"fundingRatio1",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:l("Settlement:fundingRatio")}),e.jsx(f,{children:e.jsxs("span",{className:"grid grid-cols-8",children:[e.jsx("span",{className:"col-span-2 mb-1",children:e.jsx(o,{disabled:!0,value:`${(1/G/L.finalSettlementPrice*100).toFixed(2)} %`,readOnly:!0})}),e.jsx("span",{className:"col-span-2 text-red-500",children:e.jsx(o,{disabled:!0,value:`-${(100-1/G/L.finalSettlementPrice*100).toFixed(2)}%`,readOnly:!0})})]})}),e.jsx(g,{})]})}),e.jsx(j,{control:t.control,name:"additionalCollateral",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:l("Settlement:additionalCollateral")}),e.jsx(T,{children:l("Settlement:additionalCollateralDescription",{asset:J.s})}),e.jsx(f,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-8",children:e.jsx(o,{placeholder:xe?`${xe} ${q.s}`:`0 ${q.s}`,readOnly:!0,disabled:!0,className:"mb-3"})}),e.jsx("span",{className:"col-span-4 ml-3",children:e.jsxs(w,{children:[e.jsx(M,{children:e.jsx("span",{className:"inline-block border border-grey rounded pl-4 pb-1 pr-4",children:e.jsx(C,{children:l("Settlement:changeAmount")})})}),e.jsxs(R,{children:[e.jsx(C,{children:l("Settlement:provideNewAmount")}),e.jsx(o,{placeholder:xe,className:"mb-2 mt-1",onChange:e=>{const s=e.target.value;s&&s.length&&/^[0-9]*\.?[0-9]*$/.test(s)&&je(parseFloat(s).toFixed(q.p))}})]})]})})]})})]})}),e.jsx(j,{control:t.control,name:"debtCovered",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:l("Settlement:totalDebtCoveredByBid")}),e.jsx(T,{children:l("Settlement:totalDebtCoveredByBidDescription")}),e.jsx(f,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-8",children:e.jsx(o,{placeholder:he?`${he} ${J.s}`:`0 ${J.s}`,readOnly:!0,disabled:!0,className:"mb-3"})}),e.jsx("span",{className:"col-span-4 ml-3",children:e.jsxs(w,{children:[e.jsx(M,{children:e.jsx("span",{className:"inline-block border border-grey rounded pl-4 pb-1 pr-4",children:e.jsx(C,{children:l("Settlement:changeTotal")})})}),e.jsxs(R,{children:[e.jsx(C,{children:l("Settlement:provideNewTotal")}),e.jsx(o,{placeholder:he,className:"mb-2 mt-1",onChange:e=>{const s=e.target.value;s&&s.length&&/^[0-9]*\.?[0-9]*$/.test(s)&&ue(parseFloat(s).toFixed(J.p))}})]})]})})]})})]})})]}):null,Q&&(Q._debt||Q._fund)?e.jsxs(e.Fragment,{children:[e.jsx(j,{control:t.control,name:"isd",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:l("Settlement:individualSettlementDebt")})," ",e.jsx(f,{children:e.jsx("span",{className:"grid grid-cols-8",children:e.jsx("span",{className:"col-span-6",children:e.jsx(o,{disabled:!0,className:"mb-1",value:`${Q._debt} ${J.s}`,readOnly:!0})})})}),e.jsx(g,{})]})}),e.jsx(j,{control:t.control,name:"isf",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:l("Settlement:individualSettlementFund")})," ",e.jsx(f,{children:e.jsx("span",{className:"grid grid-cols-8",children:e.jsx("span",{className:"col-span-6",children:e.jsx(o,{disabled:!0,className:"mb-1",value:`${Q._fund} ${q.s}`,readOnly:!0})})})}),e.jsx(g,{})]})}),e.jsx(j,{control:t.control,name:"fundingRatio2",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:l("Settlement:fundingRatio")}),e.jsx(f,{children:e.jsxs("span",{className:"grid grid-cols-8",children:[e.jsx("span",{className:"col-span-2 mb-1",children:e.jsx(o,{disabled:!0,value:`${(Q._debt*G/Q._fund*100).toFixed(2)} %`,readOnly:!0})}),e.jsx("span",{className:"col-span-2 text-red-500",children:e.jsx(o,{disabled:!0,value:`-${(100-Q._debt*G/Q._fund*100).toFixed(2)}%`,readOnly:!0})})]})}),e.jsx(g,{})]})}),e.jsx(j,{control:t.control,name:"ForceSettleAmount",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:l("Settlement:forceSettleAmount")}),e.jsx(T,{children:l("Settlement:forceSettleAmountDescription")}),e.jsx(f,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-8",children:e.jsx(o,{placeholder:V?`${V} ${J.s}`:`0 ${J.s}`,readOnly:!0,disabled:!0,className:"mb-3"})}),e.jsx("span",{className:"col-span-4 ml-3",children:e.jsxs(w,{children:[e.jsx(M,{children:e.jsx("span",{className:"inline-block border border-grey rounded pl-4 pb-1 pr-4",children:e.jsx(C,{children:l("Settlement:changeAmount")})})}),e.jsxs(R,{children:[e.jsx(C,{children:l("Settlement:provideNewForceSettleAmount")}),e.jsx(o,{placeholder:V,className:"mb-2 mt-1",onChange:e=>{const s=e.target.value;if(s&&s.length&&/^[0-9]*\.?[0-9]*$/.test(s)){de(parseFloat(s).toFixed(J.p));const e=parseFloat((Q._debt/Q._fund*s).toFixed(q.p));me(e)}}})]})]})})]})}),V&&Q._debt&&V>Q._debt?e.jsx(g,{children:l("Settlement:forceSettleAmountExceedsDebt")}):null]})}),e.jsx(j,{control:t.control,name:"totalReceiving",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:l("Settlement:totalAmountReceive")}),e.jsx(T,{children:l("Settlement:totalAmountReceiveDescription",{asset:J.s})}),e.jsx(f,{children:e.jsxs("span",{className:"grid grid-cols-12",children:[e.jsx("span",{className:"col-span-8",children:e.jsx(o,{placeholder:oe?`${oe} ${q.s}`:`0 ${q.s}`,readOnly:!0,disabled:!0,className:"mb-1"})}),e.jsx("span",{className:"col-span-4 ml-3",children:e.jsxs(w,{children:[e.jsx(M,{children:e.jsx("span",{className:"inline-block border border-grey rounded pl-4 pb-1 pr-4",children:e.jsx(C,{children:l("Settlement:changeTotal")})})}),e.jsxs(R,{children:[e.jsx(C,{children:l("Settlement:provideNewTotalAmount")}),e.jsx(o,{placeholder:oe,className:"mb-2 mt-1",onChange:e=>{const s=e.target.value;s&&s.length&&/^[0-9]*\.?[0-9]*$/.test(s)&&(me(parseFloat(s).toFixed(q.p)),de((s/G).toFixed(J.p)))}})]})]})})]})}),e.jsx(g,{children:l("Settlement:payingPremium",{premium:(100-Q._debt*G/Q._fund*100).toFixed(2)})})]})})]}):null,e.jsx(j,{control:t.control,name:"fee",render:({field:s})=>e.jsxs(b,{children:[e.jsx(S,{children:l("Settlement:networkFee")}),e.jsx(T,{children:l("Settlement:operation",{operation:L&&L.finalSettlementFund?45:17})}),e.jsx(f,{children:e.jsx("span",{className:"grid grid-cols-8",children:e.jsx("span",{className:"col-span-6",children:e.jsx(o,{disabled:!0,className:"mb-1",value:`${L&&L.finalSettlementFund?B:P} ${"Bitshares"===r.chain?"BTS":"TEST"}`,readOnly:!0})})})}),e.jsx(g,{})]})}),y&&y.options.extensions.force_settle_fee_percent?e.jsx(g,{children:l("Settlement:additionalForceSettlementFee",{fee:y.options.extensions.force_settle_fee_percent/100})}):null,e.jsx($e,{className:"mt-5 mb-3",type:"submit",children:l("Settlement:submit")}),K?e.jsx(g,{children:l("Settlement:collateralBiddingDisabled")}):null]})}),L&&(!L||L.finalSettlementFund)||Q&&(!Q||Q._debt&&Q._fund)?null:"No settlement funds available"]})]}),U&&U.length?e.jsxs(Y,{children:[e.jsxs(Z,{children:[e.jsx(ee,{children:l("Settlement:existingCollateralBids")}),e.jsx(se,{children:l("Settlement:existingCollateralBidsDescription")})]}),e.jsxs(te,{children:[e.jsxs("div",{className:"grid grid-cols-5",children:[e.jsx("div",{className:"col-span-1",children:l("Settlement:bidder")}),e.jsx("div",{className:"col-span-1",children:l("Settlement:collateral")}),e.jsx("div",{className:"col-span-1",children:l("Settlement:debt")}),e.jsx("div",{className:"col-span-1",children:l("Settlement:bidPrice")}),e.jsx("div",{className:"col-span-1",children:l("Settlement:ratio")})]}),e.jsx(ye,{height:500,itemCount:U.length,itemSize:225,className:"w-full",children:({index:s,style:l})=>{const n=U[s],t=F(n.bid.base.amount,q.p),a=F(n.bid.quote.amount,J.p),r=parseFloat((t/a).toFixed(q.p)),i=parseFloat((1/G/r*100).toFixed(2));return e.jsxs("div",{className:"grid grid-cols-4 text-sm",style:l,children:[e.jsx("div",{className:"col-span-1",children:n.bidder}),e.jsx("div",{className:"col-span-1",children:t}),e.jsx("div",{className:"col-span-1",children:a}),e.jsx("div",{className:"col-span-1",children:r}),e.jsx("div",{className:"col-span-1",children:i})]})}})]})]}):null,pe?e.jsx(Oe,{operationName:L&&L.finalSettlementFund?"bid_collateral":"asset_settle",username:r.username,usrChain:r.chain,userID:r.id,dismissCallback:be,headerText:L&&L.finalSettlementFund?l("Settlement:biddingOnDebt",{asset:J.s,collateral:q.s}):l("Settlement:settlingFor",{forceSettleAmount:V,asset:J.s,totalReceiving:oe,collateral:q.s}),trxJSON:[L&&L.finalSettlementFund?{bidder:r.id,additional_collateral:{amount:H(xe,q.p),asset_id:q.id},debt_covered:{amount:H(he,J.p),asset_id:J.id},extensions:[]}:{account:r.id,amount:{amount:H(V,J.p),asset_id:J.id},extensions:[]}]},L&&L.finalSettlementFund?`bidCollateral${q.s}Debt${J.s}`:`Settling${V}${J.s}for${oe}${q.s}`):null]})})})}export{ss as default};