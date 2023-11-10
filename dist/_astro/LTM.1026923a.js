import{$ as i,j as e,C as t,b as l,c,d as m,i as o,B as h,f as d}from"./CurrentUser.1e0e4221.js";import{r as a}from"./index.178a5b5e.js";import{D as u}from"./DeepLinkDialog.d4274afa.js";import"./common.e1bc7670.js";import"./ExternalLink.26cefe6b.js";function y(x){const s=a.useSyncExternalStore(i.subscribe,i.get,()=>!0),[n,r]=a.useState(!1);return e.jsx(e.Fragment,{children:e.jsxs("div",{className:"container mx-auto mt-5 mb-5",children:[e.jsx("div",{className:"grid grid-cols-1 gap-3",children:e.jsxs(t,{children:[e.jsxs(l,{children:[e.jsx(c,{children:"💱 LTM membership"}),e.jsx(m,{children:"Purchase a lifetime membership"})]}),e.jsxs(o,{children:[s&&s.id===s.referrer?e.jsxs(e.Fragment,{children:[e.jsx("h3",{children:"This account already has purchased a lifetime membership!"}),e.jsx("h4",{children:"Your active lifetime membership benefits:"}),e.jsxs("ul",{className:"ml-2 list-disc [&>li]:mt-2",children:[e.jsx("li",{children:"Receive an 80% rebate on all fees into your vesting balance."}),e.jsx("li",{children:"Passively earn a share of fees spent by your referred users."}),e.jsx("li",{children:"Now able to generate premium account names."})]})]}):null,s&&s.id!=s.referrer?e.jsxs(e.Fragment,{children:[e.jsx("h3",{children:"Want to purchase a lifetime membership for your account?"}),e.jsx("h4",{className:"text-lg",children:"Lifetime members receive the following benefits:"}),e.jsxs("ul",{className:"ml-2 list-disc [&>li]:mt-2 pl-3 text-sm",children:[e.jsx("li",{children:"They receive an 80% rebate on all spent fees, in a vesting balance form."}),e.jsx("li",{children:"They unlock the ability to passively earn a share of fees spent by users they refer."}),e.jsx("li",{children:"The ability to generate premium blockchain account names."})]}),e.jsx(h,{className:"mt-3",onClick:()=>{r(!0)},children:"Purchase LTM"})]}):null,n?e.jsx(u,{operationName:"account_upgrade",username:s.username,usrChain:s.chain,userID:s.id,dismissCallback:r,headerText:`Purchasing a lifetime membership for ${s.username}`,trxJSON:[{account_to_upgrade:s.id,upgrade_to_lifetime_member:!0,extensions:[]}]},`BuyLTM${s.id}`):null]})]})}),e.jsx("div",{className:"grid grid-cols-1 mt-5",children:s&&s.username&&s.username.length?e.jsx(d,{usr:s}):null})]})})}export{y as default};
