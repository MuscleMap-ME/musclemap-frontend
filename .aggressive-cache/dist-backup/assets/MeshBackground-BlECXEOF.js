import{j as a,r as l}from"./react-vendor-D847gc3Q.js";import{c as i}from"./recharts-vendor-CxtoZpzE.js";const o=()=>{const[r,t]=l.useState(!1);return l.useEffect(()=>{const s=window.matchMedia("(prefers-reduced-motion: reduce)");t(s.matches);const e=n=>t(n.matches);return s.addEventListener("change",e),()=>s.removeEventListener("change",e)},[]),r},d=({className:r,intensity:t="medium"})=>{const s={subtle:{blue:"rgba(0, 102, 255, 0.05)",purple:"rgba(139, 92, 246, 0.04)",pulse:"rgba(255, 51, 102, 0.03)"},medium:{blue:"rgba(0, 102, 255, 0.08)",purple:"rgba(139, 92, 246, 0.06)",pulse:"rgba(255, 51, 102, 0.04)"},strong:{blue:"rgba(0, 102, 255, 0.12)",purple:"rgba(139, 92, 246, 0.10)",pulse:"rgba(255, 51, 102, 0.08)"}},e=s[t]||s.medium;return a.jsx("div",{className:i("fixed inset-0 -z-10",r),style:{backgroundColor:"var(--void-base)",backgroundImage:`
          radial-gradient(ellipse at 0% 0%, ${e.blue} 0%, transparent 50%),
          radial-gradient(ellipse at 100% 0%, ${e.purple} 0%, transparent 40%),
          radial-gradient(ellipse at 100% 100%, ${e.pulse} 0%, transparent 50%),
          radial-gradient(ellipse at 0% 100%, ${e.blue} 0%, transparent 40%)
        `}})},m=({className:r,intensity:t="medium"})=>{if(o())return a.jsx(d,{className:r,intensity:t});const n={subtle:.6,medium:1,strong:1.4}[t]||1;return a.jsxs("div",{className:i("fixed inset-0 -z-10 overflow-hidden",r),children:[a.jsx("div",{className:"absolute inset-0 bg-[var(--void-base)]"}),a.jsx("div",{className:"absolute w-[800px] h-[800px] rounded-full blur-3xl animate-mesh-float-1",style:{background:`radial-gradient(circle, rgba(0, 102, 255, ${.15*n}) 0%, transparent 70%)`,left:"-10%",top:"-10%"}}),a.jsx("div",{className:"absolute w-[600px] h-[600px] rounded-full blur-3xl animate-mesh-float-2",style:{background:`radial-gradient(circle, rgba(139, 92, 246, ${.12*n}) 0%, transparent 70%)`,right:"-5%",top:"10%"}}),a.jsx("div",{className:"absolute w-[500px] h-[500px] rounded-full blur-3xl animate-mesh-float-3",style:{background:`radial-gradient(circle, rgba(255, 51, 102, ${.08*n}) 0%, transparent 70%)`,right:"20%",bottom:"10%"}}),a.jsx("style",{children:`
        @keyframes mesh-float-1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(5%, 10%) scale(1.1);
          }
          66% {
            transform: translate(-5%, 5%) scale(0.95);
          }
        }
        @keyframes mesh-float-2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-8%, 5%) scale(0.9);
          }
          66% {
            transform: translate(5%, -8%) scale(1.05);
          }
        }
        @keyframes mesh-float-3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(10%, -5%) scale(1.1);
          }
          66% {
            transform: translate(-10%, 8%) scale(0.95);
          }
        }
        .animate-mesh-float-1 {
          animation: mesh-float-1 25s ease-in-out infinite;
        }
        .animate-mesh-float-2 {
          animation: mesh-float-2 30s ease-in-out infinite;
        }
        .animate-mesh-float-3 {
          animation: mesh-float-3 20s ease-in-out infinite;
        }
      `})]})},f=m;export{f as M,d as a};
