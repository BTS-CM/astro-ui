import{u as e,I as h,O as V,P as z,Q as J,S as Q,T as Y,U as X}from"./hover-card.e7ea2833.js";import{r as l}from"./index.33c77f1d.js";import{F as B}from"./index.esm.8dba7c63.js";import{$ as G,i as K,u as ce,C as f,a as j,b,c as y,g as I,h as P,d as de}from"./CurrentUser.a6c6908b.js";import{T as he,a as ue,b as g,c as L,h as E}from"./common.760824ab.js";import{S as Z}from"./scroll-area.91eb9c1e.js";import{a as me,b as pe}from"./User.92772f34.js";import{D as xe}from"./DeepLinkDialog.7792d306.js";import{E as C}from"./ExternalLink.b2ec4386.js";import"./index.0d05e5a3.js";import"./index.6a2b73ba.js";const fe={0:"Transfer",1:"Limit order create",2:"Limit order cancel",3:"Call order update",5:"Account creation",6:"Account update",7:"Account whitelist",8:"Account upgrade",9:"Account transfer",10:"Asset create",11:"Asset update",12:"Asset update bitasset",13:"Asset update feed producers",14:"Asset issue",15:"Asset reserve",16:"Asset fund fee pool",17:"Asset settle",18:"Asset global settle",19:"Asset publish feed",20:"Witness create",21:"Witness update",22:"Proposal create",23:"Proposal update",24:"Proposal delete",25:"Withdraw permission create",26:"Withdraw permission update",27:"Withdraw permission claim",28:"Withdraw permission delete",29:"Committee member create",30:"Committee member update",31:"Committee member update global parameters",32:"Vesting balance create",33:"Vesting balance withdraw",34:"Worker create",35:"Custom operation",36:"Assert",37:"Balance claim",38:"Override transfer",39:"Transfer to blind",40:"Blind transfer",41:"Transfer from blind",43:"Asset claim fees",45:"Collateral bid",47:"Asset claim pool",48:"Asset update issuer",49:"HTLC create",50:"HTLC redeem",52:"HTLC extend",54:"Custom authority create",55:"Custom authority update",56:"Custom authority delete",57:"Ticket create",58:"Ticket update",59:"Create liquidity pool",60:"Delete liquidity pool",61:"Liquidity pool deposit",62:"Liquidity pool withdraw",63:"Liquidity pool exchange",64:"SameT fund create",65:"SameT fund delete",66:"SameT fund update",67:"SameT fund borrow",68:"SameT fund repay",69:"Create credit offer",70:"Delete credit offer",71:"Update credit offer",72:"Accept credit offer",73:"Repay credit deal"};function Oe(s){const i=l.useSyncExternalStore(G.subscribe,G.get,(()=>!0)),t=l.useSyncExternalStore(K.subscribe,K.get,(()=>!0));ce(i&&i.chain?i.chain:"bitshares",["assets"]);const r={backgroundColor:"#252526",color:"white"},[a,n]=l.useState("balances"),[c,o]=l.useState(0),[d,m]=l.useState(),[u,x]=l.useState();l.useEffect((()=>{let e;return i&&i.id&&(e=me([i.chain,i.id]).subscribe((({data:e,error:s,loading:i})=>{e&&!s&&!i&&(console.log("Successfully fetched user portfolio"),m(e.balances),x(e.limitOrders))}))),()=>{e&&e()}}),[i,c]);const[p,v]=l.useState(0),[N,k]=l.useState();l.useEffect((()=>{let e;return i&&i.id&&(e=pe([i.chain,i.id]).subscribe((({data:e,error:s,loading:i})=>{e&&!s&&!i&&(console.log("Successfully fetched history"),k(e))}))),()=>{e&&e()}}),[i,p]);const S=l.useMemo((()=>{if(!t||!d)return[];let e=[];for(let s=0;s<(u?.length||0);s++){const i=u[s].sell_price.base.asset_id,t=u[s].sell_price.quote.asset_id;e.includes(i)||e.push(i),e.includes(t)||e.push(t)}for(let s=0;s<(d?.length||0);s++){const i=d[s].asset_id;e.includes(i)||e.push(i)}return t.filter((s=>e.includes(s.id)))}),[d,u,t]),[_,$]=l.useState(),[A,w]=l.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"container mx-auto mt-5 mb-5",children:e.jsx("div",{className:"grid grid-cols-1 mt-5",children:e.jsxs(he,{defaultValue:"balances",className:"w-full",children:[e.jsxs(ue,{className:"grid w-full grid-cols-3",children:["balances"===a?e.jsx(g,{value:"balances",style:r,children:"Balances"}):e.jsx(g,{value:"balances",onClick:()=>n("balances"),children:"Balances"}),"openOrders"===a?e.jsx(g,{value:"openOrders",style:r,children:"Open orders"}):e.jsx(g,{value:"openOrders",onClick:()=>n("openOrders"),children:"Open orders"}),"activity"===a?e.jsx(g,{value:"activity",style:r,children:"Activity"}):e.jsx(g,{value:"activity",onClick:()=>n("activity"),children:"Activity"})]}),e.jsx(L,{value:"balances",children:e.jsxs(f,{children:[e.jsxs(j,{children:[e.jsxs(b,{children:[i.username,"'s account balances"]}),e.jsx(y,{children:"The assets held within your account"})]}),e.jsx(I,{className:"space-y-2",children:d&&d.length&&S&&S.length?e.jsx(B,{height:500,itemCount:d.length,itemSize:100,className:"gaps-2",children:({index:s,style:i})=>{const t=d[s],r=S&&Array.isArray(S)?S.find((e=>e.id===t.asset_id)):{symbol:t.asset_id,precision:5},l=E(t.amount,r.precision).toLocaleString(void 0,{minimumFractionDigits:r.precision});return e.jsx("div",{style:{...i,marginBottom:"8px"},children:e.jsx(f,{children:e.jsxs("div",{className:"grid grid-cols-6",children:[e.jsx("div",{className:"col-span-4",children:e.jsxs(j,{children:[e.jsxs(b,{children:[r.symbol," (",d[s].asset_id,")"]}),e.jsxs(y,{children:["Liquid amount: ",l,e.jsx("br",{})]})]})}),e.jsxs("div",{className:"col-span-2 pt-5",children:[e.jsx("a",{href:`/dex/index.html?market=${r.symbol}_${"BTS"===r.symbol?"USD":"BTS"}`,children:e.jsx(h,{variant:"outline",className:"mr-2",children:"Trade"})}),e.jsx(C,{variant:"outline",classnamecontents:"mt-2",type:"button",text:"Asset info",hyperlink:`https://blocksights.info/#/assets/${r.symbol}`})]})]})})})}}):e.jsx("p",{children:"No balances found"})}),e.jsx(P,{children:e.jsx(h,{onClick:()=>{m(),o(c+1)},children:"Refresh balances"})})]})}),e.jsx(L,{value:"openOrders",children:e.jsxs(f,{children:[e.jsxs(j,{children:[e.jsx(b,{children:"Open orders"}),e.jsx(y,{children:"Your currently open limit orders on the DEX"})]}),e.jsx(I,{children:u&&u.length&&S&&S.length?e.jsx(B,{height:500,itemCount:u.length,itemSize:145,children:({index:s,style:t})=>{const r=u[s].sell_price.base.amount,l=u[s].sell_price.base.asset_id,a=u[s].sell_price.quote.amount,n=u[s].sell_price.quote.asset_id,c=u[s].id,o=u[s].expiration,d=S&&S.length?S.find((e=>e.id===l)):null,m=S&&S.length?S.find((e=>e.id===n)):null,x=d?E(r,d.precision):r,p=m?E(a,m.precision):a,g=new Date(o)-new Date,v=Math.floor(g/1e3/60%60),N=Math.floor(g/1e3/60/60%24),k=`${Math.floor(g/1e3/60/60/24)}d ${N}h ${v}m`;return e.jsx("div",{style:{...t},children:e.jsx(f,{children:e.jsxs("div",{className:"grid grid-cols-6",children:[e.jsx("div",{className:"col-span-4",children:e.jsxs(j,{children:[e.jsxs(b,{children:["Selling ",x," ",d.symbol," for ",p," ",m.symbol]}),e.jsxs(y,{children:["Trading pair: ",l," for ",n,e.jsx("br",{}),"Order ID:",e.jsx(C,{classnamecontents:"text-blue-500",type:"text",text:` ${c}`,hyperlink:`https://blocksights.info/#/objects/${c}`}),e.jsx("br",{}),"Expires: ",k]})]})}),e.jsxs("div",{className:"col-span-2 pt-6",children:[e.jsx("a",{href:`/dex/index.html?market=${d.symbol}_${m.symbol}`,children:e.jsx(h,{variant:"outline",children:"Trade"})}),e.jsx("a",{href:`/order/index.html?id=${c}`,children:e.jsx(h,{variant:"outline",className:"mb-3 ml-3",children:"Update"})}),e.jsxs(e.Fragment,{children:[e.jsx(h,{variant:"outline",onClick:()=>{w(!0),$(c)},children:"Cancel"}),A&&c===_?e.jsx(xe,{operationName:"limit_order_cancel",username:i.username,usrChain:i.chain,userID:i.id,dismissCallback:w,headerText:`Cancelling offer of ${x} ${d.symbol} for ${p} ${m.symbol}`,trxJSON:[{fee_paying_account:i.id,order:_,extensions:[]}]},`Cancelling${x}${d.symbol}for${p}${m.symbol}`):null]})]})]})})})}}):e.jsx("p",{children:"No open orders found"})}),e.jsx(P,{children:e.jsx(h,{onClick:()=>{x(),o(c+1)},children:"Refresh open orders"})})]})}),e.jsx(L,{value:"activity",children:e.jsxs(f,{children:[e.jsxs(j,{children:[e.jsx(b,{children:"Recent blockchain activity"}),e.jsx(y,{children:"Your recent blockchain activity"})]}),e.jsx(I,{className:"space-y-2",children:N&&N.length?e.jsx(B,{height:500,itemCount:N.length,itemSize:145,children:({index:s,style:i})=>{const t=N[s],r=new Date(t.block_data.block_time),l=new Date-r,a=Math.floor(l/1e3/60%60),n=Math.floor(l/1e3/60/60%24),c=`${Math.floor(l/1e3/60/60/24)}d ${n}h ${a}m`;return e.jsx("div",{style:{...i},children:e.jsx(f,{children:e.jsxs("div",{className:"grid grid-cols-7",children:[e.jsx("div",{className:"col-span-5",children:e.jsxs(j,{children:[e.jsx(b,{children:fe[t.operation_type.toString()]}),e.jsxs(y,{children:["Operation ID:",e.jsx(C,{classnamecontents:"text-blue-500",type:"text",text:` ${t.account_history.operation_id}`,hyperlink:`https://blocksights.info/#/objects/${t.account_history.operation_id}`}),e.jsx("br",{}),"Block number:",e.jsx(C,{classnamecontents:"text-blue-500",type:"text",text:` ${t.block_data.block_num}`,hyperlink:`https://blocksights.info/#/blocks/${t.block_data.block_num}`}),e.jsx("br",{}),"Time since broadcast: ",c]})]})}),e.jsxs("div",{className:"col-span-2 mt-7",children:[e.jsxs(V,{children:[e.jsx(z,{asChild:!0,children:e.jsx(h,{variant:"outline",children:"View Operation"})}),e.jsxs(J,{className:"sm:max-w-[425px] bg-white",children:[e.jsxs(Q,{children:[e.jsx(Y,{children:"Operation JSON"}),e.jsx(X,{children:"Check out the contents of this operation"})]}),e.jsx("div",{className:"grid grid-cols-1",children:e.jsx("div",{className:"col-span-1",children:e.jsx(Z,{className:"h-72 rounded-md border",children:e.jsx("pre",{children:JSON.stringify(t.operation_history.op_object,null,2)})})})})]})]}),e.jsxs(V,{children:[e.jsx(z,{asChild:!0,children:e.jsx(h,{variant:"outline",className:"mt-2",children:"View all"})}),e.jsxs(J,{className:"sm:max-w-[425px] bg-white",children:[e.jsxs(Q,{children:[e.jsx(Y,{children:"Full operation contents"}),e.jsx(X,{children:"Exhaustive info regarding this operation"})]}),e.jsx("div",{className:"grid grid-cols-1",children:e.jsx("div",{className:"col-span-1",children:e.jsx(Z,{className:"h-72 rounded-md border",children:e.jsx("pre",{children:JSON.stringify(t,null,2)})})})})]})]})]})]})})})}}):e.jsx("p",{children:"No recent activity found"})}),e.jsx(P,{children:e.jsx(h,{onClick:()=>{k(),v(p+1)},children:"Refresh recent activity"})})]})})]})})}),e.jsx("div",{className:"grid grid-cols-1 mt-5",children:i&&i.username&&i.username.length?e.jsx(de,{usr:i}):null})]})}export{Oe as default};