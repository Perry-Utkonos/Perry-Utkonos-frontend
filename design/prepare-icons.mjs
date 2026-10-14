import fs from 'node:fs'
import vm from 'node:vm'
const names=['heart','message-circle','user-round','sliders-horizontal','arrow-left','arrow-right','x','check','map-pin','sparkles','settings','search','send','shield-check','bell','chevron-right','crown','plus','more-horizontal']
const icons={}
for(const name of names){
 let src=fs.readFileSync(`node_modules/lucide-react/dist/esm/icons/${name}.js`,'utf8')
 const alias=src.match(/from '\.\/([^']+)'/)
 if(alias)src=fs.readFileSync(`node_modules/lucide-react/dist/esm/icons/${alias[1]}`,'utf8')
 const match=src.match(/createLucideIcon\("[^"]+",\s*(\[[\s\S]*?\])\);/)
 const entries=vm.runInNewContext(match[1])
 icons[name]='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+entries.map(([tag,attrs])=>'<'+tag+' '+Object.entries(attrs).filter(([k])=>k!=='key').map(([k,v])=>`${k}="${v}"`).join(' ')+'/>').join('')+'</svg>'
}
fs.writeFileSync('design/icons.json',JSON.stringify(icons))
