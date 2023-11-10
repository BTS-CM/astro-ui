import{$ as Z,J as ee,w as se,u as he,j as e,C as O,b as M,c as z,d as Y,i as re,f as xe,k as be,B as A,D as fe,z as pe,E as ge,F as je,G as ye,I as g}from"./CurrentUser.1e0e4221.js";import{r as l}from"./index.178a5b5e.js";import{F as te}from"./index.esm.60b0ed75.js";import{u as we,F as $e,a as j,b as y,c as w,d as $,e as b,f as C}from"./form.19f24f8d.js";import{h as D,T as ve,a as Ne,b as B,c as ae,f as le}from"./common.e1bc7670.js";import{c as Ce,d as De}from"./User.fd878bac.js";import{D as ke}from"./DeepLinkDialog.d4274afa.js";import{E}from"./ExternalLink.26cefe6b.js";function Oe(Fe){const m=we({defaultValues:{account:""}}),t=l.useSyncExternalStore(Z.subscribe,Z.get,()=>!0),H=l.useSyncExternalStore(ee.subscribe,ee.get,()=>!0),k=l.useSyncExternalStore(se.subscribe,se.get,()=>!0);he(t&&t.chain?t.chain:"bitshares",["assets","globalParams"]);const[P,ne]=l.useState(0);l.useEffect(()=>{if(k&&k.length){const i=k.find(o=>o[0]===73),r=D(i[1].fee,5);ne(r)}},[k]);const[F,oe]=l.useState();l.useEffect(()=>{let i;return t&&t.id&&(i=Ce([t.chain,t.id]).subscribe(({data:o,error:s,loading:d})=>{o&&!s&&!d&&oe(o)})),()=>{i&&i()}},[t]);const[n,ie]=l.useState();l.useEffect(()=>{let i;return t&&t.id&&(i=De([t.chain,t.id]).subscribe(({data:o,error:s,loading:d})=>{o&&!s&&!d&&ie(o)})),()=>{i&&i()}},[t]);function J({style:i,res:r,type:o}){const s=H.find(a=>a.id===r.debt_asset),d=H.find(a=>a.id===r.collateral_asset),u=D(r.debt_amount,s.precision),p=D(r.collateral_amount,d.precision),S=((new Date(r?.latest_repay_time)-new Date)/(1e3*60*60)).toFixed(2);let I="";if(S<24)I=` ${S} hours`;else{const x=(S/24).toString().split(".")[0],N=parseFloat(`0.${(S/24).toString().split(".")[1]}`)*24,Q=parseFloat(`0.${N.toString().split(".")[1]}`)*60;I=` ${x} days ${N.toFixed(0)} hours ${Q.toFixed(0)} mins`}const[X,q]=l.useState(!1),[ue,K]=l.useState(!1),[c,T]=l.useState(),_=l.useMemo(()=>{if(c&&u&&p)return c/u*p},[c,u,p]),v=l.useMemo(()=>c&&r&&s?(c/100*(r.fee_rate/1e4)).toFixed(s.precision):0,[c,r,s]),V=l.useMemo(()=>c&&v&&s?(parseFloat(c)+parseFloat(v)).toFixed(s.precision):0,[c,v,s]),L=l.useMemo(()=>{if(F&&F.length&&s){const a=F.find(x=>x.asset_id===s.id);if(a)return D(a.amount,s.precision)}return 0},[F,s]),[U,R]=l.useState(),[h,me]=l.useState();return l.useEffect(()=>{const a=setTimeout(()=>{me(U)},1e3);return()=>clearTimeout(a)},[U]),l.useEffect(()=>{if(!h||!u||!s)return;const a=D(1,s.precision);if(h>u)T(u),R(u);else if(h<a)T(a),R(a);else if(h.toString().split(".").length>1&&h.toString().split(".")[1].length>s.precision){const x=parseFloat(h).toFixed(s.precision);T(x),R(x)}else T(h)},[h,u,s]),e.jsx("div",{style:{...i},children:e.jsxs(O,{className:"ml-2 mr-2 pb-3",onClick:()=>{},children:[e.jsxs(M,{className:"pb-1",children:[e.jsxs(z,{children:["Deal #",e.jsx(E,{classNameContents:"text-blue-500",type:"text",text:r.id.replace("1.22.",""),hyperlink:`https://blocksights.info/#/objects/${r.id}`})," ","with"," ",e.jsx(E,{classNameContents:"text-blue-500",type:"text",text:o==="borrower"?r.offer_owner:r.borrower,hyperlink:`https://blocksights.info/#/accounts/${o==="borrower"?r.offer_owner:r.borrower}`})]}),e.jsxs(Y,{children:[o==="borrower"?"You borrowed":"They borrowed",":",e.jsxs("b",{children:[` ${u} ${s.symbol}`," (",e.jsx(E,{classNameContents:"text-blue-500",type:"text",text:r.debt_asset,hyperlink:`https://blocksights.info/#/assets/${r.debt_asset}`}),")"]}),e.jsx("br",{}),"Loan collateral:",e.jsxs("b",{children:[` ${p} ${d.symbol}`," (",e.jsx(E,{classNameContents:"text-blue-500",type:"text",text:r.collateral_asset,hyperlink:`https://blocksights.info/#/assets/${r.collateral_asset}`}),")"]}),e.jsx("br",{}),o==="borrower"?"Borrow fee":"Earnings",":",e.jsx("b",{children:` ${u*(r.fee_rate/1e4)} ${s.symbol} (${r.fee_rate/1e4}%)`}),e.jsx("br",{}),"Remaining time:",e.jsxs("b",{children:[I," (",r.latest_repay_time,")"]})]})]}),o==="borrower"?e.jsxs(be,{className:"pb-0 mt-2",children:[e.jsx(A,{onClick:()=>q(!0),children:"Repay loan"}),e.jsx("a",{href:`/dex/index.html?market=${s.symbol}_${d.symbol}`,children:e.jsxs(A,{className:"ml-2",children:["Trade ",s.symbol," on DEX"]})}),X?e.jsx(fe,{open:X,onOpenChange:a=>{q(a)},children:e.jsx(pe,{className:"sm:max-w-[900px] bg-white",children:e.jsxs(ge,{children:[e.jsxs(je,{children:["Repaying loan #",r.id]}),e.jsx(ye,{children:"Use this form to control your credit deal repayments."}),e.jsx($e,{...m,children:e.jsxs("form",{onSubmit:()=>{K(!0),event.preventDefault()},className:"gaps-5",children:[e.jsx(j,{control:m.control,name:"account",render:({field:a})=>e.jsxs(y,{children:[e.jsx(w,{children:"Account"}),e.jsx($,{children:e.jsx(g,{disabled:!0,readOnly:!0,placeholder:"Bitshares account (1.2.x)",className:"mb-3 mt-3",value:`${t.username} (${t.id})`})}),e.jsx(b,{})]})}),e.jsx(j,{control:m.control,name:"balance",render:({field:a})=>e.jsxs(y,{children:[e.jsxs(w,{children:["Your current ",s.symbol," balance"]}),e.jsx($,{children:e.jsx(g,{disabled:!0,readOnly:!0,className:"mb-3 mt-3",value:`${L} ${s.symbol}`})}),e.jsx(b,{})]})}),e.jsx(j,{control:m.control,name:"repayAmount",render:({field:a})=>e.jsxs(y,{children:[e.jsx(w,{children:e.jsxs("div",{className:"grid grid-cols-2 gap-2 mt-2",children:[e.jsx("div",{className:"col-span-1",children:`Amount of ${s.symbol} to repay`}),e.jsx("div",{className:"col-span-1 text-right",children:`Remaining debt: ${u} ${s.symbol}`})]})}),e.jsx(C,{children:"To get back all your collateral back, repay the debt in full."}),e.jsx($,{onChange:x=>{const N=x.target.value;/^[0-9]*\.?[0-9]*$/.test(N)&&R(N)},children:e.jsx(g,{label:`Amount of ${s.symbol} to repay`,className:"mb-3",value:U??"",placeholder:u})}),e.jsx(b,{})]})}),e.jsx(j,{control:m.control,name:"collateralRedemtionAmount",render:({field:a})=>e.jsxs(y,{children:[e.jsx(w,{children:e.jsxs("div",{className:"grid grid-cols-2 gap-2 mt-2",children:[e.jsx("div",{className:"col-span-1",children:"Redeem collateral"}),e.jsx("div",{className:"col-span-1 text-right",children:`Remaining collateral: ${p} ${d.symbol}`})]})}),e.jsx(C,{children:`Amount of ${d.symbol} backing collateral you'll redeem`}),e.jsx($,{children:e.jsx(g,{label:`Amount of ${s.symbol} to repay`,value:_&&p?`${_??"?"} ${d.symbol} (${(_/p*100).toFixed(2)}%)`:"0",disabled:!0,readOnly:!0,className:"mb-3"})}),e.jsx(b,{})]})}),c?e.jsx(j,{control:m.control,name:"loanFee",render:({field:a})=>e.jsxs(y,{children:[e.jsx(w,{children:e.jsx("div",{className:"mt-2",children:"Estimated loan fee"})}),e.jsx(C,{children:"This is the fee you'll pay to the lender."}),e.jsx($,{children:e.jsx(g,{disabled:!0,placeholder:"0",className:"mb-3 mt-3",value:`${v} (${s.symbol}) (${r.fee_rate/1e4}% fee)`})}),e.jsx(b,{})]})}):null,c?e.jsx(j,{control:m.control,name:"finalRepayment",render:({field:a})=>e.jsxs(y,{children:[e.jsx(w,{children:e.jsx("div",{className:"mt-2",children:"Final repayment"})}),e.jsxs(C,{children:["Once repaid in full, your ",d.symbol," collateral will be returned to you."]}),e.jsx($,{children:e.jsx(g,{disabled:!0,placeholder:"0",className:"mb-3 mt-3",value:`${V} (${s.symbol}) (debt + ${r.fee_rate/1e4}% fee)`})}),L<V?e.jsxs(b,{children:["Insufficient ",s.symbol," balance"]}):null]})}):null,e.jsx(j,{control:m.control,name:"networkFee",render:({field:a})=>e.jsxs(y,{children:[e.jsx(w,{children:e.jsx("div",{className:"mt-2",children:"Network fee"})}),e.jsx(C,{children:"This is the fee to broadcast your credit deal repayment operation onto the blockchain."}),e.jsx($,{children:e.jsx(g,{disabled:!0,placeholder:`${P} BTS`,className:"mb-3 mt-3"})}),t.id===t.referrer?e.jsxs(b,{children:["Rebate: ",P*.8," BTS (vesting)"]}):null,e.jsx(b,{})]})}),!_||!c||L<V?e.jsx(A,{className:"mt-5 mb-3",variant:"outline",disabled:!0,type:"submit",children:"Submit"}):e.jsx(A,{className:"mt-5 mb-3",variant:"outline",type:"submit",children:"Submit"})]})}),ue?e.jsx(ke,{operationName:"credit_deal_repay",username:t.username,usrChain:t.chain,userID:t.id,dismissCallback:K,headerText:`Repaying ${c} ${s.symbol}, to claim back ${d.symbol}`,trxJSON:[{account:t.id,deal_id:r.id,repay_amount:{amount:le(c,s.precision),asset_id:s.id},credit_fee:{amount:le(v,s.precision),asset_id:s.id},extensions:[]}]},`Repaying${c}${s.symbol}toclaimback${d.symbol}`):null]})})}):null]}):null]})},`acard-${r.id}`)}const ce=({index:i,style:r})=>{let o=n.borrowerDeals[i];return o?e.jsx(J,{style:r,res:o,type:"borrower"}):null},de=({index:i,style:r})=>{let o=n.ownerDeals[i];return o?e.jsx(J,{style:r,res:o,type:"lender"}):null},W={backgroundColor:"#252526",color:"white"},[f,G]=l.useState("borrowings");return e.jsx(e.Fragment,{children:e.jsxs("div",{className:"container mx-auto mt-5 mb-5",children:[e.jsx("div",{className:"grid grid-cols-1 gap-3",children:e.jsxs(O,{children:[e.jsxs(M,{children:[e.jsx(z,{children:"💱 Check your active credit deals"}),e.jsx(Y,{children:"From here you can both monitor active credit deals and manage repayments."})]}),e.jsx(re,{children:e.jsxs(ve,{defaultValue:"borrowings",className:"w-full",children:[e.jsxs(Ne,{className:"grid w-full grid-cols-2 gap-2",children:[f==="borrowings"?e.jsx(B,{value:"borrowings",style:W,children:"Viewing your borrowings"}):e.jsx(B,{value:"borrowings",onClick:()=>G("borrowings"),children:"View your borrowings"}),f==="lendings"?e.jsx(B,{value:"lendings",style:W,children:"Viewing your lendings"}):e.jsx(B,{value:"lendings",onClick:()=>G("lendings"),children:"View your lendings"})]}),e.jsxs(ae,{value:"borrowings",children:[n&&n.borrowerDeals&&n.borrowerDeals.length?e.jsx(te,{height:500,itemCount:n.borrowerDeals.length,itemSize:225,className:"w-full",children:ce}):null,n&&n.borrowerDeals&&!n.borrowerDeals.length?"No active borrowings found":null,!n||!n.borrowerDeals?"Loading...":null]}),e.jsxs(ae,{value:"lendings",children:[n&&n.ownerDeals&&n.ownerDeals.length?e.jsx(te,{height:500,itemCount:n.ownerDeals.length,itemSize:165,className:"w-full",children:de}):null,n&&n.ownerDeals&&!n.ownerDeals.length?"No active lendings found":null,!n||!n.ownerDeals?"Loading...":null]})]})})]})}),e.jsx("div",{className:"grid grid-cols-1 gap-3 mt-5",children:e.jsxs(O,{children:[e.jsxs(M,{className:"pb-0",children:[e.jsx(z,{children:f==="borrowings"?"Borrower Risk Warning":"Lender Risk Warning"}),e.jsx(Y,{children:"Important information about your responsibilities and risks associated with credit deals."})]}),e.jsx(re,{className:"text-sm",children:e.jsxs("ul",{className:"ml-2 list-disc [&>li]:mt-2 pl-2",children:[f==="borrowings"?e.jsxs("li",{children:["You ( ",e.jsx("b",{children:t?.username})," ) are responsible for managing your credit deals and repaying them in a timely manner, noone else. Consider using an automatic repayment method to avoid missing the repayment deadline if you might forget the deadline."]}):e.jsxs("li",{children:["You ( ",e.jsx("b",{children:t?.username})," ) are responsible for managing your credit offers, their parameters and their risk exposure, noone else. Consider creating automated scripts to manage the state of your credit offers."]}),f==="borrowings"?e.jsx("li",{children:"Be aware of your exposure to external volatilities during the credit deal repay period; the value of your borrowed assets and your backing collateral will fluctuate, you should consider such volatility exposure when deciding on how/when you'll repay the credit deal."}):e.jsx("li",{children:"Be aware of your exposure to external volatilities during the credit deal repay period; the value of the assets you lended to other users and the backing collateral they provided will fluctuate, you should consider your personal risk tollerance when deciding on your credit offer parameters. You should actively manage your credit offers as markets fluctuate to minimize your risk exposure."}),f==="lendings"?e.jsxs("li",{children:["As a lender, once a credit deal exists, you ( ",t?.username," ) cannot cancel it, the borrower is responsible for the duration of the deal within the repayment period. A credit deal's repayment date can also exceed your credit offer's expiration date."]}):null,f==="borrowings"?e.jsx("li",{children:"Failure to repay a credit deal will result in the loss of remaining backing collateral assets. There isn't a credit score system which punishes defaulting borrowers; the agreed terms of the credit deal will be honoured."}):e.jsx("li",{children:"If borrowers fail to repay their credit deals, their backing collateral assets will be forfeit to you. There isn't a credit score system which punishes borrowers for defaulting; the agreed terms of the credit deal will always be honoured, so plan your credit offers accordingly to your personal risk tollerance."})]})})]})}),e.jsx("div",{className:"grid grid-cols-1 mt-5",children:t&&t.username&&t.username.length?e.jsx(xe,{usr:t}):null})]})})}export{Oe as default};
