import{r as x}from"./index.ebYJtNMn.js";import{a9 as m,aa as Te,ab as ve,ac as Y,P as q,Q as H,S as Q}from"./button.cJSehY-U.js";import{$ as z,e as W,i as pe,s as M}from"./hover-card.FBvz_Lnw.js";let G=0,X=[];function ye(){return G+=1,()=>{if(G-=1,G===0){let e=X;X=[];for(let t of e)t()}}}function Ee(e,t,s){let n=new Set([...t,void 0]);return e.listen((h,c)=>{n.has(c)&&s(h,c)})}let _e=()=>({emit(e,...t){let s=this.events[e]||[];for(let n=0,h=s.length;n<h;n++)s[n](...t)},events:{},on(e,t){return this.events[e]?.push(t)||(this.events[e]=[t]),()=>{this.events[e]=this.events[e]?.filter(s=>t!==s)}}});const Ce=({cache:e=new Map,fetcher:t,...s}={})=>{const n=_e();let h=!0;ne("visibilitychange",()=>{h=!document.hidden,h&&n.emit(ee)}),ne("online",()=>n.emit(te));const c=new Map,l=new Map,b=new Map;let T={};const f=async([a,S],o,r,p)=>{var _;if(!h)return;const i=g=>{o.key===a&&(o.set(g),n.emit(I,a,g,!0))},d=()=>{i({...o.value,...re,promise:b.get(a)})},{dedupeTime:v=4e3,fetcher:O}={...r,...T},y=ae();if(b.has(a)){o.value.loading||d();return}if(!p){const g=e.get(a);g&&o.value.data!==g&&i({data:g,...$});const u=l.get(a);if(u&&u+v>y)return}const P=ye();try{const g=O(...S);l.set(a,y),b.set(a,g),d();const u=await g;e.set(a,u),i({data:u,...$}),l.set(a,ae())}catch(g){(_=r.onError)==null||_.call(r,g),i({data:o.value.data,error:g,...$})}finally{P(),b.delete(a)}},U=(a,{fetcher:S=t,...o}={})=>{const r=m({...$}),p={...s,...o,fetcher:S};r._=fe,r.invalidate=()=>{const{key:u}=r;u&&B(u)},r.mutate=u=>{const{key:C}=r;C&&F(C,u)};let _,i,d,v,O,y=[];Te(r,()=>{const u=!_;[O,_]=we(a),v=O.subscribe(k=>{if(k){const[w,K]=k;r.key=w,f([w,K],r,p),i=w,d=K}else r.key=i=d=void 0,r.set({...$})});const C=O.get();C&&([i,d]=C,u&&P());const{refetchInterval:V=0,refetchOnFocus:me,refetchOnReconnect:Se}=p,N=()=>{i&&f([i,d],r,p)};V>0&&c.set(a,setInterval(N,V)),me&&y.push(n.on(ee,N)),Se&&y.push(n.on(te,N)),y.push(n.on(se,k=>{i&&D(i,k)&&f([i,d],r,p,!0)}),n.on(I,(k,w,K)=>{i&&D(i,k)&&r.value!==w&&r.value.data!==w&&r.set(K?w:{data:w,...$})}))});const P=()=>{i&&d&&f([i,d],r,p)},g=r.listen;return r.listen=u=>{const C=g(u);return u(r.value),P(),C},ve(r,()=>{r.value={...$},_?.(),y.forEach(C=>C()),y=[],v?.();const u=c.get(a);u&&clearInterval(u)}),r},A=a=>{e.delete(a),l.delete(a)},E=(a,S)=>{for(const o of e.keys())D(o,a)&&S(o)},B=a=>{E(a,A),n.emit(se,a)},F=(a,S)=>{E(a,o=>{S===void 0?A(o):e.set(o,S)}),n.emit(I,a,S)};function ge(a){const S=async r=>{var p;const _=T.fetcher??a,i=[];try{o.set({error:void 0,data:void 0,mutate:S,...re});const d=await _({data:r,invalidate:v=>{i.push(v)},getCacheUpdater:(v,O=!0)=>[y=>{F(v,y),O&&i.push(v)},e.get(v)]});return o.setKey("data",d),d}catch(d){(p=s?.onError)==null||p.call(s,d),o.setKey("error",d)}finally{o.setKey("loading",!1),i.forEach(B)}},o=m({mutate:S,...$});return o.mutate=S,o}return[U,ge,{__unsafeOverruleSettings:a=>{console.warn("You should only use __unsafeOverruleSettings in test environment"),T=a},invalidateKeys:B,mutateCache:F}]};function Z(e){return typeof e=="string"||typeof e=="number"||e===!0}const we=e=>{if(Z(e))return[Y([""+e,[e]]),()=>{}];let t=Y(null),s=[];const n=()=>{s.some(c=>c==null||c===!1)?t.set(null):t.set([s.join(""),s])},h=[];for(let c=0;c<e.length;c++){const l=e[c];Z(l)?s.push(l):h.push(l.subscribe(b=>{s[c]=$e(l)?l.value&&"data"in l.value?l.key:null:b,n()}))}return n(),[t,()=>h.forEach(c=>c())]};function $e(e){return e._===fe}const ee=1,te=2,se=3,I=4,ne=(e,t)=>{typeof window>"u"||addEventListener(e,t)},D=(e,t)=>Array.isArray(t)?t.includes(e):typeof t=="function"?t(e):e===t,ae=()=>new Date().getTime(),fe=Symbol(),re={loading:!0},$={loading:!1};function Oe(e,t={}){let s=x.useCallback(h=>t.keys?Ee(e,t.keys,h):e.listen(h),[t.keys,e]),n=e.get.bind(e);return x.useSyncExternalStore(s,n,n)}const L=m([]),oe=m([]);function ie(e){return e.map(t=>({id:`1.3.${t.id}`,symbol:t.s,precision:t.p,issuer:`1.2.${t.i}`,market_fee_percent:t.mfp,max_market_fee:t.mmf,max_supply:t.ms}))}function ke(e){const t=L.get();(!t||!t.length)&&L.set(ie(e.bitshares));const s=oe.get();(!s||!s.length)&&oe.set(ie(e.bitshares_testnet))}const R=m([]),ce=m([]);function le(e){return e.map(t=>({id:`1.19.${t.id}`,asset_a_id:`1.3.${t.a}`,asset_a_symbol:t.as,asset_b_id:`1.3.${t.b}`,asset_b_symbol:t.bs,share_asset_symbol:t.sa,balance_a:t.ba,balance_b:t.bb,taker_fee_percent:t.tfp}))}function Ae(e){const t=R.get();if(!t||!t.length){const n=le(e.bitshares);R.set(n)}const s=ce.get();if(!s||!s.length){const n=le(e.bitshares_testnet);ce.set(n)}}const j=m([]),ue=m([]);function Pe(e){const t=j.get();if(!t||!t.length){const n=e.bitshares;j.set(n)}const s=ue.get();if(!s||!s.length){const n=e.bitshares_testnet;ue.set(n)}}const J=m([]),he=m([]);function Ke(e){const t=J.get();(!t||!t.length)&&J.set(e.bitshares);const s=he.get();(!s||!s.length)&&he.set(e.bitshares_testnet)}const de=m(null),xe=m(null);function Ue(e){de.set(e.bitshares),xe.set(e.bitshares_testnet)}const be=m([]),Be=m([]);function Fe(e){be.set(e.bitshares),Be.set(e.bitshares_testnet)}const[Ne]=Ce({fetcher:async e=>{const t=e?e.split(","):[],s=[t.includes("marketSearch")&&!J.get().length?fetch("http://localhost:8080/cache/marketSearch/bitshares",{method:"GET"}):null,t.includes("assets")&&!L.get().length?fetch("http://localhost:8080/cache/minAssets/bitshares",{method:"GET"}):null,t.includes("pools")&&!R.get().length?fetch("http://localhost:8080/cache/minPools/bitshares",{method:"GET"}):null,t.includes("globalParams")&&!de.get()?fetch("http://localhost:8080/cache/feeSchedule/bitshares",{method:"GET"}):null,t.includes("offers")&&!j.get().length?fetch("http://localhost:8080/cache/offers/bitshares",{method:"GET"}):null,t.includes("bitAssetData")&&!be.get().length?fetch("http://localhost:8080/cache/bitassets/bitshares",{method:"GET"}):null];return await Promise.all(s)}});async function Le(e,t){const s=x.useMemo(()=>Ne([t.join(",")]),[e]),{data:n,loading:h,error:c}=Oe(s);if(x.useEffect(()=>{async function l(){await Promise.all(n.map(async(b,T)=>{if(!b)return;if(!b.ok){console.log("Failed to fetch data");return}const f=await b.json();if(!f||!f.result){console.log("Failed to fetch data");return}const U=q(H(f.result.bitshares,!0)),A=q(H(f.result.bitshares_testnet,!0)),E={bitshares:JSON.parse(Q(U)),bitshares_testnet:JSON.parse(Q(A))};switch(T){case 0:Ke(E);break;case 1:ke(E);break;case 2:Ae(E);break;case 3:Ue(E);break;case 4:Pe(E);break;case 5:Fe(E);break}}))}n&&!h&&!c&&l()},[n,h,c]),!z||!z.get().username){const l=W.get().users,b=W.get().lastAccount,T=l.find(f=>f.chain===e);if(!l||!l.length||!T)pe("null-account","1.2.3","1.2.3","bitshares"),M("null-account","1.2.3","1.2.3","bitshares");else if(b&&b.length){const f=b[0];M(f.username,f.id,f.referrer,f.chain)}else T&&M(T.username,T.id,T.referrer,T.chain)}}export{be as $,Be as a,J as b,he as c,de as d,xe as e,L as f,oe as g,j as h,ue as i,R as j,ce as k,Oe as l,Ce as n,Le as u};