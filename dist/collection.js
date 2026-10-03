export const SORT_OPTIONS=[
 ['favorites','즐겨찾기 우선'],['latest','최근 획득 순'],
 ['size-asc','크기 오름차순'],['size-desc','크기 내림차순'],
 ['stamina-asc','지구력 오름차순'],['stamina-desc','지구력 내림차순'],
 ['grip-asc','발힘 오름차순'],['grip-desc','발힘 내림차순'],
 ['health-asc','건강 오름차순'],['health-desc','건강 내림차순'],
 ['hunger-asc','포만감 오름차순'],['hunger-desc','포만감 내림차순'],
];
export const staminaCapacity=b=>100+(b.trainingStamina||0)*1.5;
export function collectionView(bugs,{species='all',sex='all',favoritesOnly=false,sort='favorites'}={}){
 const list=bugs.filter(b=>(species==='all'||b.species===species)&&(sex==='all'||b.sex===sex)&&(!favoritesOnly||b.favorite));
 const metric={size:b=>b.length,stamina:staminaCapacity,grip:b=>b.trainingGrip||0,health:b=>b.health,hunger:b=>b.hunger};
 if(sort==='latest')return list.sort((a,b)=>b.born-a.born);
 const [key,direction]=sort.split('-');
 if(metric[key])return list.sort((a,b)=>(metric[key](a)-metric[key](b))*(direction==='desc'?-1:1));
 return list.sort((a,b)=>Number(!!b.favorite)-Number(!!a.favorite)||b.born-a.born);
}
