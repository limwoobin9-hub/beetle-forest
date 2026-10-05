export const BASE_NURSERY_CAPACITY=3;
export const NURSERY_PRODUCT_ID='additional_nursery';
export function nurseryCapacity(state){return BASE_NURSERY_CAPACITY+(state?.inventory?.[NURSERY_PRODUCT_ID]||0);}
