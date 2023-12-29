import{I as Te,J as ke,u as e,K as G,O as Me}from"./button.cJSehY-U.js";import{r as n}from"./index.ebYJtNMn.js";import{u as Ee,F as Pe,a as m,b as f,c as u,d as x,f as h,e as _}from"./form.3kNmoMJP.js";import{F as Re}from"./index.esm.5gY7anoR.js";import{$ as ae,C as Q,a as W,b as X,c as le,d as Z,A as ie,I as g,f as oe}from"./hover-card.FBvz_Lnw.js";import{S as ce,a as de,b as me,c as fe,d as I}from"./select.2eufauwf.js";import{A,a as F}from"./avatar.B1Tm2Jx0.js";import{h as S,b as ue}from"./common.wDIQf1ml.js";import{f as xe,g as he,d as je,e as Ce,h as pe,i as be,u as Ie}from"./Init.AGQQj0ZE.js";import{c as Ve}from"./User.EWeWi36D.js";import{D as Ue}from"./DeepLinkDialog.zHQqyl1x.js";import{E as He}from"./ExternalLink.7YCz3qWc.js";import"./index.f2GGseSc.js";import"./index.OpSMZY1r.js";import"./index.EbhUlXEb.js";function qe(ee){var r=new Date(ee),re=new Date,d=r-re,c=Math.round(d/1e3/60/60);return c}function ar(ee){const{t:r,i18n:re}=Te(ke.get(),{i18n:Me}),d=Ee({defaultValues:{account:""}}),c=n.useSyncExternalStore(ae.subscribe,ae.get,()=>!0),V=n.useSyncExternalStore(xe.subscribe,xe.get,()=>!0),U=n.useSyncExternalStore(he.subscribe,he.get,()=>!0),H=n.useSyncExternalStore(je.subscribe,je.get,()=>!0),q=n.useSyncExternalStore(Ce.subscribe,Ce.get,()=>!0),L=n.useSyncExternalStore(pe.subscribe,pe.get,()=>!0),z=n.useSyncExternalStore(be.subscribe,be.get,()=>!0),j=n.useMemo(()=>c&&c.chain?c.chain:"bitshares",[c]);Ie(j??"bitshares",["assets","globalParams","offers"]);const w=n.useMemo(()=>j&&(V||U)?j==="bitshares"?V:U:[],[V,U,j]),E=n.useMemo(()=>j&&(H||q)?j==="bitshares"?H:q:[],[H,q,j]),P=n.useMemo(()=>j&&(L||z)?j==="bitshares"?L:z:[],[L,z,j]),[se,ge]=n.useState(0);n.useEffect(()=>{if(E&&E.length){const t=E.find(o=>o[0]===72),i=S(t[1].fee,5);ge(i)}},[E]);const[te,ne]=n.useState(!1),[a,ye]=n.useState(null),[s,_e]=n.useState(null);n.useEffect(()=>{async function t(){const i=new URLSearchParams(window.location.search),b=Object.fromEntries(i.entries()).id;if(b){const v=P.find(M=>M.id===b);return v||null}else return console.log("Credit offer parameter not found"),null}P&&P.length&&t().then(i=>{if(!i){ne(!0);return}const o=w.find(b=>b.id===i.asset_type);ne(!1),ye(o),_e(i)})},[P]);const[J,Oe]=n.useState(),[$,ve]=n.useState([]);n.useEffect(()=>{let t;return c&&c.id&&(t=Ve([c.chain,c.id]).subscribe(({data:o,error:b,loading:v})=>{o&&!b&&!v&&(ve(o.map(M=>M.asset_id)),Oe(o))})),()=>{t&&t()}},[c]);const[C,we]=n.useState(null),D=n.useMemo(()=>s&&s.acceptable_collateral?s.acceptable_collateral.map(t=>t[0]).map(t=>w.find(o=>o.id===t)):[],[s,w]),Ne=({index:t,style:i})=>{const o=D[t];return e.jsx(I,{value:o.id,style:i,children:`${o.symbol} (${o.id})`})},N=n.useMemo(()=>s&&a?S(s.current_balance,a.precision):0,[s,a]),B=n.useMemo(()=>s&&a?S(s.min_deal_amount,a.precision):1,[s,a]),[Y,R]=n.useState(B??1),[O,Se]=n.useState(0),[p,T]=n.useState();n.useEffect(()=>{const t=setTimeout(()=>{Se(Y)},1e3);return()=>clearTimeout(t)},[Y]),n.useEffect(()=>{if(!N){T(0);return}if(O)if(O>N)T(N),R(N);else if(O<B)T(B),R(B);else if(O.toString().split(".").length>1&&O.toString().split(".")[1].length>a.precision){const t=parseFloat(O).toFixed(a.precision);T(t),R(t)}else T(O)},[O,N]);const l=n.useMemo(()=>{if(C&&$&&w&&J){const t=w.find(o=>o.id===C),i=J.find(o=>o.asset_id===C);return{amount:i?S(i.amount,t.precision):0,holding:$.includes(C),symbol:t.symbol,precision:t.precision,id:t.id,isBitasset:!!t.bitasset_data_id}}},[C,$,w,J]),Ae=n.useMemo(()=>{if(s){let t=s.max_duration_seconds/3600,i=new Date;i.setHours(i.getHours()+t);let o=`${i.getDate()}/${i.getMonth()+1}/${i.getFullYear()}`;return t>24?`${Math.floor(t/24)} days (due by ${o})`:`${t.toFixed(t<1?2:0)} hours (due by ${o})`}},[s]),Fe=n.useMemo(()=>{if(s){const t=qe(s.auto_disable_time);let i=new Date(s.auto_disable_time),o=`${i.getDate()}/${i.getMonth()+1}/${i.getFullYear()}`;return t>24?`${Math.floor(t/24)} days (on ${o})`:`${t.toFixed(t<1?2:0)} hours (on ${o})`}},[s]),k=n.useMemo(()=>{if(p&&l&&s){let t=0;const i=s.acceptable_collateral.find(v=>v[0]===l.id),o=i[1].base,b=i[1].quote;if(b.asset_id===l.id){const v=S(b.amount,l.precision)/S(o.amount,w.find(M=>M.id===o.asset_id).precision);t+=p*v}return t.toFixed(l.precision)}},[p,l,s]),[$e,K]=n.useState(!1),[y,De]=n.useState(),Be=n.useMemo(()=>{if(y){if(y==="no_auto_repayment")return 0;if(y==="only_full_repayment")return 1;if(y==="allow_partial_repayment")return 2}},[y]);return e.jsx(e.Fragment,{children:e.jsxs("div",{className:"container mx-auto mt-5 mb-5",children:[e.jsxs("div",{className:"grid grid-cols-1 gap-3",children:[te?e.jsxs(Q,{children:[e.jsxs(W,{className:"pb-1 mb-3 mt-3",children:[e.jsx(X,{children:r("CreditOffer:errorCard.title")}),e.jsxs(le,{className:"pt-2",children:[r("CreditOffer:errorCard.description1"),e.jsx("br",{}),r("CreditOffer:errorCard.description2")]})]}),e.jsx(Z,{children:e.jsx("a",{href:"/offers/index.html",children:e.jsx(G,{variant:"",className:"h-6",children:r("CreditOffer:errorCard.buttonLabel")})})})]}):null,te?null:e.jsxs(Q,{children:[e.jsxs(W,{className:"pb-1",children:[e.jsx(X,{children:s?r("CreditOffer:offerCardHeader.viewingOffer",{id:s.id,owner_name:s.owner_name??"?",owner_account:s.owner_account}):r("CreditOffer:offerCardHeader.loadingOfferTerms")}),e.jsxs(le,{children:[r("CreditOffer:offerCardHeader.offerDescription1"),e.jsx("br",{}),r("CreditOffer:offerCardHeader.offerDescription2")]})]}),e.jsx(Z,{children:e.jsx("div",{className:"grid grid-cols-1 gap-2 mt-3",children:e.jsx("div",{className:"col-span-1",children:e.jsx(Pe,{...d,children:e.jsxs("form",{onSubmit:()=>{K(!0),event.preventDefault()},children:[e.jsx(m,{control:d.control,name:"borrowerAccount",render:({field:t})=>e.jsxs(f,{children:[e.jsx(u,{children:r("CreditOffer:cardContent.borrowingAccount")}),e.jsx(x,{children:e.jsxs("div",{className:"grid grid-cols-8 mt-4",children:[e.jsx("div",{className:"col-span-1 ml-5",children:c&&c.username?e.jsx(ie,{size:40,name:c.username,extra:"Target",expression:{eye:"normal",mouth:"open"},colors:["#92A1C6","#146A7C","#F0AB3D","#C271B4","#C20D90"]}):e.jsx(A,{children:e.jsx(F,{children:"?"})})}),e.jsx("div",{className:"col-span-7",children:e.jsx(g,{disabled:!0,placeholder:"Bitshares account (1.2.x)",className:"mb-1 mt-1",value:c?`${c.username} (${c.id})`:"",readOnly:!0})})]})}),e.jsx(h,{children:r("CreditOffer:cardContent.broadcastDescription")}),e.jsx(_,{})]})}),e.jsx(m,{control:d.control,name:"lenderAccount",render:({field:t})=>e.jsxs(f,{children:[e.jsx(u,{children:e.jsxs("div",{className:"grid grid-cols-2 mt-4",children:[e.jsx("div",{className:"col-span-1",children:r("CreditOffer:cardContent.lendingAccount")}),e.jsx("div",{className:"col-span-1 text-right",children:s?e.jsx(He,{classnamecontents:"text-blue-500",type:"text",text:r("CreditOffer:cardContent.viewAccount",{owner_name:s.owner_name}),hyperlink:`https://blocksights.info/#/accounts/${s.owner_name}`}):null})]})}),e.jsx(x,{children:e.jsxs("div",{className:"grid grid-cols-8 mt-4",children:[e.jsx("div",{className:"col-span-1 ml-5",children:s&&s.owner_name?e.jsx(ie,{size:40,name:s.owner_name,extra:"Target",expression:{eye:"normal",mouth:"open"},colors:["#92A1C6","#146A7C","#F0AB3D","#C271B4","#C20D90"]}):e.jsx(A,{children:e.jsx(F,{children:"?"})})}),e.jsx("div",{className:"col-span-7",children:e.jsx(g,{disabled:!0,placeholder:"Bitshares account (1.2.x)",className:"mb-1 mt-1",value:s?`${s.owner_name} (${s.owner_account})`:"",readOnly:!0})})]})}),e.jsx(h,{children:r("CreditOffer:cardContent.borrowingDescription",{symbol:a?.symbol})}),e.jsx(_,{})]})}),e.jsx(m,{control:d.control,name:"amountAvailable",render:({field:t})=>e.jsxs(f,{children:[e.jsx(u,{children:a&&s?r("CreditOffer:cardContent.availableAmount",{symbol:a.symbol,asset_type:s.asset_type}):r("CreditOffer:cardContent.loading")}),e.jsx(x,{children:e.jsxs("div",{className:"grid grid-cols-8 mt-4",children:[e.jsx("div",{className:"col-span-1 ml-5",children:a?e.jsx(A,{children:e.jsx(F,{children:e.jsx("div",{className:"text-sm",children:a.bitasset_data_id?"MPA":"UIA"})})}):e.jsx(A,{children:e.jsx(F,{children:"?"})})}),e.jsx("div",{className:"col-span-7",children:e.jsx(g,{disabled:!0,placeholder:"Bitshares account (1.2.x)",className:"mb-1 mt-1",value:s&&a?`${S(s.current_balance,a.precision)} ${a.symbol}`:r("CreditOffer:cardContent.loading"),readOnly:!0})})]})}),e.jsx(h,{children:r("CreditOffer:cardContent.offerDescription",{owner_name:s?.owner_name,symbol:a?.symbol})})]})}),e.jsx(m,{control:d.control,name:"backingCollateral",render:({field:t})=>e.jsxs(f,{children:[e.jsx(u,{children:e.jsx("div",{className:"grid grid-cols-2 mt-3",children:e.jsx("div",{className:"mt-1",children:r("CreditOffer:cardContent.backingCollateral")})})}),e.jsx(x,{children:e.jsxs("div",{className:"grid grid-cols-8",children:[e.jsx("div",{className:"col-span-1 ml-5 mt-1",children:a?e.jsx(A,{children:e.jsx(F,{children:e.jsxs("div",{className:"text-sm",children:[l?null:"?",l&&l.isBitasset?"MPA":null,l&&!l.isBitasset?"UIA":null]})})}):e.jsx(A,{children:e.jsx(F,{children:"?"})})}),e.jsx("div",{className:"col-span-7 mt-2",children:e.jsxs(ce,{onValueChange:i=>{we(i)},children:[e.jsx(de,{className:"mb-1",children:e.jsx(me,{placeholder:l?`${l.symbol} (${l.id})`:r("CreditOffer:cardContent.selectCollateral")})}),e.jsx(fe,{className:"bg-white",children:D&&D.length?e.jsx(Re,{height:100,itemCount:D.length,itemSize:35,className:"w-full",initialScrollOffset:C?D.map(i=>i.id).indexOf(C.id)*35:0,children:Ne}):null})]})})]})}),e.jsx(h,{children:r("CreditOffer:cardContent.borrowDescription",{symbol:l?.symbol,owner_name:s?.owner_name})}),$&&C&&!$.includes(C)?e.jsx(_,{children:r("CreditOffer:cardContent.noCollateralMessage")}):null]})}),e.jsx(m,{control:d.control,name:"borrowAmount",render:({field:t})=>e.jsxs(f,{children:[e.jsx(u,{children:e.jsxs("div",{className:"grid grid-cols-2 gap-1 mt-5",children:[e.jsx("div",{className:"col-span-1",children:r("CreditOffer:cardContent.borrowAmount",{symbol:a?a.symbol:"?"})}),e.jsx("div",{className:"col-span-1 text-right",children:r("CreditOffer:cardContent.availableAmountRange",{minAmount:B??"?",availableAmount:N??"?",symbol:a?.symbol})})]})}),N?e.jsx(x,{onChange:i=>{const o=i.target.value;/^[0-9]*\.?[0-9]*$/.test(o)&&R(o)},children:e.jsx(g,{value:Y,className:"mb-3"})}):e.jsx(x,{children:e.jsx(g,{disabled:!0,value:0,className:"mb-3",readOnly:!0})}),e.jsx(h,{children:r("CreditOffer:cardContent.inputBorrowAmount",{symbol:a?.symbol,owner_name:s?.owner_name})}),e.jsx(_,{})]})}),e.jsx(m,{control:d.control,name:"repayMethod",render:({field:t})=>e.jsxs(f,{children:[e.jsx(u,{children:e.jsx("div",{className:"grid grid-cols-2 mt-3",children:e.jsx("div",{className:"mt-1",children:r("CreditOffer:cardContent.repayMethod")})})}),e.jsx(x,{children:e.jsxs(ce,{onValueChange:i=>{De(i)},children:[e.jsx(de,{className:"mb-1",children:e.jsx(me,{placeholder:r("CreditOffer:cardContent.selectRepayMethod")})}),e.jsxs(fe,{className:"bg-white",children:[e.jsx(I,{value:"no_auto_repayment",children:r("CreditOffer:cardContent.noAutoRepayment")}),e.jsx(I,{value:"only_full_repayment",children:r("CreditOffer:cardContent.onlyFullRepayment")}),e.jsx(I,{value:"allow_partial_repayment",children:r("CreditOffer:cardContent.allowPartialRepayment")})]})]})}),e.jsx(h,{children:r("CreditOffer:cardContent.selectRepaymentMethod")}),y?e.jsxs(_,{children:[y==="no_auto_repayment"?r("CreditOffer:cardContent.noAutoRepaymentMessage"):null,y==="only_full_repayment"?r("CreditOffer:cardContent.onlyFullRepaymentMessage"):null,y==="allow_partial_repayment"?r("CreditOffer:cardContent.allowPartialRepaymentMessage"):null]}):null]})}),C?e.jsx(m,{control:d.control,name:"requiredCollateralAmount",render:({field:t})=>e.jsxs(f,{children:[e.jsx(u,{children:e.jsxs("div",{className:"grid grid-cols-2 gap-1 mt-5",children:[e.jsx("div",{className:"col-span-1",children:r("CreditOffer:cardContent.requiredCollateral")}),e.jsx("div",{className:"col-span-1 text-right",children:l?r("CreditOffer:cardContent.currentBalance",{amount:l.amount,symbol:l.symbol}):r("CreditOffer:cardContent.loadingBalance")})]})}),e.jsx(x,{children:e.jsx(g,{disabled:!0,value:`${k??"0"} ${l?l.symbol:""}`,className:"mb-3",readOnly:!0})}),e.jsx(h,{children:p&&a?r("CreditOffer:cardContent.collateralNeeded",{borrowAmount:p??"",symbol:a?a.symbol:""}):r("CreditOffer:cardContent.enterValidBorrowAmount")}),l&&l.holding&&l.amount<k?e.jsx(_,{children:r("CreditOffer:cardContent.insufficientBalance",{symbol:l.symbol,requiredMore:(k-l.amount).toFixed(l.precision)})}):null,l&&!l.holding?e.jsx(_,{children:r("CreditOffer:cardContent.noAssetHeld")}):null]})}):null,e.jsx(m,{control:d.control,name:"repayPeriod",render:({field:t})=>e.jsxs(f,{children:[e.jsx(u,{children:e.jsx("div",{className:"grid grid-cols-2 gap-1 mt-5",children:e.jsx("div",{className:"col-span-1",children:r("CreditOffer:cardContent.repayPeriod")})})}),e.jsx(x,{children:e.jsx(g,{disabled:!0,value:Ae??r("CreditOffer:cardContent.loading"),className:"mb-3",readOnly:!0})}),e.jsx(h,{children:r("CreditOffer:cardContent.repayPeriodDescription")})]})}),e.jsx(m,{control:d.control,name:"offerValidity",render:({field:t})=>e.jsxs(f,{children:[e.jsx(u,{children:e.jsx("div",{className:"grid grid-cols-2 gap-1 mt-5",children:e.jsx("div",{className:"col-span-1",children:r("CreditOffer:cardContent.offerExpiry")})})}),e.jsx(x,{children:e.jsx(g,{disabled:!0,value:Fe??r("CreditOffer:cardContent.loading"),className:"mb-3",readOnly:!0})}),e.jsx(h,{children:r("CreditOffer:cardContent.offerExpiryDescription")})]})}),e.jsx(m,{control:d.control,name:"estimatedFee",render:({field:t})=>e.jsxs(f,{children:[e.jsx(u,{children:e.jsxs("div",{className:"grid grid-cols-2 gap-1 mt-5",children:[e.jsx("div",{className:"col-span-1",children:r("CreditOffer:cardContent.estimatedFee")}),e.jsx("div",{className:"col-span-1 text-right",children:s?r("CreditOffer:cardContent.borrowFeeRate",{feeRate:s.fee_rate/1e4}):r("CreditOffer:cardContent.loadingFee")})]})}),e.jsx(x,{children:e.jsx(g,{disabled:!0,value:p?r("CreditOffer:cardContent.feeAmount",{feeAmount:p*.01,symbol:a?a.symbol:"?"}):r("CreditOffer:cardContent.zeroFee",{symbol:a?a.symbol:"?"}),className:"mb-3",readOnly:!0})}),e.jsx(h,{children:r("CreditOffer:cardContent.feeDescription",{symbol:a?a.symbol:"?",owner_name:s?s.owner_name:"?"})}),e.jsx(_,{})]})}),e.jsx(m,{control:d.control,disabled:!0,name:"fee",render:({field:t})=>e.jsxs(f,{children:[e.jsx(u,{children:r("CreditOffer:cardContent.networkFee")}),e.jsx(g,{disabled:!0,value:`${se??"?"} BTS`,label:"fees",readOnly:!0}),e.jsx(h,{children:r("CreditOffer:cardContent.networkFeeDescription")}),c&&c.id===c.referrer?e.jsx(_,{children:r("CreditOffer:cardContent.ltmRebate",{rebate:.8*se})}):null]})})]})})})})}),e.jsx(oe,{children:l&&!l.holding||l&&l.holding&&l.amount<k?e.jsx(G,{disabled:!0,children:r("CreditOffer:cardContent.submit")}):e.jsx(G,{onClick:()=>K(!0),children:r("CreditOffer:cardContent.submit")})})]})]}),$e?e.jsx(Ue,{operationName:"credit_offer_accept",username:c.username,usrChain:c.chain,userID:c.id,dismissCallback:K,headerText:r("CreditOffer:dialogContent.borrowing",{finalBorrowAmount:p,symbol:a.symbol,owner_name:s.owner_name,owner_account:s.owner_account}),trxJSON:[{borrower:c.id,offer_id:s.id,borrow_amount:{amount:ue(p,a.precision),asset_id:a.id},collateral:{amount:ue(k,l.precision),asset_id:l.id},max_fee_rate:s.fee_rate,min_duration_seconds:s.max_duration_seconds,extensions:{auto_repay:Be??0}}]},`Borrowing${p}${a.symbol}from${s.owner_name}(${s.owner_account})`):null,e.jsx("div",{className:"grid grid-cols-1 mt-5",children:e.jsxs(Q,{children:[e.jsx(W,{children:e.jsx(X,{children:r("CreditOffer:risks.risksTitle")})}),e.jsxs(Z,{className:"text-sm",children:[r("CreditOffer:risks.risksDescription"),e.jsxs("ul",{className:"ml-2 list-disc [&>li]:mt-2 pl-2",children:[e.jsx("li",{children:r("CreditOffer:risks.riskCollateral")}),e.jsx("li",{children:r("CreditOffer:risks.riskLiquidity")}),e.jsx("li",{children:r("CreditOffer:risks.riskPlatform")}),e.jsx("li",{children:r("CreditOffer:risks.riskUser")}),e.jsx("li",{children:r("CreditOffer:risks.riskNetwork")})]})]}),e.jsx(oe,{className:"text-sm",children:r("CreditOffer:risks.risksFooter")})]})})]})})}export{ar as default};