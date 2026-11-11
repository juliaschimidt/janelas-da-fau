const I={
 lapis:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20l2-6L17 3l4 4L10 18z M6 14l4 4"/></svg>',
 pincel:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 3l-9 10 M11 13c-3-1-6 1-6 4 0 2-1 3-2 4 5 0 9-1 10-5z"/></svg>',
 spray:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 9h7v12H8z M10 9V6h3v3"/><g fill="currentColor" stroke="none"><rect x="17" y="3" width="2" height="2"/><rect x="20" y="6" width="2" height="2"/><rect x="17" y="8" width="2" height="2"/><rect x="21" y="1" width="2" height="2"/></g></svg>',
 giz:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 18 q4 -8 8 -2 t9 -8" stroke-width="5" stroke-linecap="round"/></svg>',
 estrela:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z"/></svg>',
 termo:'<svg width="11" height="16" viewBox="0 0 10 14"><path d="M3 1h4v8a3 3 0 1 1-4 0z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="5" cy="10.5" r="1.8" fill="#ff4a2b"/></svg>',
 vento:'<svg width="16" height="14" viewBox="0 0 14 12"><path d="M1 4h8a2 2 0 1 0-2-2M1 8h10a2 2 0 1 1-2 2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
 gota:'<svg width="11" height="15" viewBox="0 0 10 13"><path d="M5 1 C 8 5 9 7 9 8.5 a4 4 0 0 1-8 0 C1 7 2 5 5 1z" fill="#9fd3ff" stroke="currentColor" stroke-width="1.4"/></svg>',
 borracha:'<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#141414" stroke-width="2"><path d="M3 13l8-9 6 6-6 7H6z M8 8l6 6"/></svg>',
 desfazer:'<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#141414" stroke-width="2"><path d="M7 4L3 8l4 4 M3 8h9a5 5 0 0 1 0 10H8"/></svg>',
 lixo:'<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#141414" stroke-width="2"><path d="M3 5h14 M8 5V3h4v2 M5 5l1 12h8l1-12"/></svg>',
 seta:'<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#f2ecdf" stroke-width="3"><path d="M3 15L15 3 M6 3h9v9"/></svg>',
 wig:(w,c)=>`<svg width="${w}" height="14" viewBox="0 0 50 14" preserveAspectRatio="none"><path d="M1 9 q4 -7 8 0 t8 0 t8 0 t8 0 t8 0" fill="none" stroke="${c}55" stroke-width="2"/><path d="M1 7 q4 -7 8 0 t8 0 t8 0 t8 0 t8 0" fill="none" stroke="${c}" stroke-width="2"/></svg>`,
 sw3:(s)=>['r','o','y'].map(k=>`<span class="sw" style="width:${s}px;height:${s}px;background:var(--${k})"></span>`).join(''),
};
const BR=[['lapis','Lápis'],['pincel','Pincel'],['spray','Spray'],['giz','Giz'],['estrela','Estrela']];
function domos(n){return '<i class="domo"></i>'.repeat(n)}
document.querySelectorAll('[data-i]').forEach(e=>e.innerHTML=I[e.dataset.i]);
I.lv=(n,w)=>{const a=[1.5,3.5,6];return `<span style="display:inline-flex;gap:${w*.18}px;align-items:center">`+a.map((h,i)=>`<svg width="${w}" height="${w*.6}" viewBox="0 0 20 12"><path d="M1 6 q2.5 ${-h} 5 0 t5 0 t5 0" fill="none" stroke="#141414" stroke-width="2" stroke-linecap="round" opacity="${i==n?1:.25}"/></svg>`).join('')+'</span>'};
I.flag=(s)=>`<svg width="${s}" height="${s}" viewBox="0 0 12 12"><path d="M2 11V1.5h7l-1.5 2.5 1.5 2.5H2" fill="#ff4a2b" stroke="#141414" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
I.clock=(s)=>`<svg width="${s}" height="${s}" viewBox="0 0 12 12"><circle cx="6" cy="6.5" r="4.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6 4v2.7l1.8 1.1M4.5 1h3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
