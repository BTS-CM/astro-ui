import{u as e,I as h,L as Q,N as Y,O as X,P as G,Q as K,S as Z}from"./button.py8r9pgQ.js";import{r as a}from"./index.vR8cGMCg.js";import{F as P}from"./index.esm.8fBdem9M.js";import{$ as ee,m as se,n as te,u as me,C as f,b,c as j,d as y,k as E,l as R,f as pe}from"./CurrentUser.RIfKambw.js";import{T as xe,a as fe,b as g,c as q,h as H}from"./common.X_7DDhag.js";import{S as re}from"./scroll-area.d4DgCtw2.js";import{a as be,b as je}from"./User.yt9xOv9l.js";import{D as ye}from"./DeepLinkDialog.EofcCPWO.js";import{E as C}from"./ExternalLink.T2a5i_k0.js";import"./index.7dNGbZe0.js";import"./index.f2GGseSc.js";const ge={0:"Transfer",1:"Limit order create",2:"Limit order cancel",3:"Call order update",5:"Account creation",6:"Account update",7:"Account whitelist",8:"Account upgrade",9:"Account transfer",10:"Asset create",11:"Asset update",12:"Asset update bitasset",13:"Asset update feed producers",14:"Asset issue",15:"Asset reserve",16:"Asset fund fee pool",17:"Asset settle",18:"Asset global settle",19:"Asset publish feed",20:"Witness create",21:"Witness update",22:"Proposal create",23:"Proposal update",24:"Proposal delete",25:"Withdraw permission create",26:"Withdraw permission update",27:"Withdraw permission claim",28:"Withdraw permission delete",29:"Committee member create",30:"Committee member update",31:"Committee member update global parameters",32:"Vesting balance create",33:"Vesting balance withdraw",34:"Worker create",35:"Custom operation",36:"Assert",37:"Balance claim",38:"Override transfer",39:"Transfer to blind",40:"Blind transfer",41:"Transfer from blind",43:"Asset claim fees",45:"Collateral bid",47:"Asset claim pool",48:"Asset update issuer",49:"HTLC create",50:"HTLC redeem",52:"HTLC extend",54:"Custom authority create",55:"Custom authority update",56:"Custom authority delete",57:"Ticket create",58:"Ticket update",59:"Create liquidity pool",60:"Delete liquidity pool",61:"Liquidity pool deposit",62:"Liquidity pool withdraw",63:"Liquidity pool exchange",64:"SameT fund create",65:"SameT fund delete",66:"SameT fund update",67:"SameT fund borrow",68:"SameT fund repay",69:"Create credit offer",70:"Delete credit offer",71:"Update credit offer",72:"Accept credit offer",73:"Repay credit deal"};function Pe(s){const i=a.useSyncExternalStore(ee.subscribe,ee.get,(()=>!0)),t=a.useSyncExternalStore(se.subscribe,se.get,(()=>!0)),r=a.useSyncExternalStore(te.subscribe,te.get,(()=>!0)),l=a.useMemo((()=>i&&i.chain?i.chain:"bitshares"),[i]),n=a.useMemo((()=>l&&(t||r)?"bitshares"===l?t:r:[]),[t,r,l]);me(l??"bitshares",["assets"]);const c={backgroundColor:"#252526",color:"white"},[o,d]=a.useState("balances"),[m,u]=a.useState(0),[x,p]=a.useState(),[v,N]=a.useState();a.useEffect((()=>{let e;return i&&i.id&&(e=be([i.chain,i.id]).subscribe((({data:e,error:s,loading:i})=>{e&&!s&&!i&&(console.log("Successfully fetched user portfolio"),p(e.balances),N(e.limitOrders))}))),()=>{e&&e()}}),[i,m]);const[k,S]=a.useState(0),[_,$]=a.useState();a.useEffect((()=>{let e;return i&&i.id&&(e=je([i.chain,i.id]).subscribe((({data:e,error:s,loading:i})=>{e&&!s&&!i&&(console.log("Successfully fetched history"),$(e))}))),()=>{e&&e()}}),[i,k]);const w=a.useMemo((()=>{if(!n||!x)return[];let e=[];for(let s=0;s<(v?.length||0);s++){const i=v[s].sell_price.base.asset_id,t=v[s].sell_price.quote.asset_id;e.includes(i)||e.push(i),e.includes(t)||e.push(t)}for(let s=0;s<(x?.length||0);s++){const i=x[s].asset_id;e.includes(i)||e.push(i)}return n.filter((s=>e.includes(s.id)))}),[x,v,n]),[A,T]=a.useState(),[O,D]=a.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"container mx-auto mt-5 mb-5",children:e.jsx("div",{className:"grid grid-cols-1 mt-5",children:e.jsxs(xe,{defaultValue:"balances",className:"w-full",children:[e.jsxs(fe,{className:"grid w-full grid-cols-3",children:["balances"===o?e.jsx(g,{value:"balances",style:c,children:"Balances"}):e.jsx(g,{value:"balances",onClick:()=>d("balances"),children:"Balances"}),"openOrders"===o?e.jsx(g,{value:"openOrders",style:c,children:"Open orders"}):e.jsx(g,{value:"openOrders",onClick:()=>d("openOrders"),children:"Open orders"}),"activity"===o?e.jsx(g,{value:"activity",style:c,children:"Activity"}):e.jsx(g,{value:"activity",onClick:()=>d("activity"),children:"Activity"})]}),e.jsx(q,{value:"balances",children:e.jsxs(f,{children:[e.jsxs(b,{children:[e.jsxs(j,{children:[i.username,"'s account balances"]}),e.jsx(y,{children:"The assets held within your account"})]}),e.jsx(E,{className:"space-y-2",children:x&&x.length&&w&&w.length?e.jsx(P,{height:500,itemCount:x.length,itemSize:100,className:"gaps-2",children:({index:s,style:i})=>{const t=x[s],r=w&&Array.isArray(w)?w.find((e=>e.id===t.asset_id)):{symbol:t.asset_id,precision:5},a=H(t.amount,r.precision).toLocaleString(void 0,{minimumFractionDigits:r.precision});return e.jsx("div",{style:{...i,marginBottom:"8px"},children:e.jsx(f,{children:e.jsxs("div",{className:"grid grid-cols-6",children:[e.jsx("div",{className:"col-span-4",children:e.jsxs(b,{children:[e.jsxs(j,{children:[r.symbol," (",x[s].asset_id,")"]}),e.jsxs(y,{children:["Liquid amount: ",a,e.jsx("br",{})]})]})}),e.jsxs("div",{className:"col-span-2 pt-5",children:[e.jsx("a",{href:`/dex/index.html?market=${r.symbol}_${"BTS"===r.symbol?"USD":"BTS"}`,children:e.jsx(h,{variant:"outline",className:"mr-2",children:"Trade"})}),e.jsx(C,{variant:"outline",classnamecontents:"mt-2",type:"button",text:"Asset info",hyperlink:`https://blocksights.info/#/assets/${r.symbol}`})]})]})})})}}):e.jsx("p",{children:"No balances found"})}),e.jsx(R,{children:e.jsx(h,{onClick:()=>{p(),u(m+1)},children:"Refresh balances"})})]})}),e.jsx(q,{value:"openOrders",children:e.jsxs(f,{children:[e.jsxs(b,{children:[e.jsx(j,{children:"Open orders"}),e.jsx(y,{children:"Your currently open limit orders on the DEX"})]}),e.jsx(E,{children:v&&v.length&&w&&w.length?e.jsx(P,{height:500,itemCount:v.length,itemSize:145,children:({index:s,style:t})=>{const r=v[s].sell_price.base.amount,a=v[s].sell_price.base.asset_id,l=v[s].sell_price.quote.amount,n=v[s].sell_price.quote.asset_id,c=v[s].id,o=v[s].expiration,d=w&&w.length?w.find((e=>e.id===a)):null,m=w&&w.length?w.find((e=>e.id===n)):null,u=d?H(r,d.precision):r,x=m?H(l,m.precision):l,p=new Date(o)-new Date,g=Math.floor(p/1e3/60%60),N=Math.floor(p/1e3/60/60%24),k=`${Math.floor(p/1e3/60/60/24)}d ${N}h ${g}m`;return e.jsx("div",{style:{...t},children:e.jsx(f,{children:e.jsxs("div",{className:"grid grid-cols-6",children:[e.jsx("div",{className:"col-span-4",children:e.jsxs(b,{children:[e.jsxs(j,{children:["Selling ",u," ",d.symbol," for ",x," ",m.symbol]}),e.jsxs(y,{children:["Trading pair: ",a," for ",n,e.jsx("br",{}),"Order ID:",e.jsx(C,{classnamecontents:"text-blue-500",type:"text",text:` ${c}`,hyperlink:`https://blocksights.info/#/objects/${c}`}),e.jsx("br",{}),"Expires: ",k]})]})}),e.jsxs("div",{className:"col-span-2 pt-6",children:[e.jsx("a",{href:`/dex/index.html?market=${d.symbol}_${m.symbol}`,children:e.jsx(h,{variant:"outline",children:"Trade"})}),e.jsx("a",{href:`/order/index.html?id=${c}`,children:e.jsx(h,{variant:"outline",className:"mb-3 ml-3",children:"Update"})}),e.jsxs(e.Fragment,{children:[e.jsx(h,{variant:"outline",onClick:()=>{D(!0),T(c)},children:"Cancel"}),O&&c===A?e.jsx(ye,{operationName:"limit_order_cancel",username:i.username,usrChain:i.chain,userID:i.id,dismissCallback:D,headerText:`Cancelling offer of ${u} ${d.symbol} for ${x} ${m.symbol}`,trxJSON:[{fee_paying_account:i.id,order:A,extensions:[]}]},`Cancelling${u}${d.symbol}for${x}${m.symbol}`):null]})]})]})})})}}):e.jsx("p",{children:"No open orders found"})}),e.jsx(R,{children:e.jsx(h,{onClick:()=>{N(),u(m+1)},children:"Refresh open orders"})})]})}),e.jsx(q,{value:"activity",children:e.jsxs(f,{children:[e.jsxs(b,{children:[e.jsx(j,{children:"Recent blockchain activity"}),e.jsx(y,{children:"Your recent blockchain activity"})]}),e.jsx(E,{className:"space-y-2",children:_&&_.length?e.jsx(P,{height:500,itemCount:_.length,itemSize:145,children:({index:s,style:i})=>{const t=_[s],r=new Date(t.block_data.block_time),a=new Date-r,l=Math.floor(a/1e3/60%60),n=Math.floor(a/1e3/60/60%24),c=`${Math.floor(a/1e3/60/60/24)}d ${n}h ${l}m`;return e.jsx("div",{style:{...i},children:e.jsx(f,{children:e.jsxs("div",{className:"grid grid-cols-7",children:[e.jsx("div",{className:"col-span-5",children:e.jsxs(b,{children:[e.jsx(j,{children:ge[t.operation_type.toString()]}),e.jsxs(y,{children:["Operation ID:",e.jsx(C,{classnamecontents:"text-blue-500",type:"text",text:` ${t.account_history.operation_id}`,hyperlink:`https://blocksights.info/#/objects/${t.account_history.operation_id}`}),e.jsx("br",{}),"Block number:",e.jsx(C,{classnamecontents:"text-blue-500",type:"text",text:` ${t.block_data.block_num}`,hyperlink:`https://blocksights.info/#/blocks/${t.block_data.block_num}`}),e.jsx("br",{}),"Time since broadcast: ",c]})]})}),e.jsxs("div",{className:"col-span-2 mt-7",children:[e.jsxs(Q,{children:[e.jsx(Y,{asChild:!0,children:e.jsx(h,{variant:"outline",children:"View Operation"})}),e.jsxs(X,{className:"sm:max-w-[425px] bg-white",children:[e.jsxs(G,{children:[e.jsx(K,{children:"Operation JSON"}),e.jsx(Z,{children:"Check out the contents of this operation"})]}),e.jsx("div",{className:"grid grid-cols-1",children:e.jsx("div",{className:"col-span-1",children:e.jsx(re,{className:"h-72 rounded-md border",children:e.jsx("pre",{children:JSON.stringify(t.operation_history.op_object,null,2)})})})})]})]}),e.jsxs(Q,{children:[e.jsx(Y,{asChild:!0,children:e.jsx(h,{variant:"outline",className:"mt-2",children:"View all"})}),e.jsxs(X,{className:"sm:max-w-[425px] bg-white",children:[e.jsxs(G,{children:[e.jsx(K,{children:"Full operation contents"}),e.jsx(Z,{children:"Exhaustive info regarding this operation"})]}),e.jsx("div",{className:"grid grid-cols-1",children:e.jsx("div",{className:"col-span-1",children:e.jsx(re,{className:"h-72 rounded-md border",children:e.jsx("pre",{children:JSON.stringify(t,null,2)})})})})]})]})]})]})})})}}):e.jsx("p",{children:"No recent activity found"})}),e.jsx(R,{children:e.jsx(h,{onClick:()=>{$(),S(k+1)},children:"Refresh recent activity"})})]})})]})})}),e.jsx("div",{className:"grid grid-cols-1 mt-5",children:i&&i.username&&i.username.length?e.jsx(pe,{usr:i}):null})]})}export{Pe as default};