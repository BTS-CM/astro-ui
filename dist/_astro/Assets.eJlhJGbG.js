import{n as c}from"./Init.AGQQj0ZE.js";import{P as l,Q as i,S as d}from"./button.cJSehY-U.js";const[S]=c({fetcher:async(r,o)=>{const e=o.replace("1.3.","2.3."),t=await fetch(`http://localhost:8080/cache/dynamic/${r}/${e}`,{method:"GET"});if(!t.ok){console.log(`Failed to fetch ${e} dynamic data`);return}const s=await t.json();if(s&&s.result){const a=l(i(s.result,!0)),n=d(a);return JSON.parse(n)}}}),[y]=c({fetcher:async(r,o,e,t,s,a)=>{let n;try{n=await fetch(`http://localhost:8080/api/fullSmartcoin/${r}`,{method:"POST",body:JSON.stringify([o,e,t,s,a])})}catch{console.log("Failed to fetch smartcoin data");return}if(!n.ok){console.log("Failed to fetch bitasset data");return}const f=await n.json();if(f&&f.result){const u=l(i(f.result,!0)),h=d(u);return JSON.parse(h)}}}),[O]=c({fetcher:async(r,o)=>{const e=await fetch(`http://localhost:8080/api/collateralBids/${r}`,{method:"POST",body:JSON.stringify([o])});if(!e.ok){console.log("Failed to fetch collateral bids");return}const t=await e.json();if(t&&t.result){const s=l(i(t.result,!0)),a=d(s);return JSON.parse(a)}}}),[g]=c({fetcher:async(r,o,e,t)=>{const s=await fetch(`http://localhost:8080/api/getObjects/${r}`,{method:"POST",body:JSON.stringify([o,e,t])});if(!s.ok){console.log("Failed to fetch smartcoin data");return}const a=await s.json();if(a&&a.result&&a.result.length){const n=l(i(a.result,!0));return JSON.parse(d(n))}}}),[w]=c({fetcher:async(r,o)=>{const e=await fetch(`http://localhost:8080/api/getObjects/${r}`,{method:"POST",body:JSON.stringify([o])});if(!e.ok){console.log("Failed to fetch bitasset data");return}const t=await e.json();if(t&&t.result&&t.result.length){const s=l(i(t.result,!0));return JSON.parse(d(s))[0]}}}),[J]=c({fetcher:async(r,o)=>{const e=await fetch(`http://localhost:8080/cache/asset/${r}/${o}`,{method:"GET"});if(!e.ok){console.log(`Failed to fetch asset: ${o}`);return}const t=await e.json();if(t&&t.result){const s=l(i(t.result,!0));return JSON.parse(d(s))}}});export{O as a,y as b,g as c,S as d,w as e,J as f};
