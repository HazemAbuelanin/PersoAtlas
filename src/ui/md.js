
import { esc } from "../core/util.js";
export function md(src){
  const lines=String(src||"").split("\n");let out="",inList=false,inCode=false,code=[],para=[];
  const inline=t=>esc(t).replace(/`([^`]+)`/g,"<code>$1</code>")
    .replace(/!\[([^\]]*)\]\(att:([A-Za-z0-9]+)\)/g,'<img class="mdimg" alt="$1" data-src="$2">')
    .replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g,'<img class="mdimg" alt="$1" src="$2">').replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/\*([^*]+)\*/g,"<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  const flushP=()=>{if(para.length){out+=`<p>${inline(para.join(" "))}</p>`;para=[];}};
  const closeL=()=>{if(inList){out+="</ul>";inList=false;}};
  for(const l of lines){
    if(l.startsWith("```")){if(inCode){out+=`<pre><code>${esc(code.join("\n"))}</code></pre>`;code=[];inCode=false;}else{flushP();closeL();inCode=true;}continue;}
    if(inCode){code.push(l);continue;}
    const h=l.match(/^(#{1,3})\s+(.*)/);if(h){flushP();closeL();out+=`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;continue;}
    const li=l.match(/^\s*[-*]\s+(.*)/);if(li){flushP();if(!inList){out+="<ul>";inList=true;}out+=`<li>${inline(li[1])}</li>`;continue;}
    const bq=l.match(/^>\s?(.*)/);if(bq){flushP();closeL();out+=`<blockquote>${inline(bq[1])}</blockquote>`;continue;}
    if(!l.trim()){flushP();closeL();continue;}
    closeL();para.push(l);
  }
  if(inCode)out+=`<pre><code>${esc(code.join("\n"))}</code></pre>`;flushP();closeL();return out;
}
