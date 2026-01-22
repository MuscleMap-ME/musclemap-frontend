import{a as C,j as e}from"./react-vendor-D1NxaRNd.js";import{c as g}from"./recharts-vendor-BziRPEEi.js";const $=`
  /* Shimmer animation - gradient sweep left to right */
  @keyframes skeleton-shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  /* Wave animation - more pronounced gradient with smoother motion */
  @keyframes skeleton-wave {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  /* Pulse animation - opacity fade in/out */
  @keyframes skeleton-pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  /* Base skeleton styles */
  .skeleton-base {
    position: relative;
    overflow: hidden;
  }

  /* Shimmer variant - subtle gradient sweep */
  .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 0%,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 40%,
      var(--skeleton-highlight, rgba(255, 255, 255, 0.1)) 50%,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 60%,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 100%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
  }

  /* Wave variant - more visible gradient with longer sweep */
  .skeleton-wave {
    background: linear-gradient(
      90deg,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 0%,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 25%,
      var(--skeleton-highlight, rgba(255, 255, 255, 0.15)) 50%,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 75%,
      var(--skeleton-base, rgba(255, 255, 255, 0.05)) 100%
    );
    background-size: 200% 100%;
    animation: skeleton-wave 2s linear infinite;
  }

  /* Pulse variant - simple opacity animation */
  .skeleton-pulse {
    background: var(--skeleton-base, rgba(255, 255, 255, 0.08));
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  /* Speed modifiers */
  .skeleton-speed-slow.skeleton-shimmer { animation-duration: 2.5s; }
  .skeleton-speed-normal.skeleton-shimmer { animation-duration: 1.5s; }
  .skeleton-speed-fast.skeleton-shimmer { animation-duration: 0.8s; }

  .skeleton-speed-slow.skeleton-wave { animation-duration: 3s; }
  .skeleton-speed-normal.skeleton-wave { animation-duration: 2s; }
  .skeleton-speed-fast.skeleton-wave { animation-duration: 1.2s; }

  .skeleton-speed-slow.skeleton-pulse { animation-duration: 2.5s; }
  .skeleton-speed-normal.skeleton-pulse { animation-duration: 1.5s; }
  .skeleton-speed-fast.skeleton-pulse { animation-duration: 0.8s; }

  /* Delay classes for staggered animations */
  .skeleton-delay-0 { animation-delay: 0ms; }
  .skeleton-delay-1 { animation-delay: 100ms; }
  .skeleton-delay-2 { animation-delay: 200ms; }
  .skeleton-delay-3 { animation-delay: 300ms; }
  .skeleton-delay-4 { animation-delay: 400ms; }
  .skeleton-delay-5 { animation-delay: 500ms; }
  .skeleton-delay-6 { animation-delay: 600ms; }
  .skeleton-delay-7 { animation-delay: 700ms; }
  .skeleton-delay-8 { animation-delay: 800ms; }
  .skeleton-delay-9 { animation-delay: 900ms; }

  /* Static variant - no animation */
  .skeleton-static {
    background: var(--skeleton-base, rgba(255, 255, 255, 0.08));
  }

  /* Respect prefers-reduced-motion */
  @media (prefers-reduced-motion: reduce) {
    .skeleton-shimmer,
    .skeleton-wave,
    .skeleton-pulse {
      animation: none;
      background: var(--skeleton-base, rgba(255, 255, 255, 0.08));
    }
  }
`;let b=!1;function A(){if(b||typeof document>"u")return;const i=document.createElement("style");i.id="skeleton-shimmer-styles",i.textContent=$,document.head.appendChild(i),b=!0}const M={none:"0",xs:"var(--radius-xs, 2px)",sm:"var(--radius-sm, 4px)",md:"var(--radius-md, 8px)",lg:"var(--radius-lg, 12px)",xl:"var(--radius-xl, 16px)","2xl":"var(--radius-2xl, 24px)","3xl":"var(--radius-3xl, 32px)",full:"var(--radius-full, 9999px)"},V={xs:12,sm:14,md:16,lg:20,xl:24,"2xl":32};function l({variant:i="rectangular",animation:d="shimmer",shape:a,animate:t,shimmer:s,circle:o=!1,width:n,height:c,borderRadius:m,speed:j="normal",animationDelay:h,className:y,style:N,...v}){C.useEffect(()=>{A()},[]);let u=i;o?u="circular":a&&(u={rect:"rectangular",circle:"circular",text:"text"}[a]||a);let p=d;(s===!1||v.animate===!1)&&(p="none");let x;if(m!==void 0)x=M[m]||m;else switch(u){case"circular":x="var(--radius-full, 9999px)";break;case"text":x="var(--radius-sm, 4px)";break;case"rounded":x="var(--radius-lg, 12px)";break;case"rectangular":default:x="var(--radius-md, 8px)";break}let f=typeof n=="number"?`${n}px`:n,k=typeof c=="number"?`${c}px`:c;u==="text"&&(f=f||"100%",k=k||"16px"),u==="circular"&&n&&!c&&(k=f);const z=p!=="none"?`skeleton-${p}`:"skeleton-static",S=p!=="none"?`skeleton-speed-${j}`:"",R=p!=="none"&&h!==void 0?`skeleton-delay-${Math.min(Math.max(0,h),9)}`:"";return e.jsx("div",{className:g("skeleton-base",z,S,R,y),style:{width:f,height:k,borderRadius:x,flexShrink:0,...N},"aria-hidden":"true",role:"presentation",...v})}function r({width:i="100%",size:d="md",lines:a=1,variant:t="shimmer",speed:s="normal",animationDelay:o,className:n,...c}){const m=V[d]||d;return a>1?e.jsx("div",{className:g("space-y-2",n),"aria-hidden":"true",role:"presentation",children:Array.from({length:a}).map((j,h)=>e.jsx(l,{shape:"text",variant:t,speed:s,width:h===a-1?"75%":i,height:m,animationDelay:o!==void 0?o+h:void 0,...c},h))}):e.jsx(l,{shape:"text",variant:t,speed:s,width:i,height:m,animationDelay:o,className:n,...c})}function B({size:i=48,variant:d="shimmer",speed:a="normal",animationDelay:t,className:s,...o}){const n=typeof i=="number"?i:parseInt(i,10)||48;return e.jsx(l,{shape:"circle",variant:d,speed:a,width:n,height:n,animationDelay:t,className:s,...o})}function w({width:i=64,variant:d="shimmer",speed:a="normal",animationDelay:t,className:s,...o}){return e.jsx(l,{shape:"rect",variant:d,speed:a,width:i,height:22,borderRadius:"full",animationDelay:t,className:s,...o})}function F({variant:i="default",hasImage:d=!1,hasActions:a=!1,animation:t="shimmer",animationDelay:s=0,imageAspect:o="16/9",className:n="",...c}){return e.jsxs("div",{className:g("glass rounded-xl overflow-hidden",n),"aria-hidden":"true",role:"presentation",...c,children:[d&&e.jsx(l,{width:"100%",height:"auto",variant:"rectangular",borderRadius:"none",animation:t,animationDelay:s,style:{aspectRatio:o}}),e.jsxs("div",{className:"p-4 space-y-3",children:[i==="default"&&e.jsxs(e.Fragment,{children:[e.jsx(r,{width:"75%",size:"md",animation:t,animationDelay:s+1}),e.jsx(r,{width:"100%",size:"sm",animation:t,animationDelay:s+2}),e.jsx(r,{width:"66%",size:"sm",animation:t,animationDelay:s+3})]}),i==="stat"&&e.jsxs(e.Fragment,{children:[e.jsx(r,{width:96,size:"xs",animation:t,animationDelay:s+1}),e.jsx(l,{width:80,height:40,variant:"rounded",animation:t,animationDelay:s+2})]}),i==="user"&&e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(B,{size:48,animation:t,animationDelay:s}),e.jsxs("div",{className:"flex-1 space-y-2",children:[e.jsx(r,{width:128,size:"md",animation:t,animationDelay:s+1}),e.jsx(r,{width:96,size:"xs",animation:t,animationDelay:s+2})]})]}),i==="exercise"&&e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx(l,{width:64,height:64,variant:"rounded",animation:t,animationDelay:s}),e.jsxs("div",{className:"flex-1 space-y-2",children:[e.jsx(r,{width:160,size:"md",animation:t,animationDelay:s+1}),e.jsx(r,{width:112,size:"sm",animation:t,animationDelay:s+2}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(w,{width:56,animation:t,animationDelay:s+3}),e.jsx(w,{width:72,animation:t,animationDelay:s+4})]})]})]}),i==="compact"&&e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(l,{width:40,height:40,variant:"rounded",animation:t,animationDelay:s}),e.jsxs("div",{className:"flex-1 space-y-1",children:[e.jsx(r,{width:"60%",size:"sm",animation:t,animationDelay:s+1}),e.jsx(r,{width:"40%",size:"xs",animation:t,animationDelay:s+2})]})]}),i==="feature"&&e.jsxs("div",{className:"flex flex-col items-center text-center space-y-4",children:[e.jsx(l,{width:64,height:64,variant:"rounded",animation:t,animationDelay:s}),e.jsxs("div",{className:"space-y-2 w-full",children:[e.jsx(r,{width:"60%",size:"lg",className:"mx-auto",animation:t,animationDelay:s+1}),e.jsx(r,{width:"80%",size:"sm",className:"mx-auto",animation:t,animationDelay:s+2})]}),e.jsx(l,{width:120,height:40,variant:"rounded",animation:t,animationDelay:s+3})]}),a&&e.jsxs("div",{className:"flex gap-2 pt-2 border-t border-[var(--border-subtle)]",children:[e.jsx(l,{width:"100%",height:32,variant:"rounded",animation:t,animationDelay:s+5}),e.jsx(l,{width:32,height:32,variant:"rounded",animation:t,animationDelay:s+6})]})]})]})}function E({variant:i="default",hasTrend:d=!1,animationDelay:a=0,className:t,...s}){return e.jsxs("div",{className:g("glass p-4 rounded-xl",t),"aria-hidden":"true",role:"presentation",...s,children:[i==="default"&&e.jsxs("div",{className:"space-y-2",children:[e.jsx(r,{width:64,size:"xs",animationDelay:a}),e.jsx(l,{width:48,height:28,borderRadius:"md",animationDelay:a+1}),d&&e.jsxs("div",{className:"flex items-center gap-1 pt-1",children:[e.jsx(l,{width:32,height:14,borderRadius:"full",animationDelay:a+2}),e.jsx(r,{width:40,size:"xs",animationDelay:a+3})]})]}),i==="detailed"&&e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(r,{width:80,size:"xs",animationDelay:a}),e.jsx(l,{width:20,height:20,borderRadius:"sm",animationDelay:a+1})]}),e.jsx(l,{width:72,height:36,borderRadius:"md",animationDelay:a+2}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(l,{width:40,height:16,borderRadius:"full",animationDelay:a+3}),e.jsx(r,{width:48,size:"xs",animationDelay:a+4})]})]}),i==="compact"&&e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(r,{width:56,size:"xs",animationDelay:a}),e.jsx(l,{width:40,height:24,borderRadius:"md",animationDelay:a+1})]}),i==="progress"&&e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(r,{width:72,size:"sm",animationDelay:a}),e.jsx(r,{width:32,size:"xs",animationDelay:a+1})]}),e.jsx(l,{width:"100%",height:8,borderRadius:"full",animationDelay:a+2})]}),i==="large"&&e.jsxs("div",{className:"text-center space-y-3",children:[e.jsx(l,{width:64,height:48,borderRadius:"lg",className:"mx-auto",animationDelay:a}),e.jsx(r,{width:80,size:"sm",className:"mx-auto",animationDelay:a+1})]})]})}function P({count:i=4,columns:d=2,variant:a="default",hasTrend:t=!1,className:s,...o}){const n=d===2?"grid-cols-2":d===3?"grid-cols-2 md:grid-cols-3":d===4?"grid-cols-2 md:grid-cols-4":`grid-cols-${d}`;return e.jsx("div",{className:g("grid gap-4",n,s),"aria-hidden":"true",role:"presentation",...o,children:Array.from({length:i}).map((c,m)=>e.jsx(E,{variant:a,hasTrend:t,animationDelay:m%10},m))})}export{F as C,P as S};
