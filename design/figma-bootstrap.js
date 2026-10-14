// This file and the following fragments share one async function scope.
if (figma.fileKey !== CONFIG.fileKey) throw new Error('Open the file specified by design/figma-state.json; image hashes belong to that file.')
const page = figma.currentPage;
const previous = page.children.find(n => n.getPluginData('fate/source'));
if (previous) {
  if (previous.getPluginData('fate/source') !== CONFIG.fingerprint) throw new Error('This page contains another generated version. Use a new empty page to compare versions.');
  return {status:'unchanged',section:previous.id,result:JSON.parse(previous.getPluginData('fate/result'))};
}
if (page.findOne(n => ['fate. — UI/UX design','fate. / Reusable components'].includes(n.name))) throw new Error('Existing unversioned Fate design found. Use a new empty page; the old design will not be overwritten.');
if (!figma.getImageByHash(CONFIG.portrait)) throw new Error('Portrait image is missing in this Figma file. Update portrait in design/figma-state.json.');
await Promise.all([{family:'DM Sans',style:'Regular'},{family:'DM Sans',style:'Medium'},{family:'DM Sans',style:'Bold'},{family:'Manrope',style:'ExtraBold'},{family:'Manrope',style:'Bold'}].map(f=>figma.loadFontAsync(f)));
const made = [];
const tracked = n => { made.push(n.id); return n; };
const createdResources = [];
const oldStartingPoints = [...page.flowStartingPoints];
try {
const collection = figma.variables.createVariableCollection('fate. / CSS themes');
createdResources.push(collection);
collection.renameMode(collection.defaultModeId, 'Purple');
const creamMode = collection.addMode('Cream');
const V = {};
for (const [name,value] of Object.entries(COLORS.purple)) {
  const variable = figma.variables.createVariable(name,collection,'COLOR');
  createdResources.push(variable);
  variable.setValueForMode(collection.defaultModeId,value);
  variable.setValueForMode(creamMode,COLORS.cream[name]);
  V[name]=variable;
}
for (const [name,value] of Object.entries({'Space/200':8,'Space/400':16,'Space/600':24,...Object.fromEntries([12,20,28].map(r=>['radius/'+r,r]))})) {
  const variable=figma.variables.createVariable(name,collection,'FLOAT');
  createdResources.push(variable);
  variable.setValueForMode(collection.defaultModeId,value);
  variable.setValueForMode(creamMode,value);
  V[name]=variable;
}
const S = {};
const STYLE_CONFIG = {};
for (const [name,size,family,style,lineHeight] of [['Display',39,'Manrope','ExtraBold',48],['Title',29,'Manrope','ExtraBold',35],['Heading',19,'Manrope','Bold',25],['Body',12,'DM Sans','Regular',18],['Label',13,'DM Sans','Bold',18],['Caption',10,'DM Sans','Regular',15]]) {
  const textStyle=figma.createTextStyle();
  createdResources.push(textStyle);
  textStyle.name='fate. / '+name;
  textStyle.fontName={family,style};
  textStyle.fontSize=size;
  textStyle.lineHeight={unit:'PIXELS',value:lineHeight};
  S[name]=textStyle.id;
  STYLE_CONFIG[name]={fontName:{family,style},fontSize:size,lineHeight:{unit:'PIXELS',value:lineHeight}};
}
const board=tracked(figma.createFrame());
page.appendChild(board);
board.name='fate. / Handoff board';
board.layoutMode='VERTICAL';
board.primaryAxisSizingMode='AUTO';
board.counterAxisSizingMode='FIXED';
board.itemSpacing=32;
board.paddingTop=32;board.paddingBottom=32;board.paddingLeft=32;board.paddingRight=32;
board.resize(1960,1);board.fills=[];
