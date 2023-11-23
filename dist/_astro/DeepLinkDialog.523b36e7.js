import{u as e,v as f,k as D,_ as J,V as E,L,O as $,P as B,Q as C,S as F,I as d}from"./button.b901bdd6.js";import{r as o}from"./index.33c77f1d.js";import{w as R,z as _,q,s as A,r as M}from"./CurrentUser.f9848bfe.js";import{T as P,a as V,b as r,c as x,i as X}from"./common.bc86bc21.js";import{E as U}from"./ExternalLink.adef43a2.js";const j=o.forwardRef(({className:l,...t},a)=>e.jsx("textarea",{className:f("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",l),ref:a,...t}));j.displayName="Textarea";const I=o.forwardRef((l,t)=>o.createElement(D.label,J({},l,{ref:t,onMouseDown:a=>{var s;(s=l.onMouseDown)===null||s===void 0||s.call(l,a),!a.defaultPrevented&&a.detail>1&&a.preventDefault()}}))),g=I,Y=E("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"),h=o.forwardRef(({className:l,...t},a)=>e.jsx(g,{ref:a,className:f(Y(),l),...t}));h.displayName=g.displayName;let w=[];const[z]=R({fetcher:(...l)=>fetch(`http://localhost:8080/api/deeplink/${l[0]}/${l[1]}`,{method:"POST",body:JSON.stringify(w)}).then(async t=>{if(!t.ok)throw console.log("Failed to generate deeplink"),new Error("Failed to generate deeplink");let a;try{a=await t.json()}catch{throw console.log("Failed to parse JSON"),new Error("Failed to parse JSON")}return a}).then(t=>{if(t&&t.result){const a=q(A(t.result,!0)),s=M(a),i=JSON.parse(s);if(i.generatedDeepLink)return i.generatedDeepLink}throw new Error("No deep link generated")})});function Z(l){const{trxJSON:t,operationName:a,usrChain:s,headerText:i,dismissCallback:N,username:y,userID:T}=l,k=o.useMemo(()=>(w=t,z([s,a])),[s,a,t]),{data:m,loading:n,error:v}=_(k),[p,b]=o.useState(!1),S=()=>{p||(b(!0),setTimeout(()=>{b(!1)},1e4))},[c,u]=o.useState("object");return e.jsx(L,{open:!0,onOpenChange:O=>{N(O)},children:e.jsxs($,{className:"sm:max-w-[800px] bg-white",children:[e.jsxs(B,{children:[e.jsx(C,{children:n?e.jsx(e.Fragment,{children:"Generating deeplink..."}):e.jsx(e.Fragment,{children:i})}),e.jsxs(F,{children:["With the account: ",y," (",T,")",e.jsx("br",{}),n?null:e.jsxs(e.Fragment,{children:["Your Bitshares Beet operation is ready to broadcast!",e.jsx("br",{}),"Choose from the methods below to broadcast your transaction via the",e.jsx(U,{classnamecontents:"text-blue-500",type:"text",text:" Bitshares BEET multiwallet",hyperlink:"https://github.com/bitshares/beet"}),"."]}),v?e.jsx(e.Fragment,{children:"An error occurred, sorry. Please close this dialog and try again."}):null]})]}),e.jsxs(e.Fragment,{children:[e.jsx("hr",{className:"mt-3"}),e.jsx("div",{className:"grid grid-cols-1 gap-3",children:e.jsxs(P,{defaultValue:"object",className:"w-full",children:[e.jsxs(V,{className:"grid w-full grid-cols-3 gap-2",children:[c==="object"?e.jsx(r,{value:"object",children:"View TRX Object"},"activeTRXTab"):e.jsx(r,{value:"object",onClick:()=>u("object"),children:"View TRX Object"},"inactiveTRXTab"),c==="deeplink"?e.jsx(r,{value:"deeplink",children:"Raw Deeplink"},"activeDLTab"):e.jsx(r,{value:"deeplink",onClick:()=>u("deeplink"),children:"Raw Deeplink"},"inactiveDLTab"),c==="localJSON"?e.jsx(r,{value:"localJSON",className:"bg-muted",children:"Local JSON file"},"activeJSONTab"):e.jsx(r,{value:"localJSON",onClick:()=>u("localJSON"),children:"Local JSON file"},"inactiveJSONTab")]},`${c}_TabList`),e.jsxs(x,{value:"object",children:[e.jsxs("div",{className:"grid w-full gap-1.5 mb-3",children:[e.jsx(h,{className:"text-left",children:"Transaction object JSON"}),e.jsxs("span",{className:"text-left text-sm",children:["Operation type: ",a]}),e.jsx(j,{value:JSON.stringify(t,null,4),className:"min-h-[250px]",id:"trxJSON",readOnly:!0})]}),e.jsx(d,{onClick:()=>{X(JSON.stringify(t,null,4))},children:"Copy operation JSON"})]}),e.jsxs(x,{value:"deeplink",children:[e.jsx(h,{className:"text-left",children:"Using a deeplink to broadcast via the Beet multiwallet"}),e.jsxs("ol",{className:"ml-4",children:[e.jsxs("li",{type:"1",children:["Launch the BEET wallet and navigate to '",e.jsx("b",{children:"Raw Link"}),"' in the menu, the wallet has to remain unlocked for the duration of the broadcast."]}),e.jsxs("li",{type:"1",children:["From this page you can either allow all operations, or solely allow operation '",e.jsx("b",{children:a}),"' (then click save)."]}),e.jsx("li",{type:"1",children:"Once 'Ready for raw links' shows in Beet, then you can click the button below to proceed."}),e.jsx("li",{type:"1",children:"A BEET prompt will display, verify the contents, optionally request a Beet receipt, and then broadcast the transaction onto the blockchain."}),e.jsx("li",{type:"1",children:"You won't receive a confirmation in this window, but your operation will be processed within seconds on the blockchain."})]}),n?null:e.jsx("a",{href:`rawbeet://api?chain=${s==="bitshares"?"BTS":"BTS_TEST"}&request=${m}`,children:e.jsx(d,{className:"mt-4",children:"Trigger raw Beet deeplink"})})]}),e.jsxs(x,{value:"localJSON",children:[e.jsx(h,{className:"text-left",children:"Via local file upload - ready to proceed"}),e.jsxs("ol",{className:"ml-4",children:[e.jsxs("li",{type:"1",children:["Launch the BEET wallet and navigate to '",e.jsx("b",{children:"Local"}),"' in the menu."]}),e.jsxs("li",{type:"1",children:["At this page either allow all, or allow just operation '",e.jsx("b",{children:a}),"'."]}),e.jsx("li",{type:"1",children:"Once at the local upload page, click the button below to download the JSON file to your computer."}),e.jsx("li",{type:"1",children:"From the BEET Local page, upload the JSON file, a prompt should then appear."}),e.jsx("li",{type:"1",children:"Thoroughly verify the prompt's contents before approving any operation, also consider toggling the optional receipt for post broadcast analysis and verification purposes."})]}),!n&&p?e.jsx(d,{className:"mt-4",variant:"outline",disabled:!0,children:"Downloading..."}):null,!n&&!p?e.jsx("a",{href:`data:text/json;charset=utf-8,${m}`,download:`${a}.json`,target:"_blank",rel:"noreferrer",onClick:S,children:e.jsx(d,{className:"mt-4",children:"Download Beet operation JSON"})}):null]})]})})]})]})})}export{Z as D,h as L};
