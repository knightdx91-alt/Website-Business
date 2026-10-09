/**
 * The agreement pop-up and e-signature, shared by the sign-up link page, the website's Get started page and the
 * Buy extras page. Ticking "I agree" opens the agreement for exactly what's picked; the customer types their full
 * name, signs with a finger and consents to sign electronically. The form can't be sent until it's signed, and
 * changing the order afterwards asks them to sign again. Posts signer_name, signature (PNG data URL) and agree=yes.
 */

const MAX_SIGNATURE_CHARS = 300_000;

/** Server-side check of what the pop-up posted. Returns the cleaned values, or null if it wasn't signed properly. */
export function readSignature(form: FormData | null): { name: string; signature: string } | null {
  const name = String(form?.get("signer_name") ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  const signature = String(form?.get("signature") ?? "");
  if (form?.get("agree") !== "yes" || name.length < 3 || !name.includes(" ")) return null;
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length > MAX_SIGNATURE_CHARS || signature.length < 2_000) return null;
  return { name, signature };
}

export function esignHtml(o: { sectionsHtml: string; esc: (t: string) => string; businessField?: string; title: string }): string {
  const e = o.esc;
  return `<style>
.es-agree{display:flex;gap:10px;align-items:flex-start;border:2px solid #14213d;border-radius:12px;padding:14px;margin:6px 0 10px;cursor:pointer;background:#fff;color:#16181d;font-weight:600}
.es-agree input{width:22px;height:22px;min-height:0;margin-top:2px;flex:none}
.es-status{margin:0 0 12px;font-weight:700}.es-status.ok{color:#0f5132}.es-status.warn{color:#8a5300}
dialog.es{width:min(720px,96vw);max-height:94vh;padding:0;border:0;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.35);color:#16181d}
dialog.es::backdrop{background:rgba(10,15,30,.6)}
.es-head{position:sticky;top:0;background:#14213d;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px;z-index:1}
.es-head h2{margin:0;font-size:1.1rem;color:#fff}.es-x{background:none;border:0;color:#fff;font-size:1.6rem;line-height:1;cursor:pointer;padding:4px 8px}
.es-body{padding:6px 18px 18px;font-size:.95rem;line-height:1.5}
.es-body .ct{border-bottom:1px solid #e1e4ea;padding:10px 0}.es-body .ct h3{font-size:1rem;margin:4px 0 6px}.es-body .ct p{margin:0 0 6px;white-space:pre-line}
.es-body ul{margin:4px 0 6px;padding-left:20px}.ct-title{margin:12px 0 4px}
.es-sign{background:#f4f5f8;border-radius:12px;padding:14px;margin-top:14px}
.es-sign label{display:block;font-weight:700;margin:0 0 10px;color:#16181d}
.es-sign input[type=text]{display:block;width:100%;min-height:48px;margin-top:6px;padding:10px 12px;border:2px solid #3b4a6b;border-radius:10px;font:inherit;background:#fff;color:#16181d}
.es-pad{display:block;width:100%;height:150px;background:#fff;border:2px dashed #3b4a6b;border-radius:10px;touch-action:none;margin-top:6px}
.es-sign label.es-row{display:flex;gap:10px;align-items:flex-start;font-weight:400}.es-row input{width:22px;height:22px;flex:none;margin-top:2px}
.es-btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.es-btns button{min-height:50px;padding:10px 18px;border-radius:12px;border:2px solid #14213d;font:700 1rem system-ui,sans-serif;cursor:pointer}
.es-go{background:#14213d;color:#fff}.es-clear{background:#fff;color:#14213d}
.es-err{color:#a4161a;font-weight:700;margin:8px 0 0}
</style>
<label class="es-agree"><input type="checkbox" id="es-box"> <span>I've read the agreement and want to sign it. <span style="font-weight:400">(Tap to open the agreement)</span></span></label>
<p class="es-status" id="es-status" aria-live="polite"></p>
<input type="hidden" name="agree" value=""><input type="hidden" name="signer_name" value=""><input type="hidden" name="signature" value="">
<dialog class="es" id="es-dlg" aria-labelledby="es-h">
<div class="es-head"><h2 id="es-h">${e(o.title)}</h2><button type="button" class="es-x" id="es-x" aria-label="Close">×</button></div>
<div class="es-body">${o.sectionsHtml}
<div class="es-sign"><label>Your full legal name<input type="text" id="es-name" autocomplete="name" maxlength="100"></label>
<label>Sign with your finger<canvas class="es-pad" id="es-pad" aria-label="Signature pad"></canvas></label>
<label class="es-row"><input type="checkbox" id="es-consent"> <span>I agree to this agreement and to sign it electronically. I'm authorized to sign for this business.</span></label>
<p class="es-err" id="es-err" hidden></p>
<div class="es-btns"><button type="button" class="es-go" id="es-go">Sign agreement</button><button type="button" class="es-clear" id="es-clear">Clear signature</button></div></div>
</div></dialog>
<script>(function(){
var box=document.getElementById("es-box"),dlg=document.getElementById("es-dlg"),f=box.closest("form"),st=document.getElementById("es-status");
var pad=document.getElementById("es-pad"),cx=pad.getContext("2d"),drawing=false,inked=false;
var bizField=${JSON.stringify(o.businessField ?? "")};
function q(s){return f.querySelector(s)}
function txt(el){return el?el.textContent.replace(/\\s+/g," ").trim():""}
function signed(){return f.elements.agree.value==="yes"}
function reset(msg){f.elements.agree.value="";f.elements.signature.value="";f.elements.signer_name.value="";box.checked=false;st.className="es-status warn";st.textContent=msg||"";}
function fill(){
 var plan=q('[name="plan"]:checked:enabled')||q('input[type=hidden][name="plan"]');
 dlg.querySelectorAll("[data-plan]").forEach(function(s){s.hidden=!plan||s.getAttribute("data-plan")!==plan.value});
 dlg.querySelectorAll("[data-extra]").forEach(function(s){var c=q('[name="x_'+s.getAttribute("data-extra")+'"]');s.hidden=!(c&&c.checked)});
 var b=q('[name="billing"]:checked'),bt=dlg.querySelector("[data-billing-text]");
 if(bt){var lab=b&&b.closest("label");bt.textContent=lab?txt(lab.querySelector("strong"))+": "+txt(lab.querySelector("small")):"";}
 var it=dlg.querySelector("[data-invoice-text]");if(it)it.hidden=!(b&&b.value==="invoice");
 var items=[];
 if(plan&&plan.type==="radio"){items.push(txt(plan.closest("label").querySelector("strong"))+" plan"+(b?" ("+txt(b.closest("label").querySelector("strong"))+")":""));}
 f.querySelectorAll('input[type=checkbox][name^="x_"]').forEach(function(c){if(!c.checked)return;var lab=c.closest("label"),n=txt(lab.querySelector("strong")),qn=lab.querySelector('input[name^="q_"]'),pr=lab.querySelector(".pk-price");items.push(n+(qn&&+qn.value>1?" x"+qn.value:"")+(pr?" · "+txt(pr):""));});
 var t1=document.getElementById("pk-today"),t2=document.getElementById("pk-then");
 var o=dlg.querySelector("[data-order]");o.innerHTML="";var ul=document.createElement("ul");items.forEach(function(i){var li=document.createElement("li");li.textContent=i;ul.appendChild(li)});o.appendChild(ul);
 if(t1){var p=document.createElement("p");p.textContent=txt(t1)+(t2?". "+txt(t2):"");o.appendChild(p);}
 if(bizField){var bz=q('[name="'+bizField+'"]');dlg.querySelectorAll("[data-business]").forEach(function(s){s.textContent=bz&&bz.value.trim()?bz.value.trim():"your business"});}
}
function sizePad(){var r=pad.getBoundingClientRect(),k=window.devicePixelRatio||1;pad.width=Math.round(r.width*k);pad.height=Math.round(r.height*k);cx.setTransform(k,0,0,k,0,0);cx.lineWidth=2.6;cx.lineCap="round";cx.lineJoin="round";cx.strokeStyle="#111";inked=false;}
function pt(e){var r=pad.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
pad.addEventListener("pointerdown",function(e){e.preventDefault();drawing=true;pad.setPointerCapture(e.pointerId);var p=pt(e);cx.beginPath();cx.moveTo(p[0],p[1]);});
pad.addEventListener("pointermove",function(e){if(!drawing)return;var p=pt(e);cx.lineTo(p[0],p[1]);cx.stroke();inked=true;});
["pointerup","pointercancel","pointerleave"].forEach(function(n){pad.addEventListener(n,function(){drawing=false})});
function open(){if(bizField){var bz=q('[name="'+bizField+'"]');if(bz&&!bz.value.trim()){bz.focus();st.className="es-status warn";st.textContent="Type your business name first.";box.checked=false;return;}}
 fill();document.getElementById("es-err").hidden=true;dlg.showModal();dlg.querySelector(".es-body").scrollTop=0;setTimeout(sizePad,30);}
box.addEventListener("click",function(e){e.preventDefault();open();});
document.getElementById("es-x").addEventListener("click",function(){dlg.close()});
document.getElementById("es-clear").addEventListener("click",sizePad);
document.getElementById("es-go").addEventListener("click",function(){
 var name=document.getElementById("es-name").value.trim().replace(/\\s+/g," "),err=document.getElementById("es-err");
 function bad(m){err.textContent=m;err.hidden=false}
 if(name.length<3||name.indexOf(" ")<0)return bad("Type your full name (first and last).");
 if(!inked)return bad("Sign in the box with your finger.");
 if(!document.getElementById("es-consent").checked)return bad("Tick the box to agree.");
 var out=document.createElement("canvas");out.width=600;out.height=200;var oc=out.getContext("2d");oc.fillStyle="#fff";oc.fillRect(0,0,600,200);oc.drawImage(pad,0,0,600,200);
 f.elements.signature.value=out.toDataURL("image/png");f.elements.signer_name.value=name;f.elements.agree.value="yes";
 box.checked=true;st.className="es-status ok";st.textContent="✅ Signed by "+name+". You can continue.";dlg.close();
});
f.addEventListener("change",function(e){var n=e.target.name||"";if(signed()&&(n==="plan"||n==="billing"||/^[xq]_/.test(n)))reset("Your order changed, so please open the agreement and sign again.");});
f.addEventListener("input",function(e){var n=e.target.name||"";if(signed()&&(/^q_/.test(n)||(bizField&&n===bizField)))reset("Your details changed, so please open the agreement and sign again.");});
f.addEventListener("submit",function(e){if(!signed()){e.preventDefault();st.className="es-status warn";st.textContent="Please open the agreement and sign it first.";open();}});
})();</script>`;
}
