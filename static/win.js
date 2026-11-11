function win(id,n){return `<div class="ban">${'<i></i>'.repeat(n)}</div><div class="glass"><div class="dd" id="${id}"></div>
 <div class="pane" style="left:0"></div><div class="pane" style="left:33.333%"></div><div class="pane" style="left:66.666%"></div>
 <div class="bar" style="left:33.333%"></div><div class="bar" style="left:66.666%"></div><div class="trinco" style="left:33.333%"></div><div class="trinco" style="left:66.666%"></div>
 <slot></slot></div><div class="sill"></div>`}
