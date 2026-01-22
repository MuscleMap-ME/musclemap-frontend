import{j as a}from"./react-vendor-D1NxaRNd.js";import{c as o}from"./recharts-vendor-BziRPEEi.js";import{m as u}from"./index-DgKBa9XG.js";const g=({value:d=0,max:b=100,variant:e="brand",size:s="md",showValue:i=!1,animated:n=!0,className:c})=>{const r=Math.min(100,Math.max(0,d/b*100)),t={sm:"h-1",md:"h-2",lg:"h-3",xl:"h-4"},l={brand:"from-[var(--brand-blue-500)] to-[var(--brand-blue-400)]",pulse:"from-[var(--brand-pulse-500)] to-[var(--brand-pulse-400)]",success:"from-emerald-500 to-emerald-400",warning:"from-amber-500 to-amber-400"},m={brand:"shadow-[0_0_10px_rgba(0,102,255,0.4)]",pulse:"shadow-[0_0_10px_rgba(255,51,102,0.4)]",success:"shadow-[0_0_10px_rgba(34,197,94,0.4)]",warning:"shadow-[0_0_10px_rgba(245,158,11,0.4)]"};return a.jsxs("div",{className:o("relative",c),children:[a.jsx("div",{className:o("progress-glass w-full overflow-hidden",t[s]),children:a.jsx(u.div,{className:o("h-full rounded-full bg-gradient-to-r",l[e],m[e],n&&"progress-fill-liquid"),initial:{width:0},animate:{width:`${r}%`},transition:{type:"spring",stiffness:100,damping:20,duration:.8}})}),i&&a.jsxs("span",{className:"absolute right-0 -top-6 text-xs text-[var(--text-secondary)] font-medium",children:[Math.round(r),"%"]})]})},v=({value:d=0,max:b=100,size:e=64,strokeWidth:s=4,variant:i="brand",showValue:n=!1,className:c})=>{const r=Math.min(100,Math.max(0,d/b*100)),t=(e-s)/2,l=t*2*Math.PI,m=l-r/100*l,h={brand:"var(--brand-blue-500)",pulse:"var(--brand-pulse-500)",success:"#22c55e",warning:"#f59e0b"};return a.jsxs("div",{className:o("relative inline-flex items-center justify-center",c),style:{width:e,height:e},children:[a.jsxs("svg",{width:e,height:e,className:"transform -rotate-90",children:[a.jsx("circle",{cx:e/2,cy:e/2,r:t,fill:"none",stroke:"var(--glass-white-10)",strokeWidth:s}),a.jsx(u.circle,{cx:e/2,cy:e/2,r:t,fill:"none",stroke:h[i],strokeWidth:s,strokeLinecap:"round",strokeDasharray:l,initial:{strokeDashoffset:l},animate:{strokeDashoffset:m},transition:{type:"spring",stiffness:100,damping:20},style:{filter:`drop-shadow(0 0 6px ${h[i]})`}})]}),n&&a.jsx("span",{className:"absolute text-sm font-semibold text-[var(--text-primary)]",children:Math.round(r)})]})},w=({value:d=0,max:b=100,height:e=120,width:s=40,variant:i="brand",label:n,className:c})=>{const r=Math.min(100,Math.max(0,d/b*100)),t={brand:"from-[var(--brand-blue-600)] via-[var(--brand-blue-500)] to-[var(--brand-blue-400)]",pulse:"from-[var(--brand-pulse-600)] via-[var(--brand-pulse-500)] to-[var(--brand-pulse-400)]",success:"from-emerald-600 via-emerald-500 to-emerald-400",warning:"from-amber-600 via-amber-500 to-amber-400"};return a.jsxs("div",{className:o("flex flex-col items-center gap-2",c),children:[a.jsxs("div",{className:"relative rounded-full overflow-hidden bg-[var(--glass-white-5)] border border-[var(--border-default)]",style:{width:s,height:e},children:[a.jsxs(u.div,{className:o("absolute bottom-0 left-0 right-0 bg-gradient-to-t",t[i]),initial:{height:0},animate:{height:`${r}%`},transition:{type:"spring",stiffness:80,damping:20},children:[a.jsx("div",{className:"absolute top-0 left-0 right-0 h-2 bg-white/30 blur-sm"}),a.jsxs("div",{className:"absolute inset-0 overflow-hidden",children:[a.jsx("div",{className:"bubble-1"}),a.jsx("div",{className:"bubble-2"})]})]}),a.jsx("div",{className:"absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-transparent"})]}),n&&a.jsx("span",{className:"text-xs font-medium text-[var(--text-tertiary)]",children:n}),a.jsx("style",{children:`
        .bubble-1, .bubble-2 {
          position: absolute;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          animation: bubble-rise 3s ease-in-out infinite;
        }
        .bubble-1 {
          width: 4px;
          height: 4px;
          left: 20%;
          animation-delay: 0s;
        }
        .bubble-2 {
          width: 3px;
          height: 3px;
          left: 60%;
          animation-delay: 1.5s;
        }
        @keyframes bubble-rise {
          0%, 100% {
            bottom: 10%;
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            bottom: 90%;
            opacity: 0;
          }
        }
      `})]})};export{v as G,g as a,w as b};
