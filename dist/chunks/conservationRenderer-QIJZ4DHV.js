var S=(v,e)=>{let l=document.getElementById(v);if(!l)return;l.innerHTML="";let o=e.additional_metrics;if(!o||!o.alignedSeq1||e.alignment_length===0){l.innerHTML='<div class="text-gray-500 text-sm italic text-center py-4">Insufficient alignment data for graphical summary.</div>';return}let p=o.alignedSeq1||"",y=o.alignedSeq2||"",w=p.length,a=p.replace(/-/g,"").length;if(a===0)return;let u=[],m=[],f=[],x=0;for(let t=0;t<w;t++){let n=p[t],r=y[t],d=n==="-",b=r==="-";if(!d){let i=x/a*100,g=1/a*100;b?f.push({pct:i,w:g}):n===r?u.push({pct:i,w:g}):m.push({pct:i,w:g}),x++}if(d&&!b){let i=x/a*100;f.push({pct:i,w:1/a*100})}}let s="#eab308";e.alignment_score>=200?s="#92400e":e.alignment_score>=80?s="#7c3aed":e.alignment_score>=50?s="#16a34a":e.alignment_score>=40&&(s="#f97316");let c=6,h="";for(let t=0;t<=c;t++){let n=t/c*100,r=t===0?1:Math.floor(t/c*a),d=t===0?"left:0; transform:none;":t===c?"right:0; left:auto; transform:none;":`left:${n}%; transform:translateX(-50%);`;h+=`
            <div class="absolute top-0 h-[5px] w-px bg-gray-500 dark:bg-gray-400" style="left:${n}%"></div>
            <div class="absolute top-[6px] text-[9px] text-gray-600 dark:text-gray-400 font-mono leading-none" style="${d}">${r}</div>
        `}let k=f.map(t=>`<div class="absolute top-0 h-full" style="left:${t.pct.toFixed(4)}%;width:calc(${t.w.toFixed(4)}% + 0.5px);background:#6b7280;opacity:0.6;z-index:2;"></div>`).join(""),$=m.map(t=>`<div class="absolute top-0 h-full" style="left:${t.pct.toFixed(4)}%;width:calc(${t.w.toFixed(4)}% + 0.5px);background:#ef4444;opacity:0.9;z-index:3;"></div>`).join(""),M=u.map(t=>`<div class="absolute top-0 h-full" style="left:${t.pct.toFixed(4)}%;width:calc(${t.w.toFixed(4)}% + 0.5px);background:${s};opacity:1;z-index:1;"></div>`).join("");l.innerHTML=`
        <div class="w-full max-w-3xl mx-auto flex flex-col items-center gap-1 px-2 py-2">
            <div class="flex items-center gap-2 mb-2 w-full justify-center">
                <i class="fa-solid fa-chart-gantt text-muted text-base"></i>
                <span class="font-bold text-[13px] text-black dark:text-gray-200 text-center tracking-tight">
                    Distribution of Top BioAlign Match \xB7 1 Subject Sequence
                </span>
            </div>
            <div class="relative w-full h-[16px] rounded-sm overflow-hidden border border-blue-500"
                 style="background:linear-gradient(90deg,#3b82f6,#60a5fa);">
                <div class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white tracking-wider select-none">
                    Query (Alpha Seq)
                </div>
            </div>
            <div class="relative w-full h-[22px] mt-[2px]">
                <div class="absolute top-0 left-0 w-full h-px bg-gray-400 dark:bg-gray-600"></div>
                ${h}
            </div>
            <div class="relative w-full h-[18px] mt-1">
                <div class="absolute top-[3px] h-[12px] w-full rounded-[2px] overflow-hidden" style="background:var(--surface);">
                     ${M}
                     ${k}
                     ${$}
                </div>
            </div>
            <div class="flex flex-wrap gap-x-5 gap-y-1 justify-center text-[10px] font-mono text-muted mt-3">
                <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm" style="background:${s}"></span> Match (score-coloured)</span>
                <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm bg-red-500"></span> Mismatch</span>
                <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm" style="background:#6b7280;opacity:0.6"></span> Gap</span>
            </div>
        </div>
    `};export{S as renderGraphicSummary};
