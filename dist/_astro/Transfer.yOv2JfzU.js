import{u as me,l as de,j as e,i as ue}from"./utils.7znXe2qs.js";import{r as a}from"./index.sXsv9c-e.js";import{u as he,F as xe,a as x,b as f,c as j,d as b,f as T,e as z}from"./form.pcaInan5.js";import{$ as R,C as $,a as E,b as k,c as B,d as y}from"./users.2JVUOKN_.js";import{D as fe,e as je,a as be,b as pe,c as Te,d as ge}from"./dialog.8c9vlkZb.js";import{A as _,a as P}from"./avatar._NiRVrsN.js";import{B as U}from"./button.y_h6KplI.js";import{I as u}from"./input.HaIIg_lG.js";import{$ as J,a as V,b as W,c as q,h as G,i as K,u as Se}from"./Init.SOFaEcmE.js";import{h as Q,t as Ae,d as Ne}from"./common.YW9z4-R6.js";import{c as Ce}from"./User.wBO8_z3B.js";import{A as X}from"./Avatar.FWO8QUvh.js";import{A as De}from"./AccountSearch.SURZDQ1s.js";import{D as ve}from"./DeepLinkDialog.pfbpEg12.js";import{E as Fe}from"./ExternalLink.9rrHieRs.js";import{A as $e}from"./AssetDropDownCard.V_Mxw5mt.js";import"./index.TXmbRjpk.js";import"./index.QjywInIh.js";import"./index.8KvaaAxm.js";import"./index.Qq4mV9Nn.js";import"./fuse.aCsZfKX4.js";import"./index.esm.NBzIaSv3.js";function es(Ee){const{t:r,i18n:ke}=me(de.get(),{i18n:ue}),m=he({defaultValues:{account:""}}),[Y,w]=a.useState(!1),[I,Z]=a.useState(),[n,ee]=a.useState(),[l,se]=a.useState(),[h,re]=a.useState(0);a.useState();const s=a.useSyncExternalStore(R.subscribe,R.get,()=>!0),A=a.useSyncExternalStore(J.subscribe,J.get,()=>!0),N=a.useSyncExternalStore(V.subscribe,V.get,()=>!0),C=a.useSyncExternalStore(W.subscribe,W.get,()=>!0),D=a.useSyncExternalStore(q.subscribe,q.get,()=>!0),v=a.useSyncExternalStore(G.subscribe,G.get,()=>!0),F=a.useSyncExternalStore(K.subscribe,K.get,()=>!0),o=a.useMemo(()=>s&&s.chain?s.chain:"bitshares",[s]);Se(o??"bitshares",["assets","globalParams","marketSearch"]);const L=a.useMemo(()=>o&&(A||N)?o==="bitshares"?A:N:[],[A,N,o]),ae=a.useMemo(()=>o&&(v||F)?o==="bitshares"?v:F:[],[v,F,o]),g=a.useMemo(()=>o&&(C||D)?o==="bitshares"?C:D:[],[C,D,o]),[M,ne]=a.useState(0);a.useEffect(()=>{if(g&&g.length){const i=g.find(d=>d[0]===0),c=Q(i[1].fee,5);ne(c)}},[g]);const[te,Be]=a.useState(0),[p,le]=a.useState();a.useEffect(()=>{let i;return s&&s.id&&(i=Ce([s.chain,s.id]).subscribe(({data:d,error:H,loading:oe})=>{d&&!H&&!oe&&le(d)})),()=>{i&&i()}},[s,te]);const[t,ie]=a.useState(),S=a.useMemo(()=>l?L.filter(i=>i.symbol===l):[],[l,L]);a.useEffect(()=>{S&&S.length&&ie(S[0])},[S]);const[ce,O]=a.useState(!1);return a.useEffect(()=>{I&&Z(!1)},[I]),a.useEffect(()=>{n&&O(!1)},[n]),e.jsx(e.Fragment,{children:e.jsxs("div",{className:"container mx-auto mt-5 mb-5",children:[e.jsx("div",{className:"grid grid-cols-1 gap-3",children:e.jsxs($,{children:[e.jsxs(E,{children:[e.jsx(k,{children:r("Transfer:transferAssets")}),e.jsxs(B,{children:[e.jsx("p",{children:r("Transfer:sendFundsDescription")}),e.jsx("p",{className:"mt-1",children:r("Transfer:transferLimitations")})]})]}),e.jsxs(y,{children:[e.jsx(xe,{...m,children:e.jsxs("form",{onSubmit:()=>{w(!0),event.preventDefault()},children:[e.jsx(x,{control:m.control,name:"account",render:({field:i})=>e.jsxs(f,{children:[e.jsx(j,{children:r("Transfer:sendingAccount")}),e.jsx(b,{children:e.jsxs("div",{className:"grid grid-cols-8 gap-2",children:[e.jsx("div",{className:"col-span-1 ml-5",children:e.jsx(X,{size:40,name:s&&s.username?s.username:"x",extra:"Sender",expression:{eye:"normal",mouth:"open"},colors:["#92A1C6","#146A7C","#F0AB3D","#C271B4","#C20D90"]})}),e.jsx("div",{className:"col-span-7",children:e.jsx(u,{disabled:!0,className:"mb-1 mt-1",value:`${s&&s.username?s.username:"?"} (${s&&s.id?s.id:"?"})`})})]})}),e.jsx(T,{children:r("Transfer:sendingAccountDescription")})]})}),e.jsx(x,{control:m.control,name:"targetAccount",render:({field:i})=>e.jsxs(f,{children:[e.jsx(j,{children:r("Transfer:targetAccount")}),e.jsx(b,{children:e.jsxs("div",{className:"grid grid-cols-8 mt-4",children:[e.jsx("div",{className:"col-span-1 ml-5",children:n&&n.name?e.jsx(X,{size:40,name:n.name,extra:"Target",expression:{eye:"normal",mouth:"open"},colors:["#92A1C6","#146A7C","#F0AB3D","#C271B4","#C20D90"]}):e.jsx(_,{children:e.jsx(P,{children:"?"})})}),e.jsx("div",{className:"col-span-5",children:e.jsx(u,{disabled:!0,placeholder:n&&n.name?`${n.name} (${n.id})`:"Bitshares account (1.2.x)",className:"mb-1 mt-1"})}),e.jsx("div",{className:"col-span-2",children:e.jsxs(fe,{open:ce,onOpenChange:c=>{O(c)},children:[e.jsx(je,{asChild:!0,children:e.jsx(U,{variant:"outline",className:"ml-3 mt-1",children:r(n?"Transfer:changeTarget":"Transfer:provideTarget")})}),e.jsxs(be,{className:"sm:max-w-[375px] bg-white",children:[e.jsxs(pe,{children:[e.jsxs(Te,{children:[!s||!s.chain?r("Transfer:bitsharesAccountSearch"):null,s&&s.chain==="bitshares"?r("Transfer:bitsharesAccountSearchBTS"):null,s&&s.chain!=="bitshares"?r("Transfer:bitsharesAccountSearchTEST"):null]}),e.jsx(ge,{children:r("Transfer:searchingForAccount")})]}),e.jsx(De,{chain:s&&s.chain?s.chain:"bitshares",excludedUsers:s&&s.username&&s.username.length?[s]:[],setChosenAccount:ee})]})]})})]})}),e.jsx(T,{children:!n||!n.name?r("Transfer:targetAccountDescription"):r("Transfer:targetAccountDescriptionWithName",{name:n.name})})]})}),e.jsx(x,{control:m.control,name:"targetAsset",render:({field:i})=>e.jsxs(f,{children:[e.jsx(j,{children:r("Transfer:assetToTransfer")}),e.jsx(b,{children:e.jsxs("div",{className:"grid grid-cols-8 mt-4",children:[e.jsxs("div",{className:"col-span-1 ml-5",children:[!l||!t?e.jsx(_,{children:e.jsx(P,{children:"?"})}):null,t?e.jsx(_,{children:e.jsx(P,{children:e.jsx("div",{className:"text-sm",children:t.bitasset_data_id?"MPA":"UIA"})})}):null]}),e.jsxs("div",{className:"col-span-5",children:[!l||!t?e.jsx(u,{disabled:!0,placeholder:"Bitshares asset (1.3.x)",className:"mb-1 mt-1"}):null,t?e.jsx(u,{disabled:!0,placeholder:`${t.symbol} (${t.id})`,className:"mb-1 mt-1"}):null]}),e.jsx("div",{className:"col-span-2 mt-1 ml-3",children:e.jsx($e,{assetSymbol:l??"",assetData:null,storeCallback:se,otherAsset:null,marketSearch:ae,type:null})})]})}),e.jsx(T,{children:r("Transfer:assetToTransferDescription")}),e.jsx(z,{children:t&&p&&!p.map(c=>c.asset_id).includes(t.id)?r("Transfer:noAssetInAccount",{username:s.username}):null})]})}),l&&n?e.jsx(x,{control:m.control,name:"transferAmount",render:({field:i})=>e.jsxs(f,{children:[e.jsx(j,{children:r("Transfer:amountAvailableToTransfer",{asset:l??"???"})}),e.jsx(b,{children:e.jsx(u,{disabled:!0,label:r("Transfer:amountAvailableToTransferLabel"),value:t&&p&&p.find(c=>c.asset_id===t.id)?`${Q(p.find(c=>c.asset_id===t.id).amount,t.precision)} ${t.symbol}`:"0",className:"mb-1"})}),e.jsx(T,{children:r("Transfer:maximumAmountDescription",{asset:l})})]})}):null,l&&n?e.jsx(x,{control:m.control,name:"transferAmount",render:({field:i})=>e.jsxs(f,{children:[e.jsx(j,{children:r("Transfer:amountToTransfer",{asset:l??"???"})}),e.jsx(b,{onChange:c=>{const d=c.target.value;/^[0-9]*\.?[0-9]*$/.test(d)&&re(d)},children:e.jsx(u,{label:r("Transfer:amountToTransferLabel"),value:h,placeholder:h,className:"mb-1"})}),e.jsx(T,{children:r("Transfer:amountToTransferDescription")})]})}):null,l&&n?e.jsx(x,{control:m.control,name:"networkFee",render:({field:i})=>e.jsxs(f,{children:[e.jsx(j,{children:r("Transfer:networkFee")}),e.jsx(b,{children:e.jsx(u,{disabled:!0,placeholder:`${r("Transfer:networkFeePlaceholder",{fee:M})}`,className:"mb-3 mt-3"})}),s.id===s.referrer?e.jsx(z,{children:r("Transfer:rebate",{rebate:Ae(M*.8,5)})}):null]})}):null,h?e.jsx(U,{className:"mt-5 mb-3",variant:"outline",type:"submit",children:r("Transfer:submit")}):e.jsx(U,{className:"mt-5 mb-3",variant:"outline",disabled:!0,type:"submit",children:r("Transfer:submit")})]})}),Y?e.jsx(ve,{operationName:"transfer",username:s.username,usrChain:s.chain,userID:s.id,dismissCallback:w,headerText:r("Transfer:sendingHeader",{amount:h,symbol:t.symbol,id:t.id,target:n.name,user:s.username}),trxJSON:[{fee:{amount:0,asset_id:"1.3.0"},from:s.id,to:n.id,amount:{amount:Ne(h,t.precision).toFixed(0),asset_id:t.id},extensions:[]}]},`Sending${h}${l}to${n.name}from${s.username}`):null]})]})}),e.jsxs("div",{className:"grid grid-cols-2 mt-5 gap-5",children:[n&&n.name?e.jsx("div",{className:"col-span-1",children:e.jsxs($,{children:[e.jsxs(E,{className:"pb-0 mb-0",children:[e.jsx(k,{children:r("Transfer:doubleCheckTitle")}),e.jsx(B,{children:r("Transfer:doubleCheckDescription")})]}),e.jsx(y,{className:"text-sm",children:e.jsxs("ul",{className:"ml-2 list-disc [&>li]:mt-2",children:[e.jsx("li",{children:r("Transfer:doubleCheckFormInputs")}),e.jsx("li",{children:r("Transfer:validateBeetPrompt")}),e.jsx("li",{children:e.jsx(Fe,{type:"text",classnamecontents:"",hyperlink:`https://blocksights.info/#/accounts/${n.name}`,text:r("Transfer:blocksightsLink",{name:n.name})})})]})})]})}):null,n&&n.name?e.jsx("div",{className:"col-span-1",children:e.jsxs($,{children:[e.jsxs(E,{className:"pb-0 mb-0",children:[e.jsx(k,{children:r("Transfer:scamAlertTitle")}),e.jsx(B,{children:r("Transfer:scamAlertDescription")})]}),e.jsx(y,{className:"text-sm",children:e.jsxs("ul",{className:"ml-2 list-disc [&>li]:mt-2",children:[e.jsx("li",{children:r("Transfer:scamAlertPoint1")}),e.jsx("li",{children:r("Transfer:scamAlertPoint2")}),e.jsx("li",{children:r("Transfer:scamAlertPoint3")})]})})]})}):null]})]})})}export{es as default};
