import{u as e,I as V}from"./hover-card.e7ea2833.js";import{r as o}from"./index.33c77f1d.js";import{u as ve,F as we,a as d,b as u,c as m,d as h,f as x,e as v}from"./form.0dac8970.js";import{F as _e}from"./index.esm.8dba7c63.js";import{$ as G,i as K,j as Q,k as Z,u as $e,C as U,a as q,b as Y,c as ee,g as z,A as se,I as b,h as re,d as Ne}from"./CurrentUser.a6c6908b.js";import{S as ae,a as le,b as te,c as ne,d as P}from"./select.b5203a84.js";import{A,a as C}from"./avatar.c69d07d1.js";import{h as N,e as oe}from"./common.760824ab.js";import{c as Se}from"./User.92772f34.js";import{D as Ae}from"./DeepLinkDialog.7792d306.js";import{E as Ce}from"./ExternalLink.b2ec4386.js";import"./index.6a2b73ba.js";import"./index.0d05e5a3.js";import"./index.87cc51e8.js";function Fe(H){var c=new Date(H),i=new Date,g=c-i,S=Math.round(g/1e3/60/60);return S}function Ye(H){const c=ve({defaultValues:{account:""}}),i=o.useSyncExternalStore(G.subscribe,G.get,()=>!0),g=o.useSyncExternalStore(K.subscribe,K.get,()=>!0),S=o.useSyncExternalStore(Q.subscribe,Q.get,()=>!0),I=o.useSyncExternalStore(Z.subscribe,Z.get,()=>!0);$e(i&&i.chain?i.chain:"bitshares",["assets","globalParams","offers"]);const[W,ie]=o.useState(0);o.useEffect(()=>{if(S&&S.length){const r=S.find(n=>n[0]===72),t=N(r[1].fee,5);ie(t)}},[S]);const[J,X]=o.useState(!1),[l,ce]=o.useState(null),[s,de]=o.useState(null);o.useEffect(()=>{async function r(){console.log("Parsing url parameters");const t=new URLSearchParams(window.location.search),p=Object.fromEntries(t.entries()).id;if(p){const _=I.find(E=>E.id===p);return _?(console.log("Found offer"),_):(console.log("Setting default first offer"),null)}else return console.log("Credit offer parameter not found"),null}I&&I.length&&r().then(t=>{if(!t){X(!0);return}const n=g.find(p=>p.id===t.asset_type);X(!1),ce(n),de(t)})},[I]);const[R,ue]=o.useState(),[F,me]=o.useState([]);o.useEffect(()=>{let r;return i&&i.id&&(r=Se([i.chain,i.id]).subscribe(({data:n,error:p,loading:_})=>{n&&!p&&!_&&(me(n.map(E=>E.asset_id)),ue(n))})),()=>{r&&r()}},[i]);const[f,he]=o.useState(null),k=o.useMemo(()=>s&&s.acceptable_collateral?s.acceptable_collateral.map(r=>r[0]).map(r=>g.find(n=>n.id===r)):[],[s,g]),xe=({index:r,style:t})=>{const n=k[r];return e.jsx(P,{value:n.id,style:t,children:`${n.symbol} (${n.id})`})},$=o.useMemo(()=>s&&l?N(s.current_balance,l.precision):0,[s,l]),B=o.useMemo(()=>s&&l?N(s.min_deal_amount,l.precision):1,[s,l]),[O,M]=o.useState(B??1),[w,fe]=o.useState(0),[j,D]=o.useState();o.useEffect(()=>{const r=setTimeout(()=>{fe(O)},1e3);return()=>clearTimeout(r)},[O]),o.useEffect(()=>{if(!$){D(0);return}if(w)if(w>$)D($),M($);else if(w<B)D(B),M(B);else if(w.toString().split(".").length>1&&w.toString().split(".")[1].length>l.precision){const r=parseFloat(w).toFixed(l.precision);D(r),M(r)}else D(w)},[w,$]);const a=o.useMemo(()=>{if(f&&F&&g&&R){const r=g.find(n=>n.id===f),t=R.find(n=>n.asset_id===f);return{amount:t?N(t.amount,r.precision):0,holding:F.includes(f),symbol:r.symbol,precision:r.precision,id:r.id,isBitasset:!!r.bitasset_data_id}}},[f,F,g,R]),je=o.useMemo(()=>{if(s){let r=s.max_duration_seconds/3600,t=new Date;t.setHours(t.getHours()+r);let n=`${t.getDate()}/${t.getMonth()+1}/${t.getFullYear()}`;return r>24?`${Math.floor(r/24)} days (due by ${n})`:`${r.toFixed(r<1?2:0)} hours (due by ${n})`}},[s]),pe=o.useMemo(()=>{if(s){const r=Fe(s.auto_disable_time);let t=new Date(s.auto_disable_time),n=`${t.getDate()}/${t.getMonth()+1}/${t.getFullYear()}`;return r>24?`${Math.floor(r/24)} days (on ${n})`:`${r.toFixed(r<1?2:0)} hours (on ${n})`}},[s]),T=o.useMemo(()=>{if(j&&a&&s){let r=0;const t=s.acceptable_collateral.find(_=>_[0]===a.id),n=t[1].base,p=t[1].quote;if(p.asset_id===a.id){const _=N(p.amount,a.precision)/N(n.amount,g.find(E=>E.id===n.asset_id).precision);r+=j*_}return r.toFixed(a.precision)}},[j,a,s]),[be,L]=o.useState(!1),[y,ge]=o.useState(),ye=o.useMemo(()=>{if(y){if(y==="no_auto_repayment")return 0;if(y==="only_full_repayment")return 1;if(y==="allow_partial_repayment")return 2}},[y]);return e.jsx(e.Fragment,{children:e.jsxs("div",{className:"container mx-auto mt-5 mb-5",children:[e.jsxs("div",{className:"grid grid-cols-1 gap-3",children:[J?e.jsxs(U,{children:[e.jsxs(q,{className:"pb-1 mb-3 mt-3",children:[e.jsx(Y,{children:"Sorry, couldn't find your requested credit offer"}),e.jsxs(ee,{className:"pt-2",children:["The credit offer is either not active, or doesn't exist.",e.jsx("br",{}),"Check your URL parameters and try again."]})]}),e.jsx(z,{children:e.jsx("a",{href:"/offers/index.html",children:e.jsx(V,{variant:"",className:"h-6",children:"Return to credit offer overview"})})})]}):null,J?null:e.jsxs(U,{children:[e.jsxs(q,{className:"pb-1",children:[e.jsx(Y,{children:s?e.jsxs(e.Fragment,{children:["🏦 Viewing offer #",s.id," created by"," ",s.owner_name??"?"," (",s.owner_account,")"]}):"loading terms of offer..."}),e.jsxs(ee,{children:["This is an user created credit offer on the Bitshares DEX.",e.jsx("br",{}),"Thoroughly read the terms of the offer before proceeding to Beet."]})]}),e.jsx(z,{children:e.jsx("div",{className:"grid grid-cols-1 gap-2 mt-3",children:e.jsx("div",{className:"col-span-1",children:e.jsx(we,{...c,children:e.jsxs("form",{onSubmit:()=>{L(!0),event.preventDefault()},children:[e.jsx(d,{control:c.control,name:"borrowerAccount",render:({field:r})=>e.jsxs(u,{children:[e.jsx(m,{children:"Borrowing account"}),e.jsx(h,{children:e.jsxs("div",{className:"grid grid-cols-8 mt-4",children:[e.jsx("div",{className:"col-span-1 ml-5",children:i&&i.username?e.jsx(se,{size:40,name:i.username,extra:"Target",expression:{eye:"normal",mouth:"open"},colors:["#92A1C6","#146A7C","#F0AB3D","#C271B4","#C20D90"]}):e.jsx(A,{children:e.jsx(C,{children:"?"})})}),e.jsx("div",{className:"col-span-7",children:e.jsx(b,{disabled:!0,placeholder:"Bitshares account (1.2.x)",className:"mb-1 mt-1",value:i?`${i.username} (${i.id})`:"",readOnly:!0})})]})}),e.jsx(x,{children:"The account which will broadcast the credit offer accept operation."}),e.jsx(v,{})]})}),e.jsx(d,{control:c.control,name:"lenderAccount",render:({field:r})=>e.jsxs(u,{children:[e.jsx(m,{children:e.jsxs("div",{className:"grid grid-cols-2 mt-4",children:[e.jsx("div",{className:"col-span-1",children:"Lending account"}),e.jsx("div",{className:"col-span-1 text-right",children:s?e.jsx(Ce,{classnamecontents:"text-blue-500",type:"text",text:`View ${s.owner_name}'s account`,hyperlink:`https://blocksights.info/#/accounts/${s.owner_name}`}):null})]})}),e.jsx(h,{children:e.jsxs("div",{className:"grid grid-cols-8 mt-4",children:[e.jsx("div",{className:"col-span-1 ml-5",children:s&&s.owner_name?e.jsx(se,{size:40,name:s.owner_name,extra:"Target",expression:{eye:"normal",mouth:"open"},colors:["#92A1C6","#146A7C","#F0AB3D","#C271B4","#C20D90"]}):e.jsx(A,{children:e.jsx(C,{children:"?"})})}),e.jsx("div",{className:"col-span-7",children:e.jsx(b,{disabled:!0,placeholder:"Bitshares account (1.2.x)",className:"mb-1 mt-1",value:s?`${s.owner_name} (${s.owner_account})`:"",readOnly:!0})})]})}),e.jsx(x,{children:`This is the user from whom you'll be borrowing ${l?.symbol} from.`}),e.jsx(v,{})]})}),e.jsx(d,{control:c.control,name:"amountAvailable",render:({field:r})=>e.jsxs(u,{children:[e.jsx(m,{children:l&&s?`Amount of ${l.symbol} (
                                      ${s.asset_type}) available to
                                      borrow from this lender`:"loading..."}),e.jsx(h,{children:e.jsxs("div",{className:"grid grid-cols-8 mt-4",children:[e.jsx("div",{className:"col-span-1 ml-5",children:l?e.jsx(A,{children:e.jsx(C,{children:e.jsx("div",{className:"text-sm",children:l.bitasset_data_id?"MPA":"UIA"})})}):e.jsx(A,{children:e.jsx(C,{children:"?"})})}),e.jsx("div",{className:"col-span-7",children:e.jsx(b,{disabled:!0,placeholder:"Bitshares account (1.2.x)",className:"mb-1 mt-1",value:s&&l?`${N(s.current_balance,l.precision)} ${l.symbol}`:"loading...",readOnly:!0})})]})}),e.jsx(x,{children:`${s?.owner_name} is generously offering to lend you this much ${l?.symbol}, assuming you agree to their terms.`})]})}),e.jsx(d,{control:c.control,name:"backingCollateral",render:({field:r})=>e.jsxs(u,{children:[e.jsx(m,{children:e.jsx("div",{className:"grid grid-cols-2 mt-3",children:e.jsx("div",{className:"mt-1",children:"Backing collateral for credit deal"})})}),e.jsx(h,{children:e.jsxs("div",{className:"grid grid-cols-8",children:[e.jsx("div",{className:"col-span-1 ml-5 mt-1",children:l?e.jsx(A,{children:e.jsx(C,{children:e.jsxs("div",{className:"text-sm",children:[a?null:"?",a&&a.isBitasset?"MPA":null,a&&!a.isBitasset?"UIA":null]})})}):e.jsx(A,{children:e.jsx(C,{children:"?"})})}),e.jsx("div",{className:"col-span-7 mt-2",children:e.jsxs(ae,{onValueChange:t=>{he(t)},children:[e.jsx(le,{className:"mb-1",children:e.jsx(te,{placeholder:a?`${a.symbol} (${a.id})`:"Select your backing collateral.."})}),e.jsx(ne,{className:"bg-white",children:k&&k.length?e.jsx(_e,{height:100,itemCount:k.length,itemSize:35,className:"w-full",initialScrollOffset:f?k.map(t=>t.id).indexOf(f.id)*35:0,children:xe}):null})]})})]})}),e.jsx(x,{children:`To borrow ${a?.symbol} from ${s?.owner_name}, choose between the above accepted backing collateral assets.`}),F&&f&&!F.includes(f)?e.jsx(v,{children:"Account doesn't hold this backing collateral asset."}):null]})}),e.jsx(d,{control:c.control,name:"borrowAmount",render:({field:r})=>e.jsxs(u,{children:[e.jsx(m,{children:e.jsxs("div",{className:"grid grid-cols-2 gap-1 mt-5",children:[e.jsx("div",{className:"col-span-1",children:`Amount of ${l?l.symbol:"?"} you plan on borrowing`}),e.jsx("div",{className:"col-span-1 text-right",children:`Available: ${B??"?"} to ${$??"?"} ${l?.symbol}`})]})}),$?e.jsx(h,{onChange:t=>{const n=t.target.value;/^[0-9]*\.?[0-9]*$/.test(n)&&M(n)},children:e.jsx(b,{value:O,className:"mb-3"})}):e.jsx(h,{children:e.jsx(b,{disabled:!0,value:0,className:"mb-3",readOnly:!0})}),e.jsx(x,{children:`Input the amount of ${l?.symbol} you'd like to borrow from ${s?.owner_name}.`}),e.jsx(v,{})]})}),e.jsx(d,{control:c.control,name:"repayMethod",render:({field:r})=>e.jsxs(u,{children:[e.jsx(m,{children:e.jsx("div",{className:"grid grid-cols-2 mt-3",children:e.jsx("div",{className:"mt-1",children:"Credit offer repay method"})})}),e.jsx(h,{children:e.jsxs(ae,{onValueChange:t=>{ge(t)},children:[e.jsx(le,{className:"mb-1",children:e.jsx(te,{placeholder:"Select your repay method.."})}),e.jsxs(ne,{className:"bg-white",children:[e.jsx(P,{value:"no_auto_repayment",children:"No auto repayment"}),e.jsx(P,{value:"only_full_repayment",children:"Only full repayment"}),e.jsx(P,{value:"allow_partial_repayment",children:"Allow partial repayment"})]})]})}),e.jsx(x,{children:"Select between the different repayment methods."}),y?e.jsxs(v,{children:[y==="no_auto_repayment"?"You will not automatically repay this loan.":null,y==="only_full_repayment"?"You will automatically repay this loan in full when your account balance is sufficient.":null,y==="allow_partial_repayment"?"You will automatically repay this loan as much as possible using your available account balance.":null]}):null]})}),f?e.jsx(d,{control:c.control,name:"requiredCollateralAmount",render:({field:r})=>e.jsxs(u,{children:[e.jsx(m,{children:e.jsxs("div",{className:"grid grid-cols-2 gap-1 mt-5",children:[e.jsx("div",{className:"col-span-1",children:"Required collateral"}),e.jsx("div",{className:"col-span-1 text-right",children:a?`Your current balance: ${a.amount} ${a.symbol}`:"Loading balance..."})]})}),e.jsx(h,{children:e.jsx(b,{disabled:!0,value:`${T??"0"} ${a?a.symbol:""}`,className:"mb-3",readOnly:!0})}),e.jsx(x,{children:j&&l?`In order to borrow ${j??""} ${l?l.symbol:""} you'll
                                need to provide the following amount of collateral to
                                secure the deal.`:"Enter a valid borrow amount to calculate required collateral."}),a&&a.holding&&a.amount<T?e.jsx(v,{children:`Your account has an insufficient ${a.symbol} balance. You'll need at least ${(T-a.amount).toFixed(a.precision)} more ${a.symbol}.`}):null,a&&!a.holding?e.jsx(v,{children:"Your account does not hold this asset. Try another form of backing collateral if possible."}):null]})}):null,e.jsx(d,{control:c.control,name:"repayPeriod",render:({field:r})=>e.jsxs(u,{children:[e.jsx(m,{children:e.jsx("div",{className:"grid grid-cols-2 gap-1 mt-5",children:e.jsx("div",{className:"col-span-1",children:"Repay period"})})}),e.jsx(h,{children:e.jsx(b,{disabled:!0,value:je??"loading...",className:"mb-3",readOnly:!0})}),e.jsx(x,{children:"The maximum duration of the credit deal; repay the loan within this period to avoid loss of collateral."})]})}),e.jsx(d,{control:c.control,name:"offerValidity",render:({field:r})=>e.jsxs(u,{children:[e.jsx(m,{children:e.jsx("div",{className:"grid grid-cols-2 gap-1 mt-5",children:e.jsx("div",{className:"col-span-1",children:"Credit offer expiry"})})}),e.jsx(h,{children:e.jsx(b,{disabled:!0,value:pe??"Loading...",className:"mb-3",readOnly:!0})}),e.jsx(x,{children:"When this offer will no longer exist."})]})}),e.jsx(d,{control:c.control,name:"estimatedFee",render:({field:r})=>e.jsxs(u,{children:[e.jsx(m,{children:e.jsxs("div",{className:"grid grid-cols-2 gap-1 mt-5",children:[e.jsx("div",{className:"col-span-1",children:"Estimated borrow fee"}),e.jsx("div",{className:"col-span-1 text-right",children:s?`${s.fee_rate/1e4}% of borrowed
                                    amount`:"Loading borrow fee.."})]})}),e.jsx(h,{children:e.jsx(b,{disabled:!0,value:j?`${j*.01} ${l?l.symbol:"?"}`:`0 ${l?l.symbol:"?"}`,className:"mb-3",readOnly:!0})}),e.jsx(x,{children:`This is how much ${l?l.symbol:"?"} that ${s?s.owner_name:"?"} will earn once this deal has completed.`}),e.jsx(v,{})]})}),e.jsx(d,{control:c.control,disabled:!0,name:"fee",render:({field:r})=>e.jsxs(u,{children:[e.jsx(m,{children:"Network fee"}),e.jsx(b,{disabled:!0,value:`${W??"?"} BTS`,label:"fees",readOnly:!0}),e.jsx(x,{children:"The cost to broadcast your credit deal operation onto the network."}),i&&i.id===i.referrer?e.jsxs(v,{children:["LTM rebate: ",.8*W," BTS (vesting)"]}):null]})})]})})})})}),e.jsx(re,{children:a&&!a.holding||a&&a.holding&&a.amount<T?e.jsx(V,{disabled:!0,children:"Submit"}):e.jsx(V,{onClick:()=>L(!0),children:"Submit"})})]})]}),be?e.jsx(Ae,{operationName:"credit_offer_accept",username:i.username,usrChain:i.chain,userID:i.id,dismissCallback:L,headerText:`Borrowing ${j} ${l.symbol} from ${s.owner_name} (${s.owner_account})`,trxJSON:[{borrower:i.id,offer_id:s.id,borrow_amount:{amount:oe(j,l.precision),asset_id:l.id},collateral:{amount:oe(T,a.precision),asset_id:a.id},max_fee_rate:s.fee_rate,min_duration_seconds:s.max_duration_seconds,extensions:{auto_repay:ye??0}}]},`Borrowing${j}${l.symbol}from${s.owner_name}(${s.owner_account})`):null,e.jsx("div",{className:"grid grid-cols-1 mt-5",children:e.jsxs(U,{children:[e.jsx(q,{children:e.jsx(Y,{children:"Risks of Peer-to-Peer Loans"})}),e.jsxs(z,{className:"text-sm",children:["Peer-to-peer lending involves certain risks, including:",e.jsxs("ul",{className:"ml-2 list-disc [&>li]:mt-2 pl-2",children:[e.jsx("li",{children:"Collateral Risk: As a borrower, you may fail to repay the loan on time, forfeiting the loan collateral in full."}),e.jsx("li",{children:"Liquidity Risk: If you sell the assets you borrow, it may not be possible to re-acquire the assets in time to repay the loan, or you may do so at a loss."}),e.jsx("li",{children:"Platform Risk: If an asset's owner company goes out of business and ceases an exchange backed asset's operation, you could lose funds."}),e.jsx("li",{children:"User Risk: As credit offers are fully user generated, you could be interacting with untrustworthy assets or users who put funds at risk."}),e.jsx("li",{children:"Network Risk: Whilst blockchain downtime is very rare, it's a risk to consider when creating credit deals which span a period of time. Auto loan repay methods are available to offset such risk."})]})]}),e.jsx(re,{className:"text-sm",children:"Please consider these risks and thoroughly evaluate the terms of offers before proceeding with a credit deal."})]})}),e.jsx("div",{className:"grid grid-cols-1 mt-5",children:i&&i.username&&i.username.length?e.jsx(Ne,{usr:i}):null})]})})}export{Ye as default};