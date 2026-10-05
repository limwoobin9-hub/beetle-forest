export const BASE_ROOM_CAPACITY=48;
export const ROOM_EXPANSIONS=[
 {id:'room_expansion_1',stage:1,capacity:60,price:2000,color:'#b6bb89'},
 {id:'room_expansion_2',stage:2,capacity:72,price:5000,color:'#94ad87'},
 {id:'room_expansion_3',stage:3,capacity:96,price:12000,color:'#80a298'},
 {id:'room_expansion_4',stage:4,capacity:120,price:25000,color:'#b6a374'},
];
export const MAX_ROOM_CAPACITY=ROOM_EXPANSIONS.at(-1).capacity;
export function roomLevel(state){let level=0;for(const step of ROOM_EXPANSIONS){if(state?.inventory?.[step.id]!==1)break;level=step.stage;}return level;}
export function roomCapacity(state){return ROOM_EXPANSIONS[roomLevel(state)-1]?.capacity??BASE_ROOM_CAPACITY;}
export function validRoomExpansions(state){
 let gap=false;
 for(const step of ROOM_EXPANSIONS){const quantity=state?.inventory?.[step.id];if(quantity===undefined||quantity===0)gap=true;else if(quantity!==1||gap)return false;}
 return true;
}
